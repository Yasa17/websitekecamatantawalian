import 'dotenv/config';
import { closeDatabase, databasePool } from './database.mjs';
import { materializeAdminAvatar, materializeEntityImages, deleteUploadedPaths } from './media-service.mjs';
import { createMediaStorageFromEnv, isWebPDataUrl } from './media-storage.mjs';
import { runMigrations } from './migrations.mjs';
import { configureNodeDatabase } from './node-database.mjs';

const dryRun = process.argv.includes('--dry-run');

const countEntityImages = (content) => {
  const values = [
    content?.profile?.headPhotoUrl,
    content?.profile?.organizationStructureUrl,
    ...(content?.profile?.staff || []).map((staff) => staff.photoUrl),
    ...(content?.news || []).map((article) => article.thumbnail),
    ...(content?.gallery || []).flatMap((item) =>
      Array.isArray(item.urls) && item.urls.length ? item.urls : [item.url]),
  ];
  return values.filter(isWebPDataUrl).length;
};

const saveEntity = async (storage, entity) => {
  const materialized = await materializeEntityImages(
    entity.id,
    entity.content,
    storage,
  );
  const client = await databasePool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE portal_entities
       SET content = $2::jsonb, updated_at = NOW()
       WHERE id = $1 AND content = $3::jsonb
       RETURNING id`,
      [
        entity.id,
        JSON.stringify(materialized.updates),
        JSON.stringify(entity.content),
      ],
    );
    if (!result.rowCount) {
      throw new Error(
        `Data ${entity.id} berubah saat migrasi. Jalankan ulang migrasi setelah aktivitas admin berhenti.`,
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    await deleteUploadedPaths(storage, materialized.uploadedPaths).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return materialized.uploadedPaths.length;
};

const saveAdminAvatar = async (storage, admin) => {
  const materialized = await materializeAdminAvatar(
    admin.id,
    admin.avatar_url,
    storage,
  );
  try {
    const result = await databasePool.query(
      `UPDATE admins
       SET avatar_url = $2, updated_at = NOW()
       WHERE id = $1 AND avatar_url = $3
       RETURNING id`,
      [admin.id, materialized.avatarUrl, admin.avatar_url],
    );
    if (!result.rowCount) {
      throw new Error(
        `Profil admin ${admin.id} berubah saat migrasi. Jalankan ulang migrasi setelah aktivitas admin berhenti.`,
      );
    }
  } catch (error) {
    await deleteUploadedPaths(storage, materialized.uploadedPaths).catch(() => undefined);
    throw error;
  }
  return materialized.uploadedPaths.length;
};

try {
  await configureNodeDatabase();
  await runMigrations();
  const entityResult = await databasePool.query(
    'SELECT id, content FROM portal_entities ORDER BY display_order, id',
  );
  const adminResult = await databasePool.query(
    'SELECT id, avatar_url FROM admins ORDER BY id',
  );
  const entityCounts = entityResult.rows.map((entity) => ({
    entity,
    count: countEntityImages(entity.content),
  }));
  const adminCounts = adminResult.rows.map((admin) => ({
    admin,
    count: isWebPDataUrl(admin.avatar_url) ? 1 : 0,
  }));
  const total = [
    ...entityCounts.map(({ count }) => count),
    ...adminCounts.map(({ count }) => count),
  ].reduce((sum, count) => sum + count, 0);

  console.log(`Ditemukan ${total} referensi foto Base64.`);
  if (dryRun || total === 0) {
    console.log(dryRun ? 'Mode pemeriksaan: tidak ada data yang diubah.' : 'Tidak ada foto yang perlu dimigrasikan.');
  } else {
    const storage = createMediaStorageFromEnv(process.env);
    if (!storage) {
      throw new Error(
        'SUPABASE_URL dan SUPABASE_SECRET_KEY wajib diisi sebelum migrasi foto.',
      );
    }
    let uploaded = 0;
    for (const { entity, count } of entityCounts) {
      if (count) uploaded += await saveEntity(storage, entity);
    }
    for (const { admin, count } of adminCounts) {
      if (count) uploaded += await saveAdminAvatar(storage, admin);
    }
    console.log(`Migrasi selesai. ${uploaded} objek WebP disimpan ke Supabase Storage.`);
  }
} finally {
  await closeDatabase();
}
