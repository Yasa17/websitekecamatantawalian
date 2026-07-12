/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { History, Target, Users, Map, Compass, BookOpen, ChevronRight, Activity, Globe } from 'lucide-react';
import { VillageProfile } from '../types';

interface ProfilDesaViewProps {
  villageProfile: VillageProfile;
}

export default function ProfilDesaView({ villageProfile }: ProfilDesaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sejarah' | 'struktur' | 'peta'>('sejarah');
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : 'Kepala Desa');
  const officeLabel = villageProfile.officeLabel || (unitLabel === 'Kecamatan' ? 'Kantor Kecamatan' : 'Kantor Desa');

  return (
    <div id="profil-desa-view" className="space-y-6">
      {/* Page Title Header banner */}
      <div className="bg-teal-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md">
        <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?q=80&w=600&auto=format&fit=crop')" }} />
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-teal-300 font-bold text-xs uppercase tracking-widest bg-teal-800/60 px-3 py-1 rounded-full border border-teal-700/50">SELAYANG PANDANG</span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Profil Lengkap {villageProfile.name}</h1>
          <p className="text-teal-150 text-sm md:text-base font-light leading-relaxed">
            Menelusuri sejarah, visi kerja, tata kepemimpinan aparatur, dan letak geografis wilayah administratif.
          </p>
        </div>
      </div>

      {/* Internal Sub Navigation Selector */}
      <div className="flex border-b border-gray-250 bg-gray-50/50 p-1.5 rounded-xl gap-1">
        <button
          onClick={() => setActiveSubTab('sejarah')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs md:text-sm tracking-wide flex items-center justify-center space-x-2 transition-all ${
            activeSubTab === 'sejarah'
              ? 'bg-white text-teal-800 shadow-sm border border-gray-150'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Sejarah & </span> Visi Misi
        </button>
        <button
          onClick={() => setActiveSubTab('struktur')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs md:text-sm tracking-wide flex items-center justify-center space-x-2 transition-all ${
            activeSubTab === 'struktur'
              ? 'bg-white text-teal-800 shadow-sm border border-gray-150'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Struktur </span> Organisasi
        </button>
        <button
          onClick={() => setActiveSubTab('peta')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs md:text-sm tracking-wide flex items-center justify-center space-x-2 transition-all ${
            activeSubTab === 'peta'
              ? 'bg-white text-teal-800 shadow-sm border border-gray-150'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Map className="h-4 w-4" />
          <span className="hidden sm:inline">Peta & </span> Batas Geografis
        </button>
      </div>

      {/* Sub-tab Content Area */}
      <div className="mt-8">
        {/* TAB 1: SEJARAH & VISI MISI */}
        {activeSubTab === 'sejarah' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sejarah (8 columns on large screens) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center space-x-3 text-teal-700 pb-3 border-b border-gray-100">
                <History className="h-6 w-6" />
                <h3 className="font-extrabold text-xl text-gray-950">Sejarah Singkat {unitLabel}</h3>
              </div>
              <p className="text-gray-650 leading-relaxed text-sm md:text-base font-light text-justify">
                {villageProfile.history}
              </p>
              
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-5 border border-teal-100/50 flex items-start space-x-4">
                <Compass className="h-6 w-6 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Nilai Luhur {unitLabel}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Pelayanan wilayah dilandasi nilai "Silih Asih, Silih Asah, Silih Asuh" demi mendongkrak keguyuban dan keselarasan sosial.
                  </p>
                </div>
              </div>
            </div>

            {/* Visi Misi (5 columns) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center space-x-3 text-teal-700 pb-3 border-b border-gray-100">
                <Target className="h-6 w-6" />
                <h3 className="font-extrabold text-xl text-gray-950">Visi & Misi</h3>
              </div>

              {/* Visi */}
              <div className="space-y-2 bg-teal-50/50 p-5 rounded-xl border border-teal-100/40">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-750">VISI APARATUR {unitLabel.toUpperCase()}</span>
                <p className="text-gray-800 font-extrabold py-1 border-l-3 border-teal-600 pl-3 leading-relaxed text-sm md:text-base">
                  &ldquo;{villageProfile.vision}&rdquo;
                </p>
              </div>

              {/* Misi List */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-750 block">MISI {unitLabel.toUpperCase()}</span>
                <ul className="space-y-3">
                  {villageProfile.mission.map((misi, idx) => (
                    <li key={idx} className="flex items-start space-x-3 text-sm text-gray-650">
                      <div className="bg-teal-600 text-white font-bold font-mono rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed text-justify">{misi}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: STRUKTUR ORGANISASI */}
        {activeSubTab === 'struktur' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-8 shadow-sm">
            <div className="flex items-center space-x-3 text-teal-700 pb-3 border-b border-gray-100">
              <Users className="h-6 w-6" />
              <h3 className="font-extrabold text-xl text-gray-950">Struktur Organisasi Pemerintahan</h3>
            </div>

            <p className="text-gray-500 text-sm max-w-2xl">
              Susunan bagan dan aparatur yang bertanggung jawab penuh dalam melaksanakan pelayanan administratif harian di {officeLabel} {villageProfile.name}.
            </p>

            {/* Structure Diagram Display Card */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 relative group overflow-hidden shadow-inner md:max-w-4xl mx-auto">
              <img
                src={villageProfile.organizationStructureUrl}
                alt={`Struktur Organisasi ${villageProfile.name}`}
                className="w-full h-auto max-h-[480px] object-cover rounded-xl shadow-md cursor-pointer filter hover:brightness-105 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 right-6 bg-teal-900/90 backdrop-blur-sm p-4 rounded-xl text-white border border-teal-600/30">
                <h4 className="font-bold text-sm">Bagan Organisasi Utama</h4>
                <p className="text-xs text-teal-300 mt-1">
                  Dipimpin oleh {headRole} dan dibantu oleh jajaran sekretariat, seksi pelayanan, serta unsur aparatur wilayah.
                </p>
              </div>
            </div>

            {/* Detailed Personnel Roster - Beautiful Portrait Grid */}
            <div className="space-y-6 pt-6 font-sans">
              <h4 className="font-extrabold text-gray-900 text-sm tracking-widest uppercase border-b border-gray-100 pb-2">Daftar Aparatur Pemerintahan Aktif</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* 1. Area Leader Card */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all group flex flex-col">
                  <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
                    <img
                      src={villageProfile.headPhotoUrl}
                      alt={villageProfile.headName}
                      className="w-full h-full object-cover object-top transition-transform group-hover:scale-105 duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase font-sans">
                      Kepala Wilayah
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-center text-center bg-teal-50/20">
                    <h5 className="font-bold text-xs text-teal-950 leading-snug">{villageProfile.headName}</h5>
                    <p className="text-[10px] text-teal-750 font-semibold mt-1">{headRole}</p>
                  </div>
                </div>

                {/* 2. Staff Members */}
                {(villageProfile.staff || []).map((member) => (
                  <div key={member.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-all group flex flex-col">
                    <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
                      <img
                        src={member.photoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"}
                        alt={member.name}
                        className="w-full h-full object-cover object-top transition-transform group-hover:scale-105 duration-300"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-4 flex-grow flex flex-col justify-center text-center">
                      <h5 className="font-bold text-xs text-gray-900 leading-snug">{member.name}</h5>
                      <p className="text-[10px] text-gray-500 font-semibold mt-1">{member.role}</p>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PETA & GEOGRAFIS */}
        {activeSubTab === 'peta' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Map Frame Embed (7 columns) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 shadow-sm">
              <div className="flex items-center space-x-3 text-teal-700 pb-3 border-b border-gray-100">
                <Map className="h-6 w-6" />
                <h3 className="font-extrabold text-xl text-gray-950">Peta Satelit Wilayah {unitLabel}</h3>
              </div>

              {/* Responsive iframe wrapper */}
              <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video w-full h-[320px] shadow-inner">
                <iframe
                  key={villageProfile.mapEmbedUrl}
                  src={villageProfile.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Google Maps ${villageProfile.name}`}
                />
              </div>
              <p className="text-gray-500 text-xs italic leading-relaxed text-center pt-1">
                Navigasi satelit wilayah kerja administratif {villageProfile.name}, {villageProfile.regency}, {villageProfile.province}.
              </p>
            </div>

            {/* Geographic descriptions (5 columns) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-sm">
              <div className="flex items-center space-x-3 text-teal-700 pb-3 border-b border-gray-100">
                <Compass className="h-6 w-6" />
                <h3 className="font-extrabold text-xl text-gray-950">Letak & Batas Fisik</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <span className="font-bold text-sm text-gray-900">Total Luas Wilayah</span>
                  <span className="px-3.5 py-1 bg-white border border-gray-300 text-black font-black text-xs rounded-full font-mono">
                    {villageProfile.geographicData.area}
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">BATAS WILAYAH</span>
                  
                  <div className="divide-y divide-gray-100 text-sm">
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <ChevronRight className="h-4 w-4 text-teal-600 rotate-270" />
                        Sebelah Utara
                      </span>
                      <span className="font-bold text-gray-800 text-right">{villageProfile.geographicData.northBoundary}</span>
                    </div>
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <ChevronRight className="h-4 w-4 text-teal-600" />
                        Sebelah Timur
                      </span>
                      <span className="font-bold text-gray-800 text-right">{villageProfile.geographicData.eastBoundary}</span>
                    </div>
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <ChevronRight className="h-4 w-4 text-teal-600 rotate-90" />
                        Sebelah Selatan
                      </span>
                      <span className="font-bold text-gray-800 text-right">{villageProfile.geographicData.southBoundary}</span>
                    </div>
                    <div className="py-3 flex justify-between">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <ChevronRight className="h-4 w-4 text-teal-600 rotate-180" />
                        Sebelah Barat
                      </span>
                      <span className="font-bold text-gray-800 text-right">{villageProfile.geographicData.westBoundary}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
