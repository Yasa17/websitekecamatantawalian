import React, { useMemo, useState } from 'react';
import { Building2, Calculator, LogOut, ShieldCheck, Users } from 'lucide-react';
import { AdminProfile, StatisticCategory } from '../types';

export interface DistrictEntitySummary {
  id: string;
  label: string;
  type: 'desa' | 'kelurahan';
  statistics: StatisticCategory[];
}

interface DistrictDataRecapProps {
  entities: DistrictEntitySummary[];
}

interface DistrictSummaryProps extends DistrictDataRecapProps {
  admin: AdminProfile;
  onLogout: () => void;
}

const baseCategoryId = (id: string) => id.split('-').at(-1) || id;

export function DistrictDataRecap({ entities }: DistrictDataRecapProps) {
  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    entities.forEach((entity) =>
      entity.statistics.forEach((category) => {
        const id = baseCategoryId(category.id);
        if (!options.has(id)) options.set(id, category.title);
      }),
    );
    return Array.from(options, ([id, title]) => ({ id, title }));
  }, [entities]);
  const [selectedCategory, setSelectedCategory] = useState('kependudukan');

  const activeCategory =
    categoryOptions.find((category) => category.id === selectedCategory)?.id ||
    categoryOptions[0]?.id ||
    '';
  const categoryFor = (entity: DistrictEntitySummary) =>
    entity.statistics.find((category) => baseCategoryId(category.id) === activeCategory);

  const labels = useMemo(
    () =>
      Array.from(
        new Set(
          entities.flatMap((entity) =>
            (entity.statistics.find(
              (category) => baseCategoryId(category.id) === activeCategory,
            )?.items || []).map((item) => item.label),
          ),
        ),
      ),
    [activeCategory, entities],
  );

  const valueFor = (entity: DistrictEntitySummary, label: string) =>
    categoryFor(entity)?.items.find((item) => item.label === label)?.value || 0;

  const totalResidents = entities.reduce((sum, entity) => {
    const population = entity.statistics.find(
      (category) => baseCategoryId(category.id) === 'kependudukan',
    );
    return sum + (population?.items.reduce((itemSum, item) => itemSum + item.value, 0) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-[0.18em]">
            Data otomatis dari desa dan kelurahan
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
            Rekap Data Kecamatan
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Nilai setiap tabel dijumlahkan otomatis. Data pada menu ini tidak dapat
            ditambah, diunggah, diubah, atau dihapus oleh admin kecamatan.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700">
          <ShieldCheck className="h-4 w-4" />
          Rekap baca-saja
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 items-center shadow-sm">
          <Building2 className="h-7 w-7 text-indigo-600" />
          <div>
            <p className="text-xs text-slate-500">Wilayah Terlapor</p>
            <p className="text-2xl font-black">{entities.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 items-center shadow-sm">
          <Users className="h-7 w-7 text-teal-600" />
          <div>
            <p className="text-xs text-slate-500">Total Penduduk</p>
            <p className="text-2xl font-black">{totalResidents.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 items-center shadow-sm">
          <Calculator className="h-7 w-7 text-amber-600" />
          <div>
            <p className="text-xs text-slate-500">Kategori Tabel</p>
            <p className="text-2xl font-black">{categoryOptions.length}</p>
          </div>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900">Tabel Penjumlahan Kecamatan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Pilih kategori untuk melihat nilai setiap wilayah dan totalnya.
            </p>
          </div>
          <select
            value={activeCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold"
            disabled={!categoryOptions.length}
          >
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.title}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-extrabold sticky left-0 bg-slate-50 min-w-56">
                  Indikator
                </th>
                {entities.map((entity) => (
                  <th key={entity.id} className="px-5 py-3.5 font-bold text-right whitespace-nowrap">
                    {entity.label}
                  </th>
                ))}
                <th className="px-5 py-3.5 font-black text-right whitespace-nowrap bg-indigo-50 text-indigo-700">
                  Total Kecamatan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {labels.map((label) => (
                <tr key={label}>
                  <td className="px-5 py-3.5 font-bold text-slate-700 sticky left-0 bg-white">
                    {label}
                  </td>
                  {entities.map((entity) => (
                    <td key={entity.id} className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                      {valueFor(entity, label).toLocaleString('id-ID')}
                    </td>
                  ))}
                  <td className="px-5 py-3.5 text-right tabular-nums font-black text-indigo-700 bg-indigo-50/50">
                    {entities
                      .reduce((sum, entity) => sum + valueFor(entity, label), 0)
                      .toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
              {!labels.length && (
                <tr>
                  <td colSpan={entities.length + 2} className="px-5 py-10 text-center text-slate-400">
                    Belum ada data desa atau kelurahan untuk direkap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function DistrictSummary({
  admin,
  entities,
  onLogout,
}: DistrictSummaryProps) {
  return (
    <div className="min-h-screen bg-indigo-50/40">
      <header className="h-20 bg-slate-950 border-b border-slate-800 text-white px-5 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black text-sm sm:text-base">Panel Kecamatan Tawalian</p>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest">{admin.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-rose-950 hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </header>
      <main className="max-w-[1500px] mx-auto p-4 sm:p-7 lg:p-10">
        <DistrictDataRecap entities={entities} />
      </main>
    </div>
  );
}
