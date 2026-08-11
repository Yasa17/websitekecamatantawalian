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

test('tiket unggah video dibuat di bucket terpisah tanpa membocorkan secret', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = String(url);
    requestOptions = options;
    return Response.json({
      url: '/object/upload/sign/portal-videos/entities/desa-satu/news-videos/video.mp4?token=tiket-aman',
    });
  };
  try {
    const storage = createSupabaseMediaStorage({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_jangan-bocor',
      SUPABASE_VIDEO_BUCKET: 'portal-videos',
    });
    const ticket = await storage.createVideoUploadTicket({
      ownerType: 'entities',
      ownerId: 'desa-satu',
      collection: 'news-videos',
    });

    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers.apikey, 'sb_secret_jangan-bocor');
    assert.equal(requestOptions.headers.Authorization, undefined);
    assert.match(requestUrl, /\/object\/upload\/sign\/portal-videos\/entities\/desa-satu\/news-videos\//);
    assert.equal(ticket.bucket, 'portal-videos');
    assert.equal(ticket.token, 'tiket-aman');
    assert.match(ticket.path, /^entities\/desa-satu\/news-videos\/[^/]+\.mp4$/);
    assert.equal(
      ticket.publicUrl,
      `https://project.supabase.co/storage/v1/object/public/portal-videos/${ticket.path}`,
    );
    assert.equal(
      ticket.tusEndpoint,
      'https://project.storage.supabase.co/storage/v1/upload/resumable',
    );
    assert.equal(JSON.stringify(ticket).includes('sb_secret_jangan-bocor'), false);
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

test('video unggahan lama dibersihkan saat berita dihapus atau videonya diganti', async () => {
  const deletedVideos = [];
  const storage = {
    getObjectPath: () => null,
    ownsPath: () => false,
    deletePaths: async () => {},
    getVideoObjectPath: (url) => url.replace('https://video.test/', ''),
    ownsVideoPath: (path, owner) => path.startsWith(`${owner.ownerType}/${owner.ownerId}/`),
    deleteVideoPaths: async (paths) => deletedVideos.push(...paths),
  };
  await deleteRemovedEntityImages(
    storage,
    'desa-satu',
    {
      news: [{
        id: 'berita-1',
        videoProvider: 'upload',
        videoUrl: 'https://video.test/entities/desa-satu/news-videos/lama.mp4',
      }],
    },
    {
      news: [{
        id: 'berita-1',
        videoProvider: 'upload',
        videoUrl: 'https://video.test/entities/desa-satu/news-videos/baru.mp4',
      }],
    },
  );
  await deleteRemovedEntityImages(
    storage,
    'desa-satu',
    {
      news: [{
        id: 'berita-1',
        videoProvider: 'upload',
        videoUrl: 'https://video.test/entities/desa-satu/news-videos/baru.mp4',
      }],
    },
    { news: [] },
  );

  assert.deepEqual(deletedVideos, [
    'entities/desa-satu/news-videos/lama.mp4',
    'entities/desa-satu/news-videos/baru.mp4',
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
