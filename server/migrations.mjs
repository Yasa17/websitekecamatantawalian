import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { databasePool } from './database.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(serverDirectory, 'migrations');

export const runMigrations = async () => {
  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();
  const client = await databasePool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const fileName of migrationFiles) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [fileName],
      );
      if (applied.rowCount) continue;

      const migrationSql = await readFile(path.join(migrationsDirectory, fileName), 'utf8');
      const sql = process.env.DATABASE_URL === 'pg-mem://test'
        ? migrationSql.replace(
            /-- pg-mem-ignore-start[\s\S]*?-- pg-mem-ignore-end/g,
            '',
          )
        : migrationSql;
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [fileName]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
  }
};
