/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Search, Calendar, User, ArrowLeft, ArrowRight, Share2, Tag, BookOpen, AlertCircle, PlayCircle } from 'lucide-react';
import { News } from '../types';
import { formatNewsDate, isNewsReleased, sortNewsNewestFirst } from '../utils/newsDate';
import { resolveVideoEmbed, type VideoEmbedProvider } from '../utils/videoEmbed';

interface PortalBeritaViewProps {
  news: News[];
  selectedNews: News | null;
  setSelectedNews: (news: News | null) => void;
}

export default function PortalBeritaView({
  news,
  selectedNews,
  setSelectedNews,
}: PortalBeritaViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Filter news only for Published articles
  const publishedNews = sortNewsNewestFirst(
    news.filter((item) => item.status === 'Published' && isNewsReleased(item)),
  );
  const activeSelectedNews = selectedNews
    ? publishedNews.find((item) => item.id === selectedNews.id) || null
    : null;

  useEffect(() => {
    if (selectedNews && !activeSelectedNews) setSelectedNews(null);
  }, [activeSelectedNews, selectedNews, setSelectedNews]);

  const categories = ['Semua', 'Pemerintahan', 'Ekonomi', 'Infrastruktur', 'Pendidikan', 'Umum'];

  // Apply filters
  const filteredNews = publishedNews.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Render Single News Article Details Reader Grid
  if (activeSelectedNews) {
    const embeddedVideo = activeSelectedNews.videoUrl && activeSelectedNews.videoProvider && activeSelectedNews.videoProvider !== 'upload'
      ? resolveVideoEmbed(
          activeSelectedNews.videoProvider as VideoEmbedProvider,
          activeSelectedNews.videoUrl,
        )
      : null;
    return (
      <div id="read-news-detail" className="space-y-6 animate-fadeIn">
        <button
          id="back-to-news-list"
          onClick={() => setSelectedNews(null)}
          className="inline-flex items-center space-x-2 text-sm font-bold text-teal-600 hover:text-teal-850 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Berita</span>
        </button>

        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-md">
          {/* Cover Header Banner */}
          <div className="h-[280px] md:h-[400px] w-full bg-gray-50 relative">
            <img
              src={activeSelectedNews.thumbnail}
              alt={activeSelectedNews.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
              <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                {activeSelectedNews.category}
              </span>
              <h1 className="text-xl md:text-3xl font-black">{activeSelectedNews.title}</h1>
            </div>
          </div>

          {/* Article Contents */}
          <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
            {/* Metadata Line */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 font-semibold font-mono pb-4 border-b border-gray-100">
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-teal-600" />
                <span>
                  {formatNewsDate(activeSelectedNews.datePublished, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </span>
              <span className="h-4 w-px bg-gray-200" />
              <span className="flex items-center space-x-1">
                <User className="h-4 w-4 text-teal-600" />
                <span>Operator Desa (Staf Humas)</span>
              </span>
              <span className="h-4 w-px bg-gray-200" />
              <span className="flex items-center space-x-1">
                <Tag className="h-4 w-4 text-teal-600" />
                <span>{activeSelectedNews.category}</span>
              </span>
            </div>

            {activeSelectedNews.videoProvider === 'upload' && activeSelectedNews.videoUrl && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-950 shadow-sm">
                <video
                  src={activeSelectedNews.videoUrl}
                  poster={activeSelectedNews.thumbnail}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-contain"
                >
                  Browser Anda belum mendukung pemutar video HTML5.
                </video>
              </div>
            )}

            {embeddedVideo && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-slate-950 shadow-sm">
                <iframe
                  src={embeddedVideo.embedUrl}
                  title={`Video: ${activeSelectedNews.title}`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            )}

            {/* Paragraph Text renderer */}
            <div className="prose max-w-none text-gray-750 leading-relaxed text-sm md:text-md space-y-5 text-justify">
              {activeSelectedNews.content.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            {/* Footer details */}
            <div className="pt-8 border-t border-gray-150 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-gray-400">
                Layanan Informasi Desa Digital • {activeSelectedNews.id}
              </div>
              <button
                id="share-fake-news"
                onClick={() => {
                  alert(`Tautan berita berhasil disalin ke papan klip!\n${window.location.origin}/berita/${activeSelectedNews.id}`);
                }}
                className="px-4 py-2 border border-gray-200 hover:border-teal-400 hover:bg-teal-50 text-gray-700 hover:text-teal-800 rounded-lg text-xs font-bold leading-none flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Bagikan Berita</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Master news Grid
  return (
    <div id="portal-berita-view" className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-amber-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1469504512102-900f29606341?q=80&w=600&auto=format&fit=crop')" }} />
        <div className="relative z-10 max-w-3xl space-y-5">
          <span className="text-amber-300 font-bold text-xs uppercase tracking-widest bg-amber-800/60 px-3 py-1 rounded-full border border-amber-700/50">WARTA DESA</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Portal Berita & Kabar Kegiatan</h1>
          
          {/* Integrated Search Box */}
          <div className="relative max-w-md w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-amber-300">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              id="news-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita atau judul artikel mendetail..."
              className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white text-gray-900 placeholder-amber-200/70 focus:placeholder-gray-400 rounded-xl border border-amber-500/20 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Categories Horizontal Pills List */}
      <div className="flex flex-wrap gap-2 py-2 border-b border-gray-150">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`news-cat-${cat}`}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === cat
                ? 'bg-amber-600 text-white shadow-sm border border-amber-500'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-950 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Listings Grid representaiton */}
      {filteredNews.length === 0 ? (
        <div id="no-news-found" className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm flex flex-col items-center space-y-3">
          <BookOpen className="h-10 w-10 text-gray-300" />
          <p className="font-bold">Artikel Berita Tidak Ditemukan</p>
          <p className="text-xs text-gray-400 max-w-sm">
            Maaf, kami tidak berhasil menemukan berita yang sesuai dengan kata kunci pencarian atau kategori Anda saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              id={`news-card-${item.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:scale-101 hover:border-gray-200 transition-all flex flex-col"
            >
              {/* Cover Picture */}
              <div className="h-48 overflow-hidden bg-gray-100 relative">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 bg-amber-600 text-white rounded-full text-[10px] font-bold tracking-wider uppercase shadow">
                    {item.category}
                  </span>
                </div>
                {item.videoUrl && (
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow">
                    <PlayCircle className="h-3.5 w-3.5" />
                    Video
                  </span>
                )}
              </div>

              {/* Descriptions & Read button */}
              <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 font-mono flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                    <span>
                      {formatNewsDate(item.datePublished, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                  <h3 className="font-extrabold text-gray-950 text-md leading-snug line-clamp-2 hover:text-amber-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-550 text-xs line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                </div>

                <button
                  id={`read-article-btn-${item.id}`}
                  onClick={() => setSelectedNews(item)}
                  className="w-full py-2.5 bg-gray-50 hover:bg-amber-50 hover:text-amber-800 text-gray-700 border border-gray-100 rounded-lg text-xs font-bold tracking-wide text-center transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
