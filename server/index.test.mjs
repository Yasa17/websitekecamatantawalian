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
    MEDIA_STORAGE_TEST_MODE: 'true',
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

const fakeWebPDataUrl = (size) => {
  const bytes = Buffer.alloc(size);
  bytes.write('RIFF', 0, 'ascii');
  bytes.write('WEBP', 8, 'ascii');
  return `data:image/webp;base64,${bytes.toString('base64')}`;
};

const waitUntilReady = async () => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
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
  const visibilityNews = [
    {
      id: 'berita-rilis',
      title: 'Berita Sudah Rilis',
      content: 'Berita ini dapat dibaca oleh masyarakat.',
      category: 'Pemerintahan',
      thumbnail: 'https://images.example/berita-rilis.webp',
      status: 'Published',
      datePublished: '2020-01-01',
    },
    {
      id: 'berita-draft',
      title: 'Berita Draft',
      content: 'Berita ini hanya boleh dilihat admin wilayahnya.',
      category: 'Pemerintahan',
      thumbnail: 'https://images.example/berita-draft.webp',
      status: 'Draft',
      datePublished: '2020-01-01',
    },
    {
      id: 'berita-masa-depan',
      title: 'Berita Terjadwal',
      content: 'Berita ini belum boleh tampil kepada masyarakat.',
      category: 'Pemerintahan',
      thumbnail: 'https://images.example/berita-masa-depan.webp',
      status: 'Published',
      datePublished: '9999-12-31',
    },
    {
      id: 'berita-legacy',
      title: 'Berita Legacy',
      content: 'Berita lama tanpa tanggal ISO tetap ditampilkan.',
      category: 'Pemerintahan',
      thumbnail: 'https://images.example/berita-legacy.webp',
      status: 'Published',
      datePublished: 'tanggal-belum-tercatat',
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
  const content = { profile: {}, news: visibilityNews, statistics, gallery };
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

  const publicPortal = await request('/api/portal');
  assert.equal(publicPortal.response.status, 200);
  for (const entity of publicPortal.body.data.entities) {
    assert.deepEqual(
      entity.content.news.map((article) => article.id),
      ['berita-rilis', 'berita-legacy'],
    );
  }

  const districtLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail: 'admin', password: 'admin' }),
  });
  assert.equal(districtLogin.response.status, 200);
  const districtHeaders = {
    Authorization: `Bearer ${districtLogin.body.token}`,
  };

  const districtPortal = await request('/api/portal', {
    headers: districtHeaders,
  });
  assert.equal(districtPortal.response.status, 200);
  const assignedDistrict = districtPortal.body.data.entities.find(
    (entity) => entity.id === 'kecamatan-tawalian',
  );
  const otherVillage = districtPortal.body.data.entities.find(
    (entity) => entity.id === 'desa-satu',
  );
  assert.deepEqual(
    assignedDistrict.content.news.map((article) => article.id),
    visibilityNews.map((article) => article.id),
  );
  assert.deepEqual(
    otherVillage.content.news.map((article) => article.id),
    ['berita-rilis', 'berita-legacy'],
  );

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
          content: 'Kegiatan pelayanan dan pembangunan Kecamatan Tawalian.',
          category: 'Pemerintahan',
          thumbnail: 'https://images.example/berita-kecamatan.webp',
          status: 'Published',
          datePublished: '2026-08-10',
        }],
      },
    }),
  });
  assert.equal(districtNewsWrite.response.status, 200);

  const invalidNewsDate = await request('/api/entities/kecamatan-tawalian/content', {
    method: 'PATCH',
    headers: districtHeaders,
    body: JSON.stringify({
      updates: {
        news: [{
          id: 'berita-tanggal-invalid',
          title: 'Berita dengan Tanggal Tidak Valid',
          content: 'Isi berita tetap valid agar pengujian berfokus pada tanggal rilis.',
          category: 'Pemerintahan',
          thumbnail: 'https://images.example/berita-tanggal-invalid.webp',
          status: 'Published',
          datePublished: '2026-02-30',
        }],
      },
    }),
  });
  assert.equal(invalidNewsDate.response.status, 400);

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

  const contactUpdate = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        profile: {
          address: 'Kantor Desa Satu',
          phone: '0812-0000-0000',
          email: 'layanan@desa-satu.example',
          serviceHours: 'Senin–Jumat, 08.00–15.00 WITA',
          mapEmbedUrl: 'https://www.google.com/maps?q=Desa+Satu&output=embed',
        },
      },
    }),
  });
  assert.equal(contactUpdate.response.status, 200);
  assert.equal(contactUpdate.body.data.profile.address, 'Kantor Desa Satu');

  const invalidMapUpdate = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: { profile: { mapEmbedUrl: 'javascript:alert(1)' } },
    }),
  });
  assert.equal(invalidMapUpdate.response.status, 400);

  const invalidSubmission = await request('/api/citizen-submissions', {
    method: 'POST',
    body: JSON.stringify({
      entityId: 'desa-satu',
      kind: 'aduan',
      name: 'A',
      email: 'bukan-email',
      category: 'Lainnya',
      message: 'pendek',
    }),
  });
  assert.equal(invalidSubmission.response.status, 400);

  const citizenSubmission = await request('/api/citizen-submissions', {
    method: 'POST',
    body: JSON.stringify({
      entityId: 'desa-satu',
      kind: 'aduan',
      name: 'Warga Desa',
      email: 'warga@example.test',
      phone: '0812-3456-7890',
      category: 'Pengaduan Kerusakan Infrastruktur',
      message: 'Jalan di dekat kantor desa mengalami kerusakan cukup berat.',
      website: '',
    }),
  });
  assert.equal(citizenSubmission.response.status, 201);
  assert.ok(citizenSubmission.body.referenceId);

  const publicPortalAfterSubmission = await request('/api/portal');
  assert.equal(publicPortalAfterSubmission.response.status, 200);
  assert.equal(
    JSON.stringify(publicPortalAfterSubmission.body).includes('warga@example.test'),
    false,
  );

  const anonymousInbox = await request('/api/admin/citizen-submissions');
  assert.equal(anonymousInbox.response.status, 401);

  const villageInbox = await request('/api/admin/citizen-submissions', {
    headers: villageHeaders,
  });
  assert.equal(villageInbox.response.status, 200);
  assert.equal(villageInbox.body.data.length, 1);
  assert.equal(villageInbox.body.data[0].email, 'warga@example.test');

  const districtInbox = await request('/api/admin/citizen-submissions', {
    headers: districtHeaders,
  });
  assert.equal(districtInbox.response.status, 200);
  assert.equal(districtInbox.body.data.length, 0);

  const updateSubmissionStatus = await request(
    `/api/admin/citizen-submissions/${citizenSubmission.body.referenceId}/status`,
    {
      method: 'PATCH',
      headers: villageHeaders,
      body: JSON.stringify({ status: 'in_progress' }),
    },
  );
  assert.equal(updateSubmissionStatus.response.status, 200);
  assert.equal(updateSubmissionStatus.body.data.status, 'in_progress');

  const otherAdminCannotUpdateSubmission = await request(
    `/api/admin/citizen-submissions/${citizenSubmission.body.referenceId}/status`,
    {
      method: 'PATCH',
      headers: districtHeaders,
      body: JSON.stringify({ status: 'resolved' }),
    },
  );
  assert.equal(otherAdminCannotUpdateSubmission.response.status, 404);

  const repeatedSubmissionBody = {
    entityId: 'desa-satu',
    kind: 'aspirasi',
    name: 'Warga Desa',
    email: 'warga@example.test',
    category: 'Lainnya',
    message: 'Kiriman lanjutan untuk menguji batas pengiriman formulir warga.',
  };
  for (let index = 0; index < 2; index += 1) {
    const allowedRepeat = await request('/api/citizen-submissions', {
      method: 'POST',
      body: JSON.stringify(repeatedSubmissionBody),
    });
    assert.equal(allowedRepeat.response.status, 201);
  }
  const rateLimitedSubmission = await request('/api/citizen-submissions', {
    method: 'POST',
    body: JSON.stringify(repeatedSubmissionBody),
  });
  assert.equal(rateLimitedSubmission.response.status, 429);

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

  const webpData = fakeWebPDataUrl(220 * 1024);
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

  const smallWebpData = fakeWebPDataUrl(1024);
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
  assert.match(
    smallConvertedPhoto.body.data.gallery[0].url,
    /^https:\/\/storage\.example\.test\/storage\/v1\/object\/public\/portal-media\//,
  );
  assert.equal(
    smallConvertedPhoto.body.data.gallery[0].url.startsWith('data:image/'),
    false,
  );

  const statisticMetadataWrite = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        statistics: [{
          id: 'kependudukan-thumbnail',
          title: 'Kependudukan dengan Thumbnail',
          description: 'Dataset pengujian metadata kategori dan thumbnail.',
          dataCategory: 'demografi',
          type: 'bar',
          thumbnail: smallWebpData,
          items: [{ id: 'penduduk', label: 'Jumlah Penduduk', value: 145 }],
        }],
      },
    }),
  });
  assert.equal(statisticMetadataWrite.response.status, 200);
  assert.equal(
    statisticMetadataWrite.body.data.statistics[0].dataCategory,
    'demografi',
  );
  assert.match(
    statisticMetadataWrite.body.data.statistics[0].thumbnail,
    /^https:\/\/storage\.example\.test\/storage\/v1\/object\/public\/portal-media\//,
  );

  const invalidStatisticDataCategory = await request('/api/entities/desa-satu/content', {
    method: 'PATCH',
    headers: villageHeaders,
    body: JSON.stringify({
      updates: {
        statistics: [{
          ...statisticMetadataWrite.body.data.statistics[0],
          dataCategory: 'kategori-tidak-valid',
        }],
      },
    }),
  });
  assert.equal(invalidStatisticDataCategory.response.status, 400);

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
          content: 'Informasi terbaru kegiatan pelayanan di Desa Satu.',
          category: 'Pemerintahan',
          thumbnail: smallWebpData,
          status: 'Draft',
          datePublished: '',
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

  const oversizedWebpData = fakeWebPDataUrl(501 * 1024);
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
