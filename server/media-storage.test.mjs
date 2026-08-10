import assert from 'node:assert/strict';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import {
  deleteRemovedEntityImages,
  materializeEntityImages,
} from './media-service.mjs';
import {
  createMemoryMediaStorage,
  createSupabaseMediaStorage,
} from './media-storage.mjs';

const fakeWebPDataUrl = () => {
  const bytes = Buffer.alloc(1024);
  bytes.write('RIFF', 0, 'ascii');
  bytes.write('WEBP', 8, 'ascii');
  return `data:image/webp;base64,${bytes.toString('base64')}`;
};

test('foto Base64 dimaterialisasi menjadi URL Storage tanpa duplikasi sampul album', async () => {
  const storage = createMemoryMediaStorage();
  const dataUrl = fakeWebPDataUrl();
  const result = await materializeEntityImages(
    'desa-satu',
    {
      gallery: [{
        id: 'album-1',
        url: dataUrl,
        urls: [dataUrl],
        title: 'Album',
      }],
    },
    storage,
  );

  assert.equal(result.uploadedPaths.length, 1);
  assert.equal(result.updates.gallery[0].url, result.updates.gallery[0].urls[0]);
  assert.equal(storage.ownsUrl(result.updates.gallery[0].url), true);
  assert.equal(result.updates.gallery[0].url.startsWith('data:image/'), false);
});

test('thumbnail statistik Base64 disimpan pada collection statistics', async () => {
  const storage = createMemoryMediaStorage();
  const result = await materializeEntityImages(
    'desa-satu',
    {
      statistics: [{
        id: 'kependudukan',
        title: 'Kependudukan',
        thumbnail: fakeWebPDataUrl(),
        items: [],
      }],
    },
    storage,
  );

  assert.equal(result.uploadedPaths.length, 1);
  assert.match(
    result.uploadedPaths[0],
    /^entities\/desa-satu\/statistics\/[^/]+\.webp$/,
  );
  assert.equal(storage.ownsUrl(result.updates.statistics[0].thumbnail), true);
  assert.equal(
    result.updates.statistics[0].thumbnail.startsWith('data:image/'),
    false,
  );
});

test('foto Base64 ditolak ketika secret Storage belum dikonfigurasi', async () => {
  await assert.rejects(
    () => materializeEntityImages(
      'desa-satu',
      { news: [{ thumbnail: fakeWebPDataUrl() }] },
      null,
    ),
    (error) => error.status === 503,
  );
});

test('secret API key baru hanya dikirim melalui header apikey', async () => {
  const originalFetch = globalThis.fetch;
  let requestHeaders;
  globalThis.fetch = async (_url, options) => {
    requestHeaders = options.headers;
    return new Response('{}', { status: 200 });
  };
  try {
    const storage = createSupabaseMediaStorage({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
    });
    await storage.uploadDataUrl(fakeWebPDataUrl(), {
      ownerType: 'entities',
      ownerId: 'desa-satu',
      collection: 'news',
    });
    assert.equal(requestHeaders.apikey, 'sb_secret_test');
    assert.equal(requestHeaders.Authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('pembersihan media tidak dapat menghapus objek milik wilayah lain', async () => {
  const deleted = [];
  const storage = {
    getObjectPath: (url) => url.replace('https://storage.test/', ''),
    ownsPath: (path, owner) => path.startsWith(`${owner.ownerType}/${owner.ownerId}/`),
    deletePaths: async (paths) => deleted.push(...paths),
  };
  await deleteRemovedEntityImages(
    storage,
    'desa-satu',
    {
      news: [{ thumbnail: 'https://storage.test/entities/desa-dua/news/foto.webp' }],
    },
    { news: [] },
  );
  assert.deepEqual(deleted, []);
});

test('thumbnail statistik lama dibersihkan saat diganti lalu dataset dihapus', async () => {
  const deleted = [];
  const storage = {
    getObjectPath: (url) => url.replace('https://storage.test/', ''),
    ownsPath: (path, owner) => path.startsWith(`${owner.ownerType}/${owner.ownerId}/`),
    deletePaths: async (paths) => deleted.push(...paths),
  };
  await deleteRemovedEntityImages(
    storage,
    'desa-satu',
    {
      statistics: [{
        id: 'kependudukan',
        thumbnail: 'https://storage.test/entities/desa-satu/statistics/lama.webp',
      }],
    },
    {
      statistics: [{
        id: 'kependudukan',
        thumbnail: 'https://storage.test/entities/desa-satu/statistics/baru.webp',
      }],
    },
  );
  await deleteRemovedEntityImages(
    storage,
    'desa-satu',
    {
      statistics: [{
        id: 'kependudukan',
        thumbnail: 'https://storage.test/entities/desa-satu/statistics/baru.webp',
      }],
    },
    { statistics: [] },
  );

  assert.deepEqual(deleted, [
    'entities/desa-satu/statistics/lama.webp',
    'entities/desa-satu/statistics/baru.webp',
  ]);
});

test('upload yang sudah berhasil dibersihkan bila foto berikutnya gagal', async () => {
  const deleted = [];
  let uploadCount = 0;
  const storage = {
    uploadDataUrl: async () => {
      uploadCount += 1;
      if (uploadCount === 2) throw Object.assign(new Error('gagal'), { status: 502 });
      return { path: 'entities/desa-satu/news/pertama.webp', url: 'https://storage.test/pertama.webp' };
    },
    deletePaths: async (paths) => deleted.push(...paths),
  };
  await assert.rejects(() => materializeEntityImages(
    'desa-satu',
    {
      news: [
        { thumbnail: fakeWebPDataUrl() },
        { thumbnail: fakeWebPDataUrl().replace(/A(?=[^A]*$)/, 'B') },
      ],
    },
    storage,
  ));
  assert.deepEqual(deleted, ['entities/desa-satu/news/pertama.webp']);
});
