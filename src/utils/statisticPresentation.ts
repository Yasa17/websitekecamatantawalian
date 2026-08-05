import {
  StatisticCategory,
  StatisticCellValue,
  StatisticTable,
} from '../types';
import {
  getStatisticLeafColumns,
  getStatisticTable,
  StatisticLeafColumn,
  statisticHeaderLabel,
  withStatisticTable,
} from './statisticTable';

export interface StatisticChartSeries {
  key: string;
  label: string;
  columnId?: string;
}

export interface StatisticChartRow {
  label: string;
  [key: string]: string | number;
}

export interface StatisticChartSlice {
  label: string;
  value: number;
}

export interface StatisticPresentation {
  table: StatisticTable;
  leaves: StatisticLeafColumn[];
  numericLeaves: StatisticLeafColumn[];
  yearLeaf?: StatisticLeafColumn;
  availableYears: string[];
  filteredTable: StatisticTable;
  filteredCategory: StatisticCategory;
  series: StatisticChartSeries[];
  chartRows: StatisticChartRow[];
  pieData: StatisticChartSlice[];
  rowCount: number;
  columnCount: number;
  numericColumnCount: number;
  total: number;
  topItem: StatisticChartSlice | null;
  isStructured: boolean;
}

const YEAR_COLUMN_PATTERN = /(^|[\s/_-])(tahun|year)([\s/_-]|$)/i;

const cellText = (value: StatisticCellValue | undefined) =>
  String(value ?? '').trim();

const cellNumber = (value: StatisticCellValue | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const uniqueSortedYears = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((left, right) =>
    right.localeCompare(left, 'id-ID', { numeric: true }),
  );

const topSlice = (slices: StatisticChartSlice[]) =>
  slices.reduce<StatisticChartSlice | null>(
    (top, slice) => (!top || slice.value > top.value ? slice : top),
    null,
  );

export const getStatisticPresentation = (
  category: StatisticCategory,
  selectedYear = 'all',
): StatisticPresentation => {
  const isStructured = Boolean(category.table);
  const table = getStatisticTable(category);
  const leaves = getStatisticLeafColumns(table.columns);
  const yearLeaf = leaves.find((leaf) =>
    YEAR_COLUMN_PATTERN.test(statisticHeaderLabel(leaf)),
  );
  const numericLeaves = leaves.filter(
    (leaf) =>
      leaf.column.dataType === 'number' &&
      leaf.column.id !== yearLeaf?.column.id,
  );
  const availableYears = yearLeaf
    ? uniqueSortedYears(
        table.rows.map((row) => cellText(row.values[yearLeaf.column.id])),
      )
    : [];
  const filteredRows =
    yearLeaf && selectedYear !== 'all'
      ? table.rows.filter(
          (row) =>
            cellText(row.values[yearLeaf.column.id]) === selectedYear,
        )
      : table.rows;
  const filteredTable = { ...table, rows: filteredRows };
  const filteredCategory = isStructured
    ? withStatisticTable(category, filteredTable)
    : category;

  if (!isStructured) {
    const slices = category.items.map((item) => ({
      label: item.label,
      value: item.value,
    }));
    return {
      table,
      leaves,
      numericLeaves: leaves.filter(
        (leaf) => leaf.column.dataType === 'number',
      ),
      availableYears: [],
      filteredTable,
      filteredCategory,
      series: [{ key: 'value', label: 'Nilai' }],
      chartRows: slices.map((slice) => ({
        label: slice.label,
        value: slice.value,
      })),
      pieData: slices,
      rowCount: category.items.length,
      columnCount: 2,
      numericColumnCount: 1,
      total: slices.reduce((sum, slice) => sum + slice.value, 0),
      topItem: topSlice(slices),
      isStructured: false,
    };
  }

  const labelLeaves = leaves.filter(
    (leaf) =>
      leaf.column.dataType !== 'number' &&
      leaf.column.id !== yearLeaf?.column.id,
  );
  const series = numericLeaves.map((leaf, index) => ({
    key: `series_${index}`,
    label: statisticHeaderLabel(leaf),
    columnId: leaf.column.id,
  }));
  const slices: StatisticChartSlice[] = [];
  const chartRows = filteredRows.map((row, rowIndex) => {
    const labelParts = labelLeaves
      .map((leaf) => cellText(row.values[leaf.column.id]))
      .filter(Boolean);
    const yearValue = yearLeaf
      ? cellText(row.values[yearLeaf.column.id])
      : '';
    if (yearValue && selectedYear === 'all') labelParts.push(yearValue);
    const label = labelParts.join(' · ') || `Baris ${rowIndex + 1}`;
    const chartRow: StatisticChartRow = { label };

    series.forEach((item, seriesIndex) => {
      const numericValue = cellNumber(
        row.values[numericLeaves[seriesIndex].column.id],
      );
      chartRow[item.key] = numericValue ?? 0;
      if (numericValue !== null) {
        slices.push({
          label:
            series.length === 1
              ? label
              : `${label} — ${item.label}`,
          value: numericValue,
        });
      }
    });
    return chartRow;
  });

  return {
    table,
    leaves,
    numericLeaves,
    yearLeaf,
    availableYears,
    filteredTable,
    filteredCategory,
    series,
    chartRows,
    pieData: slices,
    rowCount: filteredRows.length,
    columnCount: leaves.length,
    numericColumnCount: numericLeaves.length,
    total: slices.reduce((sum, slice) => sum + slice.value, 0),
    topItem: topSlice(slices),
    isStructured,
  };
};
