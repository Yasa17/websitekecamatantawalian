import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  LoaderCircle,
  PencilLine,
  Plus,
  Save,
  TableProperties,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  StatisticCategory,
  StatisticDataCategory,
  StatisticTable,
  StatisticTableColumn,
} from '../types';
import { formatImageSize, processImageToWebP } from '../utils/imageUpload';
import {
  DEFAULT_STATISTIC_DATA_CATEGORY,
  STATISTIC_DATA_CATEGORY_OPTIONS,
  resolveStatisticMetadata,
} from '../utils/statisticMetadata';
import {
  buildStatisticHeaderRows,
  createDefaultStatisticTable,
  createStatisticId,
  downloadStatisticTemplate,
  downloadStatisticWorkbook,
  getStatisticNumberCellIssues,
  getStatisticLeafColumns,
  getStatisticTable,
  readStatisticWorkbook,
  reconcileStatisticRows,
  withStatisticTable,
} from '../utils/statisticTable';

interface StatisticTableManagerProps {
  statistics: StatisticCategory[];
  setStatistics: (statistics: StatisticCategory[]) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'info') => void;
}

interface EditorNode {
  column: StatisticTableColumn;
  depth: number;
  index: number;
  siblingCount: number;
}

const cloneColumns = (columns: StatisticTableColumn[]) =>
  JSON.parse(JSON.stringify(columns)) as StatisticTableColumn[];

const flattenEditorNodes = (
  columns: StatisticTableColumn[],
  depth = 0,
): EditorNode[] =>
  columns.flatMap((column, index) => [
    { column, depth, index, siblingCount: columns.length },
    ...(column.kind === 'group'
      ? flattenEditorNodes(column.children || [], depth + 1)
      : []),
  ]);

const updateColumnTree = (
  columns: StatisticTableColumn[],
  columnId: string,
  updater: (column: StatisticTableColumn) => StatisticTableColumn,
): StatisticTableColumn[] =>
  columns.map((column) => {
    if (column.id === columnId) return updater(column);
    if (column.kind !== 'group') return column;
    return {
      ...column,
      children: updateColumnTree(column.children || [], columnId, updater),
    };
  });

const removeColumnFromTree = (
  columns: StatisticTableColumn[],
  columnId: string,
): StatisticTableColumn[] =>
  columns
    .filter((column) => column.id !== columnId)
    .map((column) =>
      column.kind === 'group'
        ? {
            ...column,
            children: removeColumnFromTree(column.children || [], columnId),
          }
        : column,
    );

const moveColumnInTree = (
  columns: StatisticTableColumn[],
  columnId: string,
  direction: -1 | 1,
): StatisticTableColumn[] => {
  const index = columns.findIndex((column) => column.id === columnId);
  if (index >= 0) {
    const destination = index + direction;
    if (destination < 0 || destination >= columns.length) return columns;
    const next = [...columns];
    [next[index], next[destination]] = [next[destination], next[index]];
    return next;
  }

  return columns.map((column) =>
    column.kind === 'group'
      ? {
          ...column,
          children: moveColumnInTree(
            column.children || [],
            columnId,
            direction,
          ),
        }
      : column,
  );
};

const newColumn = (
  kind: StatisticTableColumn['kind'],
): StatisticTableColumn => ({
  id: createStatisticId(kind === 'group' ? 'group' : 'col'),
  label: kind === 'group' ? 'Grup Baru' : 'Kolom Baru',
  kind,
  ...(kind === 'group'
    ? { children: [newColumn('column')] }
    : { dataType: 'text' as const }),
});

