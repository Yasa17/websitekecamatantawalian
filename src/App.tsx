/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Mail, Phone, MapPin, Key, X, Lock, AlertCircle, Heart, Building2 } from 'lucide-react';

import { VillageProfile, StatisticCategory, News, GalleryItem, AdminProfile, PortalData } from './types';
import { INITIAL_ADMIN_USERS, INITIAL_PORTAL_DATA } from './data/initialData';

import Navbar from './components/Navbar';
import BerandaView from './components/BerandaView';
import ProfilDesaView from './components/ProfilDesaView';
import DataDesaView from './components/DataDesaView';
import PortalBeritaView from './components/PortalBeritaView';
import GaleriView from './components/GaleriView';
import KontakView from './components/KontakView';
import AdminDashboard from './components/AdminDashboard';

const PORTAL_DATA_STORAGE_KEY = 'tawalian_portal_data_v2';
const ACTIVE_ENTITY_STORAGE_KEY = 'tawalian_active_entity_id_v3';
const ADMIN_USERS_STORAGE_KEY = 'tawalian_admin_users_v2';
const CURRENT_ADMIN_STORAGE_KEY = 'tawalian_current_admin_id_v1';
const DEFAULT_ENTITY_ID = 'kecamatan-tawalian';

const readStoredJson = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export default function App() {
  const [portalData, setPortalDataState] = useState<PortalData>(() => {
    const stored = readStoredJson<PortalData | null>(PORTAL_DATA_STORAGE_KEY, null);
    if (stored?.entities?.length) return stored;
    localStorage.setItem(PORTAL_DATA_STORAGE_KEY, JSON.stringify(INITIAL_PORTAL_DATA));
    return INITIAL_PORTAL_DATA;
  });

  const [activeEntityId, setActiveEntityIdState] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_ENTITY_STORAGE_KEY) || DEFAULT_ENTITY_ID;
  });

  const activeEntity = useMemo(() => {
    return portalData.entities.find((entity) => entity.id === activeEntityId) || portalData.entities[0];
  }, [activeEntityId, portalData.entities]);

  const selectedEntityId = activeEntity?.id || DEFAULT_ENTITY_ID;
  const villageProfile = activeEntity.content.profile;
  const statistics = activeEntity.content.statistics;
  const news = activeEntity.content.news;
  const gallery = activeEntity.content.gallery;
  const unitLabel = villageProfile.contentLabel || (activeEntity.type === 'kecamatan' ? 'Kecamatan' : activeEntity.type === 'kelurahan' ? 'Kelurahan' : 'Desa');

  const [adminUsers, setAdminUsersState] = useState<AdminProfile[]>(() => {
    const stored = readStoredJson<AdminProfile[] | null>(ADMIN_USERS_STORAGE_KEY, null);
    if (stored?.length) return stored;
    localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(INITIAL_ADMIN_USERS));
    return INITIAL_ADMIN_USERS;
  });

  const [currentAdminId, setCurrentAdminId] = useState<string | null>(() => localStorage.getItem(CURRENT_ADMIN_STORAGE_KEY));
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const currentAdmin = adminUsers.find((admin) => admin.id === currentAdminId || admin.username === currentAdminId) || null;
  const adminProfile = currentAdmin || INITIAL_ADMIN_USERS[0];
  const isSuperAdmin = currentAdmin?.role === 'super_admin';
  const manageableEntities = isSuperAdmin
    ? portalData.entities
    : portalData.entities.filter((entity) => entity.id === currentAdmin?.assignedEntityId);
  const visibleEntities = isAdminMode && currentAdmin ? manageableEntities : portalData.entities;
  const dashboardEntity =
    currentAdmin?.role === 'admin' && currentAdmin.assignedEntityId
      ? portalData.entities.find((entity) => entity.id === currentAdmin.assignedEntityId) || activeEntity
      : activeEntity;

  const setPortalData = (nextData: PortalData | ((prev: PortalData) => PortalData)) => {
    setPortalDataState((prev) => {
      const resolved = typeof nextData === 'function' ? nextData(prev) : nextData;
      localStorage.setItem(PORTAL_DATA_STORAGE_KEY, JSON.stringify(resolved));
      return resolved;
    });
  };

  const updateActiveEntityContent = (updates: Partial<typeof activeEntity.content>) => {
    const targetEntityId =
      currentAdmin?.role === 'admin' && currentAdmin.assignedEntityId
        ? currentAdmin.assignedEntityId
        : selectedEntityId;

    setPortalData((prev) => ({
      ...prev,
      entities: prev.entities.map((entity) =>
        entity.id === targetEntityId
          ? { ...entity, content: { ...entity.content, ...updates } }
          : entity,
      ),
    }));
  };

  const setActiveEntityId = (entityId: string) => {
    setActiveEntityIdState(entityId);
    localStorage.setItem(ACTIVE_ENTITY_STORAGE_KEY, entityId);
  };

  const setVillageProfile = (profile: VillageProfile) => {
    updateActiveEntityContent({ profile });
  };

  const setStatistics = (nextStatistics: StatisticCategory[]) => {
    updateActiveEntityContent({ statistics: nextStatistics });
  };

  const setNews = (nextNews: News[]) => {
    updateActiveEntityContent({ news: nextNews });
  };

  const setGallery = (nextGallery: GalleryItem[]) => {
    updateActiveEntityContent({ gallery: nextGallery });
  };

  const setAdminUsers = (nextUsers: AdminProfile[] | ((prev: AdminProfile[]) => AdminProfile[])) => {
    setAdminUsersState((prev) => {
      const resolved = typeof nextUsers === 'function' ? nextUsers(prev) : nextUsers;
      localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(resolved));
      return resolved;
    });
  };

  const setAdminProfile = (admin: AdminProfile) => {
    if (!currentAdmin) return;
    setAdminUsers((prev) =>
      prev.map((item) =>
        item.id === currentAdmin.id
          ? {
              ...item,
              ...admin,
              id: item.id,
              role: item.role,
              assignedEntityId: item.assignedEntityId,
              assignedEntityLabel: item.assignedEntityLabel,
            }
          : item,
      ),
    );
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (activeEntityId !== selectedEntityId) {
      setActiveEntityId(selectedEntityId);
    }
    setSelectedNews(null);
  }, [selectedEntityId]);

  useEffect(() => {
    if (isAdminMode && currentAdmin?.role === 'admin' && currentAdmin.assignedEntityId && selectedEntityId !== currentAdmin.assignedEntityId) {
      setActiveEntityId(currentAdmin.assignedEntityId);
    }
  }, [currentAdmin, isAdminMode, selectedEntityId]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const account = adminUsers.find((admin) => {
      const matchUsername = loginForm.username === admin.username || loginForm.username === admin.email;
      const matchPassword = loginForm.password === admin.password;
      return matchUsername && matchPassword;
    });

    if (account) {
      setCurrentAdminId(account.id || account.username);
      setIsAdminMode(true);
      localStorage.setItem(CURRENT_ADMIN_STORAGE_KEY, account.id || account.username);
      if (account.role === 'admin' && account.assignedEntityId) {
        setActiveEntityId(account.assignedEntityId);
      }
      setIsLoginModalOpen(false);
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Kombinasi username/email dan kata sandi admin salah!');
    }
  };

  const handleLogout = () => {
    setCurrentAdminId(null);
    setIsAdminMode(false);
    localStorage.removeItem(CURRENT_ADMIN_STORAGE_KEY);
  };

  return (
    <div id="application-root" className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        villageProfile={villageProfile}
        adminProfile={adminProfile}
        onLogout={handleLogout}
        openLoginModal={() => setIsLoginModalOpen(true)}
        entities={visibleEntities.length ? visibleEntities : portalData.entities}
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
                Berita, galeri, data, profil, dan kontak yang tampil mengikuti pilihan wilayah ini.
              </p>
            </div>
          </div>
          <select
            value={selectedEntityId}
            onChange={(e) => setActiveEntityId(e.target.value)}
            className="w-full md:w-72 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Pilih konteks website"
          >
            {(visibleEntities.length ? visibleEntities : portalData.entities).map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.label}
              </option>
            ))}
          </select>
        </div>

        <div className="animate-fadeIn">
          {isAdminMode && currentAdmin ? (
            <div key={dashboardEntity.id}>
              <AdminDashboard
                villageProfile={dashboardEntity.content.profile}
                setVillageProfile={setVillageProfile}
                statistics={dashboardEntity.content.statistics}
                setStatistics={setStatistics}
                news={dashboardEntity.content.news}
                setNews={setNews}
                gallery={dashboardEntity.content.gallery}
                setGallery={setGallery}
                adminProfile={adminProfile}
                setAdminProfile={setAdminProfile}
                onLogout={handleLogout}
              />
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <footer id="app-footer" className="bg-teal-985 text-teal-150 border-t border-teal-900 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="p-2 bg-teal-800 rounded-lg">
                  <Landmark className="h-5 w-5 text-teal-300" />
                </div>
                <span className="font-bold text-lg">{villageProfile.name}</span>
              </div>
              <p className="text-xs text-teal-300 leading-relaxed font-light text-justify">
                Portal komunikasi digital, publikasi kegiatan, dan transparansi data untuk tingkat kecamatan maupun desa.
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
                    <button onClick={() => { setCurrentTab(tab); setIsAdminMode(false); }} className="hover:text-white transition-colors cursor-pointer">
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-teal-300 tracking-wider uppercase mb-1">Hubungi Pelayanan</h4>
              <ul className="space-y-3 text-xs text-teal-200">
                <li className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 shrink-0 text-teal-400" />
                  <span className="leading-tight">{villageProfile.address}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-teal-400" />
                  <span>{villageProfile.phone}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-teal-400" />
                  <span>{villageProfile.email}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-extrabold text-sm text-teal-300 tracking-wider uppercase">Portal Admin Terpadu</h4>
              <p className="text-xs text-teal-400 leading-relaxed font-light">
                Operator dapat memilih wilayah aktif, lalu mengelola profil, berita, data statistik, dan album galeri sesuai kebutuhan.
              </p>
              {currentAdmin ? (
                <button
                  id="footer-dashboard-link"
                  onClick={() => setIsAdminMode(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95 cursor-pointer"
                >
                  Masuk Dashboard
                </button>
              ) : (
                <button
                  id="footer-login-trigger"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2 bg-teal-900 hover:bg-teal-850 hover:text-white text-teal-200 rounded-lg text-xs font-medium border border-teal-850 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Masuk Operator Admin
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-teal-900 my-8" />

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-teal-400 font-medium">
            <p>© {new Date().getFullYear()} Pemerintah {villageProfile.name}, {villageProfile.regency}. All Rights Reserved.</p>
            <p className="flex items-center gap-1">
              <span>Sistem portal wilayah terintegrasi dengan</span>
              <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" />
              <span>untuk pelayanan publik</span>
            </p>
          </div>
        </div>
      </footer>

      {isLoginModalOpen && (
        <div
          id="login-modal-backdrop"
          className="fixed inset-0 z-50 bg-teal-985/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            id="login-modal-container"
            className="bg-white rounded-2xl border border-gray-150 shadow-2xl max-w-sm w-full p-6 space-y-6 relative animate-slideUp text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2 text-teal-800">
                <div className="p-1.5 bg-teal-50 rounded-lg border border-teal-100">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <h3 className="font-extrabold text-sm tracking-tight uppercase">Autentikasi Operator</h3>
              </div>
              <button
                id="login-modal-close-btn"
                onClick={() => setIsLoginModalOpen(false)}
                className="p-1 hover:bg-gray-100 hover:text-gray-900 text-gray-400 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-md tracking-tight leading-snug">Portal Masuk Operator Wilayah</h4>
              <p className="text-gray-500 text-xs text-justify">
                Super admin kecamatan dapat mengelola semua wilayah. Admin desa/kelurahan hanya dapat mengubah konten wilayah yang ditugaskan.
              </p>
            </div>

            {loginError && (
              <div id="login-error-message" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-1.5">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            <form id="simulated-login-form" onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-450 uppercase">Username / Email</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="admin"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-gray-450 uppercase">Kata Sandi</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="admin"
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                className="w-full py-3 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold uppercase rounded-lg transition-all shadow cursor-pointer flex items-center justify-center space-x-1"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Masuk Dashboard</span>
              </button>
            </form>

            <div className="bg-gray-50 border border-gray-150 p-3 rounded-xl space-y-2 text-[10px] text-gray-500">
              <p className="font-extrabold text-gray-700">Kredensial Evaluasi:</p>
              <p>
                Super admin kecamatan:
                <strong className="font-mono text-teal-800"> admin</strong> /
                <strong className="font-mono text-teal-800"> admin</strong>
              </p>
              <p>
                Admin wilayah:
                <strong className="font-mono text-teal-800"> tawalian-timur</strong>,
                <strong className="font-mono text-teal-800"> kariango</strong>,
                <strong className="font-mono text-teal-800"> kelurahan-tawalian</strong>,
                <strong className="font-mono text-teal-800"> rantetangnga</strong> /
                <strong className="font-mono text-teal-800"> admin</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
