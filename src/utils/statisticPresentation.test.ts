import assert from 'node:assert/strict';
import test from 'node:test';
import { StatisticCategory } from '../types';
import { getStatisticPresentation } from './statisticPresentation';

const groupedCategory: StatisticCategory = {
  id: 'penduduk',
  title: 'Penduduk',
  description: 'Penduduk menurut wilayah dan jenis kelamin.',
  type: 'bar',
  items: [],
  table: {
    columns: [
      {
        id: 'wilayah',
        label: 'Wilayah',
        kind: 'column',
        dataType: 'text',
      },
      {
        id: 'gender',
        label: 'Jenis Kelamin',
        kind: 'group',
        children: [
          {
            id: 'pria',
            label: 'Laki-laki',
            kind: 'column',
            dataType: 'number',
          },
          {
            id: 'wanita',
            label: 'Perempuan',
            kind: 'column',
            dataType: 'number',
          },
        ],
      },
    ],
    rows: [
      {
        id: 'row-1',
        values: { wilayah: 'Dusun Satu', pria: 60, wanita: 55 },
      },
      {
        id: 'row-2',
        values: { wilayah: 'Dusun Dua', pria: 48, wanita: 51 },
      },
    ],
  },
};

test('grafik mengikuti baris, grup, dan kolom angka tanpa tahun sintetis', () => {
  const presentation = getStatisticPresentation(groupedCategory);

  assert.deepEqual(presentation.availableYears, []);
  assert.equal(presentation.rowCount, 2);
  assert.equal(presentation.columnCount, 3);
  assert.deepEqual(
    presentation.series.map((series) => series.label),
    ['Jenis Kelamin > Laki-laki', 'Jenis Kelamin > Perempuan'],
  );
  assert.deepEqual(presentation.chartRows, [
    { label: 'Dusun Satu', series_0: 60, series_1: 55 },
    { label: 'Dusun Dua', series_0: 48, series_1: 51 },
  ]);
  assert.equal(presentation.total, 214);
});

test('filter tahun hanya tersedia ketika tabel memiliki kolom Tahun', () => {
  const categoryWithYear: StatisticCategory = {
    ...groupedCategory,
    id: 'produksi-tahunan',
    table: {
      columns: [
        {
          id: 'tahun',
          label: 'Tahun',
          kind: 'column',
          dataType: 'number',
        },
        {
          id: 'komoditas',
          label: 'Komoditas',
          kind: 'column',
          dataType: 'text',
        },
        {
          id: 'produksi',
          label: 'Produksi',
          kind: 'column',
          dataType: 'number',
        },
      ],
      rows: [
        {
          id: '2025-padi',
          values: { tahun: 2025, komoditas: 'Padi', produksi: 120 },
        },
        {
          id: '2026-padi',
          values: { tahun: 2026, komoditas: 'Padi', produksi: 135 },
        },
      ],
    },
  };

  const presentation = getStatisticPresentation(categoryWithYear, '2025');
  assert.deepEqual(presentation.availableYears, ['2026', '2025']);
  assert.equal(presentation.yearLeaf?.column.id, 'tahun');
  assert.equal(presentation.numericColumnCount, 1);
  assert.equal(presentation.rowCount, 1);
  assert.deepEqual(presentation.chartRows, [
    { label: 'Padi', series_0: 120 },
  ]);
  assert.equal(presentation.filteredCategory.table?.rows[0].id, '2025-padi');
});

test('dataset lama ditampilkan apa adanya tanpa rekayasa nilai per tahun', () => {
  const legacy: StatisticCategory = {
    id: 'lama',
    title: 'Data Lama',
    description: 'Kompatibilitas data lama.',
    type: 'line',
    items: [
      { label: 'A', value: 10 },
      { label: 'B', value: 20 },
    ],
  };

  const presentation = getStatisticPresentation(legacy);
  assert.deepEqual(presentation.availableYears, []);
  assert.deepEqual(presentation.chartRows, [
    { label: 'A', value: 10 },
    { label: 'B', value: 20 },
  ]);
});
