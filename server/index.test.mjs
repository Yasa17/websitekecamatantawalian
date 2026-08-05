import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 19000 + (process.pid % 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    DATABASE_URL: 'pg-mem://test',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const request = async (pathname, options = {}) => {
  const response = await fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json();
  return { response, body };
};

const waitUntilReady = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const { response } = await request('/api/health');
      if (response.ok) return;
    } catch {
      // Server masih mulai.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Server pengujian tidak berhasil dimulai.');
};

test.after(async () => {
  server.kill();
});

test('backend menyimpan data dan membatasi hak akses berdasarkan peran', async () => {
  await waitUntilReady();

  const statistics = [
    {
      id: 'kependudukan',
      title: 'Kependudukan',
      items: [{ id: 'penduduk', label: 'Jumlah Penduduk', value: 120 }],
    },
  ];
  const gallery = [
    {
      id: 'foto-1',
      url: 'https://images.example/foto-1.webp',
      title: 'Foto Awal',
      category: 'Kegiatan',
      dateAdded: '2026-07-29',
    },
  ];
  const content = { profile: {}, news: [], statistics, gallery };
  const bootstrap = await request('/api/bootstrap', {
    method: 'POST',
    body: JSON.stringify({
      initialData: {
        portalData: {
          entities: [
            {
              id: 'kecamatan-tawalian',
              type: 'kecamatan',
              label: 'Kecamatan Tawalian',
              content,
            },
            {
              id: 'desa-satu',
              type: 'desa',
              label: 'Desa Satu',
              content,
            },
          ],
        },
        admins: [
          {
            id: 'admin-kecamatan',
            name: 'Admin Kecamatan',
            username: 'admin',
            email: 'admin@example.test',
            password: 'admin',
            role: 'super_admin',
            assignedEntityId: 'kecamatan-tawalian',
          },
          {
            id: 'admin-desa',
            name: 'Admin Desa',
            username: 'desa',
            email: 'desa@example.test',
            password: 'admin',
            role: 'admin',
            assignedEntityId: 'desa-satu',
          },
        ],
      },
    }),
  });
  assert.equal(bootstrap.response.status, 201);

  const districtLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'admin' }),
  });
  assert.equal(districtLogin.response.status, 200);
  const districtHeaders = {
    Authorization: `Bearer ${districtLogin.body.token}`,
  };

  const summary = await request('/api/district/summary', {
    headers: districtHeaders,
  });
  assert.equal(summary.response.status, 200);
  assert.equal(summary.body.data.length, 1);
  assert.equal(summary.body.data[0].statistics[0].items[0].value, 120);

  const forbiddenWrite = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: districtHeaders,
    body: JSON.stringify({ updates: { statistics: [] } }),
  });
  assert.equal(forbiddenWrite.response.status, 403);

  const districtNewsWrite = await request('/api/entities/kecamatan-tawalian/content', {
    method: 'PATCH',
    headers: districtHeaders,
    body: JSON.stringify({
      updates: {
        news: [{
          id: 'berita-kecamatan',
          title: 'Kegiatan Kecamatan',
          thumbnail: 'https://images.example/berita-kecamatan.webp',
        }],
      },
    }),
  });
  assert.equal(districtNewsWrite.response.status, 200);

  const districtGalleryWrite = await request('/api/entities/kecamatan-tawalian/content', {
    method: 'PATCH',
    headers: districtHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{
          ...gallery[0],
          id: 'album-kecamatan',
          urls: [gallery[0].url],
        }],
      },
    }),
  });
  assert.equal(districtGalleryWrite.response.status, 200);

  const districtStatisticsWrite = await request('/api/entities/kecamatan-tawalian/content', {
    method: 'PATCH',
    headers: districtHeaders,
    body: JSON.stringify({ updates: { statistics: [] } }),
  });
  assert.equal(districtStatisticsWrite.response.status, 403);

  const villageLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'desa', password: 'admin' }),
  });
  const villageHeaders = {
    Authorization: `Bearer ${villageLogin.body.token}`,
  };
  const updatedStatistics = [
    {
      ...statistics[0],
      items: [{ id: 'penduduk', label: 'Jumlah Penduduk', value: 145 }],
    },
  ];
  const allowedWrite = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({ updates: { statistics: updatedStatistics } }),
  });
  assert.equal(allowedWrite.response.status, 200);

  const flexibleStatistics = [
    {
      id: 'penduduk-dusun',
      title: 'Penduduk per Dusun',
      description: 'Data penduduk dengan header bertingkat.',
      type: 'bar',
      items: [
        { id: 'row-1-pria', label: 'Dusun Satu — Gender / Pria', value: 62 },
        { id: 'row-1-wanita', label: 'Dusun Satu — Gender / Wanita', value: 58 },
      ],
      table: {
        columns: [
          {
            id: 'col-dusun',
            label: 'Dusun',
            kind: 'column',
            dataType: 'text',
          },
          {
            id: 'group-gender',
            label: 'Gender',
            kind: 'group',
            children: [
              {
                id: 'col-pria',
                label: 'Pria',
                kind: 'column',
                dataType: 'number',
              },
              {
                id: 'col-wanita',
                label: 'Wanita',
                kind: 'column',
                dataType: 'number',
              },
            ],
          },
        ],
        rows: [
          {
            id: 'row-1',
            values: {
              'col-dusun': 'Dusun Satu',
              'col-pria': 62,
              'col-wanita': 58,
            },
          },
        ],
      },
    },
  ];
  const flexibleWrite = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({ updates: { statistics: flexibleStatistics } }),
  });
  assert.equal(flexibleWrite.response.status, 200);
  assert.equal(
    flexibleWrite.body.data.statistics[0].table.rows[0].values['col-pria'],
    62,
  );

  const invalidFlexibleWrite = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        statistics: [
          {
            ...flexibleStatistics[0],
            table: {
              ...flexibleStatistics[0].table,
              rows: [
                {
                  id: 'row-invalid',
                  values: {
                    'col-dusun': 'Dusun Dua',
                    'col-pria': 'bukan angka',
                    'col-wanita': 70,
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  });
  assert.equal(invalidFlexibleWrite.response.status, 400);

  const emptyGallery = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({ updates: { gallery: [] } }),
  });
  assert.equal(emptyGallery.response.status, 200);

  const sixAlbums = Array.from({ length: 6 }, (_, index) => ({
    ...gallery[0],
    id: `album-${index + 1}`,
    url: `https://images.example/album-${index + 1}.webp`,
  }));
  const unlimitedAlbums = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({ updates: { gallery: sixAlbums } }),
  });
  assert.equal(unlimitedAlbums.response.status, 200);

  const albumWithoutPhoto = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: { gallery: [{ ...gallery[0], url: '', urls: [] }] },
    }),
  });
  assert.equal(albumWithoutPhoto.response.status, 400);

  const rawPhoto = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{ ...gallery[0], url: 'data:image/jpeg;base64,AAAA' }],
      },
    }),
  });
  assert.equal(rawPhoto.response.status, 400);

  const webpData = `data:image/webp;base64,${Buffer.alloc(220 * 1024).toString('base64')}`;
  const sixPhotos = Array.from({ length: 6 }, () => webpData);
  const albumWithTooManyPhotos = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{ ...gallery[0], url: webpData, urls: sixPhotos }],
      },
    }),
  });
  assert.equal(albumWithTooManyPhotos.response.status, 400);

  const smallWebpData = `data:image/webp;base64,${Buffer.alloc(1024).toString('base64')}`;
  const smallConvertedPhoto = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{
          ...gallery[0],
          url: smallWebpData,
          urls: [smallWebpData],
        }],
      },
    }),
  });
  assert.equal(smallConvertedPhoto.response.status, 200);

  const otherSmallImageUploads = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        profile: {
          headPhotoUrl: smallWebpData,
          organizationStructureUrl: smallWebpData,
          staff: [{ photoUrl: smallWebpData }],
        },
        news: [{
          id: 'berita-desa',
          title: 'Berita Desa',
          thumbnail: smallWebpData,
        }],
      },
    }),
  });
  assert.equal(otherSmallImageUploads.response.status, 200);

  const smallAvatarUpload = await request('/api/admin/profile', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({ fields: { avatarUrl: smallWebpData } }),
  });
  assert.equal(smallAvatarUpload.response.status, 200);

  const oversizedWebpData = `data:image/webp;base64,${Buffer.alloc(501 * 1024).toString('base64')}`;
  const oversizedPhoto = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{
          ...gallery[0],
          url: oversizedWebpData,
          urls: [oversizedWebpData],
        }],
      },
    }),
  });
  assert.equal(oversizedPhoto.response.status, 400);

  const convertedPhoto = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        gallery: [{ ...gallery[0], url: webpData, urls: [webpData] }],
      },
    }),
  });
  assert.equal(convertedPhoto.response.status, 200);
});
