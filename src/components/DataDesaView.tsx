/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  TrendingUp,
} from 'lucide-react';
import { StatisticCategory, VillageProfile } from '../types';
import { exportToCSV, exportToPDF, exportChartToImage } from '../utils/exportHelpers';
import {
  buildStatisticHeaderRows,
  downloadStatisticWorkbook,
} from '../utils/statisticTable';
import { getStatisticPresentation } from '../utils/statisticPresentation';
import { resolveStatisticMetadata } from '../utils/statisticMetadata';

interface DataDesaViewProps {
  statistics: StatisticCategory[];
  villageProfile: VillageProfile;
}

const COLORS = [
  '#4f46e5', // Indigo-600
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#64748b', // Slate
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#a5b4fc', // Indigo-300
  '#0ea5e9', // Sky
];

export default function DataDesaView({ statistics, villageProfile }: DataDesaViewProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const activeCategory = statistics[activeCategoryIndex] || statistics[0];
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    setSelectedYear('all');
  }, [activeCategory?.id]);

  const getCategoryMeta = (cat: StatisticCategory) => {
    const baseMeta = resolveStatisticMetadata(cat);
    return {
      ...baseMeta,
      source: baseMeta.source.replace(/Wilayah/g, villageProfile.contentLabel || 'Wilayah'),
    };
  };

  const getChartTypeLabel = (type: StatisticCategory['type']) => {
    switch (type) {
      case 'bar':
        return 'Diagram Batang';
      case 'line':
        return 'Grafik Tren';
      case 'donut':
        return 'Diagram Donat';
      case 'pie':
      default:
        return 'Diagram Lingkaran';
    }
  };

  const activePresentation = activeCategory
    ? getStatisticPresentation(activeCategory, selectedYear)
    : null;
  const structuredLeaves = activePresentation?.isStructured
    ? activePresentation.leaves
    : [];
  const structuredHeaderRows =
    activePresentation?.isStructured && activeCategory?.table
      ? buildStatisticHeaderRows(activeCategory.table.columns)
      : [];
  const exportCategory =
    activePresentation && activeCategory
      ? selectedYear === 'all'
        ? activePresentation.filteredCategory
        : {
            ...activePresentation.filteredCategory,
            id: `${activeCategory.id}_${selectedYear}`,
            description: `${activeCategory.description} Filter ${activePresentation.yearLeaf?.column.label || 'Tahun'}: ${selectedYear}.`,
          }
      : null;
  const hasChartData = Boolean(
    activePresentation &&
      activePresentation.series.length > 0 &&
      (activeCategory?.type === 'pie' || activeCategory?.type === 'donut'
        ? activePresentation.pieData.length > 0
        : activePresentation.chartRows.length > 0),
  );

  const handleDownloadCSV = () => {
    if (!exportCategory) return;
    exportToCSV(exportCategory);
  };

  const handleDownloadExcel = () => {
    if (!exportCategory) return;
    void downloadStatisticWorkbook(exportCategory);
  };

  const handleDownloadPDF = () => {
    if (!exportCategory) return;
    exportToPDF(exportCategory, villageProfile);
  };

  const handleDownloadChart = (format: 'png' | 'jpeg' | 'jpg') => {
    if (!activeCategory) return;
    exportChartToImage(
      'active-recharts-pane',
      format,
      `${activeCategory.id}${selectedYear === 'all' ? '' : `_${selectedYear}`}_stat_grafik`,
    );
  };

  if (!activeCategory || !activePresentation) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm">
        Data statistik {villageProfile.name} belum dikonfigurasi.
      </div>
    );
  }

  if (selectedCategoryIndex === null) {
    return (
      <div id="data-desa-view" className="space-y-6">
        <div className="bg-teal-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
          <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=900&auto=format&fit=crop')" }} />
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="text-teal-300 font-bold text-xs uppercase tracking-widest bg-teal-800/60 px-3 py-1 rounded-full border border-teal-700/50">DATA STATS</span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">Katalog Statistik {villageProfile.name}</h1>
            <p className="text-teal-150 text-sm md:text-base font-light leading-relaxed">
              Pilih laporan statistik untuk membaca ringkasan data, melihat grafik interaktif, dan mengunduh dokumen pendukung.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-gray-150 pb-4">
          <div>
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Laporan Terbit</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Data Statistik Terbaru</h2>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 shadow-sm">
            <Database className="h-4 w-4 text-teal-600" />
            {statistics.length} Dataset
          </span>
        </div>

        <div className="space-y-4">
          {statistics.map((cat, index) => {
            const meta = getCategoryMeta(cat);
            const summary = getStatisticPresentation(cat);

            return (
              <button
                key={cat.id || index}
                id={`stat-news-card-${cat.id}`}
                onClick={() => {
                  setActiveCategoryIndex(index);
                  setSelectedCategoryIndex(index);
                }}
                className="group w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-teal-200 transition-all active:scale-98 cursor-pointer"
              >
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto]">
                  <div className="relative h-48 md:h-full min-h-[180px] bg-gray-100 overflow-hidden">
                    <img
                      src={meta.image}
                      alt={cat.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 px-2.5 py-1 bg-teal-600 text-white rounded-full text-[10px] font-bold tracking-wider uppercase shadow">
                      {meta.category}
                    </span>
                  </div>

                  <div className="p-5 md:p-6 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Database className="h-3.5 w-3.5 text-teal-600" />
                            {summary.rowCount} Baris · {summary.columnCount} Kolom
                          </span>
                        <span className="h-3 w-px bg-gray-200" />
                        <span>{getChartTypeLabel(cat.type)}</span>
                      </div>
                      <h3 className="font-extrabold text-lg md:text-xl text-gray-950 leading-snug group-hover:text-teal-700 transition-colors">
                        {cat.title}
                      </h3>
                      <p className="text-gray-550 text-sm leading-relaxed line-clamp-2">
                        {cat.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Isi Tabel</p>
                        <p className="mt-1 text-sm font-black text-gray-900">
                          {summary.rowCount} baris
                        </p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sorotan</p>
                        <p className="mt-1 text-sm font-black text-gray-900 truncate">{summary.topItem?.label || '-'}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sumber</p>
                        <p className="mt-1 text-sm font-black text-gray-900 truncate">{meta.source}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5 md:p-6 md:w-40 flex md:flex-col items-center md:items-end justify-between gap-4 bg-gray-50/70 border-t md:border-t-0 md:border-l border-gray-100">
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">
                      Baca Data
                    </span>
                    <span className="h-10 w-10 rounded-full bg-white border border-gray-200 text-teal-700 flex items-center justify-center shadow-sm group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div id="data-desa-view" className="space-y-6">
      <button
        id="back-to-stat-list"
        onClick={() => setSelectedCategoryIndex(null)}
        className="inline-flex items-center space-x-2 text-sm font-bold text-teal-600 hover:text-teal-850 cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Daftar Data Stats</span>
      </button>

      {/* 1. Header Row */}
      <div className="bg-teal-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
        <img
          src={getCategoryMeta(activeCategory).image}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-15"
        />
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-teal-300 font-bold text-xs uppercase tracking-widest bg-teal-800/60 px-3 py-1 rounded-full border border-teal-700/50">
            {getCategoryMeta(activeCategory).category} DATA STORY
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-sans">{activeCategory.title}</h1>
          <p className="text-teal-150 text-sm md:text-base font-light leading-relaxed">
            {activeCategory.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-teal-600" />
            <h2 className="font-extrabold text-lg text-gray-950">Penjelasan Statistik</h2>
          </div>
          <div className="text-sm text-gray-600 leading-relaxed space-y-3 text-justify">
            <p>
              Dataset ini menjelaskan {getCategoryMeta(activeCategory).focus.toLowerCase()} berdasarkan rekap data {villageProfile.name}. Informasi disajikan untuk membantu warga, aparatur, dan pemangku kepentingan membaca kondisi wilayah secara cepat sebelum melihat grafik rinci.
            </p>
            {activePresentation.numericColumnCount > 0 ? (
              <p>
                Tabel memuat <strong className="text-gray-900">{activePresentation.rowCount} baris</strong> dan <strong className="text-gray-900">{activePresentation.columnCount} kolom</strong>. Total seluruh sel angka yang sedang ditampilkan adalah <strong className="text-gray-900">{activePresentation.total.toLocaleString('id-ID')}</strong>
                {activePresentation.topItem ? (
                  <> dengan nilai terbesar pada <strong className="text-gray-900">{activePresentation.topItem.label}</strong>.</>
                ) : '.'}
              </p>
            ) : (
              <p>
                Tabel memuat <strong className="text-gray-900">{activePresentation.rowCount} baris</strong> dan <strong className="text-gray-900">{activePresentation.columnCount} kolom</strong>. Grafik tidak dibuat karena struktur tabel belum memiliki kolom bertipe angka.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-gray-950 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            Ringkasan Data
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <span className="text-xs font-bold text-gray-500">Jenis Grafik</span>
              <span className="text-xs font-black text-gray-900">{getChartTypeLabel(activeCategory.type)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <span className="text-xs font-bold text-gray-500">Ukuran Tabel</span>
              <span className="text-xs font-black text-gray-900">{activePresentation.rowCount} baris · {activePresentation.columnCount} kolom</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <span className="text-xs font-bold text-gray-500">Kolom Angka</span>
              <span className="text-xs font-black text-gray-900">{activePresentation.numericColumnCount} kolom</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <span className="text-xs font-bold text-gray-500">Sumber Data</span>
              <span className="text-xs font-black text-gray-900 text-right">{getCategoryMeta(activeCategory).source}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Statistic Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Chart Pane (8 Rows on Large screen) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="space-y-1">
              <h3 id="active-stat-title" className="font-extrabold text-lg md:text-xl text-gray-900 tracking-tight leading-snug">
                {activeCategory.title}
              </h3>
              <p id="active-stat-desc" className="text-gray-500 text-xs md:text-sm leading-relaxed">
                {activeCategory.description}
              </p>
            </div>

            {activePresentation.yearLeaf &&
              activePresentation.availableYears.length > 0 && (
                <label className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-gray-150 bg-gray-50 px-3 py-2 md:self-center">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase text-gray-500">
                    {activePresentation.yearLeaf.column.label}:
                  </span>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    className="rounded border border-gray-200 bg-white p-1 text-[11px] font-bold text-gray-700"
                  >
                    <option value="all">Semua</option>
                    {activePresentation.availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              )}
          </div>

          {/* Interactive Recharts container */}
          <div
            id="active-recharts-pane"
            className="w-full h-[320px] md:h-[380px] bg-gray-50/50 rounded-2xl border border-gray-100 p-4 md:p-6 flex items-center justify-center relative shadow-inner overflow-hidden"
          >
            {!hasChartData ? (
              <div className="px-6 text-center text-xs font-medium leading-relaxed text-gray-400">
                Grafik belum dapat dibuat. Pastikan tabel memiliki baris data dan
                minimal satu kolom bertipe angka.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {activeCategory.type === 'bar' ? (
                  <BarChart data={activePresentation.chartRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      stroke="#6B7280"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const label = String(value);
                        return label.length > 18 ? `${label.slice(0, 18)}…` : label;
                      }}
                    />
                    <YAxis
                      stroke="#6B7280"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString('id-ID', {
                          notation: 'compact',
                          maximumFractionDigits: 1,
                        })
                      }
                    />
                    <Tooltip cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    {activePresentation.series.length > 1 && (
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    )}
                    {activePresentation.series.map((series, seriesIndex) => (
                      <Bar
                        key={series.key}
                        dataKey={series.key}
                        name={series.label}
                        fill={COLORS[seriesIndex % COLORS.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      >
                        {activePresentation.series.length === 1 &&
                          activePresentation.chartRows.map((_, rowIndex) => (
                            <Cell
                              key={`cell-${rowIndex}`}
                              fill={COLORS[rowIndex % COLORS.length]}
                            />
                          ))}
                      </Bar>
                    ))}
                  </BarChart>
                ) : activeCategory.type === 'line' ? (
                  <LineChart data={activePresentation.chartRows} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="label"
                      stroke="#6B7280"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value) => {
                        const label = String(value);
                        return label.length > 18 ? `${label.slice(0, 18)}…` : label;
                      }}
                    />
                    <YAxis
                      stroke="#6B7280"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) =>
                        Number(value).toLocaleString('id-ID', {
                          notation: 'compact',
                          maximumFractionDigits: 1,
                        })
                      }
                    />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    {activePresentation.series.map((series, seriesIndex) => (
                      <Line
                        key={series.key}
                        name={series.label}
                        type="monotone"
                        dataKey={series.key}
                        stroke={COLORS[seriesIndex % COLORS.length]}
                        strokeWidth={3}
                        activeDot={{ r: 7 }}
                        dot={{ r: 4, strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={activePresentation.pieData}
                      cx="50%"
                      cy="48%"
                      nameKey="label"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius="80%"
                      innerRadius={activeCategory.type === 'donut' ? '54%' : '0%'}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activePresentation.pieData.map((_, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Export Graph Buttons Area */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100">
            <span className="text-gray-400 font-bold text-[10px] tracking-wider uppercase flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-teal-600" />
              Ekspor visual grafik:
            </span>
            <div className="flex gap-2">
              <button
                id="export-png-btn"
                disabled={!hasChartData}
                onClick={() => handleDownloadChart('png')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unduh PNG
              </button>
              <button
                id="export-jpg-btn"
                disabled={!hasChartData}
                onClick={() => handleDownloadChart('jpg')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unduh JPG
              </button>
              <button
                id="export-jpeg-btn"
                disabled={!hasChartData}
                onClick={() => handleDownloadChart('jpeg')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              >
                Unduh JPEG
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Tabular Spreadsheet Data Views & Document Downloader */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Document Downloader Card */}
          <div className="bg-teal-950 text-teal-100 rounded-3xl p-6 border border-teal-850 shadow-md space-y-4">
            <h4 className="font-extrabold text-white text-sm tracking-tight flex items-center space-x-2">
              <Download className="h-4 w-4 text-teal-400" />
              <span>Dokumen Statistik Resmi</span>
            </h4>
            <p className="text-teal-300 text-xs">
              CSV, Excel, dan PDF mengikuti susunan grup, kolom, serta baris
              tabel{selectedYear !== 'all' ? ` untuk ${activePresentation.yearLeaf?.column.label || 'tahun'} ${selectedYear}` : ''}.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <button
                id="export-csv-btn"
                onClick={handleDownloadCSV}
                className="w-full py-3 px-4 bg-teal-900 hover:bg-teal-800 border border-teal-800 text-white rounded-xl text-xs font-bold leading-none flex items-center justify-between transition-all active:scale-98 group cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Unduh Dokumen CSV (.csv)</span>
                </span>
                <span className="text-[10px] bg-teal-800 px-2 py-0.5 rounded text-teal-300">Tabel Aktif</span>
              </button>

              <button
                id="export-excel-btn"
                onClick={handleDownloadExcel}
                className="w-full py-3 px-4 bg-teal-900 hover:bg-teal-850 border border-teal-800 text-white rounded-xl text-xs font-bold leading-none flex items-center justify-between transition-all active:scale-98 group cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Unduh Dokumen Excel (.xlsx)</span>
                </span>
                <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded text-amber-300 font-semibold uppercase font-mono">XLSX</span>
              </button>

              <button
                id="export-pdf-official-btn"
                onClick={handleDownloadPDF}
                className="w-full py-3 px-4 bg-teal-800 hover:bg-teal-700 hover:text-white border border-teal-700/50 text-white rounded-xl text-xs font-bold leading-none flex items-center justify-between transition-all active:scale-98 group cursor-pointer"
              >
                <span className="flex items-center space-x-2">
                  <FileDown className="h-4 w-4 text-teal-350 group-hover:scale-110 transition-transform" />
                  <span>Cetak Dokumen Laporan PDF</span>
                </span>
                <span className="text-[10px] bg-teal-900 text-teal-350 px-2 py-0.5 rounded uppercase font-bold">Kop Surat</span>
              </button>
            </div>
          </div>

          {/* Accessible Table View Panel */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-150">
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                Tabel Data Statistik
              </h4>
              <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                {activePresentation.rowCount} baris
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              {activeCategory.table ? (
                <table className="min-w-full border-collapse text-xs text-gray-600">
                  <thead className="bg-teal-50 text-teal-950">
                    {structuredHeaderRows.map((headerRow, rowIndex) => (
                      <tr key={rowIndex}>
                        {headerRow.map(({ column, colSpan, rowSpan }) => (
                          <th
                            key={column.id}
                            colSpan={colSpan}
                            rowSpan={rowSpan}
                            className="min-w-32 border border-teal-100 p-3 text-center font-extrabold"
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {activePresentation.filteredTable.rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={structuredLeaves.length}
                          className="p-8 text-center italic text-gray-400"
                        >
                          Belum ada baris data.
                        </td>
                      </tr>
                    ) : (
                      activePresentation.filteredTable.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          {structuredLeaves.map((leaf) => {
                            const value = row.values[leaf.column.id] ?? '';
                            return (
                              <td
                                key={leaf.column.id}
                                className={`border border-gray-100 p-3 ${
                                  leaf.column.dataType === 'number'
                                    ? 'text-right font-mono font-bold text-gray-900'
                                    : 'font-semibold text-gray-800'
                                }`}
                              >
                                {typeof value === 'number'
                                  ? value.toLocaleString('id-ID')
                                  : value}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse text-left text-xs text-gray-600">
                  <thead className="border-b border-gray-200 bg-gray-50/50 font-bold text-gray-800">
                    <tr>
                      <th className="p-3">Indikator Parameter</th>
                      <th className="p-3 text-right">Nilai Angka</th>
                      <th className="p-3 text-right">Mata Persen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activePresentation.pieData.map((item, idx) => {
                      const percentage =
                        activePresentation.total > 0
                          ? ((item.value / activePresentation.total) * 100).toFixed(1)
                          : '0.0';
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="flex items-center space-x-2 p-3 font-semibold text-gray-800">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                            <span>{item.label}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-gray-900">
                            {item.value.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-gray-500">
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
