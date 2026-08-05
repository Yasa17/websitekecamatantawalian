import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.mjs';
import { closeDatabase } from './database.mjs';
import { runMigrations } from './migrations.mjs';
import { configureNodeDatabase } from './node-database.mjs';
import { seedDatabase } from './repository.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const legacyFile = process.env.LEGACY_DATA_FILE
  ? path.resolve(process.env.LEGACY_DATA_FILE)
  : path.join(serverDirectory, 'data', 'database.json');

try {
  const legacyDatabase = JSON.parse(await readFile(legacyFile, 'utf8'));
  if (!legacyDatabase?.portalData?.entities?.length || !legacyDatabase?.admins?.length) {
    throw new Error('Berkas JSON lama tidak memiliki portalData/admins yang lengkap.');
  }

  await configureNodeDatabase();
  await runMigrations();
  const imported = await seedDatabase(legacyDatabase, hashPassword);
  console.log(
    imported
      ? 'Data database.json berhasil diimpor ke PostgreSQL.'
      : 'Impor dilewati karena PostgreSQL sudah memiliki data.',
  );
} finally {
  await closeDatabase();
}
