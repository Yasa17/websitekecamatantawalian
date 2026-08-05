import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import test from 'node:test';
import * as XLSX from '@e965/xlsx';
import { StatisticTable } from '../types';
import {
  getStatisticNumberCellIssues,
  readStatisticWorkbook,
  reconcileStatisticRows,
  tableRowsToStatisticItems,
} from './statisticTable';

const table: StatisticTable = {
  columns: [
    {
      id: 'wilayah',
      label: 'Wilayah',
      kind: 'column',
      dataType: 'text',
    },
    {
      id: 'penduduk',
      label: 'Penduduk',
      kind: 'group',
      children: [
        {
          id: 'pria',
          label: 'Pria',
          kind: 'column',
          dataType: 'number',
        },
        {
          id: 'wanita',
          label: 'Wanita',
          kind: 'column',
          dataType: 'number',
        },
      ],
    },
  ],
  rows: [],
};

test('membaca header Excel bertingkat sesuai struktur tabel', async () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Wilayah', 'Penduduk', ''],
    ['', 'Pria', 'Wanita'],
    ['Dusun Satu', 62, 58],
  ]);
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const file = new File([bytes], 'penduduk.xlsx');

  const rows = await readStatisticWorkbook(file, table);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].values, {
    wilayah: 'Dusun Satu',
    pria: 62,
    wanita: 58,
  });

  assert.deepEqual(
    tableRowsToStatisticItems({ ...table, rows }).map(({ label, value }) => ({
      label,
      value,
    })),
    [
      { label: 'Dusun Satu — Penduduk / Pria', value: 62 },
      { label: 'Dusun Satu — Penduduk / Wanita', value: 58 },
    ],
  );
});

test('menolak susunan kolom yang tidak sesuai template terbaru', async () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Wilayah', 'Wanita', 'Pria'],
    ['Dusun Satu', 58, 62],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  const file = new File([bytes], 'kolom-salah.xlsx');

  await assert.rejects(
    () => readStatisticWorkbook(file, table),
    /tidak cocok dengan struktur tabel/,
  );
});

test('mengonversi nilai teks numerik ketika tipe kolom diubah menjadi angka', () => {
  const textColumns = [
    {
      id: 'label',
      label: 'Kelompok',
      kind: 'column' as const,
      dataType: 'text' as const,
    },
    {
      id: 'pria',
      label: 'Laki-Laki',
      kind: 'column' as const,
      dataType: 'text' as const,
    },
    {
      id: 'wanita',
      label: 'Perempuan',
      kind: 'column' as const,
      dataType: 'text' as const,
    },
  ];
  const importedAsText = [
    {
      id: 'row-1',
      values: {
        label: '0-5',
        pria: '12',
        wanita: '14',
      },
    },
  ];
  const numericColumns = textColumns.map((column) =>
    column.id === 'pria' || column.id === 'wanita'
      ? { ...column, dataType: 'number' as const }
      : column,
  );

  const reconciled = reconcileStatisticRows(
    importedAsText,
    numericColumns,
  );
  assert.deepEqual(reconciled[0].values, {
    label: '0-5',
    pria: 12,
    wanita: 14,
  });
  assert.deepEqual(
    getStatisticNumberCellIssues(reconciled, numericColumns),
    [],
  );
});

test('menandai hanya nilai yang benar-benar tidak dapat menjadi angka', () => {
  const columns = [
    {
      id: 'nilai',
      label: 'Nilai',
      kind: 'column' as const,
      dataType: 'number' as const,
    },
  ];
  const reconciled = reconcileStatisticRows(
    [
      { id: 'valid', values: { nilai: '1.5' } },
      { id: 'invalid', values: { nilai: 'dua belas' } },
      { id: 'empty', values: { nilai: '' } },
    ],
    columns,
  );

  assert.equal(reconciled[0].values.nilai, 1.5);
  assert.equal(reconciled[2].values.nilai, '');
  assert.deepEqual(getStatisticNumberCellIssues(reconciled, columns), [
    {
      rowIndex: 1,
      columnLabel: 'Nilai',
      value: 'dua belas',
    },
  ]);
});

test('mengonversi angka menjadi string ketika tipe kolom diubah ke teks', () => {
  const reconciled = reconcileStatisticRows(
    [{ id: 'row-1', values: { tahun: 2026 } }],
    [
      {
        id: 'tahun',
        label: 'Tahun',
        kind: 'column',
        dataType: 'text',
      },
    ],
  );
  assert.equal(reconciled[0].values.tahun, '2026');
});
