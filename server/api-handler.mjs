import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  passwordMatches,
  publicAdmin,
} from './auth.mjs';
import { databasePool } from './database.mjs';
import {
  createSession,
  createCitizenSubmission,
  deleteExpiredSessions,
  deleteSession,
  entityExists,
  extendSession,
  findAdminByLogin,
  findAdminBySession,
  getDistrictSummary,
  getPortalData,
  isDatabaseInitialized,
  listCitizenSubmissionsForEntity,
  seedDatabase,
  updateAdmin,
  updateCitizenSubmissionStatus,
  updateEntityContent,
} from './repository.mjs';
import {
  deleteRemovedEntityImages,
  deleteUploadedPaths,
  materializeAdminAvatar,
  materializeEntityImages,
} from './media-service.mjs';

const apiResult = (body, status = 200) => ({ status, body });

const apiError = (message, status) =>
  Object.assign(new Error(message), { status });

const validationError = (message) => apiError(message, 400);

const CITIZEN_KINDS = ['aspirasi', 'aduan', 'pertanyaan'];
const CITIZEN_STATUSES = ['new', 'in_progress', 'resolved', 'rejected'];
const CITIZEN_CATEGORIES = [
  'Saran Pembangunan',
  'Kritik Pelayanan Perangkat',
  'Pengaduan Kerusakan Infrastruktur',
  'Pelayanan Administrasi Kependudukan',
  'Lainnya',
];

const trimmedString = (value) => typeof value === 'string' ? value.trim() : '';

const validateCitizenSubmission = (body) => {
  const submission = {
    entityId: trimmedString(body.entityId),
    kind: trimmedString(body.kind),
    name: trimmedString(body.name),
    email: trimmedString(body.email).toLowerCase(),
    phone: trimmedString(body.phone),
    category: trimmedString(body.category),
    message: trimmedString(body.message),
  };

  if (trimmedString(body.website)) {
    throw validationError('Formulir tidak dapat diproses.');
  }
  if (!submission.entityId || submission.entityId.length > 100) {
    throw validationError('Wilayah tujuan aspirasi tidak valid.');
  }
  if (!CITIZEN_KINDS.includes(submission.kind)) {
    throw validationError('Jenis kiriman warga tidak valid.');
  }
  if (submission.name.length < 2 || submission.name.length > 100) {
    throw validationError('Nama warga harus berisi 2–100 karakter.');
  }
  if (
    submission.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)
  ) {
    throw validationError('Alamat email tidak valid.');
  }
  if (submission.phone.length > 30 || !/^[0-9+() .-]*$/.test(submission.phone)) {
    throw validationError('Nomor telepon tidak valid.');
  }
  if (!CITIZEN_CATEGORIES.includes(submission.category)) {
    throw validationError('Kategori aspirasi atau aduan tidak valid.');
  }
  if (submission.message.length < 10 || submission.message.length > 5000) {
    throw validationError('Rincian aspirasi atau aduan harus berisi 10–5.000 karakter.');
  }
  return submission;
};

const safeStorageCleanup = async (operation) => {
  try {
    await operation();
  } catch (error) {
    console.error('Pembersihan media Supabase Storage tertunda:', error?.message || error);
  }
};

const validateImage = (url) => {
  if (typeof url !== 'string' || !url) {
    throw validationError('Berkas foto wajib diisi.');
  }
  if (/^https?:\/\//.test(url)) return;

  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match) {
    throw validationError('Foto baru harus dikonversi ke WebP.');
  }
  const bytes = Buffer.from(match[1], 'base64');
  const size = bytes.length;
  if (size <= 0 || size > 500 * 1024) {
    throw validationError(
      'Ukuran setiap foto harus lebih dari 0 KB dan maksimal 500 KB.',
    );
  }
  if (
    bytes.length < 12 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw validationError('Isi berkas bukan gambar WebP yang valid.');
  }
};

const validateGallery = (gallery) => {
  if (!Array.isArray(gallery)) {
    throw validationError('Data galeri harus berupa daftar album.');
  }
  for (const item of gallery) {
    const urls = Array.isArray(item.urls) ? item.urls : [item.url];
    if (urls.length < 1 || urls.length > 5) {
      throw validationError('Setiap album hanya boleh memuat 1–5 foto.');
    }
    if (item.url !== urls[0]) {
      throw validationError('Foto sampul harus menjadi foto pertama album.');
    }
    urls.forEach(validateImage);
  }
};