export default function StatisticTableManager({
  statistics,
  setStatistics,
  showToast,
}: StatisticTableManagerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditingStructure, setIsEditingStructure] = useState(false);
  const [draftColumns, setDraftColumns] = useState<StatisticTableColumn[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingDataset, setIsCreatingDataset] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [processingThumbnail, setProcessingThumbnail] = useState<'new' | 'existing' | null>(null);
  const [showNewDataset, setShowNewDataset] = useState(false);
  const [newDataset, setNewDataset] = useState({
    title: '',
    description: '',
    type: 'bar' as StatisticCategory['type'],
    dataCategory: DEFAULT_STATISTIC_DATA_CATEGORY as StatisticDataCategory,
    thumbnail: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeSelectedIndex = Math.min(
    selectedIndex,
    Math.max(0, statistics.length - 1),
  );
  const selectedCategory = statistics[safeSelectedIndex];
  const selectedCategoryIdRef = useRef(selectedCategory?.id);
  selectedCategoryIdRef.current = selectedCategory?.id;
  const [metadataForm, setMetadataForm] = useState({
    dataCategory: DEFAULT_STATISTIC_DATA_CATEGORY as StatisticDataCategory,
    thumbnail: '',
  });
  const isExistingMetadataBusy =
    isSavingMetadata || processingThumbnail === 'existing';
  const activeTable = useMemo(
    () =>
      selectedCategory
        ? getStatisticTable(selectedCategory)
        : createDefaultStatisticTable(),
    [selectedCategory],
  );
  const leaves = useMemo(
    () => getStatisticLeafColumns(activeTable.columns),
    [activeTable.columns],
  );
  const headerRows = useMemo(
    () => buildStatisticHeaderRows(activeTable.columns),
    [activeTable.columns],
  );
  const editorNodes = useMemo(
    () => flattenEditorNodes(draftColumns),
    [draftColumns],
  );

  useEffect(() => {
    setIsEditingStructure(false);
    setDraftColumns(cloneColumns(activeTable.columns));
  }, [selectedCategory?.id]);

  useEffect(() => {
    if (!selectedCategory) return;
    const metadata = resolveStatisticMetadata(selectedCategory);
    setMetadataForm({
      dataCategory: metadata.dataCategory,
      thumbnail: metadata.thumbnail,
    });
  }, [selectedCategory?.id, selectedCategory?.dataCategory, selectedCategory?.thumbnail]);

  const processThumbnail = async (
    file: File,
    target: 'new' | 'existing',
    expectedCategoryId?: string,
  ) => {
    setProcessingThumbnail(target);
    try {
      const processed = await processImageToWebP(file);
      if (target === 'new') {
        setNewDataset((current) => ({ ...current, thumbnail: processed.dataUrl }));
      } else {
        if (selectedCategoryIdRef.current !== expectedCategoryId) {
          showToast(
            'Dataset aktif sudah berubah. Silakan pilih thumbnail kembali pada dataset yang benar.',
            'info',
          );
          return;
        }
        setMetadataForm((current) => ({ ...current, thumbnail: processed.dataUrl }));
      }
      showToast(`Thumbnail dikonversi ke WebP (${formatImageSize(processed.size)}).`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Thumbnail gagal diproses.',
        'info',
      );
    } finally {
      setProcessingThumbnail(null);
    }
  };

  const saveTable = (table: StatisticTable) => {
    if (!selectedCategory) return Promise.resolve(false);
    const next = statistics.map((current, currentIndex) =>
      currentIndex === safeSelectedIndex
        ? withStatisticTable(selectedCategory, table)
        : current,
    );
    return setStatistics(next);
  };

  const beginStructureEditor = () => {
    setDraftColumns(cloneColumns(activeTable.columns));
    setIsEditingStructure(true);
  };

  const beginStructureEditorWithNew = (
    kind: StatisticTableColumn['kind'],
  ) => {
    setDraftColumns([
      ...cloneColumns(activeTable.columns),
      newColumn(kind),
    ]);
    setIsEditingStructure(true);
    showToast(
      kind === 'group'
        ? 'Grup baru beserta satu kolom di dalamnya sudah ditambahkan. Beri nama lalu simpan struktur.'
        : 'Kolom baru sudah ditambahkan. Beri nama dan tipe datanya lalu simpan struktur.',
      'info',
    );
  };

  const handleSaveStructure = async () => {
    const nextLeaves = getStatisticLeafColumns(draftColumns);
    if (!nextLeaves.length) {
      showToast('Tambahkan minimal satu kolom sebelum menyimpan struktur.', 'info');
      return;
    }
    if (
      flattenEditorNodes(draftColumns).some(
        ({ column }) => !column.label.trim(),
      )
    ) {
      showToast('Semua grup dan kolom wajib memiliki nama.', 'info');
      return;
    }
    if (
      flattenEditorNodes(draftColumns).some(
        ({ column }) =>
          column.kind === 'group' && !(column.children || []).length,
      )
    ) {
      showToast(
        'Setiap grup wajib memiliki minimal satu sub-grup atau kolom.',
        'info',
      );
      return;
    }

    const reconciledRows = reconcileStatisticRows(
      activeTable.rows,
      draftColumns,
    );
    const numberIssues = getStatisticNumberCellIssues(
      reconciledRows,
      draftColumns,
    );
    if (numberIssues.length) {
      const firstIssue = numberIssues[0];
      showToast(
        `Kolom "${firstIssue.columnLabel}" masih memiliki ${numberIssues.length} nilai yang bukan angka. Contoh pada baris ${firstIssue.rowIndex + 1}: "${firstIssue.value}". Batalkan editor, perbaiki nilainya, lalu simpan struktur kembali.`,
        'info',
      );
      return;
    }

    const success = await saveTable({
      columns: cloneColumns(draftColumns),
      rows: reconciledRows,
    });
    if (!success) return;
    setIsEditingStructure(false);
    showToast('Struktur dan tipe data berhasil disimpan. Nilai lama sudah disesuaikan otomatis.');
  };

  const addTopLevel = (kind: StatisticTableColumn['kind']) => {
    setDraftColumns((current) => [...current, newColumn(kind)]);
  };

  const addChild = (
    parentId: string,
    kind: StatisticTableColumn['kind'],
  ) => {
    setDraftColumns((current) =>
      updateColumnTree(current, parentId, (column) => ({
        ...column,
        children: [...(column.children || []), newColumn(kind)],
      })),
    );
  };

  const addDataRow = () => {
    const values = Object.fromEntries(
      leaves.map((leaf) => [leaf.column.id, '']),
    );
    saveTable({
      ...activeTable,
      rows: [
        ...activeTable.rows,
        { id: createStatisticId('row'), values },
      ],
    });
  };

  const updateCell = (
    rowId: string,
    columnId: string,
    rawValue: string,
    dataType: StatisticTableColumn['dataType'],
  ) => {
    const value =
      dataType === 'number' && rawValue !== '' ? Number(rawValue) : rawValue;
    saveTable({
      ...activeTable,
      rows: activeTable.rows.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [columnId]: value } }
          : row,
      ),
    });
  };

  const deleteDataRow = async (rowId: string, rowNumber: number) => {
    if (!confirm(`Hapus baris data nomor ${rowNumber}? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    const success = await saveTable({
      ...activeTable,
      rows: activeTable.rows.filter((row) => row.id !== rowId),
    });
    if (success) showToast('Baris data berhasil dihapus.');
  };

  const handleImportFile = async (file?: File) => {
    if (!file || !selectedCategory) return;
    setIsImporting(true);
    try {
      const rows = await readStatisticWorkbook(file, activeTable);
      const success = await saveTable({
        ...activeTable,
        rows:
          importMode === 'append'
            ? [...activeTable.rows, ...rows]
            : rows,
      });
      if (!success) return;
      showToast(
        `${rows.length} baris dari "${file.name}" berhasil diimpor (${importMode === 'append' ? 'ditambahkan' : 'mengganti data lama'}).`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Berkas gagal diimpor.',
        'info',
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateDataset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newDataset.title.trim() || !newDataset.thumbnail) {
      showToast('Judul dan thumbnail dataset wajib diisi.', 'info');
      return;
    }
    const category: StatisticCategory = {
      id: createStatisticId('stat'),
      title: newDataset.title.trim(),
      description:
        newDataset.description.trim() ||
        'Dataset statistik wilayah yang dapat disusun secara fleksibel.',
      type: newDataset.type,
      dataCategory: newDataset.dataCategory,
      thumbnail: newDataset.thumbnail,
      items: [],
      table: createDefaultStatisticTable(),
    };
    setIsCreatingDataset(true);
    try {
      const success = await setStatistics([...statistics, category]);
      if (!success) return;
      setSelectedIndex(statistics.length);
      setNewDataset({
        title: '',
        description: '',
        type: 'bar',
        dataCategory: DEFAULT_STATISTIC_DATA_CATEGORY,
        thumbnail: '',
      });
      setShowNewDataset(false);
      showToast(`Dataset "${category.title}" berhasil dibuat.`);
    } finally {
      setIsCreatingDataset(false);
    }
  };

  const handleSaveDatasetMetadata = async () => {
    if (!selectedCategory || !metadataForm.thumbnail || isSavingMetadata) return;
    setIsSavingMetadata(true);
    try {
      const nextStatistics = statistics.map((category, index) =>
        index === safeSelectedIndex
          ? {
              ...category,
              dataCategory: metadataForm.dataCategory,
              thumbnail: metadataForm.thumbnail,
            }
          : category,
      );
      const success = await setStatistics(nextStatistics);
      if (!success) return;
      showToast(`Kategori dan thumbnail "${selectedCategory.title}" berhasil disimpan.`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  const handleClearDataset = async () => {
    if (!selectedCategory || !activeTable.rows.length) return;
    if (!confirm(
      `Kosongkan seluruh ${activeTable.rows.length} baris pada dataset “${selectedCategory.title}”? Struktur kolom tetap dipertahankan.`,
    )) return;
    setIsDeleting(true);
    const success = await saveTable({ ...activeTable, rows: [] });
    setIsDeleting(false);
    if (success) showToast(`Seluruh data pada “${selectedCategory.title}” berhasil dikosongkan.`);
  };

  const handleDeleteDataset = async () => {
    if (!selectedCategory) return;
    if (!confirm(
      `Hapus dataset “${selectedCategory.title}” beserta ${activeTable.rows.length} baris? Tindakan ini tidak dapat dibatalkan. Ekspor XLSX dahulu bila diperlukan.`,
    )) return;
    setIsDeleting(true);
    const nextStatistics = statistics.filter((_, index) => index !== safeSelectedIndex);
    const success = await setStatistics(nextStatistics);
    setIsDeleting(false);
    if (!success) return;
    setSelectedIndex(Math.max(0, Math.min(safeSelectedIndex, nextStatistics.length - 1)));
    setIsEditingStructure(false);
    setShowNewDataset(false);
    showToast(`Dataset “${selectedCategory.title}” berhasil dihapus.`);
  };

  if (!selectedCategory) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <TableProperties className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 font-extrabold text-slate-900">
            Belum ada dataset statistik
          </h3>
          <button
            type="button"
            onClick={() => setShowNewDataset(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Buat Dataset
          </button>
        </div>
        {showNewDataset && (
          <NewDatasetForm
            value={newDataset}
            onChange={setNewDataset}
            onSubmit={handleCreateDataset}
            onCancel={() => setShowNewDataset(false)}
            saving={isCreatingDataset}
            processingThumbnail={processingThumbnail === 'new'}
            onThumbnailFile={(file) => void processThumbnail(file, 'new')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
              Tabel Fleksibel
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {leaves.length} kolom · {activeTable.rows.length} baris
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950 md:text-2xl">
            Upload Data Statistik
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
            Susun grup dan kolom sesuai kebutuhan, simpan strukturnya, lalu isi
            data secara manual atau melalui template Excel yang dibuat otomatis.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isEditingStructure && (
            <>
              <button
                type="button"
                onClick={() => beginStructureEditorWithNew('group')}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
              >
                <FolderPlus className="h-4 w-4" />
                Tambah Grup
              </button>
              <button
                type="button"
                onClick={() => beginStructureEditorWithNew('column')}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100"
              >
                <FilePlus2 className="h-4 w-4" />
                Tambah Kolom
              </button>
              <button
                type="button"
                onClick={beginStructureEditor}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              >
                <PencilLine className="h-4 w-4 text-indigo-600" />
                Atur Struktur
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isEditingStructure}
            onClick={() => downloadStatisticTemplate(selectedCategory)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileSpreadsheet className="h-4 w-4 text-amber-600" />
            Template XLSX
          </button>
          <button
            type="button"
            disabled={isEditingStructure || isImporting}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? 'Memproses...' : 'Import Excel'}
          </button>
          <button
            type="button"
            disabled={isEditingStructure || activeTable.rows.length === 0}
            onClick={() => downloadStatisticWorkbook(selectedCategory)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-teal-700" />
            Export XLSX
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(event) =>
              void handleImportFile(event.target.files?.[0])
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-64 flex-1">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Dataset aktif
            </span>
            <select
              value={safeSelectedIndex}
              disabled={isExistingMetadataBusy}
              onChange={(event) => setSelectedIndex(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statistics.map((category, index) => (
                <option key={category.id} value={index}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={processingThumbnail !== null || isSavingMetadata || isCreatingDataset}
            onClick={() => setShowNewDataset((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Dataset Baru
          </button>
          <button
            type="button"
            disabled={isDeleting || isEditingStructure || activeTable.rows.length === 0}
            onClick={() => void handleClearDataset()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Kosongkan Data
          </button>
          <button
            type="button"
            disabled={isDeleting || isEditingStructure || isImporting}
            onClick={() => void handleDeleteDataset()}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Menghapus...' : 'Hapus Dataset'}
          </button>
        </div>
      </div>

      {showNewDataset && (
        <NewDatasetForm
          value={newDataset}
          onChange={setNewDataset}
          onSubmit={handleCreateDataset}
          onCancel={() => setShowNewDataset(false)}
          saving={isCreatingDataset}
          processingThumbnail={processingThumbnail === 'new'}
          onThumbnailFile={(file) => void processThumbnail(file, 'new')}
        />
      )}

      <section className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-teal-950">
            Kategori & Thumbnail Dataset
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-teal-700">
            Metadata ini disimpan bersama dataset dan digunakan pada kartu katalog statistik publik.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.2fr)_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
              Kategori Data
            </span>
            <select
              value={metadataForm.dataCategory}
              disabled={isExistingMetadataBusy}
              onChange={(event) => setMetadataForm((current) => ({
                ...current,
                dataCategory: event.target.value as StatisticDataCategory,
              }))}
              className="w-full rounded-xl border border-teal-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {STATISTIC_DATA_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
              Thumbnail Data
            </span>
            <div className="flex items-center gap-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-teal-200 bg-white">
                {metadataForm.thumbnail ? (
                  <img
                    src={metadataForm.thumbnail}
                    alt={`Thumbnail ${selectedCategory.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="m-auto h-full w-6 text-teal-300" />
                )}
              </div>
              <div className="flex-1">
                <input
                  id={`statistic-thumbnail-${selectedCategory.id}`}
                  type="file"
                  accept="image/*"
                  disabled={processingThumbnail !== null || isSavingMetadata}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void processThumbnail(file, 'existing', selectedCategory.id);
                    }
                    event.currentTarget.value = '';
                  }}
                  className="hidden"
                />
                <label
                  htmlFor={`statistic-thumbnail-${selectedCategory.id}`}
                  aria-disabled={isExistingMetadataBusy}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2.5 text-xs font-bold text-teal-800 ${
                    isExistingMetadataBusy
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-teal-50'
                  }`}
                >
                  {processingThumbnail === 'existing' ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {processingThumbnail === 'existing' ? 'Mengonversi...' : 'Pilih Thumbnail Baru'}
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingMetadata || processingThumbnail !== null || !metadataForm.thumbnail}
            onClick={() => void handleSaveDatasetMetadata()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingMetadata ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSavingMetadata ? 'Menyimpan...' : 'Simpan Tampilan'}
          </button>
        </div>
      </section>

      {isEditingStructure ? (
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-indigo-100 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-indigo-950">
                <TableProperties className="h-4 w-4 text-indigo-600" />
                Editor Struktur Tabel
              </h3>
              <p className="mt-1 text-[11px] text-indigo-700">
                Grup membentuk header bertingkat. Kolom adalah tempat nilai data
                diisi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addTopLevel('group')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700"
              >
                <FolderPlus className="h-4 w-4" />
                Tambah Grup
              </button>
              <button
                type="button"
                onClick={() => addTopLevel('column')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700"
              >
                <FilePlus2 className="h-4 w-4" />
                Tambah Kolom
              </button>
              <button
                type="button"
                onClick={() => void handleSaveStructure()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                Simpan Struktur
              </button>
              <button
                type="button"
                onClick={() => setIsEditingStructure(false)}
                className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white"
              >
                Batal
              </button>
            </div>
          </div>

          <div className="space-y-2 p-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Menghapus kolom juga menghapus isi kolom tersebut saat struktur
              disimpan. Kolom lain dan data baris tetap dipertahankan.
            </div>

            {editorNodes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                Struktur masih kosong. Tambahkan grup atau kolom.
              </div>
            ) : (
              editorNodes.map(({ column, depth, index, siblingCount }) => (
                <div
                  key={column.id}
                  className={`flex flex-wrap items-center gap-2 rounded-xl border p-2.5 ${
                    column.kind === 'group'
                      ? 'border-indigo-200 bg-indigo-50/50'
                      : 'border-slate-200 bg-white shadow-sm'
                  }`}
                  style={{ marginLeft: `${Math.min(depth, 5) * 28}px` }}
                >
                  <span className="w-6 text-center text-[10px] font-bold text-slate-400">
                    {index + 1}
                  </span>
                  {column.kind === 'group' ? (
                    <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                  )}
                  <input
                    value={column.label}
                    onChange={(event) =>
                      setDraftColumns((current) =>
                        updateColumnTree(current, column.id, (item) => ({
                          ...item,
                          label: event.target.value,
                        })),
                      )
                    }
                    className="min-w-36 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                    aria-label={`Nama ${column.kind === 'group' ? 'grup' : 'kolom'}`}
                  />
                  {column.kind === 'column' && (
                    <select
                      value={column.dataType || 'text'}
                      onChange={(event) =>
                        setDraftColumns((current) =>
                          updateColumnTree(current, column.id, (item) => ({
                            ...item,
                            dataType: event.target.value as 'text' | 'number',
                          })),
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-600"
                      aria-label={`Tipe data ${column.label}`}
                    >
                      <option value="text">Teks</option>
                      <option value="number">Angka</option>
                    </select>
                  )}
                  {column.kind === 'group' && (
                    <>
                      <button
                        type="button"
                        onClick={() => addChild(column.id, 'group')}
                        title="Tambah sub-grup"
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-2 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Subgrup
                      </button>
                      <button
                        type="button"
                        onClick={() => addChild(column.id, 'column')}
                        title="Tambah kolom di dalam grup"
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-2 text-[10px] font-extrabold text-indigo-700 hover:bg-indigo-100"
                      >
                        <FilePlus2 className="h-4 w-4" />
                        Kolom di Grup
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() =>
                      setDraftColumns((current) =>
                        moveColumnInTree(current, column.id, -1),
                      )
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                    title="Geser ke atas"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === siblingCount - 1}
                    onClick={() =>
                      setDraftColumns((current) =>
                        moveColumnInTree(current, column.id, 1),
                      )
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25"
                    title="Geser ke bawah"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftColumns((current) =>
                        removeColumnFromTree(current, column.id),
                      )
                    }
                    className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    title="Hapus"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Struktur tersimpan. Tabel memiliki <strong>{leaves.length} kolom</strong>.
              Tambah grup/kolom di sini, lalu isi baris datanya.
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => beginStructureEditorWithNew('group')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-100"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Tambah Grup
            </button>
            <button
              type="button"
              onClick={() => beginStructureEditorWithNew('column')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-100"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Tambah Kolom
            </button>
          </div>
        </div>
      )}

      <section
        className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
          isEditingStructure ? 'pointer-events-none opacity-45' : ''
        }`}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Data ({activeTable.rows.length} baris)
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Perubahan pada sel tersimpan otomatis ke dataset.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => beginStructureEditorWithNew('group')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
            >
              <FolderPlus className="h-4 w-4" />
              Tambah Grup
            </button>
            <button
              type="button"
              onClick={() => beginStructureEditorWithNew('column')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
            >
              <FilePlus2 className="h-4 w-4" />
              Tambah Kolom
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-bold text-slate-500">
              Saat import:
              <select
                value={importMode}
                onChange={(event) =>
                  setImportMode(event.target.value as 'replace' | 'append')
                }
                className="bg-transparent font-extrabold text-slate-800 outline-none"
              >
                <option value="replace">Ganti data lama</option>
                <option value="append">Tambah ke data lama</option>
              </select>
            </label>
            <button
              type="button"
              onClick={addDataRow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Tambah Baris
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {leaves.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Simpan minimal satu kolom untuk mulai mengisi data.
            </div>
          ) : (
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-indigo-50 text-indigo-950">
                {headerRows.map((headerRow, rowIndex) => (
                  <tr key={rowIndex}>
                    {headerRow.map(({ column, colSpan, rowSpan }) => (
                      <th
                        key={column.id}
                        colSpan={colSpan}
                        rowSpan={rowSpan}
                        className="min-w-40 border border-indigo-100 px-3 py-3 text-center font-extrabold"
                      >
                        {column.label}
                        {column.kind === 'column' && (
                          <span className="ml-1.5 text-[8px] font-bold uppercase text-indigo-400">
                            {column.dataType === 'number' ? 'Angka' : 'Teks'}
                          </span>
                        )}
                      </th>
                    ))}
                    {rowIndex === 0 && (
                      <th
                        rowSpan={headerRows.length}
                        className="w-14 border border-indigo-100 px-2 py-3 text-center"
                      >
                        Aksi
                      </th>
                    )}
                  </tr>
                ))}
              </thead>
              <tbody>
                {activeTable.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={leaves.length + 1}
                      className="p-10 text-center text-xs italic text-slate-400"
                    >
                      Belum ada data. Tambah baris atau impor file Excel.
                    </td>
                  </tr>
                ) : (
                  activeTable.rows.map((row, rowIndex) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {leaves.map((leaf) => (
                        <td
                          key={leaf.column.id}
                          className="border border-slate-100 p-1.5"
                        >
                          <input
                            type={
                              leaf.column.dataType === 'number'
                                ? 'number'
                                : 'text'
                            }
                            value={row.values[leaf.column.id] ?? ''}
                            onChange={(event) =>
                              updateCell(
                                row.id,
                                leaf.column.id,
                                event.target.value,
                                leaf.column.dataType,
                              )
                            }
                            placeholder={
                              leaf.column.dataType === 'number'
                                ? '0'
                                : `Isi ${leaf.column.label}`
                            }
                            aria-label={`${leaf.column.label} baris ${rowIndex + 1}`}
                            className={`w-full min-w-36 rounded-lg border border-transparent bg-transparent px-2.5 py-2 outline-none hover:border-slate-200 focus:border-teal-400 focus:bg-white ${
                              leaf.column.dataType === 'number'
                                ? 'text-right font-mono font-bold'
                                : 'font-semibold'
                            }`}
                          />
                        </td>
                      ))}
                      <td className="border border-slate-100 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => void deleteDataRow(row.id, rowIndex + 1)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          title="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

interface NewDatasetFormProps {
  value: {
    title: string;
    description: string;
    type: StatisticCategory['type'];
    dataCategory: StatisticDataCategory;
    thumbnail: string;
  };
  onChange: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      type: StatisticCategory['type'];
      dataCategory: StatisticDataCategory;
      thumbnail: string;
    }>
  >;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  processingThumbnail: boolean;
  onThumbnailFile: (file: File) => void;
}

function NewDatasetForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving,
  processingThumbnail,
  onThumbnailFile,
}: NewDatasetFormProps) {
  const busy = saving || processingThumbnail;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-indigo-950">
            Buat Dataset Statistik
          </h3>
          <p className="mt-1 text-[10px] text-indigo-700">
            Dataset baru dimulai dengan kolom Indikator dan Nilai yang bebas
            diubah.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg p-2 text-indigo-500 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          required
          disabled={busy}
          value={value.title}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          placeholder="Judul dataset"
          className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <input
          disabled={busy}
          value={value.description}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Deskripsi singkat"
          className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <select
          value={value.type}
          disabled={busy}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              type: event.target.value as StatisticCategory['type'],
            }))
          }
          className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="bar">Grafik Batang</option>
          <option value="line">Grafik Garis</option>
          <option value="pie">Grafik Lingkaran</option>
          <option value="donut">Grafik Donat</option>
        </select>
        <select
          value={value.dataCategory}
          disabled={busy}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              dataCategory: event.target.value as StatisticDataCategory,
            }))
          }
          className="rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-xs font-bold outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {STATISTIC_DATA_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Kategori: {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-white p-3 sm:grid-cols-[120px_1fr] sm:items-center">
        <div className="h-20 overflow-hidden rounded-lg border border-indigo-100 bg-indigo-50">
          {value.thumbnail ? (
            <img
              src={value.thumbnail}
              alt="Pratinjau thumbnail dataset"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="m-auto h-full w-7 text-indigo-300" />
          )}
        </div>
        <div>
          <input
            id="new-statistic-thumbnail"
            type="file"
            accept="image/*"
            disabled={processingThumbnail || saving}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onThumbnailFile(file);
              event.currentTarget.value = '';
            }}
            className="hidden"
          />
          <label
            htmlFor="new-statistic-thumbnail"
            aria-disabled={busy}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-bold text-indigo-700 ${
              busy
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:bg-indigo-100'
            }`}
          >
            {processingThumbnail ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {processingThumbnail ? 'Mengonversi thumbnail...' : 'Pilih Thumbnail Dataset'}
          </label>
          <p className="mt-1.5 text-[10px] leading-relaxed text-indigo-500">
            Gambar dikonversi ke WebP maksimal 500 KB dan disimpan di Supabase Storage.
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving || processingThumbnail || !value.thumbnail}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Buat Dataset'}
        </button>
      </div>
    </form>
  );
}
