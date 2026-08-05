import 'dotenv/config';
import { INITIAL_ADMIN_USERS, INITIAL_PORTAL_DATA } from '../src/data/initialData.ts';
import { hashPassword } from './auth.mjs';
import { closeDatabase } from './database.mjs';
import { runMigrations } from './migrations.mjs';
import { configureNodeDatabase } from './node-database.mjs';
import { seedDatabase } from './repository.mjs';

const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || '';

if (initialPassword.length < 12 || initialPassword.includes('CHANGE_ME')) {
  throw new Error(
    'INITIAL_ADMIN_PASSWORD wajib diisi sendiri dengan minimal 12 karakter sebelum seed dijalankan.',
  );
}

try {
  await configureNodeDatabase();
  await runMigrations();
  const seeded = await seedDatabase(
    {
      portalData: INITIAL_PORTAL_DATA,
      admins: INITIAL_ADMIN_USERS.map((admin) => ({
        ...admin,
        password: initialPassword,
      })),
    },
    hashPassword,
  );
  console.log(
    seeded
      ? 'Data awal berhasil dimasukkan ke PostgreSQL.'
      : 'Seed dilewati karena database sudah memiliki data.',
  );
} finally {
  await closeDatabase();
}
