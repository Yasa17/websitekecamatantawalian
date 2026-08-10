import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Inbox, LoaderCircle, Mail, Phone, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';
import { CitizenSubmission, CitizenSubmissionStatus } from '../types';

const statusOptions: Array<{ value: CitizenSubmissionStatus; label: string }> = [
  { value: 'new', label: 'Baru' },
  { value: 'in_progress', label: 'Sedang diproses' },
  { value: 'resolved', label: 'Selesai' },
  { value: 'rejected', label: 'Tidak dapat ditindaklanjuti' },
];

const kindLabel = {
  aspirasi: 'Aspirasi',
  aduan: 'Aduan',
  pertanyaan: 'Pertanyaan',
};

export default function CitizenSubmissionManager() {
  const [items, setItems] = useState<CitizenSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | CitizenSubmissionStatus>('all');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(() => new Set());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiRequest<{ data: CitizenSubmission[] }>(
        '/api/admin/citizen-submissions',
      );
      setItems(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Data warga gagal dimuat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.status === filter),
    [filter, items],
  );

  const changeStatus = async (item: CitizenSubmission, status: CitizenSubmissionStatus) => {
    setUpdatingIds((current) => new Set(current).add(item.id));
    setError('');
    try {
      await apiRequest(`/api/admin/citizen-submissions/${encodeURIComponent(item.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setItems((current) => current.map((entry) =>
        entry.id === item.id ? { ...entry, status } : entry));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Status gagal diperbarui.');
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
            Aspirasi & Aduan Warga
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Hanya kiriman untuk wilayah tugas akun ini yang ditampilkan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Muat Ulang
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: 'all', label: `Semua (${items.length})` }, ...statusOptions].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value as typeof filter)}
            className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold ${
              filter === option.value
                ? 'bg-teal-700 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-12 text-xs text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" /> Memuat kiriman warga...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">Belum ada kiriman pada filter ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-indigo-700">
                      {kindLabel[item.kind]}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{item.category}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} · Ref. {item.id}
                  </p>
                </div>
                <select
                  value={item.status}
                  disabled={updatingIds.has(item.id)}
                  onChange={(event) => void changeStatus(
                    item,
                    event.target.value as CitizenSubmissionStatus,
                  )}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                {item.message}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-slate-500">
                <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 hover:text-teal-700">
                  <Mail className="h-3.5 w-3.5" /> {item.email}
                </a>
                {item.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {item.phone}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
