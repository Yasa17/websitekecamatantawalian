/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Heart, Landmark, LogOut, Mail, MapPin, Phone } from 'lucide-react';
import { AdminProfile, GalleryItem, News, PortalData, StatisticCategory, VillageProfile } from './types';
import { ApiError, apiRequest, clearApiToken, getApiToken, setApiToken } from './services/api';

import Navbar from './components/Navbar';
import BerandaView from './components/BerandaView';
import ProfilDesaView from './components/ProfilDesaView';
import DataDesaView from './components/DataDesaView';
import PortalBeritaView from './components/PortalBeritaView';
import GaleriView from './components/GaleriView';
import KontakView from './components/KontakView';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginPage from './components/AdminLoginPage';
import type { DistrictEntitySummary } from './components/DistrictSummary';

const ACTIVE_ENTITY_STORAGE_KEY = 'tawalian_active_entity_id_v3';
const DEFAULT_ENTITY_ID = 'kecamatan-tawalian';
const ANONYMOUS_ADMIN_PROFILE: AdminProfile = {
  name: 'Admin',
  username: '',
  email: '',
  avatarUrl: '',
};

export default function App() {
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [activeEntityId, setActiveEntityIdState] = useState(
    () => localStorage.getItem(ACTIVE_ENTITY_STORAGE_KEY) || DEFAULT_ENTITY_ID,
  );
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile | null>(null);
  const [appView, setAppView] = useState<'public' | 'login' | 'admin'>('public');
  const [districtEntities, setDistrictEntities] = useState<DistrictEntitySummary[]>([]);
  const [currentTab, setCurrentTab] = useState('beranda');
  const [selectedNews, setSelectedNews] = useState<News | null>(null);

  const activeEntity = useMemo(
    () =>
      portalData?.entities.find((entity) => entity.id === activeEntityId) ||
      portalData?.entities[0],
    [activeEntityId, portalData],
  );
  const selectedEntityId = activeEntity?.id || DEFAULT_ENTITY_ID;

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        const response = await apiRequest<{ data: PortalData }>('/api/portal');
        if (mounted) setPortalData(response.data);

        if (getApiToken()) {
          try {
            const session = await apiRequest<{ admin: AdminProfile }>('/api/auth/session');
            if (mounted) setCurrentAdmin(session.admin);
          } catch {
            clearApiToken();
          }
        }
      } catch (error) {
        console.error('Backend tidak dapat dihubungi:', error);
        if (mounted) {
          setInitializationError(
            error instanceof Error
              ? error.message
              : 'Backend atau database tidak dapat dihubungi.',
          );
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    };
    void initialize();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeEntity) return;
    if (activeEntityId !== selectedEntityId) {
      setActiveEntityIdState(selectedEntityId);
      localStorage.setItem(ACTIVE_ENTITY_STORAGE_KEY, selectedEntityId);
    }
    setSelectedNews(null);
  }, [activeEntity, activeEntityId, selectedEntityId]);

  if (isInitializing || !activeEntity || !portalData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <Landmark className="mx-auto h-10 w-10 text-teal-400" />
          <h1 className="mt-4 text-xl font-black">
            {isInitializing ? 'Menghubungkan ke database…' : 'Database belum siap'}
          </h1>
          {!isInitializing && (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {initializationError || 'Data portal belum tersedia di PostgreSQL.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  const villageProfile = activeEntity.content.profile;
  const statistics = activeEntity.content.statistics;
  const news = activeEntity.content.news;
  const gallery = activeEntity.content.gallery;
  const unitLabel =
    villageProfile.contentLabel ||
    (activeEntity.type === 'kecamatan'
      ? 'Kecamatan'
      : activeEntity.type === 'kelurahan'
        ? 'Kelurahan'
        : 'Desa');

  const setActiveEntityId = (entityId: string) => {
    setActiveEntityIdState(entityId);
    localStorage.setItem(ACTIVE_ENTITY_STORAGE_KEY, entityId);
  };

  const updateAssignedEntityContent = (updates: Partial<typeof activeEntity.content>) => {
    if (!currentAdmin?.assignedEntityId) return;
    if (currentAdmin.role === 'super_admin' && updates.statistics !== undefined) return;
    const entityId = currentAdmin.assignedEntityId;
    const previousContent = portalData.entities.find(
      (entity) => entity.id === entityId,
    )?.content;

    setPortalData((current) => current ? ({
        ...current,
        entities: current.entities.map((entity) =>
          entity.id === entityId
            ? { ...entity, content: { ...entity.content, ...updates } }
            : entity,
        ),
      }) : current);

    void apiRequest(`/api/entities/${entityId}/content`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }).catch((error) => {
      if (previousContent) {
        setPortalData((current) => current ? ({
            ...current,
            entities: current.entities.map((entity) =>
              entity.id === entityId
                ? { ...entity, content: previousContent }
                : entity,
            ),
          }) : current);
      }
      alert(error instanceof Error ? error.message : 'Data gagal disimpan ke backend.');
    });
  };

  const setVillageProfile = (profile: VillageProfile) =>
    updateAssignedEntityContent({ profile });
  const setStatistics = (nextStatistics: StatisticCategory[]) =>
    updateAssignedEntityContent({ statistics: nextStatistics });
  const setNews = (nextNews: News[]) =>
    updateAssignedEntityContent({ news: nextNews });
  const setGallery = (nextGallery: GalleryItem[]) =>
    updateAssignedEntityContent({ gallery: nextGallery });

  const setAdminProfile = (
    profile: AdminProfile,
    currentPassword?: string,
  ) => {
    const fields = {
      name: profile.name,
      username: profile.username,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    };
    void apiRequest<{ data: AdminProfile }>('/api/admin/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        fields,
        currentPassword,
        newPassword: profile.password || undefined,
      }),
    })
      .then((response) => setCurrentAdmin(response.data))
      .catch((error) => {
        alert(error instanceof Error ? error.message : 'Profil admin gagal disimpan.');
      });
  };

  const loadDistrictSummary = async () => {
    const response = await apiRequest<{ data: DistrictEntitySummary[] }>(
      '/api/district/summary',
    );
    setDistrictEntities(response.data);
  };

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await apiRequest<{ token: string; admin: AdminProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ usernameOrEmail: username, password }),
        },
      );
      setApiToken(response.token);
      setCurrentAdmin(response.admin);
      if (response.admin.role === 'super_admin') await loadDistrictSummary();
      if (response.admin.assignedEntityId) {
        setActiveEntityId(response.admin.assignedEntityId);
      }
      setAppView('admin');
      return true;
    } catch (error) {
      clearApiToken();
      if (error instanceof ApiError && error.status === 401) return false;
      throw error;
    }
  };

  const openAdminPanel = async () => {
    if (!currentAdmin) {
      setAppView('login');
      return;
    }
    if (currentAdmin.role === 'super_admin') {
      try {
        await loadDistrictSummary();
      } catch {
        clearApiToken();
        setCurrentAdmin(null);
        setAppView('login');
        return;
      }
    }
    setAppView('admin');
  };

  const handleLogout = () => {
    void apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearApiToken();
    setCurrentAdmin(null);
    setDistrictEntities([]);
    setAppView('login');
  };

  if (appView === 'login') {
    return (
      <AdminLoginPage
        onLogin={handleLogin}
        onBack={() => setAppView('public')}
      />
    );
  }

  if (appView === 'admin' && currentAdmin) {
    const dashboardEntity =
      portalData.entities.find(
        (entity) => entity.id === currentAdmin.assignedEntityId,
      ) || activeEntity;

    return (
      <div className="min-h-screen bg-slate-100">
        <header className="h-20 bg-slate-950 text-white border-b border-slate-800 px-5 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-600">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <p className="font-black text-sm sm:text-base">Panel Admin {dashboardEntity.shortLabel}</p>
              <p className="text-[10px] text-teal-300 uppercase tracking-widest">Area administrasi internal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAppView('public')}
            className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-xl px-3 py-2"
          >
            Lihat Website
          </button>
        </header>
        <main className="max-w-7xl mx-auto p-4 sm:p-7 lg:p-10">
          <AdminDashboard
            villageProfile={dashboardEntity.content.profile}
            setVillageProfile={setVillageProfile}
            statistics={dashboardEntity.content.statistics}
            setStatistics={setStatistics}
            news={dashboardEntity.content.news}
            setNews={setNews}
            gallery={dashboardEntity.content.gallery}
            setGallery={setGallery}
            adminProfile={currentAdmin}
            setAdminProfile={setAdminProfile}
            districtEntities={districtEntities}
            onLogout={handleLogout}
          />
        </main>
      </div>
    );
  }

  return (
    <div id="application-root" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdminMode={false}
        setIsAdminMode={() => undefined}
        villageProfile={villageProfile}
        adminProfile={currentAdmin || ANONYMOUS_ADMIN_PROFILE}
        onLogout={handleLogout}
        openLoginModal={() => void openAdminPanel()}
        entities={portalData.entities}
        activeEntityId={selectedEntityId}
        onActiveEntityChange={setActiveEntityId}
      />

      <div id="site-content-wrapper" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-teal-700" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider">Konteks Website Aktif</p>
              <h2 className="text-base md:text-lg font-black text-slate-950 leading-tight">{activeEntity.label}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Berita, galeri, data, profil, dan kontak mengikuti pilihan wilayah ini.
              </p>
            </div>
          </div>
          <select
            value={selectedEntityId}
            onChange={(event) => setActiveEntityId(event.target.value)}
            className="w-full md:w-72 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            {portalData.entities.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.label}</option>
            ))}
          </select>
        </div>

        <div className="animate-fadeIn">
          {currentTab === 'beranda' && (
            <BerandaView
              villageProfile={villageProfile}
              statistics={statistics}
              news={news}
              gallery={gallery}
              setCurrentTab={setCurrentTab}
              setSelectedNews={setSelectedNews}
            />
          )}
          {currentTab === 'profil' && <ProfilDesaView villageProfile={villageProfile} />}
          {currentTab === 'data' && <DataDesaView statistics={statistics} villageProfile={villageProfile} />}
          {currentTab === 'berita' && (
            <PortalBeritaView
              news={news}
              selectedNews={selectedNews}
              setSelectedNews={setSelectedNews}
            />
          )}
          {currentTab === 'galeri' && <GaleriView gallery={gallery} villageProfile={villageProfile} />}
          {currentTab === 'kontak' && <KontakView villageProfile={villageProfile} />}
        </div>
      </div>

      <footer id="app-footer" className="bg-teal-985 text-teal-150 border-t border-teal-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="p-2 bg-teal-800 rounded-lg"><Landmark className="h-5 w-5 text-teal-300" /></div>
                <span className="font-bold text-lg">{villageProfile.name}</span>
              </div>
              <p className="text-xs text-teal-300 leading-relaxed font-light text-justify">
                Portal komunikasi digital, publikasi kegiatan, dan transparansi data tingkat kecamatan maupun desa.
              </p>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-teal-300 tracking-wider uppercase mb-4">Navigasi Portal</h4>
              <ul className="space-y-2 text-xs">
                {[
                  ['beranda', 'Beranda Utama'],
                  ['profil', `Profil ${unitLabel}`],
                  ['data', `Data ${unitLabel}`],
                  ['berita', `Berita ${unitLabel}`],
                  ['galeri', `Galeri ${unitLabel}`],
                ].map(([tab, label]) => (
                  <li key={tab}>
                    <button onClick={() => setCurrentTab(tab)} className="hover:text-white transition-colors">{label}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-teal-300 tracking-wider uppercase">Hubungi Pelayanan</h4>
              <ul className="space-y-3 text-xs text-teal-200">
                <li className="flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 text-teal-400" />{villageProfile.address}</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-teal-400" />{villageProfile.phone}</li>
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-400" />{villageProfile.email}</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-teal-300 tracking-wider uppercase">Portal Admin Terpadu</h4>
              <p className="text-xs text-teal-400 leading-relaxed">Area login dan panel admin dipisahkan dari website publik.</p>
              <button
                onClick={() => void openAdminPanel()}
                className="px-4 py-2 bg-teal-900 hover:bg-teal-850 text-teal-200 rounded-lg text-xs border border-teal-850"
              >
                {currentAdmin ? 'Buka Panel Admin' : 'Masuk Operator Admin'}
              </button>
            </div>
          </div>
          <div className="h-px bg-teal-900 my-8" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-teal-400">
            <p>© {new Date().getFullYear()} Pemerintah {villageProfile.name}, {villageProfile.regency}.</p>
            <p className="flex items-center gap-1">Pelayanan publik <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" /></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