const validateContentImages = (updates) => {
  if (updates.profile !== undefined) {
    if (updates.profile?.headPhotoUrl !== undefined) {
      validateImage(updates.profile.headPhotoUrl);
    }
    if (updates.profile?.organizationStructureUrl !== undefined) {
      validateImage(updates.profile.organizationStructureUrl);
    }
    for (const staff of updates.profile?.staff || []) {
      validateImage(staff.photoUrl);
    }
  }
  if (updates.news !== undefined) {
    if (!Array.isArray(updates.news)) {
      throw validationError('Data berita harus berupa daftar.');
    }
    for (const article of updates.news) validateImage(article.thumbnail);
  }
};

const validateContactProfile = (profile) => {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw validationError('Data profil wilayah tidak valid.');
  }
  const limits = {
    address: 1000,
    phone: 100,
    email: 254,
    serviceHours: 200,
    mapEmbedUrl: 2000,
  };
  for (const [key, limit] of Object.entries(limits)) {
    if (profile[key] !== undefined && typeof profile[key] !== 'string') {
      throw validationError(`Kolom ${key} harus berupa teks.`);
    }
    if (profile[key]?.trim().length > limit) {
      throw validationError(`Isi kolom ${key} terlalu panjang.`);
    }
  }
  if (
    profile.email !== undefined &&
    profile.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
  ) {
    throw validationError('Alamat email pelayanan tidak valid.');
  }
  if (profile.mapEmbedUrl !== undefined && profile.mapEmbedUrl.trim()) {
    let mapUrl;
    try {
      mapUrl = new URL(profile.mapEmbedUrl.trim());
    } catch {
      throw validationError('Tautan peta tidak valid.');
    }
    const googleHost = mapUrl.hostname === 'google.com' ||
      mapUrl.hostname.endsWith('.google.com') ||
      mapUrl.hostname === 'google.co.id' ||
      mapUrl.hostname.endsWith('.google.co.id');
    if (mapUrl.protocol !== 'https:' || !googleHost || mapUrl.searchParams.get('output') !== 'embed') {
      throw validationError('Gunakan tautan sematan HTTPS Google Maps dengan output=embed.');
    }
  }
};

