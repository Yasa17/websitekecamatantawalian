import { Buffer } from 'node:buffer';
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
  deleteExpiredSessions,
  deleteSession,
  extendSession,
  findAdminByLogin,
  findAdminBySession,
  getDistrictSummary,
  getPortalData,
  isDatabaseInitialized,
  seedDatabase,
  updateAdmin,
  updateEntityContent,
} from './repository.mjs';

const apiResult = (body, status = 200) => ({ status, body });

const apiError = (message, status) =>
  Object.assign(new Error(message), { status });

const validationError = (message) => apiError(message, 400);

const validateImage = (url) => {
  if (typeof url !== 'string' || !url) {
    throw validationError('Berkas foto wajib diisi.');
  }
  if (/^https?:\/\//.test(url)) return;

  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match) {
    throw validationError('Foto baru harus dikonversi ke WebP.');
  }
  const size = Buffer.from(match[1], 'base64').length;
  if (size <= 0 || size > 500 * 1024) {
    throw validationError(
      'Ukuran setiap foto harus lebih dari 0 KB dan maksimal 500 KB.',
    );
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
    validateImage(updates.profile?.headPhotoUrl);
    validateImage(updates.profile?.organizationStructureUrl);
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

const validateStatistics = (statistics) => {
  if (!Array.isArray(statistics)) {
    throw validationError('Data statistik harus berupa daftar dataset.');
  }
  if (statistics.length > 100) {
    throw validationError('Jumlah dataset statistik maksimal 100.');
  }

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
    validateContentImages(updates);
    const content = await updateEntityContent(entityId, updates);
    if (!content) {
      return apiResult({ error: 'Wilayah tidak ditemukan.' }, 404);
    }
    return apiResult({ data: content });
  }

  if (requestMethod === 'GET' && staticPath === '/api/district/summary') {
    await requireSession(authorization, ['super_admin']);
    return apiResult({ data: await getDistrictSummary() });
  }

  if (requestMethod === 'PATCH' && staticPath === '/api/admin/profile') {
    const { admin } = await requireSession(authorization);
    const { fields, currentPassword, newPassword } = body;
    if (fields?.avatarUrl !== undefined) validateImage(fields.avatarUrl);
    if (newPassword !== undefined) {
      if (!passwordMatches(currentPassword || '', admin)) {
        return apiResult({ error: 'Password saat ini tidak cocok.' }, 400);
      }
      if (newPassword.length < 8) {
        return apiResult({ error: 'Password baru minimal 8 karakter.' }, 400);
      }
    }

    for (const key of ['name', 'username', 'email', 'avatarUrl']) {
      if (fields?.[key] !== undefined) admin[key] = fields[key];
    }
    if (newPassword !== undefined) Object.assign(admin, hashPassword(newPassword));
    const savedAdmin = await updateAdmin(admin);
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
