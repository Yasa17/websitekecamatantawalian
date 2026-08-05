import type { Range, WorkBook } from '@e965/xlsx';
import {
  StatisticCategory,
  StatisticCellValue,
  StatisticItem,
  StatisticTable,
  StatisticTableColumn,
  StatisticTableRow,
} from '../types';

export interface StatisticLeafColumn {
  column: StatisticTableColumn;
  path: string[];
}

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('id-ID')
    .replace(/\s+/g, ' ');

export const createStatisticId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const getStatisticLeafColumns = (
  columns: StatisticTableColumn[],
  parentPath: string[] = [],
): StatisticLeafColumn[] =>
  columns.flatMap((column) => {
    const path = [...parentPath, column.label.trim() || 'Tanpa Nama'];
    if (column.kind === 'group') {
      return getStatisticLeafColumns(column.children || [], path);
    }
    return [{ column, path }];
  });

export const getStatisticColumnDepth = (columns: StatisticTableColumn[]): number =>
  Math.max(
    1,
    ...columns.map((column) =>
      column.kind === 'group'
        ? 1 + getStatisticColumnDepth(column.children || [])
        : 1,
    ),
  );

export const statisticHeaderLabel = (leaf: StatisticLeafColumn) =>
  leaf.path.join(' > ');

export const createDefaultStatisticTable = (
  items: StatisticItem[] = [],
): StatisticTable => {
  const labelColumnId = createStatisticId('col');
  const valueColumnId = createStatisticId('col');
  return {
    columns: [
      {
        id: labelColumnId,
        label: 'Indikator',
        kind: 'column',
        dataType: 'text',
      },
      {
        id: valueColumnId,
        label: 'Nilai',
        kind: 'column',
        dataType: 'number',
      },
    ],
    rows: items.map((item) => ({
      id: createStatisticId('row'),
      values: {
        [labelColumnId]: item.label,
        [valueColumnId]: item.value,
      },
    })),
  };
};

export const getStatisticTable = (category: StatisticCategory): StatisticTable =>
  category.table || createDefaultStatisticTable(category.items);

export const parseStatisticNumber = (value: StatisticCellValue): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const compact = value.trim().replace(/[\s\u00A0]/g, '');
  if (!compact) return null;

  let normalized = compact;
  if (compact.includes(',') && compact.includes('.')) {
    normalized =
      compact.lastIndexOf(',') > compact.lastIndexOf('.')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '');
  } else if (compact.includes(',')) {
    normalized = compact.replace(',', '.');
  }
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const tableRowsToStatisticItems = (table: StatisticTable): StatisticItem[] => {
  const leaves = getStatisticLeafColumns(table.columns);
  const textLeaves = leaves.filter((leaf) => leaf.column.dataType !== 'number');
  const numberLeaves = leaves.filter(
    (leaf) =>
      leaf.column.dataType === 'number' &&
      !/(^|[\s/_-])(tahun|year)([\s/_-]|$)/i.test(leaf.path.join(' / ')),
  );

  return table.rows.flatMap((row, rowIndex) => {
    const textLabel = textLeaves
      .map((leaf) => String(row.values[leaf.column.id] ?? '').trim())
      .filter(Boolean)
      .join(' · ');
    const rowLabel = textLabel || `Baris ${rowIndex + 1}`;

    return numberLeaves.flatMap((leaf) => {
      const numberValue = parseStatisticNumber(row.values[leaf.column.id] ?? '');
      if (numberValue === null) return [];
      return [{
        id: `${row.id}_${leaf.column.id}`,
        label:
          numberLeaves.length === 1
            ? rowLabel
            : `${rowLabel} — ${leaf.path.join(' / ')}`,
        value: numberValue,
      }];
    });
  });
};

export const withStatisticTable = (
  category: StatisticCategory,
  table: StatisticTable,
): StatisticCategory => ({
  ...category,
  table,
  items: tableRowsToStatisticItems(table),
});

export const reconcileStatisticRows = (
  rows: StatisticTableRow[],
  columns: StatisticTableColumn[],
): StatisticTableRow[] => {
  const leaves = getStatisticLeafColumns(columns);
  return rows.map((row) => ({
    ...row,
    values: Object.fromEntries(
      leaves.map((leaf) => {
        const currentValue = row.values[leaf.column.id] ?? '';
        if (leaf.column.dataType === 'number') {
          if (currentValue === '') return [leaf.column.id, ''];
          const numericValue = parseStatisticNumber(currentValue);
          return [
            leaf.column.id,
            numericValue === null ? currentValue : numericValue,
          ];
        }
        return [
          leaf.column.id,
          currentValue === '' ? '' : String(currentValue),
        ];
      }),
    ),
  }));
};

