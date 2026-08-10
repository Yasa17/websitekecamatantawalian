import assert from 'node:assert/strict';
import test from 'node:test';
import type { StatisticCategory } from '../types';
import {
  DEFAULT_STATISTIC_DATA_CATEGORY,
  DEFAULT_STATISTIC_THUMBNAIL,
  STATISTIC_DATA_CATEGORY_OPTIONS,
  STATISTIC_THUMBNAIL_OPTIONS,
  inferLegacyStatisticDataCategory,
  isAllowedStatisticThumbnail,
  isStatisticDataCategory,
  resolveStatisticMetadata,
} from './statisticMetadata';

const category = (
  overrides: Partial<StatisticCategory> = {},
): StatisticCategory => ({
  id: 'statistik-baru',
  title: 'Statistik Baru',
  description: 'Dataset uji.',
  type: 'bar',
  items: [],
  ...overrides,
});

test('metadata tersimpan mengalahkan inferensi ID lama', () => {
  const selectedThumbnail = STATISTIC_THUMBNAIL_OPTIONS[2].value;
  const metadata = resolveStatisticMetadata(category({
    id: 'kependudukan',
    dataCategory: 'kesehatan',
    thumbnail: selectedThumbnail,
  }));

  assert.equal(metadata.dataCategory, 'kesehatan');
  assert.equal(metadata.category, 'Kesehatan');
  assert.equal(metadata.thumbnail, selectedThumbnail);
  assert.equal(metadata.image, selectedThumbnail);
});

test('dataset lama tetap mendapat kategori dari ID atau judul', () => {
  assert.equal(
    inferLegacyStatisticDataCategory(category({ id: 'desa-satu-kependudukan' })),
    'demografi',
  );
  assert.equal(
    inferLegacyStatisticDataCategory(category({ id: 'legacy', title: 'Tingkat Pendidikan' })),
    'pendidikan',
  );
  assert.equal(
    resolveStatisticMetadata(category({ id: 'pekerjaan' })).category,
    'Ekonomi',
  );
  assert.equal(
    resolveStatisticMetadata(category({ id: 'pertanian' })).category,
    'Pertanian',
  );
});

test('nilai runtime yang tidak dikenal memakai fallback aman', () => {
  const malformed = category({
    dataCategory: 'kategori-liar' as StatisticCategory['dataCategory'],
    thumbnail: 'javascript:alert(1)',
  });
  const metadata = resolveStatisticMetadata(malformed);

  assert.equal(metadata.dataCategory, DEFAULT_STATISTIC_DATA_CATEGORY);
  assert.equal(metadata.category, 'Lainnya');
  assert.equal(metadata.thumbnail, DEFAULT_STATISTIC_THUMBNAIL);
  assert.equal(metadata.image, DEFAULT_STATISTIC_THUMBNAIL);
});

test('URL Supabase Storage dan WebP sementara dapat dipakai sebagai thumbnail', () => {
  const storageThumbnail =
    'https://contoh.supabase.co/storage/v1/object/public/portal/statistics/data.webp';
  const transientWebp = 'data:image/webp;base64,UklGRg==';

  assert.equal(
    resolveStatisticMetadata(category({ thumbnail: storageThumbnail })).thumbnail,
    storageThumbnail,
  );
  assert.ok(isAllowedStatisticThumbnail(transientWebp));
});

test('thumbnail dengan skema atau URL yang tidak aman ditolak', () => {
  assert.equal(isAllowedStatisticThumbnail('http://contoh.test/data.webp'), false);
  assert.equal(isAllowedStatisticThumbnail('javascript:alert(1)'), false);
  assert.equal(isAllowedStatisticThumbnail('https://'), false);
  assert.equal(isAllowedStatisticThumbnail('data:image/png;base64,UklGRg=='), false);
  assert.equal(isAllowedStatisticThumbnail('data:image/webp;base64,***'), false);
});

test('allowlist kategori memiliki slug dan label Indonesia yang unik', () => {
  assert.ok(STATISTIC_DATA_CATEGORY_OPTIONS.length > 0);
  assert.equal(
    new Set(STATISTIC_DATA_CATEGORY_OPTIONS.map((option) => option.value)).size,
    STATISTIC_DATA_CATEGORY_OPTIONS.length,
  );
  assert.equal(
    new Set(STATISTIC_DATA_CATEGORY_OPTIONS.map((option) => option.label)).size,
    STATISTIC_DATA_CATEGORY_OPTIONS.length,
  );
  assert.ok(STATISTIC_DATA_CATEGORY_OPTIONS.every((option) =>
    isStatisticDataCategory(option.value)));
  assert.ok(STATISTIC_THUMBNAIL_OPTIONS.every((option) =>
    isAllowedStatisticThumbnail(option.value)));
});
