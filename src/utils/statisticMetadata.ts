import type { StatisticCategory, StatisticDataCategory } from '../types';

export interface StatisticDataCategoryOption {
  value: StatisticDataCategory;
  label: string;
  source: string;
  focus: string;
  defaultThumbnail: string;
}

export interface StatisticThumbnailOption {
  value: string;
  label: string;
}

export interface ResolvedStatisticMetadata {
  dataCategory: StatisticDataCategory;
  category: string;
  thumbnail: string;
  image: string;
  source: string;
  focus: string;
}

const COMMUNITY_THUMBNAIL =
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop';
const EDUCATION_THUMBNAIL =
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop';
const ECONOMY_THUMBNAIL =
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop';
const AGRICULTURE_THUMBNAIL =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop';
const REGION_THUMBNAIL =
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=800&auto=format&fit=crop';

export const DEFAULT_STATISTIC_DATA_CATEGORY: StatisticDataCategory = 'lainnya';
export const DEFAULT_STATISTIC_THUMBNAIL = REGION_THUMBNAIL;

/**
 * Daftar ini menjadi allowlist kategori yang dapat disimpan oleh formulir admin.
 * Label sengaja menggunakan bahasa Indonesia agar dapat langsung dipakai di UI.
 */
export const STATISTIC_DATA_CATEGORY_OPTIONS: readonly StatisticDataCategoryOption[] = [
  {
    value: 'demografi',
    label: 'Demografi',
    source: 'Basis Data Kependudukan',
    focus: 'Komposisi warga dan rasio penduduk',
    defaultThumbnail: COMMUNITY_THUMBNAIL,
  },
  {
    value: 'pendidikan',
    label: 'Pendidikan',
    source: 'Pendataan Profil Keluarga',
    focus: 'Jenjang pendidikan formal warga',
    defaultThumbnail: EDUCATION_THUMBNAIL,
  },
  {
    value: 'ekonomi',
    label: 'Ekonomi',
    source: 'Rekap Mata Pencaharian',
    focus: 'Sebaran pekerjaan dan aktivitas produktif',
    defaultThumbnail: ECONOMY_THUMBNAIL,
  },
  {
    value: 'pertanian',
    label: 'Pertanian',
    source: 'Laporan Produksi Wilayah',
    focus: 'Volume hasil pangan, peternakan, dan perkebunan',
    defaultThumbnail: AGRICULTURE_THUMBNAIL,
  },
  {
    value: 'kesehatan',
    label: 'Kesehatan',
    source: 'Pendataan Layanan Kesehatan',
    focus: 'Kondisi kesehatan dan cakupan layanan warga',
    defaultThumbnail: COMMUNITY_THUMBNAIL,
  },
  {
    value: 'infrastruktur',
    label: 'Infrastruktur',
    source: 'Pendataan Infrastruktur Wilayah',
    focus: 'Kondisi sarana, prasarana, dan akses dasar',
    defaultThumbnail: REGION_THUMBNAIL,
  },
  {
    value: 'sosial-budaya',
    label: 'Sosial & Budaya',
    source: 'Pendataan Sosial dan Budaya',
    focus: 'Kondisi sosial, kelembagaan, dan kebudayaan warga',
    defaultThumbnail: COMMUNITY_THUMBNAIL,
  },
  {
    value: 'pemerintahan',
    label: 'Pemerintahan',
    source: 'Administrasi Pemerintahan Wilayah',
    focus: 'Pelayanan dan tata kelola pemerintahan wilayah',
    defaultThumbnail: REGION_THUMBNAIL,
  },
  {
    value: 'lainnya',
    label: 'Lainnya',
    source: 'Open Data Wilayah',
    focus: 'Ringkasan indikator statistik wilayah',
    defaultThumbnail: REGION_THUMBNAIL,
  },
] as const;

