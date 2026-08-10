import React, { useEffect, useState } from 'react';
import { Clock3, Mail, MapPin, Phone, Save } from 'lucide-react';
import { VillageProfile } from '../types';

interface ContactSettingsEditorProps {
  villageProfile: VillageProfile;
  onSave: (profile: VillageProfile) => Promise<boolean>;
  showToast: (message: string, type?: 'success' | 'info') => void;
}
const contactFields = (profile: VillageProfile) => ({
  address: profile.address || '',
  phone: profile.phone || '',
  email: profile.email || '',
  serviceHours: profile.serviceHours || 'Senin–Jumat, 08.00–15.00 WITA',
  mapEmbedUrl: profile.mapEmbedUrl || '',
});

export default function ContactSettingsEditor({
  villageProfile,
  onSave,
  showToast,
}: ContactSettingsEditorProps) {
  const [form, setForm] = useState(() => contactFields(villageProfile));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(contactFields(villageProfile));
  }, [villageProfile]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const success = await onSave({
      ...villageProfile,
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      serviceHours: form.serviceHours.trim(),
      mapEmbedUrl: form.mapEmbedUrl.trim(),
    });
    setSaving(false);
    if (success) showToast('Informasi penghubung berhasil disimpan dan ditampilkan di website.');
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 md:text-2xl">
            Informasi Penghubung
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Data ini tampil pada halaman Kontak dan bagian bawah website.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Menyimpan...' : 'Simpan Informasi'}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-1.5 md:col-span-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600">
            <MapPin className="h-4 w-4 text-teal-600" /> Alamat Kantor
          </span>
          <textarea
            required
            rows={3}
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
        </label>

        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600">
            <Phone className="h-4 w-4 text-teal-600" /> Telepon / WhatsApp
          </span>
          <input
            required
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
        </label>

        <label className="space-y-1.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600">
            <Mail className="h-4 w-4 text-teal-600" /> Email Pelayanan
          </span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-gray-600">
            <Clock3 className="h-4 w-4 text-teal-600" /> Jam Pelayanan
          </span>
          <input
            required
            value={form.serviceHours}
            onChange={(event) => setForm({ ...form, serviceHours: event.target.value })}
            placeholder="Contoh: Senin–Jumat, 08.00–15.00 WITA"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
        </label>

        <label className="space-y-1.5 md:col-span-2">
          <span className="text-xs font-bold uppercase text-gray-600">
            Tautan Sematan Google Maps
          </span>
          <input
            required
            type="url"
            value={form.mapEmbedUrl}
            onChange={(event) => setForm({ ...form, mapEmbedUrl: event.target.value })}
            placeholder="https://www.google.com/maps?...&output=embed"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="text-[10px] leading-relaxed text-gray-400">
            Gunakan tautan HTTPS Google Maps yang berakhiran parameter output=embed.
          </p>
        </label>
      </div>
    </form>
  );
}
