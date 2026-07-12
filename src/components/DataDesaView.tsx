/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Layers,
  TrendingUp,
} from 'lucide-react';
import { StatisticCategory, VillageProfile } from '../types';
import { exportToCSV, exportToExcel, exportToPDF, exportChartToImage } from '../utils/exportHelpers';

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

const STAT_CARD_META: Record<string, { category: string; image: string; source: string; focus: string }> = {
  kependudukan: {
    category: 'Demografi',
    image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop',
    source: 'Basis Data Kependudukan Desa',
    focus: 'Komposisi warga dan rasio penduduk',
  },
  pendidikan: {
    category: 'Pendidikan',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
    source: 'Pendataan Profil Keluarga',
    focus: 'Jenjang pendidikan formal warga',
  },
  pekerjaan: {
    category: 'Ekonomi',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800&auto=format&fit=crop',
    source: 'Rekap Mata Pencaharian',
    focus: 'Sebaran pekerjaan dan aktivitas produktif',
  },
  pertanian: {
    category: 'Pertanian',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop',
    source: 'Laporan Produksi Tahunan',
    focus: 'Volume hasil pangan dan perkebunan',
  },
};

export default function DataDesaView({ statistics, villageProfile }: DataDesaViewProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(0);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const activeCategory = statistics[activeCategoryIndex] || statistics[0];

  // Year filter states
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [startYear, setStartYear] = useState<string>('2023');
  const [endYear, setEndYear] = useState<string>('2026');
  const [granularity, setGranularity] = useState<'tahunan' | 'triwulan' | 'bulanan'>('tahunan');

  const yearsList = ['2023', '2024', '2025', '2026'];

  const getCategoryMeta = (cat: StatisticCategory) => {
    const metaKey = Object.keys(STAT_CARD_META).find((key) => cat.id.includes(key));
    const baseMeta = (metaKey ? STAT_CARD_META[metaKey] : null) || {
      category: `Statistik ${villageProfile.contentLabel || 'Wilayah'}`,
      image: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=800&auto=format&fit=crop',
      source: `Open Data ${villageProfile.name}`,
      focus: 'Ringkasan indikator statistik wilayah',
    };
    return {
      ...baseMeta,
      source: baseMeta.source.replace(/Desa/g, villageProfile.contentLabel || 'Wilayah'),
    };
  };

  const getCategoryTotal = (cat: StatisticCategory) => cat.items.reduce((acc, curr) => acc + curr.value, 0);

  const getTopItem = (cat: StatisticCategory) =>
    cat.items.reduce<StatisticCategory['items'][number] | null>((top, item) => {
      if (!top || item.value > top.value) return item;
      return top;
    }, null);

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

  // Factor to scale values to show differences per year
  const getYearMultiplier = (year: string) => {
    switch(year) {
      case '2023': return 0.88;
      case '2024': return 0.92;
      case '2025': return 0.96;
      case '2026':
      default: return 1.0;
    }
  };

  // 1. Process standard chart data scaled by year
  const processedItems = (activeCategory?.items || []).map(item => ({
    ...item,
    value: Math.round(item.value * getYearMultiplier(selectedYear))
  }));

  // 2. Process time-series based on activeCategory (Used for Line Charts)
  const generateTimeSeriesData = () => {
    const start = parseInt(startYear);
    const end = parseInt(endYear);
    const selectedYears = Array.from({ length: Math.max(1, end - start + 1) }, (_, i) => String(start + i));

    const records: { label: string; value: number }[] = [];

    selectedYears.forEach(yr => {
      const mult = getYearMultiplier(yr);
      
      if (granularity === 'bulanan') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        months.forEach((m, mIdx) => {
          const baseSum = (activeCategory?.items || []).reduce((acc, curr) => acc + curr.value, 0) / ((activeCategory?.items || []).length || 1);
          const monthFactor = 0.8 + Math.sin((mIdx / 11) * Math.PI) * 0.4;
          records.push({
            label: `${m} ${yr}`,
            value: Math.round(baseSum * mult * monthFactor * 0.15 + 10)
          });
        });
      } else if (granularity === 'triwulan') {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        quarters.forEach((q, qIdx) => {
          const baseSum = (activeCategory?.items || []).reduce((acc, curr) => acc + curr.value, 0) / ((activeCategory?.items || []).length || 1);
          const qFactor = 0.9 + Math.cos((qIdx / 3) * Math.PI) * 0.2;
          records.push({
            label: `${q} ${yr}`,
            value: Math.round(baseSum * mult * qFactor * 0.45 + 25)
          });
        });
      } else {
        // Tahunan
        (activeCategory?.items || []).forEach(item => {
          records.push({
            label: `${item.label} (${yr})`,
            value: Math.round(item.value * mult)
          });
        });
      }
    });

    return records;
  };

  const chartData = activeCategory?.type === 'line' ? generateTimeSeriesData() : processedItems;
  const total = chartData.reduce((acc, curr) => acc + curr.value, 0) || 0;

  const handleDownloadCSV = () => {
    if (!activeCategory) return;
    exportToCSV({ ...activeCategory, items: chartData });
  };

  const handleDownloadExcel = () => {
    if (!activeCategory) return;
    exportToExcel({ ...activeCategory, items: chartData });
  };

  const handleDownloadPDF = () => {
    if (!activeCategory) return;
    exportToPDF({ ...activeCategory, items: chartData }, villageProfile);
  };

  const handleDownloadChart = (format: 'png' | 'jpeg' | 'jpg') => {
    if (!activeCategory) return;
    exportChartToImage('active-recharts-pane', format, `${activeCategory.id}_stat_grafik`);
  };

  if (statistics.length === 0) {
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
            const totalValue = getCategoryTotal(cat);
            const topItem = getTopItem(cat);

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
                          <Calendar className="h-3.5 w-3.5 text-teal-600" />
                          Data 2026
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Data</p>
                        <p className="mt-1 text-sm font-black text-gray-900">{totalValue.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Sorotan</p>
                        <p className="mt-1 text-sm font-black text-gray-900 truncate">{topItem?.label || '-'}</p>
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
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url('${getCategoryMeta(activeCategory).image}')` }} />
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
            <p>
              Total nilai yang tercatat pada kategori ini adalah <strong className="text-gray-900">{getCategoryTotal(activeCategory).toLocaleString('id-ID')}</strong>. Indikator dengan nilai terbesar saat ini adalah <strong className="text-gray-900">{getTopItem(activeCategory)?.label || '-'}</strong>, sehingga dapat menjadi perhatian utama dalam evaluasi layanan dan perencanaan program.
            </p>
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
              <span className="text-xs font-bold text-gray-500">Jumlah Indikator</span>
              <span className="text-xs font-black text-gray-900">{activeCategory.items.length} Parameter</span>
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

            {/* YEAR & TIME RANGE FILTER SELECTORS */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              {activeCategory.type === 'line' ? (
                /* Time Series Controls */
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-150">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <select
                      value={startYear}
                      onChange={(e) => setStartYear(e.target.value)}
                      className="bg-white border border-gray-200 rounded p-1 text-[11px] font-bold text-gray-750"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y} disabled={parseInt(y) > parseInt(endYear)}>{y}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-400 font-bold">s/d</span>
                    <select
                      value={endYear}
                      onChange={(e) => setEndYear(e.target.value)}
                      className="bg-white border border-gray-200 rounded p-1 text-[11px] font-bold text-gray-750"
                    >
                      {yearsList.map(y => (
                        <option key={y} value={y} disabled={parseInt(y) < parseInt(startYear)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-indigo-600" />
                    <select
                      value={granularity}
                      onChange={(e) => setGranularity(e.target.value as any)}
                      className="bg-white border border-gray-200 rounded p-1 text-[11px] font-bold text-gray-750"
                    >
                      <option value="tahunan">Tahunan</option>
                      <option value="triwulan">Triwulan</option>
                      <option value="bulanan">Bulanan</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Standard Chart Year Select */
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-150">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Tahun Data:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-white border border-gray-200 rounded p-1 text-[11px] font-bold text-gray-700"
                  >
                    {yearsList.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Recharts container */}
          <div
            id="active-recharts-pane"
            className="w-full h-[320px] md:h-[380px] bg-gray-50/50 rounded-2xl border border-gray-100 p-4 md:p-6 flex items-center justify-center relative shadow-inner overflow-hidden"
          >
            {chartData.length === 0 ? (
              <div className="text-gray-400 font-medium text-xs">Kosong, belum ada nilai parameter.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {/* Dynamically render whichever diagram type matches the configuration */}
                {activeCategory.type === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <Tooltip cursor={{ fill: 'rgba(13, 148, 136, 0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28}>
                      {chartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : activeCategory.type === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#6B7280" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      name={`${activeCategory.title.split(' ').slice(-1)[0] || 'Hasil'} (${granularity === 'bulanan' ? 'Bulanan' : granularity === 'triwulan' ? 'Triwulan' : 'Tahunan'})`}
                      type="monotone"
                      dataKey="value"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      dot={{ r: 5, strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  // Pie or Donut implementations
                  <PieChart>
                    <Pie
                      data={chartData}
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
                      {chartData.map((entry, idx) => (
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
                onClick={() => handleDownloadChart('png')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Unduh PNG
              </button>
              <button
                id="export-jpg-btn"
                onClick={() => handleDownloadChart('jpg')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                Unduh JPG
              </button>
              <button
                id="export-jpeg-btn"
                onClick={() => handleDownloadChart('jpeg')}
                className="px-3 py-1.5 border border-gray-200 hover:border-teal-500 hover:bg-teal-50 text-gray-700 hover:text-teal-800 text-[11px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer"
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
              Unduh data numerik mentah terlampir dalam format dokumen tabel resmi pemerintah atau cetak sebagai surat laporan.
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
                <span className="text-[10px] bg-teal-800 px-2 py-0.5 rounded text-teal-300">Data Mandiri</span>
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
                <span className="text-[10px] bg-amber-950 px-2 py-0.5 rounded text-amber-300 font-semibold uppercase font-mono">XLS</span>
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
                Raw Spreadsheet Data
              </h4>
              <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                N = {total.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-xs text-gray-600 border-collapse">
                <thead className="bg-gray-50/50 text-gray-800 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Indikator Parameter</th>
                    <th className="p-3 text-right">Nilai Angka</th>
                    <th className="p-3 text-right">Mata Persen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chartData.map((item, idx) => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-gray-800 flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span>{item.label}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-900">{item.value.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-right text-gray-500 font-medium font-mono">{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
