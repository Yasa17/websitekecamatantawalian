import { Buffer } from 'node:buffer';

const WEBP_DATA_URL = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/;
const DEFAULT_BUCKET = 'portal-media';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const safePathPart = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const encodeObjectPath = (path) =>
  path.split('/').map((part) => encodeURIComponent(part)).join('/');

const createObjectId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseWebPDataUrl = (dataUrl) => {
  const match = typeof dataUrl === 'string' ? WEBP_DATA_URL.exec(dataUrl) : null;
  if (!match) return null;
  const bytes = Buffer.from(match[1], 'base64');
  if (
    bytes.length < 12 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) return null;
  return bytes;
};

const createStorageShape = ({ baseUrl, bucket, upload, remove }) => {
  const publicPrefix = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/`;

  const getOwnerPrefix = ({ ownerType, ownerId }) =>
    `${safePathPart(ownerType, 'portal')}/${safePathPart(ownerId, 'unknown')}/`;

  const getObjectPath = (url) => {
    if (typeof url !== 'string' || !url.startsWith(publicPrefix)) return null;
    const encodedPath = url.slice(publicPrefix.length).split(/[?#]/, 1)[0];
    if (!encodedPath) return null;
    try {
      const parts = encodedPath
        .split('/')
        .map((part) => decodeURIComponent(part));
      if (parts.some((part) => !part || part === '.' || part === '..' || /[\\/]/.test(part))) {
        return null;
      }
      return parts.join('/');
    } catch {
      return null;
    }
  };

  return {
    bucket,
    getObjectPath,
    getOwnerPrefix,
    ownsPath: (path, owner) =>
      typeof path === 'string' && path.startsWith(getOwnerPrefix(owner)),
    ownsUrl: (url) => Boolean(getObjectPath(url)),
    async uploadDataUrl(dataUrl, { ownerType, ownerId, collection }) {
      const bytes = parseWebPDataUrl(dataUrl);
      if (!bytes?.length) {
        throw Object.assign(new Error('Foto yang akan disimpan bukan WebP yang valid.'), {
          status: 400,
        });
      }
      const path = [
        safePathPart(ownerType, 'portal'),
        safePathPart(ownerId, 'unknown'),
        safePathPart(collection, 'images'),
        `${Date.now()}-${createObjectId()}.webp`,
      ].join('/');
      await upload(path, bytes);
      return {
        path,
        url: `${publicPrefix}${encodeObjectPath(path)}`,
      };
    },
    async deletePaths(paths) {
      const uniquePaths = [...new Set(paths.filter(Boolean))];
      if (uniquePaths.length) await remove(uniquePaths);
    },
  };
};

export const createSupabaseMediaStorage = (environment = {}) => {
  const supabaseUrl = trimTrailingSlash(String(environment.SUPABASE_URL || '').trim());
  const secretKey = String(
    environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY || '',
  ).trim();
  const bucket = String(environment.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();
  if (!supabaseUrl || !secretKey || !bucket) return null;

  const headers = { apikey: secretKey };
  if (!secretKey.startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${secretKey}`;
  }

  const requestError = async (response, action) => {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    console.error(
      `${action} gagal di Supabase Storage (${response.status})${detail ? `: ${detail}` : '.'}`,
    );
    const error = new Error(`${action} belum berhasil. Periksa konfigurasi Supabase Storage.`);
    error.status = response.status === 404 ? 503 : 502;
    return error;
  };

  return createStorageShape({
    baseUrl: supabaseUrl,
    bucket,
    upload: async (path, bytes) => {
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'image/webp',
            'Cache-Control': 'max-age=31536000',
            'x-upsert': 'false',
          },
          body: bytes,
        },
      );
      if (!response.ok) throw await requestError(response, 'Unggah foto');
    },
    remove: async (paths) => {
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`,
        {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: paths }),
        },
      );
      if (!response.ok) throw await requestError(response, 'Penghapusan foto lama');
    },
  });
};

export const createMemoryMediaStorage = () => {
  const files = new Map();
  return createStorageShape({
    baseUrl: 'https://storage.example.test',
    bucket: DEFAULT_BUCKET,
    upload: async (path, bytes) => files.set(path, bytes),
    remove: async (paths) => paths.forEach((path) => files.delete(path)),
  });
};

export const createMediaStorageFromEnv = (environment = process.env) =>
  environment.MEDIA_STORAGE_TEST_MODE === 'true'
    ? createMemoryMediaStorage()
    : createSupabaseMediaStorage(environment);

export const isWebPDataUrl = (value) => Boolean(parseWebPDataUrl(value));
