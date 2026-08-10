/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VillageProfile, StatisticCategory, News, GalleryItem, AdminProfile, PortalData } from '../types';

export const INITIAL_VILLAGE_PROFILE: VillageProfile = {
  administrationLevel: 'desa',
  headRole: 'Kepala Desa',
  officeLabel: 'Kantor Desa',
  contentLabel: 'Desa',
  name: 'Desa Tawalian Timur',
  subdistrict: 'Kecamatan Tawalian',
  regency: 'Kabupaten Mamasa',
  province: 'Sulawesi Barat',
  headName: 'H. Jajang Supriatna, S.IP.',
  headPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
  welcomeText: 'Selamat datang di Website Resmi Desa Tawalian Timur. Platform ini kami hadirkan sebagai media komunikasi utama, keterbukaan informasi publik, serta sarana pelayanan administrasi digital guna mewujudkan Tawalian Timur yang mandiri, sejahtera, dan berbasis teknologi informasi.',
  history: 'Desa Tawalian Timur tumbuh sebagai wilayah administratif yang kuat dalam kebersamaan warga, pelayanan publik, dan pengelolaan potensi lokal. Profil ini dapat diperbarui oleh operator ketika ada perubahan sejarah, program prioritas, maupun data kewilayahan.',
  vision: 'Mewujudkan Desa Tawalian Timur yang mandiri, transparan, responsif dalam pelayanan, dan berdaya saing melalui pembangunan yang berkelanjutan.',
  mission: [
    'Meningkatkan tata kelola pemerintahan desa yang bersih, transparan, dan responsif berbasis teknologi informasi.',
    'Mengembangkan sektor pertanian terpadu dan mendukung UMKM lokal agar terwujud kemandirian ekonomi warga.',
    'Meningkatkan sarana prasarana infrastruktur desa yang merata, aman, dan berwawasan lingkungan.',
    'Menyelenggarakan kegiatan keagamaan, peningkatan mutu pendidikan informal, dan pelestarian seni budaya sunda.',
    'Menjamin pelayanan kesehatan yang optimal, ramah, dan cepat tanggap bagi seluruh golongan warga.'
  ],
  organizationStructureUrl: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?q=80&w=800&auto=format&fit=crop', // Beautiful placeholder indicating structure / team
  address: 'Desa Tawalian Timur, Kecamatan Tawalian, Kabupaten Mamasa, Sulawesi Barat',
  phone: '0812-3456-7890',
  email: 'pemdes@tawaliantimur.desa.id',
  serviceHours: 'Senin–Jumat, 08.00–15.00 WITA',
  mapEmbedUrl: 'https://www.google.com/maps?q=Desa%20Tawalian%20Timur%2C%20Kecamatan%20Tawalian%2C%20Kabupaten%20Mamasa%2C%20Sulawesi%20Barat&output=embed',
  geographicData: {
    area: '425.8 Ha',
    northBoundary: 'Kelurahan Tawalian',
    eastBoundary: 'Desa Rantetangnga',
    southBoundary: 'Desa Kariango',
    westBoundary: 'Wilayah Kecamatan Tawalian'
  },
  staff: [
    {
      id: 'staff-1',
      name: 'Agus Setiawan, S.AP.',
      role: 'Sekretaris Desa',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 'staff-2',
      name: 'Rina Dahlia, S.E.',
      role: 'Kaur Keuangan',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 'staff-3',
      name: 'Wawan Nurjaman',
      role: 'Kasi Pemerintahan',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop'
    },
    {
      id: 'staff-4',
      name: 'Siti Aminah',
      role: 'Kaur Perencanaan',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop'
    }
  ]
};

