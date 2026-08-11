import { Buffer } from 'node:buffer';

const WEBP_DATA_URL = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/;
const DEFAULT_BUCKET = 'portal-media';
const DEFAULT_VIDEO_BUCKET = 'portal-videos';

export const MAX_NEWS_VIDEO_BYTES = 40 * 1024 * 1024;

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

const createStorageShape = ({
  baseUrl,
  bucket,
  videoBucket,
  tusEndpoint,
  upload,
  remove,
  createVideoTicket,
  removeVideos,
}) => {
  const publicPrefix = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
  const videoPublicPrefix = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(videoBucket)}/`;

  const getOwnerPrefix = ({ ownerType, ownerId }) =>
    `${safePathPart(ownerType, 'portal')}/${safePathPart(ownerId, 'unknown')}/`;

  const parsePublicPath = (url, prefix) => {
    if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
    const encodedPath = url.slice(prefix.length).split(/[?#]/, 1)[0];
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

  const getObjectPath = (url) => parsePublicPath(url, publicPrefix);
  const getVideoObjectPath = (url) => parsePublicPath(url, videoPublicPrefix);

  return {
    bucket,
    videoBucket,
    tusEndpoint,
    getObjectPath,
    getVideoObjectPath,
    getOwnerPrefix,
    ownsPath: (path, owner) =>
      typeof path === 'string' && path.startsWith(getOwnerPrefix(owner)),
    ownsUrl: (url) => Boolean(getObjectPath(url)),
    ownsVideoPath: (path, owner) =>
      typeof path === 'string' && path.startsWith(getOwnerPrefix(owner)),
    ownsVideoUrl: (url) => Boolean(getVideoObjectPath(url)),
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
    async createVideoUploadTicket({ ownerType, ownerId, collection = 'news-videos' }) {
      const path = [
        safePathPart(ownerType, 'entities'),
        safePathPart(ownerId, 'unknown'),
        safePathPart(collection, 'news-videos'),
        `${Date.now()}-${createObjectId()}.mp4`,
      ].join('/');
      const ticket = await createVideoTicket(path);
      return {
        ...ticket,
        bucket: videoBucket,
        path,
        publicUrl: `${videoPublicPrefix}${encodeObjectPath(path)}`,
        tusEndpoint,
      };
    },
    async deleteVideoPaths(paths) {
      const uniquePaths = [...new Set(paths.filter(Boolean))];
      if (uniquePaths.length) await removeVideos(uniquePaths);
    },
  };
};

const directStorageEndpoint = (supabaseUrl) => {
  try {
    const url = new URL(supabaseUrl);
    const match = /^([a-z0-9-]+)\.supabase\.co$/i.exec(url.hostname);
    if (match) {
      return `${url.protocol}//${match[1]}.storage.supabase.co/storage/v1/upload/resumable/sign`;
    }
  } catch {
    // URL sudah divalidasi oleh pemanggil sebelum fungsi ini digunakan.
  }
  return `${supabaseUrl}/storage/v1/upload/resumable/sign`;
};

export const createSupabaseMediaStorage = (environment = {}) => {
  const supabaseUrl = trimTrailingSlash(String(environment.SUPABASE_URL || '').trim());
  const secretKey = String(
    environment.SUPABASE_SECRET_KEY || environment.SUPABASE_SERVICE_ROLE_KEY || '',
  ).trim();
  const bucket = String(environment.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET).trim();
  const videoBucket = String(
    environment.SUPABASE_VIDEO_BUCKET || DEFAULT_VIDEO_BUCKET,
  ).trim();
  if (!supabaseUrl || !secretKey || !bucket || !videoBucket) return null;

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
    videoBucket,
    tusEndpoint: directStorageEndpoint(supabaseUrl),
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
    createVideoTicket: async (path) => {
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(videoBucket)}/${encodeObjectPath(path)}`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: '{}',
        },
      );
      if (!response.ok) throw await requestError(response, 'Pembuatan tiket unggah video');
      const data = await response.json().catch(() => ({}));
      const rawUrl = typeof data.url === 'string' ? data.url : '';
      const signedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
        ? rawUrl
        : `${supabaseUrl}/storage/v1${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
      let token = typeof data.token === 'string' ? data.token : '';
      try {
        token ||= new URL(signedUrl).searchParams.get('token') || '';
      } catch {
        token = '';
      }
      if (!rawUrl || !token) {
        throw Object.assign(new Error('Supabase Storage tidak mengembalikan tiket video yang valid.'), {
          status: 502,
        });
      }
      return { token, signedUrl, uploadUrl: signedUrl };
    },
    removeVideos: async (paths) => {
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/${encodeURIComponent(videoBucket)}`,
        {
          method: 'DELETE',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prefixes: paths }),
        },
      );
      if (!response.ok) throw await requestError(response, 'Penghapusan video lama');
    },
  });
};

export const createMemoryMediaStorage = () => {
  const files = new Map();
  const videoTickets = new Map();
  const deletedVideoPaths = [];
  const storage = createStorageShape({
    baseUrl: 'https://storage.example.test',
    bucket: DEFAULT_BUCKET,
    videoBucket: DEFAULT_VIDEO_BUCKET,
    tusEndpoint: 'https://storage.example.test/storage/v1/upload/resumable',
    upload: async (path, bytes) => files.set(path, bytes),
    remove: async (paths) => paths.forEach((path) => files.delete(path)),
    createVideoTicket: async (path) => {
      const token = `memory-ticket-${createObjectId()}`;
      const signedUrl = `https://storage.example.test/storage/v1/object/upload/sign/${DEFAULT_VIDEO_BUCKET}/${encodeObjectPath(path)}?token=${encodeURIComponent(token)}`;
      videoTickets.set(path, token);
      return { token, signedUrl, uploadUrl: signedUrl };
    },
    removeVideos: async (paths) => {
      deletedVideoPaths.push(...paths);
      paths.forEach((path) => videoTickets.delete(path));
    },
  });
  return Object.assign(storage, {
    hasVideoTicket: (path) => videoTickets.has(path),
    deletedVideoPaths,
  });
};

export const createMediaStorageFromEnv = (environment = process.env) =>
  environment.MEDIA_STORAGE_TEST_MODE === 'true'
    ? createMemoryMediaStorage()
    : createSupabaseMediaStorage(environment);

export const isWebPDataUrl = (value) => Boolean(parseWebPDataUrl(value));
