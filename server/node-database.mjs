import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { setDefaultDatabase } from './database.mjs';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');

const resolveConnectionString = () => {
  const template = process.env.DATABASE_URL?.trim();
  const password = process.env.DATABASE_PASSWORD;

  if (!template) {
    throw new Error(
      'DATABASE_URL belum diatur. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL Anda.',
    );
  }
  if (template.includes('[YOUR-PASSWORD]') && !password) {
    throw new Error(
      'DATABASE_PASSWORD belum diatur. Isi password database Supabase hanya di file .env.',
    );
  }

  return template.includes('[YOUR-PASSWORD]')
    ? template.replace('[YOUR-PASSWORD]', encodeURIComponent(password))
    : template;
};

export const configureNodeDatabase = async () => {
  const connectionString = resolveConnectionString();
  let Pool = pg.Pool;
  let poolOptions = {
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS || 30000),
  };

  if (process.env.NODE_ENV === 'test' && connectionString === 'pg-mem://test') {
    const { newDb } = await import('pg-mem');
    const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
    ({ Pool } = memoryDatabase.adapters.createPg());
    poolOptions = {};
  } else if (process.env.DATABASE_SSL === 'true') {
    const configuredCertificatePath = process.env.DATABASE_CA_CERT_PATH?.trim();
    const certificatePath = configuredCertificatePath
      ? path.resolve(projectDirectory, configuredCertificatePath)
      : path.join(serverDirectory, 'prod-ca-2021.crt');
    poolOptions.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: await readFile(certificatePath, 'utf8'),
    };
  }

  const database = new Pool(poolOptions);
  database.on('error', (error) => {
    console.error('Koneksi idle PostgreSQL bermasalah:', error.message);
  });
  return setDefaultDatabase(database);
};