export const INITIAL_STATISTICS: StatisticCategory[] = [
  {
    id: 'kependudukan',
    title: 'Kependudukan Berdasarkan Jenis Kelamin',
    description: 'Rincian jumlah warga penduduk Desa Tawalian Timur berdasarkan kategori jenis kelamin menurut data terbaru tahun ini.',
    type: 'pie',
    items: [
      { label: 'Laki-Laki', value: 1850 },
      { label: 'Perempuan', value: 1920 }
    ]
  },
  {
    id: 'pendidikan',
    title: 'Tingkat Pendidikan Penduduk',
    description: 'Profil kualifikasi pendidikan formal tertinggi yang ditempuh oleh warga Desa Tawalian Timur.',
    type: 'bar',
    items: [
      { label: 'Tidak/Belum Sekolah', value: 180 },
      { label: 'SD / Sederajat', value: 920 },
      { label: 'SMP / Sederajat', value: 1100 },
      { label: 'SMA / Sederajat', value: 1250 },
      { label: 'Diploma (D1-D4)', value: 180 },
      { label: 'Sarjana (S1)', value: 110 },
      { label: 'Pascasarjana (S2/S3)', value: 30 }
    ]
  },
  {
    id: 'pekerjaan',
    title: 'Mata Pencaharian Utama Warga',
    description: 'Tingkat persebaran pekerjaan utama warga produktif di wilayah Desa Tawalian Timur.',
    type: 'donut',
    items: [
      { label: 'Petani & Pekebun', value: 1150 },
      { label: 'Karyawan Swasta', value: 720 },
      { label: 'Pelaku UMKM / Dagang', value: 480 },
      { label: 'Buruh Harian Lepas', value: 410 },
      { label: 'Aparatur Negara (PNS/TNI/Polri)', value: 130 },
      { label: 'Ibu Rumah Tangga', value: 580 },
      { label: 'Belum / Tidak Bekerja', value: 300 }
    ]
  },
  {
    id: 'pertanian',
    title: 'Volume Hasil Pertanian & Perkebunan',
    description: 'Hasil produksi komoditas pangan utama Desa Tawalian Timur dalam satuan Ton per tahun (data kumulatif tahun terakhir).',
    type: 'line',
    items: [
      { label: 'Padi Gogo', value: 870 },
      { label: 'Jagung Hibrida', value: 540 },
      { label: 'Kopi Arabika', value: 120 },
      { label: 'Sayur-Mayur', value: 380 },
      { label: 'Cengkeh', value: 45 },
      { label: 'Gula Aren', value: 90 }
    ]
  }
];