/** Thumbnail bawaan yang dipakai sebagai fallback untuk data lama. */
export const STATISTIC_THUMBNAIL_OPTIONS: readonly StatisticThumbnailOption[] = [
  { value: COMMUNITY_THUMBNAIL, label: 'Masyarakat' },
  { value: EDUCATION_THUMBNAIL, label: 'Pendidikan' },
  { value: ECONOMY_THUMBNAIL, label: 'Ekonomi' },
  { value: AGRICULTURE_THUMBNAIL, label: 'Pertanian' },
  { value: REGION_THUMBNAIL, label: 'Wilayah' },
] as const;

const categoryMetadata = new Map(
  STATISTIC_DATA_CATEGORY_OPTIONS.map((option) => [option.value, option]),
);
const allowedThumbnails = new Set(
  STATISTIC_THUMBNAIL_OPTIONS.map((option) => option.value),
);

export const isStatisticDataCategory = (
  value: unknown,
): value is StatisticDataCategory =>
  typeof value === 'string' && categoryMetadata.has(value as StatisticDataCategory);

const WEBP_DATA_URL_PATTERN =
  /^data:image\/webp;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const isHttpsThumbnailUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
};

/**
 * Thumbnail tersimpan dapat berupa URL HTTPS Supabase Storage (atau URL HTTPS
 * lama), sedangkan formulir memakai data URL WebP hanya sampai backend selesai
 * memindahkannya ke Storage. Skema lain ditolak sebelum dipakai pada elemen
 * gambar maupun CSS `background-image`.
 */
export const isAllowedStatisticThumbnail = (value: unknown): value is string =>
  typeof value === 'string' && (
    allowedThumbnails.has(value) ||
    isHttpsThumbnailUrl(value) ||
    WEBP_DATA_URL_PATTERN.test(value)
  );

const legacyCategoryPatterns: ReadonlyArray<{
  value: StatisticDataCategory;
  pattern: RegExp;
}> = [
  { value: 'demografi', pattern: /(kependudukan|penduduk|demografi)/i },
  { value: 'pendidikan', pattern: /(pendidikan|sekolah|literasi)/i },
  { value: 'ekonomi', pattern: /(pekerjaan|ekonomi|penghasilan|umkm|usaha)/i },
  { value: 'pertanian', pattern: /(pertanian|perkebunan|peternakan|perikanan|pangan)/i },
  { value: 'kesehatan', pattern: /(kesehatan|stunting|posyandu|imunisasi)/i },
  { value: 'infrastruktur', pattern: /(infrastruktur|jalan|jembatan|sanitasi)/i },
  { value: 'sosial-budaya', pattern: /(sosial|budaya|agama|bansos)/i },
  { value: 'pemerintahan', pattern: /(pemerintahan|aparatur|pelayanan|anggaran)/i },
];

export const inferLegacyStatisticDataCategory = (
  category: Pick<StatisticCategory, 'id' | 'title'>,
): StatisticDataCategory => {
  const searchable = `${category.id} ${category.title}`;
  return legacyCategoryPatterns.find(({ pattern }) => pattern.test(searchable))?.value
    || DEFAULT_STATISTIC_DATA_CATEGORY;
};

export const resolveStatisticMetadata = (
  category: Pick<
    StatisticCategory,
    'id' | 'title' | 'dataCategory' | 'thumbnail'
  >,
): ResolvedStatisticMetadata => {
  const dataCategory = isStatisticDataCategory(category.dataCategory)
    ? category.dataCategory
    : inferLegacyStatisticDataCategory(category);
  const metadata = categoryMetadata.get(dataCategory)
    || categoryMetadata.get(DEFAULT_STATISTIC_DATA_CATEGORY)!;
  const thumbnail = isAllowedStatisticThumbnail(category.thumbnail)
    ? category.thumbnail
    : metadata.defaultThumbnail;

  return {
    dataCategory,
    category: metadata.label,
    thumbnail,
    image: thumbnail,
    source: metadata.source,
    focus: metadata.focus,
  };
};