export interface StatisticNumberCellIssue {
  rowIndex: number;
  columnLabel: string;
  value: StatisticCellValue;
}

export const getStatisticNumberCellIssues = (
  rows: StatisticTableRow[],
  columns: StatisticTableColumn[],
): StatisticNumberCellIssue[] => {
  const numberLeaves = getStatisticLeafColumns(columns).filter(
    (leaf) => leaf.column.dataType === 'number',
  );
  return rows.flatMap((row, rowIndex) =>
    numberLeaves.flatMap((leaf) => {
      const value = row.values[leaf.column.id] ?? '';
      if (
        value === '' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        return [];
      }
      return [{
        rowIndex,
        columnLabel: leaf.column.label,
        value,
      }];
    }),
  );
};

export interface StatisticHeaderCell {
  column: StatisticTableColumn;
  colSpan: number;
  rowSpan: number;
}

const countLeafColumns = (column: StatisticTableColumn): number =>
  column.kind === 'group'
    ? Math.max(
        1,
        (column.children || []).reduce(
          (total, child) => total + countLeafColumns(child),
          0,
        ),
      )
    : 1;

export const buildStatisticHeaderRows = (
  columns: StatisticTableColumn[],
): StatisticHeaderCell[][] => {
  const depth = getStatisticColumnDepth(columns);
  const rows: StatisticHeaderCell[][] = Array.from({ length: depth }, () => []);

  const visit = (column: StatisticTableColumn, level: number) => {
    const hasChildren = column.kind === 'group' && (column.children || []).length > 0;
    rows[level].push({
      column,
      colSpan: hasChildren ? countLeafColumns(column) : 1,
      rowSpan: hasChildren ? 1 : depth - level,
    });
    if (hasChildren) {
      column.children?.forEach((child) => visit(child, level + 1));
    }
  };

  columns.forEach((column) => visit(column, 0));
  return rows;
};

const sanitizeFilename = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'statistik';

const buildExcelHeader = (columns: StatisticTableColumn[]) => {
  const leaves = getStatisticLeafColumns(columns);
  const depth = getStatisticColumnDepth(columns);
  const rows: (string | number)[][] = Array.from(
    { length: depth },
    () => Array.from({ length: leaves.length }, () => ''),
  );
  const merges: Range[] = [];

  const visit = (
    column: StatisticTableColumn,
    level: number,
    startColumn: number,
  ): number => {
    const children = column.kind === 'group' ? column.children || [] : [];
    const width = children.length
      ? children.reduce((sum, child) => sum + countLeafColumns(child), 0)
      : 1;
    rows[level][startColumn] = column.label;

    if (children.length) {
      if (width > 1) {
        merges.push({
          s: { r: level, c: startColumn },
          e: { r: level, c: startColumn + width - 1 },
        });
      }
      let cursor = startColumn;
      children.forEach((child) => {
        cursor += visit(child, level + 1, cursor);
      });
    } else if (level < depth - 1) {
      merges.push({
        s: { r: level, c: startColumn },
        e: { r: depth - 1, c: startColumn },
      });
    }

    return width;
  };

  let cursor = 0;
  columns.forEach((column) => {
    cursor += visit(column, 0, cursor);
  });
  return { depth, leaves, merges, rows };
};