export const INITIAL_NEWS: News[] = [
  {
    id: '1',
    title: 'Desa Tawalian Timur Perkuat Layanan Informasi Digital Tahun 2026',
    content: 'Pemerintah Desa Tawalian Timur memperkuat kanal informasi publik melalui portal digital yang memuat berita, data statistik, galeri kegiatan, profil wilayah, dan kontak pelayanan.\n\nDalam keterangannya, Kepala Desa Tawalian Timur menyampaikan bahwa keterbukaan informasi menjadi bagian penting dari pelayanan warga. Portal ini diharapkan memudahkan masyarakat memantau agenda, dokumentasi, serta perkembangan pembangunan wilayah.\n\nPenguatan informasi digital juga menjadi ruang kolaborasi antara aparatur, lembaga masyarakat, pemuda, pelaku UMKM, dan warga untuk mendukung pelayanan yang lebih responsif.',
    category: 'Pemerintahan',
    thumbnail: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop',
    status: 'Published',
    datePublished: '2026-06-01'
  },
  {
    id: '2',
    title: 'Rembug UMKM Tawalian: Strategi Menguatkan Produk Lokal',
    content: 'Kelompok pelaku UMKM dan aparatur wilayah menggelar sarasehan bertajuk "Rembug UMKM Tawalian". Acara ini menjadi ruang berbagi gagasan untuk memperkuat pemasaran, kemasan produk, dan pemanfaatan kanal digital.\n\nTujuan utama kegiatan ini adalah mengoptimalkan potensi usaha warga agar lebih mudah dikenal pasar lokal maupun luar daerah. Pemerintah wilayah mendorong pendampingan usaha, literasi digital, dan kolaborasi lintas kelompok masyarakat.\n\nProgram ini diharapkan mengangkat martabat produk lokal Tawalian sekaligus membuka peluang ekonomi baru bagi warga.',
    category: 'Ekonomi',
    thumbnail: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop',
    status: 'Published',
    datePublished: '2026-05-20'
  },
  {
    id: '3',
    title: 'Pelaksanaan Gotong Royong Pembangunan Drainase Utama Dusun Dua',
    content: 'Dalam rangka mengantisipasi datangnya siklus hujan lebat pertengahan tahun, warga Desa Tawalian Timur bahu-membahu menggelar gotong royong kerja bakti pada hari Minggu pagi.\n\nPekerjaan gotong royong difokuskan pada pembersihan dan perbaikan saluran air guna memperlancar laju air hujan. Hal ini penting guna meminimalkan risiko genangan yang kerap mengganggu akses warga.\n\nPenyediaan material dibantu melalui dukungan program lingkungan wilayah. Dengan semangat kebersamaan, seluruh warga bergantian membersihkan drainase dan titik rawan.',
    category: 'Infrastruktur',
    thumbnail: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop',
    status: 'Published',
    datePublished: '2026-05-15'
  },
  {
    id: '4',
    title: 'Rencana Pelatihan Desa: Kursus Bahasa Pemrograman Dasar untuk Pemuda Karang Taruna',
    content: 'Seksi pendidikan dan kepemudaan Desa Tawalian Timur akan merilis uji coba modul pelatihan digital dasar bagi pemuda. Program bertujuan memberi bekal kompetensi teknologi agar generasi muda wilayah dapat lebih siap menghadapi peluang kerja dan usaha digital.',
    category: 'Pendidikan',
    thumbnail: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop',
    status: 'Draft',
    datePublished: '2026-06-08'
  }
];

export const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'g1',
    url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=600&auto=format&fit=crop',
    title: 'Kegiatan Panen Raya Padi Organik Kelompok Tani',
    category: 'Kegiatan',
    dateAdded: '2026-05-10'
  },
  {
    id: 'g2',
    url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=600&auto=format&fit=crop',
    title: 'Festival Budaya Seni Tradisional Jaipongan',
    category: 'Budaya',
    dateAdded: '2026-04-28'
  },
  {
    id: 'g3',
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=600&auto=format&fit=crop',
    title: 'Pembangunan Akses Jalan Lingkungan Tawalian Timur',
    category: 'Pembangunan',
    dateAdded: '2026-05-02'
  },
  {
    id: 'g4',
    url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=600&auto=format&fit=crop',
    title: 'Pemeriksaan Kesehatan Berkala Ibu dan Anak di Posyandu Melati',
    category: 'Kegiatan',
    dateAdded: '2026-05-11'
  },
  {
    id: 'g5',
    url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop',
    title: 'Musyawarah Rencana Pembangunan Desa (Musrenbangdes)',
    category: 'Masyarakat',
    dateAdded: '2026-03-12'
  }
];

export const INITIAL_ADMIN_PROFILE: AdminProfile = {
  id: 'admin-kecamatan-tawalian',
  name: 'Admin Kecamatan Tawalian',
  username: 'admin',
  email: 'admin@tawalian.go.id',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
  role: 'super_admin',
  assignedEntityId: 'kecamatan-tawalian',
  assignedEntityLabel: 'Kecamatan Tawalian',
};

