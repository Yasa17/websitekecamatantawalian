import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatNewsDate,
  isNewsReleased,
  isValidIsoCalendarDate,
  localIsoDate,
  sortNewsNewestFirst,
} from './newsDate';

test('localIsoDate mengikuti kalender WITA untuk seluruh perangkat', () => {
  assert.equal(localIsoDate(new Date('2026-08-09T16:30:00.000Z')), '2026-08-10');
  assert.equal(localIsoDate(new Date('2026-08-09T15:59:59.000Z')), '2026-08-09');
  assert.equal(localIsoDate(new Date(Number.NaN)), '');
});

test('validasi menerima tanggal ISO kalender termasuk tahun kabisat', () => {
  assert.equal(isValidIsoCalendarDate('2024-02-29'), true);
  assert.equal(isValidIsoCalendarDate('2026-08-10'), true);
  assert.equal(isValidIsoCalendarDate('2026-02-29'), false);
  assert.equal(isValidIsoCalendarDate('2026-02-30'), false);
  assert.equal(isValidIsoCalendarDate('2026-13-01'), false);
  assert.equal(isValidIsoCalendarDate('10/08/2026'), false);
  assert.equal(isValidIsoCalendarDate(''), false);
  assert.equal(isValidIsoCalendarDate(undefined), false);
});

test('tanggal valid mengatur rilis dan berita Published lama tetap kompatibel', () => {
  const today = '2026-08-10';

  assert.equal(isNewsReleased({
    status: 'Published',
    datePublished: '2026-08-09',
  }, today), true);
  assert.equal(isNewsReleased({
    status: 'Published',
    datePublished: today,
  }, today), true);
  assert.equal(isNewsReleased({
    status: 'Published',
    datePublished: '2026-08-11',
  }, today), false);
  assert.equal(isNewsReleased({
    status: 'Draft',
    datePublished: '2026-08-09',
  }, today), false);
  assert.equal(isNewsReleased({ status: 'Published' }, today), true);
  assert.equal(isNewsReleased({
    status: 'Published',
    datePublished: '2026-02-30',
  }, today), true);
});

test('sorting terbaru bersifat non-mutating, stabil, dan menaruh tanggal rusak terakhir', () => {
  const news = [
    { id: 'lama', datePublished: '2026-05-01' },
    { id: 'sama-pertama', datePublished: '2026-08-10' },
    { id: 'tanpa-tanggal' },
    { id: 'terbaru', datePublished: '2026-08-11' },
    { id: 'sama-kedua', datePublished: '2026-08-10' },
    { id: 'tanggal-rusak', datePublished: '2026-02-30' },
  ];
  const originalOrder = news.map(({ id }) => id);

  const sorted = sortNewsNewestFirst(news);

  assert.deepEqual(news.map(({ id }) => id), originalOrder);
  assert.notEqual(sorted, news);
  assert.deepEqual(sorted.map(({ id }) => id), [
    'terbaru',
    'sama-pertama',
    'sama-kedua',
    'lama',
    'tanpa-tanggal',
    'tanggal-rusak',
  ]);
});

test('format tanggal menggunakan lokal Indonesia tanpa bergeser hari', () => {
  assert.equal(formatNewsDate('2026-08-10'), '10 Agu 2026');
  assert.match(
    formatNewsDate('2026-08-10', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    /^Senin, 10 Agustus 2026$/,
  );
  assert.equal(formatNewsDate('2026-02-30'), 'Tanggal belum diatur');
  assert.equal(formatNewsDate(undefined), 'Tanggal belum diatur');
});
