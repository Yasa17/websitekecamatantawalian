import { Client } from 'pg';
import { dispatchApiRequest } from '../../server/api-handler.mjs';
import { withDatabaseClient } from '../../server/database.mjs';
import { createSupabaseMediaStorage } from '../../server/media-storage.mjs';

const maxJsonBodyBytes = 10 * 1024 * 1024;

const jsonResponse = (body, status = 200, method = 'GET') => new Response(
  method === 'HEAD' ? null : JSON.stringify(body),
  {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  },
);

const requestUsesJson = (request) => {
  const contentType = request.headers.get('content-type') || '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  return mediaType === 'application/json' || mediaType.endsWith('+json');
};

const readJsonBody = async (request) => {
  if (!['POST', 'PATCH', 'PUT'].includes(request.method) || !requestUsesJson(request)) {
    return {};
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxJsonBodyBytes) {
    throw Object.assign(new Error('Ukuran data request maksimal 10 MB.'), { status: 413 });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxJsonBodyBytes) {
    throw Object.assign(new Error('Ukuran data request maksimal 10 MB.'), { status: 413 });
  }
  if (!text.trim()) return {};

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Isi JSON request tidak valid.'), { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    throw Object.assign(new Error('Isi JSON request harus berupa objek atau daftar.'), {
      status: 400,
    });
  }
  return body;
};

export const onRequest = async (context) => {
  let body;
  try {
    body = await readJsonBody(context.request);
  } catch (error) {
    return jsonResponse(
      { error: error.message || 'Isi request tidak valid.' },
      error.status || 400,
      context.request.method,
    );
  }

  const connectionString = context.env.HYPERDRIVE?.connectionString;
  if (!connectionString) {
    console.error('Binding HYPERDRIVE tidak tersedia untuk Pages Function.');
    return jsonResponse(
      { error: 'Koneksi database untuk website belum tersedia.' },
      500,
      context.request.method,
    );
  }

  const client = new Client({ connectionString });
  const mediaStorage = createSupabaseMediaStorage(context.env);
  try {
    await client.connect();
    const result = await withDatabaseClient(client, () => dispatchApiRequest({
      method: context.request.method,
      pathname: new URL(context.request.url).pathname,
      authorization: context.request.headers.get('authorization') || '',
      body,
      allowBootstrap: false,
      mediaStorage,
    }));
    return jsonResponse(result.body, result.status, context.request.method);
  } catch (error) {
    console.error('Pages Function gagal mengakses database:', error?.message || error);
    return jsonResponse(
      { error: 'Terjadi kesalahan saat mengakses database website.' },
      500,
      context.request.method,
    );
  }
  // Hyperdrive membersihkan koneksi sisi Worker otomatis saat invocation selesai.
};