export const INITIAL_ADMIN_USERS: AdminProfile[] = [
  INITIAL_ADMIN_PROFILE,
  {
    id: 'admin-desa-tawalian-timur',
    name: 'Admin Desa Tawalian Timur',
    username: 'tawalian-timur',
    email: 'admin@tawaliantimur.desa.id',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
    role: 'admin',
    assignedEntityId: 'desa-tawalian-timur',
    assignedEntityLabel: 'Desa Tawalian Timur',
  },
  {
    id: 'admin-desa-kariango',
    name: 'Admin Desa Kariango',
    username: 'kariango',
    email: 'admin@kariango.desa.id',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop',
    role: 'admin',
    assignedEntityId: 'desa-kariango',
    assignedEntityLabel: 'Desa Kariango',
  },
  {
    id: 'admin-kelurahan-tawalian',
    name: 'Admin Kelurahan Tawalian',
    username: 'kelurahan-tawalian',
    email: 'admin@tawalian.kelurahan.id',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    role: 'admin',
    assignedEntityId: 'kelurahan-tawalian',
    assignedEntityLabel: 'Kelurahan Tawalian',
  },
  {
    id: 'admin-desa-rantetangnga',
    name: 'Admin Desa Rantetangnga',
    username: 'rantetangnga',
    email: 'admin@rantetangnga.desa.id',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    role: 'admin',
    assignedEntityId: 'desa-rantetangnga',
    assignedEntityLabel: 'Desa Rantetangnga',
  },
];

const cloneStatisticsForEntity = (
  entityName: string,
  factor: number,
  prefix: string,
): StatisticCategory[] =>
  INITIAL_STATISTICS.map((category) => ({
    ...category,
    id: `${prefix}-${category.id}`,
    description: category.description.replace(/Desa Tawalian Timur/g, entityName),
    items: category.items.map((item) => ({
      ...item,
      value: Math.max(1, Math.round(item.value * factor)),
    })),
  }));

const cloneNewsForEntity = (entityName: string, prefix: string, categorySuffix = ''): News[] =>
  INITIAL_NEWS.map((item) => ({
    ...item,
    id: `${prefix}-${item.id}`,
    title: item.title
      .replace(/Desa Tawalian Timur/g, entityName)
      .replace(/Tawalian Timur/g, entityName.replace(/^Desa\s|^Kecamatan\s|^Kelurahan\s/, '')),
    content: item.content
      .replace(/Desa Tawalian Timur/g, entityName)
      .replace(/Tawalian Timur/g, entityName.replace(/^Desa\s|^Kecamatan\s|^Kelurahan\s/, '')),
    category: `${item.category}${categorySuffix}`,
  }));

const cloneGalleryForEntity = (entityName: string, prefix: string): GalleryItem[] =>
  INITIAL_GALLERY.map((item) => ({
    ...item,
    id: `${prefix}-${item.id}`,
    title: item.title.replace(/Tawalian Timur/g, entityName.replace(/^Desa\s|^Kecamatan\s|^Kelurahan\s/, '')),
  }));