const validateStatistics = (statistics) => {
  if (!Array.isArray(statistics)) {
    throw validationError('Data statistik harus berupa daftar dataset.');
  }
  if (statistics.length > 100) {
    throw validationError('Jumlah dataset statistik maksimal 100.');
  }

  const categoryIds = new Set();
  for (const category of statistics) {
    if (
      !category ||
      typeof category.id !== 'string' ||
      !category.id ||
      typeof category.title !== 'string' ||
      !category.title.trim()
    ) {
      throw validationError('Setiap dataset statistik wajib memiliki ID dan judul.');
    }
    if (categoryIds.has(category.id)) {
      throw validationError(`ID dataset statistik "${category.id}" digunakan lebih dari sekali.`);
    }
    categoryIds.add(category.id);
    if (
      category.type !== undefined &&
      !['bar', 'line', 'pie', 'donut'].includes(category.type)
    ) {
      throw validationError(`Jenis grafik dataset "${category.title}" tidak valid.`);
    }
    if (!Array.isArray(category.items)) {
      throw validationError(`Data grafik dataset "${category.title}" tidak valid.`);
    }
    for (const item of category.items) {
      if (
        typeof item?.label !== 'string' ||
        typeof item?.value !== 'number' ||
        !Number.isFinite(item.value)
      ) {
        throw validationError(`Nilai grafik dataset "${category.title}" tidak valid.`);
      }
    }

    if (category.table === undefined) continue;
    const { columns, rows } = category.table || {};
    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      throw validationError(`Struktur tabel dataset "${category.title}" tidak valid.`);
    }
    if (rows.length > 10000) {
      throw validationError(`Dataset "${category.title}" maksimal berisi 10.000 baris.`);
    }

    const nodeIds = new Set();
    const leafColumns = new Map();
    let nodeCount = 0;
    const visitColumns = (nodes, depth = 1) => {
      if (depth > 8) {
        throw validationError(`Grup tabel "${category.title}" maksimal 8 tingkat.`);
      }
      for (const column of nodes) {
        nodeCount += 1;
        if (nodeCount > 250) {
          throw validationError(`Struktur "${category.title}" maksimal 250 grup/kolom.`);
        }
        if (
          !column ||
          typeof column.id !== 'string' ||
          !column.id ||
          nodeIds.has(column.id) ||
          typeof column.label !== 'string' ||
          !column.label.trim()
        ) {
          throw validationError(`Nama atau ID kolom dataset "${category.title}" tidak valid.`);
        }
        nodeIds.add(column.id);
        if (column.kind === 'group') {
          if (!Array.isArray(column.children) || !column.children.length) {
            throw validationError(`Grup "${column.label}" harus memiliki minimal satu kolom.`);
          }
          visitColumns(column.children, depth + 1);
        } else if (
          column.kind === 'column' &&
          ['text', 'number'].includes(column.dataType)
        ) {
          leafColumns.set(column.id, column);
        } else {
          throw validationError(`Tipe kolom "${column.label}" tidak valid.`);
        }
      }
    };
    visitColumns(columns);
    if (!leafColumns.size) {
      throw validationError(`Dataset "${category.title}" harus memiliki minimal satu kolom.`);
    }

    const rowIds = new Set();
    for (const row of rows) {
      if (
        !row ||
        typeof row.id !== 'string' ||
        !row.id ||
        rowIds.has(row.id) ||
        !row.values ||
        typeof row.values !== 'object' ||
        Array.isArray(row.values)
      ) {
        throw validationError(`Baris tabel dataset "${category.title}" tidak valid.`);
      }
      rowIds.add(row.id);
      for (const [columnId, value] of Object.entries(row.values)) {
        const column = leafColumns.get(columnId);
        if (!column) {
          throw validationError(
            `Baris dataset "${category.title}" memuat kolom yang sudah tidak ada.`,
          );
        }
        if (
          column.dataType === 'number' &&
          value !== '' &&
          (typeof value !== 'number' || !Number.isFinite(value))
        ) {
          throw validationError(`Kolom "${column.label}" hanya dapat berisi angka.`);
        }
        if (column.dataType === 'text' && typeof value !== 'string') {
          throw validationError(`Kolom "${column.label}" hanya dapat berisi teks.`);
        }
      }
    }
  }
};

const bootstrapDatabase = async (initialData) => {
  if (
    !initialData?.portalData?.entities?.length ||
    !Array.isArray(initialData.admins) ||
    !initialData.admins.length
  ) {
    throw validationError('Data awal backend tidak lengkap.');
  }
  initialData.portalData.entities.forEach((entity) =>
    validateStatistics(entity.content?.statistics),
  );
  await seedDatabase(initialData, hashPassword);
};

const requireSession = async (authorization, roles) => {
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const tokenHash = token ? hashSessionToken(token) : '';
  const admin = tokenHash ? await findAdminBySession(tokenHash) : null;

  if (!admin) {
    if (tokenHash) await deleteSession(tokenHash);
    throw apiError('Sesi admin tidak valid atau telah berakhir.', 401);
  }
  if (roles && !roles.includes(admin.role)) {
    throw apiError('Peran admin tidak memiliki akses ke fungsi ini.', 403);
  }

  await extendSession(tokenHash, new Date(Date.now() + 12 * 60 * 60 * 1000));
  return { admin, tokenHash };
};

