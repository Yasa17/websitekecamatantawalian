/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, X, Landmark, User, LayoutDashboard, LogOut, Building2 } from 'lucide-react';
import { VillageProfile, AdminProfile, PortalEntity } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  villageProfile: VillageProfile;
  adminProfile: AdminProfile;
  onLogout: () => void;
  openLoginModal: () => void;
  entities: PortalEntity[];
  activeEntityId: string;
  onActiveEntityChange: (entityId: string) => void;
}

export default function Navbar({
  currentTab,
  setCurrentTab,
  isAdminMode,
  setIsAdminMode,
  villageProfile,
  adminProfile,
  onLogout,
  openLoginModal,
  entities,
  activeEntityId,
  onActiveEntityChange,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');

  const menuItems = [
    { id: 'beranda', label: 'Beranda' },
    { id: 'profil', label: `Profil ${unitLabel}` },
    { id: 'data', label: `Data ${unitLabel}` },
    { id: 'berita', label: 'Berita' },
    { id: 'galeri', label: 'Galeri' },
    { id: 'kontak', label: 'Kontak' },
  ];

  const handleTabClick = (tabId: string) => {
    setCurrentTab(tabId);
    setIsAdminMode(false);
    setIsMobileMenuOpen(false);
  };

  const handleAdminTabClick = () => {
    setIsAdminMode(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav id="app-navbar" className="sticky top-0 z-40 bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabClick('beranda')}>
            <div id="nav-logo" className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm flex items-center justify-center">
              <Landmark className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <span id="nav-brand-title" className="block font-extrabold text-lg md:text-xl tracking-tight leading-none text-slate-900">
                {villageProfile.name}
              </span>
              <span id="nav-brand-subtitle" className="block text-[10px] text-slate-500 font-bold tracking-wider mt-1.5 uppercase">
                {unitLabel === 'Kecamatan' ? villageProfile.regency : villageProfile.subdistrict}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 mr-1">
              <Building2 className="h-4 w-4 text-teal-700" />
              <select
                value={activeEntityId}
                onChange={(e) => onActiveEntityChange(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-750 focus:outline-none cursor-pointer max-w-40"
                aria-label="Pilih wilayah"
              >
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            {menuItems.map((item) => (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  currentTab === item.id && !isAdminMode
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50 shadow-sm font-semibold'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Separator */}
            <div className="h-6 w-px bg-slate-200 mx-2" />

            {/* Admin Login/Control Panel button */}
            {isAdminMode ? (
              <div className="flex items-center space-x-2">
                <button
                  id="nav-admin-dashboard"
                  onClick={handleAdminTabClick}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg text-sm font-semibold shadow-sm border border-amber-500/30 hover:brightness-110 active:scale-95 transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  id="nav-admin-logout"
                  onClick={onLogout}
                  title="Logout Admin"
                  className="p-2 bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-700 rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="nav-admin-login-trigger"
                onClick={openLoginModal}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-650 hover:bg-indigo-50/50 hover:border-indigo-200 rounded-lg text-sm font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Masyarakat & Admin</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {isAdminMode && (
              <button
                id="mob-nav-admin"
                onClick={handleAdminTabClick}
                className="p-2 bg-amber-600 rounded-lg text-white"
                title="Admin Dashboard"
              >
                <LayoutDashboard className="h-5 w-5" />
              </button>
            )}
            <button
              id="mob-menu-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden bg-white border-b border-slate-200 animate-fadeIn">
          <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3 text-center">
            {menuItems.map((item) => (
              <button
                key={item.id}
                id={`mob-nav-item-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`block w-full text-left px-4 py-3 rounded-md text-base font-medium transition-all ${
                  currentTab === item.id && !isAdminMode
                    ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="p-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block px-2 mb-1">
                Pilih Wilayah
              </label>
              <select
                value={activeEntityId}
                onChange={(e) => {
                  onActiveEntityChange(e.target.value);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Pilih wilayah"
              >
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-px bg-slate-150 my-2" />

            {isAdminMode ? (
              <div className="space-y-1 pt-1">
                <button
                  id="mob-nav-admin-dashboard"
                  onClick={handleAdminTabClick}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-amber-600 text-white rounded-md text-base font-semibold"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard Admin</span>
                </button>
                <button
                  id="mob-nav-admin-logout"
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-slice bg-slate-50 hover:bg-rose-50 text-rose-700 border border-slate-200 mt-2 rounded-md text-base font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Keluar Admin</span>
                </button>
              </div>
            ) : (
              <button
                id="mob-nav-admin-login"
                onClick={() => {
                  openLoginModal();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 text-base font-medium border border-slate-200 rounded-md"
              >
                <User className="h-5 w-5" />
                <span>Masuk Admin</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