const createVillageProfile = (
  name: string,
  slug: string,
  headName: string,
  area: string,
  welcomeFocus: string,
  boundaries: VillageProfile['geographicData'],
): VillageProfile => {
  const isKelurahan = name.startsWith('Kelurahan');

  return {
    ...INITIAL_VILLAGE_PROFILE,
    administrationLevel: isKelurahan ? 'kelurahan' : 'desa',
    headRole: isKelurahan ? 'Lurah' : 'Kepala Desa',
    officeLabel: isKelurahan ? 'Kantor Kelurahan' : 'Kantor Desa',
    contentLabel: isKelurahan ? 'Kelurahan' : 'Desa',
    name,
    headName,
    welcomeText: `Selamat datang di Website Resmi ${name}. Kanal ini menyajikan berita, galeri, data statistik, profil wilayah, serta layanan informasi publik yang dapat berubah sesuai kebutuhan warga. ${welcomeFocus}`,
    history: `${name} merupakan wilayah administratif di Kecamatan Tawalian yang berkembang melalui kerja sama warga, aparatur, pelaku UMKM, kelompok tani, dan lembaga kemasyarakatan. Profil ini dapat diperbarui oleh operator ketika ada perubahan sejarah, program prioritas, maupun data kewilayahan.`,
    vision: `Mewujudkan ${name} yang terbuka, responsif, tertib administrasi, dan berdaya melalui pelayanan publik berbasis data.`,
    address: `${name}, Kecamatan Tawalian, Kabupaten Mamasa, Sulawesi Barat`,
    email: `admin@${slug}.${isKelurahan ? 'kelurahan' : 'desa'}.id`,
    phone: `0812-${slug.length}456-78${slug.length}`,
    mapEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(`${name}, Kecamatan Tawalian, Kabupaten Mamasa, Sulawesi Barat`)}&output=embed`,
    geographicData: {
      ...boundaries,
      area,
    },
  };
};

const kecamatanProfile: VillageProfile = {
  ...INITIAL_VILLAGE_PROFILE,
  administrationLevel: 'kecamatan',
  headRole: 'Camat',
  officeLabel: 'Kantor Kecamatan',
  contentLabel: 'Kecamatan',
  name: 'Kecamatan Tawalian',
  subdistrict: 'Kabupaten Mamasa',
  headName: 'Drs. Raka Wiratama, M.Si.',
  welcomeText: 'Selamat datang di Website Resmi Kecamatan Tawalian. Portal ini menjadi pintu utama untuk membaca berita, galeri, data statistik, profil wilayah, dan informasi pelayanan kecamatan maupun desa/kelurahan di wilayah Tawalian.',
  history: 'Kecamatan Tawalian menjadi simpul pelayanan publik lintas desa dan kelurahan dengan karakter wilayah permukiman, pertanian, UMKM, dan kelembagaan masyarakat yang terus berkembang. Informasi pada halaman ini dapat diperbarui oleh operator untuk menampilkan agenda, data, dan capaian tingkat kecamatan.',
  vision: 'Mewujudkan Kecamatan Tawalian yang kolaboratif, transparan, responsif, dan unggul dalam pelayanan publik berbasis data.',
  mission: [
    'Menguatkan koordinasi pelayanan administrasi antara kecamatan dan seluruh desa.',
    'Meningkatkan keterbukaan data pembangunan, kependudukan, sosial, ekonomi, dan wilayah.',
    'Mendorong transformasi digital layanan publik yang mudah diakses masyarakat.',
    'Memperkuat ketahanan ekonomi lokal melalui UMKM, pertanian, dan potensi wisata.',
  ],
  address: 'Kecamatan Tawalian, Kabupaten Mamasa, Sulawesi Barat',
  email: 'kecamatan@tawalian.go.id',
  phone: '022-589-2026',
  mapEmbedUrl: 'https://www.google.com/maps?q=Kecamatan%20Tawalian%2C%20Kabupaten%20Mamasa%2C%20Sulawesi%20Barat&output=embed',
  geographicData: {
    area: '5.420 Ha',
    northBoundary: 'Wilayah Kabupaten Mamasa bagian utara',
    eastBoundary: 'Wilayah perbukitan Mamasa',
    southBoundary: 'Desa Rantetangnga',
    westBoundary: 'Kelurahan Tawalian',
  },
  staff: [
    {
      id: 'kec-staff-1',
      name: 'Nia Kartika, S.STP.',
      role: 'Sekretaris Kecamatan',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop',
    },
    {
      id: 'kec-staff-2',
      name: 'Yusuf Hidayat, S.Sos.',
      role: 'Kasi Pemerintahan',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=200&auto=format&fit=crop',
    },
    {
      id: 'kec-staff-3',
      name: 'Dewi Lestari, S.E.',
      role: 'Kasi Pemberdayaan Masyarakat',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop',
    },
  ],
};

export const INITIAL_PORTAL_DATA: PortalData = {
  entities: [
    {
      id: 'kecamatan-tawalian',
      type: 'kecamatan',
      label: 'Kecamatan Tawalian',
      shortLabel: 'Kecamatan',
      content: {
        profile: kecamatanProfile,
        statistics: cloneStatisticsForEntity('Kecamatan Tawalian', 4.6, 'kec'),
        news: cloneNewsForEntity('Kecamatan Tawalian', 'kec', ' Kecamatan'),
        gallery: cloneGalleryForEntity('Kecamatan Tawalian', 'kec'),
      },
    },
    {
      id: 'desa-tawalian-timur',
      type: 'desa',
      label: 'Desa Tawalian Timur',
      shortLabel: 'Tawalian Timur',
      content: {
        profile: INITIAL_VILLAGE_PROFILE,
        statistics: INITIAL_STATISTICS,
        news: INITIAL_NEWS,
        gallery: INITIAL_GALLERY,
      },
    },
    {
      id: 'desa-kariango',
      type: 'desa',
      label: 'Desa Kariango',
      shortLabel: 'Kariango',
      content: {
        profile: createVillageProfile(
          'Desa Kariango',
          'kariango',
          'Ibu Tati Rohayati, S.AP.',
          '386.2 Ha',
          'Fokus utama desa adalah penguatan layanan keluarga, ketahanan pangan, dan pengembangan ekonomi kreatif.',
          {
            area: '386.2 Ha',
            northBoundary: 'Desa Tawalian Timur',
            eastBoundary: 'Desa Rantetangnga',
            southBoundary: 'Wilayah Kecamatan Tawalian bagian selatan',
            westBoundary: 'Kelurahan Tawalian',
          },
        ),
        statistics: cloneStatisticsForEntity('Desa Kariango', 0.78, 'kariango'),
        news: cloneNewsForEntity('Desa Kariango', 'kariango'),
        gallery: cloneGalleryForEntity('Desa Kariango', 'kariango'),
      },
    },
    {
      id: 'kelurahan-tawalian',
      type: 'kelurahan',
      label: 'Kelurahan Tawalian',
      shortLabel: 'Kelurahan',
      content: {
        profile: createVillageProfile(
          'Kelurahan Tawalian',
          'tawalian',
          'Bapak Asep Rahmat, S.IP.',
          '512.4 Ha',
          'Informasi kelurahan menonjolkan layanan publik, akses infrastruktur, dan kegiatan kelembagaan warga.',
          {
            area: '512.4 Ha',
            northBoundary: 'Wilayah pusat Kecamatan Tawalian',
            eastBoundary: 'Desa Tawalian Timur',
            southBoundary: 'Desa Kariango',
            westBoundary: 'Wilayah Kecamatan Tawalian bagian barat',
          },
        ),
        statistics: cloneStatisticsForEntity('Kelurahan Tawalian', 1.12, 'kel-tawalian'),
        news: cloneNewsForEntity('Kelurahan Tawalian', 'kel-tawalian'),
        gallery: cloneGalleryForEntity('Kelurahan Tawalian', 'kel-tawalian'),
      },
    },
    {
      id: 'desa-rantetangnga',
      type: 'desa',
      label: 'Desa Rantetangnga',
      shortLabel: 'Rantetangnga',
      content: {
        profile: createVillageProfile(
          'Desa Rantetangnga',
          'rantetangnga',
          'H. Dadan Mulyana, S.E.',
          '448.7 Ha',
          'Operator dapat menampilkan agenda budaya, capaian pembangunan, dan dokumentasi layanan masyarakat.',
          {
            area: '448.7 Ha',
            northBoundary: 'Wilayah perbukitan Kecamatan Tawalian',
            eastBoundary: 'Wilayah Kabupaten Mamasa bagian timur',
            southBoundary: 'Desa Kariango',
            westBoundary: 'Desa Tawalian Timur',
          },
        ),
        statistics: cloneStatisticsForEntity('Desa Rantetangnga', 0.92, 'rantetangnga'),
        news: cloneNewsForEntity('Desa Rantetangnga', 'rantetangnga'),
        gallery: cloneGalleryForEntity('Desa Rantetangnga', 'rantetangnga'),
      },
    },
  ],
};
