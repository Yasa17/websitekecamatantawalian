/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Newspaper, Image as ImageIcon, MapPin, ArrowRight, TrendingUp, Users, ShieldAlert } from 'lucide-react';
import { VillageProfile, StatisticCategory, News, GalleryItem } from '../types';
import { formatNewsDate, isNewsReleased, sortNewsNewestFirst } from '../utils/newsDate';

interface BerandaViewProps {
  villageProfile: VillageProfile;
  statistics: StatisticCategory[];
  news: News[];
  gallery: GalleryItem[];
  setCurrentTab: (tab: string) => void;
  setSelectedNews: (news: News | null) => void;
}

export default function BerandaView({
  villageProfile,
  statistics,
  news,
  gallery,
  setCurrentTab,
  setSelectedNews,
}: BerandaViewProps) {
  // Compute some high-level metrics for layout stats
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : 'Kepala Desa');
  const officeLabel = villageProfile.officeLabel || (unitLabel === 'Kecamatan' ? 'Kantor Kecamatan' : 'Kantor Desa');
  const genderStat = statistics.find((s) => s.id.includes('kependudukan') || s.title.toLowerCase().includes('kependudukan'));
  const totalWarga = genderStat
    ? genderStat.items.reduce((acc, curr) => acc + curr.value, 0)
    : null;
  const publishedNews = sortNewsNewestFirst(
    news.filter((item) => item.status === 'Published' && isNewsReleased(item)),
  );
  const activePhotos = gallery.length;

  return (
    <div id="beranda-view" className="space-y-12">
      {/* 1. Hero Jumbotron Section */}
      <div
        id="hero-jumbotron"
        className="relative rounded-3xl overflow-hidden shadow-2xl bg-teal-950 text-white min-h-[480px] flex items-center"
      >
        <div className="absolute inset-0 z-0 bg-cover bg-center brightness-35 mix-blend-multiply" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1596401057633-53102141663b?q=80&w=1200&auto=format&fit=crop')" }} />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
          <h1 id="hero-title" className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Selamat Datang di Portal Resmi <br />
            <span className="text-indigo-200 drop-shadow-[0_3px_16px_rgba(129,140,248,0.45)]">{villageProfile.name}</span>
          </h1>
          
          <p id="hero-desc" className="text-lg md:text-xl text-teal-100 max-w-2xl mx-auto font-light leading-relaxed">
            Pusat transparansi data kependudukan, informasi pembangunan, berita kegiatan terhangat, dan pelayanan digital partisipatif.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              id="hero-btn-profil"
              onClick={() => setCurrentTab('profil')}
              className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 rounded-xl font-bold shadow-lg transition-all flex items-center space-x-2 group active:scale-95 cursor-pointer"
            >
              <span>Jelajahi Profil {unitLabel}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              id="hero-btn-data"
              onClick={() => setCurrentTab('data')}
              className="px-6 py-3.5 bg-teal-905/80 hover:bg-teal-900 text-teal-100 border border-teal-700/50 rounded-xl font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Lihat Statistik Grafik
            </button>
          </div>
        </div>
      </div>

      {/* 2. Welcome Speech from Active Area Leader */}
      <div id="sambutan-kades" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-4 flex flex-col items-center text-center">
            <div className="relative rounded-2xl overflow-hidden border-4 border-teal-550/30 shadow-lg w-52 h-64 md:w-60 md:h-72">
              <img
                src={villageProfile.headPhotoUrl}
                alt={villageProfile.headName}
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-950 to-transparent p-4 pt-10 text-white">
                <p className="font-bold text-sm leading-tight">{villageProfile.headName}</p>
                <p className="text-[11px] text-teal-300 tracking-wider font-semibold uppercase mt-1">{headRole}</p>
              </div>
            </div>
            <div className="mt-4 hidden lg:block">
              <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100 uppercase tracking-widest leading-none">
                Masa Bakti: 2024 - 2030
              </span>
            </div>
          </div>
          
          <div className="lg:col-span-8 space-y-5">
            <div className="space-y-1">
              <span className="text-teal-600 font-bold text-sm uppercase tracking-wider block">SAMBUTAN {headRole.toUpperCase()}</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
                Mari Bersinergi Membangun {unitLabel} yang Responsif & Nyaman
              </h2>
            </div>
            
            <div className="relative">
              <span className="absolute -top-6 -left-3 text-7xl text-teal-100/75 select-none font-serif">“</span>
              <p className="text-gray-600 leading-relaxed text-sm md:text-base italic relative z-10">
                {villageProfile.welcomeText}
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-150 flex items-center space-x-3 text-gray-500 text-xs">
              <MapPin className="h-4 w-4 text-teal-600" />
              <span>{officeLabel}: {villageProfile.address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Visual Stat Cards */}
      <div id="quick-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 shadow-sm hover:scale-102 transition-transform">
          <div className="flex items-center justify-between mb-3 text-teal-600">
            <Users className="h-6 w-6" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-teal-700 bg-teal-100 px-2 py-0.5 rounded">TOTAL</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-teal-950 mt-1">
            {totalWarga === null ? 'Belum tersedia' : totalWarga.toLocaleString('id-ID')}
          </p>
          <h4 className="text-xs md:text-sm font-medium text-teal-800 mt-2">Jumlah Penduduk (Jiwa)</h4>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm hover:scale-102 transition-transform">
          <div className="flex items-center justify-between mb-3 text-emerald-600">
            <MapPin className="h-6 w-6" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">LUAS</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-slate-950 mt-1">{villageProfile.geographicData.area}</p>
          <h4 className="text-xs md:text-sm font-medium text-emerald-950 mt-2">Luas Wilayah Kerja</h4>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm hover:scale-102 transition-transform">
          <div className="flex items-center justify-between mb-3 text-amber-600">
            <Newspaper className="h-6 w-6" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-mono">PORTAL</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-950 mt-1">{publishedNews.length} Berita</p>
          <h4 className="text-xs md:text-sm font-medium text-amber-800 mt-2">Publikasi Terkini</h4>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm hover:scale-102 transition-transform">
          <div className="flex items-center justify-between mb-3 text-indigo-600">
            <ImageIcon className="h-6 w-6" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded font-mono">DOKUMEN</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-950 mt-1">{activePhotos} Foto</p>
          <h4 className="text-xs md:text-sm font-medium text-indigo-800 mt-2">Galeri Album Sosial</h4>
        </div>
      </div>

      {/* 4. Highlighted News Section */}
      <div id="berita-sorotan" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider block">INFORMASI TEKINI</span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Kabar Terbaru {unitLabel}</h3>
          </div>
          <button
            id="view-all-news-btn"
            onClick={() => setCurrentTab('berita')}
            className="flex items-center space-x-1 text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
          >
            <span>Semua Berita</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {publishedNews.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            belum tersedia rilis berita yang dipublikasikan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publishedNews.slice(0, 3).map((item) => (
              <div
                key={item.id}
                id={`featured-news-card-${item.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:scale-101 transition-all flex flex-col"
              >
                <div className="h-48 overflow-hidden bg-gray-100 relative">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-teal-600 text-white rounded-full text-[10px] font-bold tracking-wider uppercase shadow">
                      {item.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-gray-400 font-mono">
                      {formatNewsDate(item.datePublished, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <h4 className="font-bold text-gray-900 leading-snug line-clamp-2 hover:text-teal-600 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                  
                  <button
                    id={`read-featured-btn-${item.id}`}
                    onClick={() => {
                      setSelectedNews(item);
                      setCurrentTab('berita');
                    }}
                    className="w-full py-2.5 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 text-gray-700 border border-gray-100 rounded-lg text-xs font-semibold tracking-wide text-center transition-all cursor-pointer"
                  >
                    Baca Selengkapnya
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Miniature Gallery Snippet */}
      <div id="galeri-sekilas" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-teal-600 font-bold text-xs uppercase tracking-wider block">POTRET AKTIVITAS</span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">Galeri Gotong Royong Warga</h3>
          </div>
          <button
            id="view-all-gallery-btn"
            onClick={() => setCurrentTab('galeri')}
            className="flex items-center space-x-1 text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
          >
            <span>Semua Foto</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {gallery.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-150 p-8 text-center text-gray-400">
            belum tersedia foto dokumentasi.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.slice(0, 4).map((img, i) => (
              <div
                key={img.id || i}
                id={`featured-galeri-${img.id || i}`}
                className="group relative rounded-2xl overflow-hidden aspect-video md:aspect-square bg-gray-150 cursor-pointer shadow-sm"
                onClick={() => setCurrentTab('galeri')}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-teal-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-teal-300 tracking-wider">
                      {img.category}
                    </span>
                    <h5 className="font-semibold text-xs leading-snug mt-0.5 text-white line-clamp-1">{img.title}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
