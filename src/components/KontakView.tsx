/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { VillageProfile } from '../types';
import { apiRequest } from '../services/api';

interface KontakViewProps {
  villageProfile: VillageProfile;
  entityId: string;
}

export default function KontakView({ villageProfile, entityId }: KontakViewProps) {
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const officeLabel = villageProfile.officeLabel || (unitLabel === 'Kecamatan' ? 'Kantor Kecamatan' : 'Kantor Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : 'Kepala Desa');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    kind: 'aspirasi',
    subject: '',
    message: '',
    website: '',
  });

  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const activeEntityIdRef = useRef(entityId);

  useEffect(() => {
    activeEntityIdRef.current = entityId;
    setIsSubmitSuccess(false);
    setReferenceId('');
    setSubmitError('');
    setLoading(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      kind: 'aspirasi',
      subject: '',
      message: '',
      website: '',
    });
  }, [entityId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError('');
    setIsSubmitSuccess(false);
    try {
      const response = await apiRequest<{ success: boolean; referenceId: string }>(
        '/api/citizen-submissions',
        {
          method: 'POST',
          body: JSON.stringify({
            entityId,
            kind: formData.kind,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            category: formData.subject,
            message: formData.message,
            website: formData.website,
          }),
        },
      );
      if (activeEntityIdRef.current !== entityId) return;
      setReferenceId(response.referenceId);
      setIsSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        kind: 'aspirasi',
        subject: '',
        message: '',
        website: '',
      });
    } catch (error) {
      if (activeEntityIdRef.current !== entityId) return;
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Aspirasi atau aduan belum berhasil dikirim.',
      );
    } finally {
      if (activeEntityIdRef.current === entityId) setLoading(false);
    }
  };

  return (
    <div id="kontak-view" className="space-y-6">
      {/* 1. Page Title banner */}
      <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=600&auto=format&fit=crop')" }} />
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-teal-300 font-bold text-xs uppercase tracking-widest bg-teal-850/60 px-3 py-1 rounded-full border border-teal-700/50">LAYANAN ADUAN</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Kanal Kontak Pelayanan {unitLabel}</h1>
          <p className="text-teal-150 text-sm md:text-base font-light leading-relaxed">
            Hubungi {officeLabel} {villageProfile.name} melalui form saran aspirasi, surel resmi, nomor WhatsApp, atau berkunjung langsung ke loket pelayanan {headRole}.
          </p>
        </div>
      </div>

      {/* 2. Interactive Grid: Contact Parameters vs Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Coordinates / Information details (5 rows) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-sm">
            <h4 className="font-extrabold text-gray-900 text-lg tracking-tight uppercase border-b border-gray-100 pb-3">
              Informasi Penghubung
            </h4>

            {/* Direct contact info entries */}
            <div className="space-y-5">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-100 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-400 font-mono tracking-wider uppercase mb-1">ALAMAT {officeLabel.toUpperCase()}</h5>
                  <p className="text-gray-700 text-sm leading-relaxed">{villageProfile.address}</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shrink-0">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-400 font-mono tracking-wider uppercase mb-1">LAYANAN TELEPON & HOTLINE WA</h5>
                  <p className="text-gray-700 text-sm font-semibold">{villageProfile.phone}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Jam pelayanan: {villageProfile.serviceHours || 'Senin–Jumat, 08.00–15.00 WITA'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-gray-400 font-mono tracking-wider uppercase mb-1">SURAT ELEKTRONIK AKREDITASI</h5>
                  <p className="text-gray-700 text-sm font-semibold hover:text-teal-600 transition-colors">
                    {villageProfile.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice Panel */}
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start space-x-4 text-amber-900">
            <Info className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold">Mekanisme Pengaduan Hukum (Aman)</h5>
              <p className="text-amber-800 leading-relaxed leading-normal text-justify">
                Data formulir hanya dapat dibaca oleh operator wilayah yang berwenang dan digunakan untuk menindaklanjuti pelayanan {unitLabel}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Active Feedback inputs form (7 rows) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
          <div className="space-y-1 pb-3 border-b border-gray-100">
            <h4 id="form-aspirasi-header" className="font-extrabold text-gray-900 text-lg tracking-tight uppercase">
              Formulir Aspirasi & Aduan Warga
            </h4>
            <p className="text-gray-450 text-xs text-justify">
              Silakan lengkapi kolom formulir di bawah dengan santun untuk menyampaikan tanggapan membangun, pelaporan masalah, maupun pertanyaan perihal layanan {unitLabel.toLowerCase()}.
            </p>
          </div>

          {/* Toast Notification for Submit Success */}
          {isSubmitSuccess && (
            <div id="submit-success-toast" className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 animate-slideUp">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm">Aspirasi Berhasil Terkirim!</h5>
                <p className="text-xs text-emerald-700 mt-1 text-justify">
                  Hatur nuhun! Pesan kritik/saran Anda telah berhasil terekam di sistem digital {unitLabel.toLowerCase()}. Jajaran pengurus administrasi akan melakukan validasi dan pemrosesan secepatnya.
                </p>
                <p className="mt-1 font-mono text-[10px] text-emerald-800">
                  Nomor referensi: {referenceId}
                </p>
              </div>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-xs leading-relaxed">{submitError}</p>
            </div>
          )}

          {/* Dynamic Suggestion Form */}
          <form id="kontak-feedback-form" onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Nama Lengkap Anda</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Contoh: Sukarna Dinata"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Alamat Email Aktif</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="sukarna@email.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Nomor HP/WhatsApp</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Contoh: 0812xxxx (Opsional)"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Jenis Kiriman</label>
                <select
                  name="kind"
                  value={formData.kind}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-white transition-all text-gray-700"
                >
                  <option value="aspirasi">Aspirasi / Saran</option>
                  <option value="aduan">Aduan / Laporan</option>
                  <option value="pertanyaan">Pertanyaan Pelayanan</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Kategori Aspirasi / Aduan</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-white transition-all text-gray-700"
                >
                  <option value="">-- Silakan Pilih Kategori --</option>
                  <option value="Saran Pembangunan">Saran Pembangunan {unitLabel}</option>
                  <option value="Kritik Pelayanan Perangkat">Kritik Pelayanan Staf Perangkat</option>
                  <option value="Pengaduan Kerusakan Infrastruktur">Kerusakan Infrastruktur Jembatan/Jalan</option>
                  <option value="Pelayanan Administrasi Kependudukan">Persoalan Layanan Administrasi Kependudukan</option>
                  <option value="Lainnya">Lainnya / Umum</option>
                </select>
            </div>

            <div className="hidden" aria-hidden="true">
              <label>
                Situs web
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase">Rincian Aspirasi / Aduan Anda</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                required
                rows={5}
                placeholder="Tuliskan isi aduan atau aspirasi Anda secara lengkap dan santun beserta lokasi yang dirujuk jika ada..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all leading-normal"
              />
            </div>

            <button
              type="submit"
              id="submit-aduan-btn"
              disabled={loading}
              className={`w-full py-3.5 bg-gradient-to-r from-teal-700 to-teal-850 hover:brightness-110 font-bold rounded-xl text-xs text-white uppercase tracking-wider shadow flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                loading ? 'animate-pulse' : ''
              }`}
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Mengirim...' : 'Kirimkan Aspirasi / Aduan'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