const createWorkbook = async (
  category: StatisticCategory,
  includeData: boolean,
): Promise<WorkBook> => {
  const XLSX = await import('@e965/xlsx');
  const table = getStatisticTable(category);
  const header = buildExcelHeader(table.columns);
  const dataRows = includeData
    ? table.rows.map((row) =>
        header.leaves.map((leaf) => row.values[leaf.column.id] ?? ''),
      )
    : [header.leaves.map(() => '')];
  const sheet = XLSX.utils.aoa_to_sheet([...header.rows, ...dataRows]);
  sheet['!merges'] = header.merges;
  sheet['!cols'] = header.leaves.map((leaf) => ({
    wch: Math.max(16, Math.min(36, statisticHeaderLabel(leaf).length + 3)),
  }));
  sheet['!freeze'] = { xSplit: 0, ySplit: header.depth };

  const instructions = XLSX.utils.aoa_to_sheet([
    ['PETUNJUK IMPOR DATA STATISTIK'],
    ['Dataset', category.title],
    ['Cara pengisian'],
    ['1. Isi data hanya pada sheet "Data".'],
    ['2. Jangan mengubah nama, urutan, atau jumlah kolom.'],
    ['3. Kolom bertipe angka hanya boleh diisi angka.'],
    ['4. Baris kosong akan diabaikan ketika diimpor.'],
    [],
    ['Kolom', 'Tipe'],
    ...header.leaves.map((leaf) => [
      statisticHeaderLabel(leaf),
      leaf.column.dataType === 'number' ? 'Angka' : 'Teks',
    ]),
  ]);
  instructions['!cols'] = [{ wch: 52 }, { wch: 18 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructions, 'Petunjuk');
  XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
  return workbook;
};

export const downloadStatisticTemplate = async (category: StatisticCategory) => {
  const XLSX = await import('@e965/xlsx');
  XLSX.writeFile(
    await createWorkbook(category, false),
    `template-${sanitizeFilename(category.title)}.xlsx`,
  );
};

export const downloadStatisticWorkbook = async (category: StatisticCategory) => {
  const XLSX = await import('@e965/xlsx');
  XLSX.writeFile(
    await createWorkbook(category, true),
    `data-${sanitizeFilename(category.title)}.xlsx`,
  );
};

const rowIsEmpty = (row: unknown[]) =>
  row.every((value) => String(value ?? '').trim() === '');

export const readStatisticWorkbook = async (
  file: { arrayBuffer: () => Promise<ArrayBuffer> },
  table: StatisticTable,
): Promise<StatisticTableRow[]> => {
  const XLSX = await import('@e965/xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const worksheet =
    workbook.Sheets.Data || workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error('Berkas tidak memiliki sheet data.');

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: true,
  });
  const leaves = getStatisticLeafColumns(table.columns);
  if (!leaves.length) throw new Error('Struktur tabel belum memiliki kolom.');

  const expectedFlat = leaves.map((leaf) =>
    normalizeHeader(statisticHeaderLabel(leaf)),
  );
  const expectedLeaf = leaves.map((leaf) => normalizeHeader(leaf.column.label));
  const firstRow = matrix[0] || [];
  const firstHeaders = leaves.map((_, index) =>
    normalizeHeader(firstRow[index]),
  );

  let dataStart = 1;
  const isFlatHeader =
    firstHeaders.every(
      (header, index) =>
        header === expectedFlat[index] || header === expectedLeaf[index],
    );

  if (!isFlatHeader) {
    const depth = getStatisticColumnDepth(table.columns);
    const hierarchicalHeader = leaves.map((leaf, columnIndex) => {
      let lastValue = '';
      for (let rowIndex = 0; rowIndex < depth; rowIndex += 1) {
        const current = normalizeHeader(matrix[rowIndex]?.[columnIndex]);
        if (current) lastValue = current;
      }
      return lastValue;
    });
    const isHierarchicalHeader = hierarchicalHeader.every(
      (header, index) => header === expectedLeaf[index],
    );
    if (!isHierarchicalHeader) {
      throw new Error(
        'Kolom berkas tidak cocok dengan struktur tabel. Unduh dan gunakan template terbaru.',
      );
    }
    dataStart = depth;
  }

  const importedRows = matrix
    .slice(dataStart)
    .filter((row) => !rowIsEmpty(row))
    .map((row, rowIndex) => {
      const values: Record<string, StatisticCellValue> = {};
      leaves.forEach((leaf, columnIndex) => {
        const rawValue = row[columnIndex] ?? '';
        if (leaf.column.dataType === 'number') {
          const parsed = parseStatisticNumber(
            typeof rawValue === 'number' ? rawValue : String(rawValue),
          );
          if (
            parsed === null &&
            String(rawValue).trim() !== ''
          ) {
            throw new Error(
              `Baris ${dataStart + rowIndex + 1}, kolom "${leaf.column.label}" harus berupa angka.`,
            );
          }
          values[leaf.column.id] = parsed ?? '';
        } else {
          values[leaf.column.id] = String(rawValue).trim();
        }
      });
      return { id: createStatisticId('row'), values };
    });

  if (!importedRows.length) {
    throw new Error('Tidak ada baris data yang dapat diimpor.');
  }
  return importedRows;
};
