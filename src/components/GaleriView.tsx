import React, { useState } from 'react';
import { ClickAwayListener } from 'react'; // we can implement a simple custom click handler instead
import { Image as ImageIcon, Calendar, Tag, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GalleryItem, VillageProfile } from '../types';

interface GaleriViewProps {
  gallery: GalleryItem[];
  villageProfile: VillageProfile;
}

export default function GaleriView({ gallery, villageProfile }: GaleriViewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');

  // Categorize album categories dynamically
  const categories = ['Semua', 'Kegiatan', 'Pembangunan', 'Budaya', 'Masyarakat'];

  const filteredPhotos = gallery.filter((item) => {
    return activeCategory === 'Semua' || item.category === activeCategory;
  });

  const handleOpenLightbox = (photo: GalleryItem) => {
    setSelectedPhoto(photo);
    setActivePhotoIdx(0);
  };

  // Get active images array
  const imageList = selectedPhoto
    ? (selectedPhoto.urls && selectedPhoto.urls.length > 0 ? selectedPhoto.urls : [selectedPhoto.url])
    : [];

  const handleNextPhoto = () => {
    if (imageList.length <= 1) return;
    setActivePhotoIdx((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevPhoto = () => {
    if (imageList.length <= 1) return;
    setActivePhotoIdx((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  return (
    <div id="galeri-view" className="space-y-6">
      {/* Page Title banner */}
      <div className="bg-indigo-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?q=80&w=600&auto=format&fit=crop')" }} />
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-indigo-300 font-bold text-xs uppercase tracking-widest bg-indigo-800/60 px-3 py-1 rounded-full border border-indigo-700/50">DOKUMENTASI VISUAL</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Galeri Kegiatan & Pembangunan</h1>
          <p className="text-indigo-150 text-sm md:text-base font-light leading-relaxed">
            Kumpulan potret pembangunan infrastruktur, pembinaan budaya, pelayanan publik, dan partisipasi sosial kemasyarakatan {unitLabel.toLowerCase()} {villageProfile.name}.
          </p>
        </div>
      </div>

      {/* Categories horizontally */}
      <div className="flex flex-wrap gap-2 py-2 border-b border-gray-150">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`galeri-cat-${cat}`}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-950 hover:bg-gray-50 font-medium'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-500 shadow-sm flex flex-col items-center space-y-2">
          <ImageIcon className="h-10 w-10 text-gray-300" />
          <p className="font-extrabold text-sm text-gray-700">Foto Album Belum Tersedia</p>
          <p className="text-xs text-gray-400">Belum ada rilis dokumentasi foto untuk kategori ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => {
            const extraCount = photo.urls && photo.urls.length > 1 ? photo.urls.length : 1;
            return (
              <div
                key={photo.id}
                id={`photo-card-${photo.id}`}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:scale-101 transition-all group cursor-pointer flex flex-col"
                onClick={() => handleOpenLightbox(photo)}
              >
                {/* Media box */}
                <div className="aspect-video relative overflow-hidden bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Gallery item photos count badge on hover/display */}
                  <div className="absolute bottom-3 left-3 bg-teal-950/85 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white rounded-md font-bold flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-indigo-400" />
                    <span>{extraCount} Foto</span>
                  </div>

                  {/* Float expander icon badge */}
                  <div className="absolute top-3 right-3 bg-teal-950/70 p-2 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Title & tags */}
                <div className="p-4 flex-grow flex flex-col justify-between space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                    {photo.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold font-mono">
                    <span className="flex items-center space-x-1">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{photo.category}</span>
                    </span>
                    <span>
                      {new Date(photo.dateAdded).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal Popover Element with Carousel */}
      {selectedPhoto && (
        <div
          id="lightbox-backdrop"
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 z-50 bg-teal-985/95 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
        >
          <div
            id="lightbox-container"
            onClick={(e) => e.stopPropagation()} // prevent dismiss clicking inside
            className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          >
            {/* Header control */}
            <div className="p-4 bg-teal-950/90 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold leading-none uppercase bg-indigo-600 px-3 py-1 rounded text-white shadow font-mono">
                  {selectedPhoto.category}
                </span>
                {imageList.length > 1 && (
                  <span className="text-xs text-gray-400 font-medium font-mono">
                    Foto {activePhotoIdx + 1} dari {imageList.length}
                  </span>
                )}
              </div>
              <button
                id="lightbox-close-btn"
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 hover:bg-white/10 text-white/85 hover:text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scale Visual image with Next/Prev Overlay buttons */}
            <div className="flex-grow overflow-hidden flex items-center justify-center bg-black/50 relative group min-h-[50vh] max-h-[60vh]">
              
              {/* Prev Button */}
              {imageList.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-4 z-10 p-2.5 bg-black/60 hover:bg-indigo-600 text-white rounded-full transition-all focus:outline-none hover:scale-105 active:scale-95 cursor-pointer"
                  title="Foto Sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Central image container */}
              <img
                src={imageList[activePhotoIdx]}
                alt={`${selectedPhoto.title} - Slide ${activePhotoIdx + 1}`}
                className="max-w-full max-h-[58vh] object-contain transition-all duration-300 transform"
                referrerPolicy="no-referrer"
              />

              {/* Next Button */}
              {imageList.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-4 z-10 p-2.5 bg-black/60 hover:bg-indigo-600 text-white rounded-full transition-all focus:outline-none hover:scale-105 active:scale-95 cursor-pointer"
                  title="Foto Berikutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Dots index track overlay info */}
              {imageList.length > 1 && (
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
                  {imageList.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setActivePhotoIdx(dotIdx)}
                      className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                        dotIdx === activePhotoIdx ? 'w-5 bg-indigo-500' : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Explanatory description card */}
            <div className="p-6 bg-teal-950 text-white space-y-3">
              <h3 className="font-extrabold text-base md:text-lg leading-snug">{selectedPhoto.title}</h3>
              
              <div className="flex items-center space-x-4 text-[11px] font-mono font-semibold text-teal-300">
                <span className="flex items-center space-x-1">
                  <Tag className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Kategori: {selectedPhoto.category}</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Tanggal Ditambahkan: {new Date(selectedPhoto.dateAdded).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
