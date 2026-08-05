import 'dotenv/config';
import { closeDatabase } from './database.mjs';
import { runMigrations } from './migrations.mjs';
import { configureNodeDatabase } from './node-database.mjs';

try {
  await configureNodeDatabase();
  await runMigrations();
  console.log('Migrasi PostgreSQL selesai.');
} finally {
  await closeDatabase();
}
