import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, KeyRound, Landmark, LockKeyhole, ShieldCheck, User } from 'lucide-react';

interface AdminLoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onBack: () => void;
}

export default function AdminLoginPage({ onLogin, onBack }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await onLogin(username.trim(), password);
      if (!success) setError('Username/email atau password tidak sesuai.');
    } catch {
      setError('Backend tidak dapat dihubungi. Pastikan server sedang berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid lg:grid-cols-2">
      <section className="hidden lg:flex relative overflow-hidden p-12 xl:p-16 flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-950 to-teal-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_42%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-white/10 border border-white/10">
              <Landmark className="h-7 w-7 text-indigo-300" />
            </span>
            <div>
              <p className="font-black text-lg">Portal Administrasi Tawalian</p>
              <p className="text-xs text-slate-400">Panel internal pemerintah wilayah</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl">
          <p className="text-xs font-extrabold text-indigo-300 uppercase tracking-[0.2em]">
            Sistem berbasis peran
          </p>
          <h1 className="text-4xl xl:text-5xl font-black leading-tight mt-4">
            Kelola data desa.<br />Rekap kecamatan otomatis.
          </h1>
          <p className="text-slate-400 mt-5 leading-relaxed max-w-lg">
            Admin desa mengelola seluruh data wilayahnya. Admin kecamatan mengelola
            profil, berita, dan galeri kecamatan, sementara statistiknya berupa rekap
            baca-saja dari seluruh desa dan kelurahan.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <Building2 className="h-5 w-5 text-teal-300" />
              <p className="font-bold text-sm mt-3">Admin Desa</p>
              <p className="text-xs text-slate-500 mt-1">Kelola konten dan statistik</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <ShieldCheck className="h-5 w-5 text-indigo-300" />
              <p className="font-bold text-sm mt-3">Admin Kecamatan</p>
              <p className="text-xs text-slate-500 mt-1">Kelola konten & rekap data</p>
            </div>
          </div>
        </div>
        <p className="relative text-xs text-slate-600">Pemerintah Kecamatan Tawalian</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-10 relative">
        <button
          type="button"
          onClick={onBack}
          className="absolute left-5 top-5 sm:left-8 sm:top-8 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke website
        </button>

        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Landmark className="h-9 w-9 text-indigo-400 mx-auto" />
            <p className="font-black mt-3">Portal Administrasi Tawalian</p>
          </div>
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-9 shadow-2xl">
            <LockKeyhole className="h-8 w-8 text-indigo-400" />
            <h2 className="text-2xl font-black mt-5">Masuk ke panel admin</h2>
            <p className="text-sm text-slate-500 mt-2">
              Gunakan akun sesuai wilayah dan peran Anda.
            </p>

            {error && (
              <div className="mt-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-7">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Username atau Email
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <button
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 text-sm font-bold transition-colors"
              >
                {loading ? 'Memverifikasi...' : 'Masuk Panel Admin'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-[10px] leading-relaxed text-slate-500">
              Gunakan kredensial resmi dari pengelola sistem dan jangan membagikan
              password kepada pihak lain.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