const dispatch = async ({
  method,
  pathname,
  authorization = '',
  body = {},
  allowBootstrap = false,
  mediaStorage = null,
}) => {
  const requestMethod = method === 'HEAD' ? 'GET' : method;
  const requestPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const staticPath = requestPath.toLowerCase();

  if (requestMethod === 'GET' && staticPath === '/api/health') {
    await databasePool.query('SELECT 1');
    return apiResult({ status: 'ok', initialized: await isDatabaseInitialized() });
  }

  if (requestMethod === 'POST' && staticPath === '/api/bootstrap' && allowBootstrap) {
    await bootstrapDatabase(body.initialData);
    return apiResult({ data: await getPortalData() }, 201);
  }

  if (requestMethod === 'GET' && staticPath === '/api/portal') {
    if (!(await isDatabaseInitialized())) {
      return apiResult({
        error: 'Database belum memiliki data awal. Jalankan npm run db:seed.',
        code: 'NOT_INITIALIZED',
      }, 503);
    }
    return apiResult({ data: await getPortalData() });
  }

  if (requestMethod === 'POST' && staticPath === '/api/citizen-submissions') {
    const submission = validateCitizenSubmission(body);
    if (!(await entityExists(submission.entityId))) {
      return apiResult({ error: 'Wilayah tujuan aspirasi tidak ditemukan.' }, 404);
    }
    const saved = await createCitizenSubmission({
      ...submission,
      id: randomUUID(),
    });
    if (!saved) {
      return apiResult({
        error: 'Batas pengiriman tercapai. Silakan tunggu 10 menit sebelum mengirim lagi.',
      }, 429);
    }
    return apiResult({
      success: true,
      referenceId: saved.id,
      createdAt: saved.createdAt,
    }, 201);
  }

  if (requestMethod === 'POST' && staticPath === '/api/auth/login') {
    if (!(await isDatabaseInitialized())) {
      return apiResult({ error: 'Database belum memiliki data awal.' }, 503);
    }
    const { usernameOrEmail, password } = body;
    const admin = await findAdminByLogin(usernameOrEmail || '');
    if (!admin || !passwordMatches(password || '', admin)) {
      return apiResult({ error: 'Username/email atau password salah.' }, 401);
    }

    await deleteExpiredSessions();
    const token = createSessionToken();
    await createSession(
      hashSessionToken(token),
      admin.id,
      new Date(Date.now() + 12 * 60 * 60 * 1000),
    );
    return apiResult({ token, admin: publicAdmin(admin) });
  }

  if (requestMethod === 'GET' && staticPath === '/api/auth/session') {
    const { admin } = await requireSession(authorization);
    return apiResult({ admin: publicAdmin(admin) });
  }

  if (requestMethod === 'POST' && staticPath === '/api/auth/logout') {
    const { tokenHash } = await requireSession(authorization);
    await deleteSession(tokenHash);
    return apiResult({ success: true });
  }

  if (requestMethod === 'GET' && staticPath === '/api/admin/citizen-submissions') {
    const { admin } = await requireSession(authorization);
    return apiResult({
      data: await listCitizenSubmissionsForEntity(admin.assignedEntityId),
    });
  }

  const submissionStatusMatch = /^\/api\/admin\/citizen-submissions\/([^/]+)\/status$/i.exec(requestPath);
  if (requestMethod === 'PATCH' && submissionStatusMatch) {
    const { admin } = await requireSession(authorization);
    let submissionId;
    try {
      submissionId = decodeURIComponent(submissionStatusMatch[1]);
    } catch {
      throw validationError('ID aspirasi atau aduan tidak valid.');
    }
    const status = trimmedString(body.status);
    if (!CITIZEN_STATUSES.includes(status)) {
      throw validationError('Status aspirasi atau aduan tidak valid.');
    }
    const saved = await updateCitizenSubmissionStatus(
      submissionId,
      admin.assignedEntityId,
      status,
    );
    if (!saved) {
      return apiResult({ error: 'Aspirasi atau aduan tidak ditemukan.' }, 404);
    }
    return apiResult({ data: saved });
  }

  const entityMatch = /^\/api\/entities\/([^/]+)\/content$/i.exec(requestPath);
  if (requestMethod === 'PATCH' && entityMatch) {
    const { admin } = await requireSession(authorization, ['admin', 'super_admin']);
    let entityId;
    try {
      entityId = decodeURIComponent(entityMatch[1]);
    } catch {
      throw validationError('ID wilayah tidak valid.');
    }
    if (admin.assignedEntityId !== entityId) {
      return apiResult({ error: 'Admin hanya dapat mengubah wilayah tugasnya.' }, 403);
    }

    const updates = body.updates || {};
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw validationError('Data pembaruan wilayah tidak valid.');
    }
    const allowedUpdateKeys = new Set(['profile', 'statistics', 'news', 'gallery']);
    if (Object.keys(updates).some((key) => !allowedUpdateKeys.has(key))) {
      throw validationError('Pembaruan memuat bagian data yang tidak diizinkan.');
    }
    if (
      admin.role === 'super_admin' &&
      Object.prototype.hasOwnProperty.call(updates, 'statistics')
    ) {
      return apiResult({
        error: 'Data statistik kecamatan merupakan rekap otomatis dan tidak dapat diubah.',
      }, 403);
    }
    if (updates.statistics !== undefined) validateStatistics(updates.statistics);
    if (updates.gallery !== undefined) validateGallery(updates.gallery);
    if (updates.profile !== undefined) validateContactProfile(updates.profile);
    validateContentImages(updates);

    const materialized = await materializeEntityImages(
      entityId,
      updates,
      mediaStorage,
    );
    let saved;
    try {
      saved = await updateEntityContent(entityId, materialized.updates);
    } catch (error) {
      await safeStorageCleanup(() =>
        deleteUploadedPaths(mediaStorage, materialized.uploadedPaths));
      throw error;
    }
    if (!saved) {
      await safeStorageCleanup(() =>
        deleteUploadedPaths(mediaStorage, materialized.uploadedPaths));
      return apiResult({ error: 'Wilayah tidak ditemukan.' }, 404);
    }
    await safeStorageCleanup(() => deleteRemovedEntityImages(
      mediaStorage,
      entityId,
      saved.previousContent,
      saved.content,
    ));
    return apiResult({ data: saved.content });
  }

  if (requestMethod === 'GET' && staticPath === '/api/district/summary') {
    await requireSession(authorization, ['super_admin']);
    return apiResult({ data: await getDistrictSummary() });
  }

  if (requestMethod === 'PATCH' && staticPath === '/api/admin/profile') {
    const { admin } = await requireSession(authorization);
    const { fields, currentPassword, newPassword } = body;
    if (fields?.avatarUrl !== undefined) validateImage(fields.avatarUrl);
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      throw validationError('Data profil admin tidak valid.');
    }
    if (fields.name !== undefined && trimmedString(fields.name).length < 2) {
      throw validationError('Nama admin minimal 2 karakter.');
    }
    if (fields.username !== undefined && trimmedString(fields.username).length < 3) {
      throw validationError('Username admin minimal 3 karakter.');
    }
    if (
      fields.email !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedString(fields.email))
    ) {
      throw validationError('Alamat email admin tidak valid.');
    }
    if (newPassword !== undefined) {
      if (!passwordMatches(currentPassword || '', admin)) {
        return apiResult({ error: 'Password saat ini tidak cocok.' }, 400);
      }
      if (newPassword.length < 8) {
        return apiResult({ error: 'Password baru minimal 8 karakter.' }, 400);
      }
    }

    const previousAvatarUrl = admin.avatarUrl;
    let uploadedAvatar = { avatarUrl: fields.avatarUrl, uploadedPaths: [] };
    if (fields.avatarUrl !== undefined) {
      uploadedAvatar = await materializeAdminAvatar(
        admin.id,
        fields.avatarUrl,
        mediaStorage,
      );
      fields.avatarUrl = uploadedAvatar.avatarUrl;
    }
    for (const key of ['name', 'username', 'email', 'avatarUrl']) {
      if (fields[key] !== undefined) {
        admin[key] = typeof fields[key] === 'string' ? fields[key].trim() : fields[key];
      }
    }
    if (newPassword !== undefined) Object.assign(admin, hashPassword(newPassword));
    let savedAdmin;
    try {
      savedAdmin = await updateAdmin(admin);
    } catch (error) {
      await safeStorageCleanup(() =>
        deleteUploadedPaths(mediaStorage, uploadedAvatar.uploadedPaths));
      throw error;
    }
    const previousAvatarPath = mediaStorage?.getObjectPath(previousAvatarUrl);
    const nextAvatarPath = mediaStorage?.getObjectPath(savedAdmin.avatarUrl);
    if (
      previousAvatarPath &&
      mediaStorage.ownsPath(previousAvatarPath, { ownerType: 'admins', ownerId: admin.id }) &&
      previousAvatarPath !== nextAvatarPath
    ) {
      await safeStorageCleanup(() => mediaStorage.deletePaths([previousAvatarPath]));
    }
    return apiResult({ data: publicAdmin(savedAdmin) });
  }

  return apiResult({ error: 'Endpoint API tidak ditemukan.' }, 404);
};

export const apiErrorResult = (error) => {
  const isDuplicate = error?.code === '23505';
  const status = error?.status || (isDuplicate ? 409 : 500);
  if (status >= 500) console.error(error);
  return apiResult({
    error: isDuplicate
      ? 'Username atau email sudah digunakan oleh akun lain.'
      : error?.status
        ? error.message
        : 'Terjadi kesalahan pada server.',
  }, status);
};

export const dispatchApiRequest = async (request) => {
  try {
    return await dispatch(request);
  } catch (error) {
    return apiErrorResult(error);
  }
};
