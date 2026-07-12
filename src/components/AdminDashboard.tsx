/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Landmark,
  Newspaper,
  Image as ImageIcon,
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  Save,
  Undo2,
  Upload,
  CheckCircle,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { VillageProfile, StatisticCategory, News, GalleryItem, AdminProfile } from '../types';

interface AdminDashboardProps {
  villageProfile: VillageProfile;
  setVillageProfile: (p: VillageProfile) => void;
  statistics: StatisticCategory[];
  setStatistics: (s: StatisticCategory[]) => void;
  news: News[];
  setNews: (n: News[]) => void;
  gallery: GalleryItem[];
  setGallery: (g: GalleryItem[]) => void;
  adminProfile: AdminProfile;
  setAdminProfile: (a: AdminProfile) => void;
  onLogout: () => void;
}

export default function AdminDashboard({
  villageProfile,
  setVillageProfile,
  statistics,
  setStatistics,
  news,
  setNews,
  gallery,
  setGallery,
  adminProfile,
  setAdminProfile,
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profil' | 'stats' | 'news' | 'gallery' | 'profile_admin'>('overview');
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : 'Kepala Desa');
  const roleLabel = adminProfile.role === 'super_admin' ? 'SUPER ADMIN KECAMATAN' : `ADMIN ${unitLabel.toUpperCase()}`;
  const scopeLabel = adminProfile.role === 'super_admin' ? 'Semua wilayah Kecamatan Tawalian' : (adminProfile.assignedEntityLabel || villageProfile.name);

  // Interactive local states for creating/editing items
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // NEWS States
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    category: 'Umum',
    thumbnail: '',
    status: 'Published' as 'Published' | 'Draft',
  });

  // STATS States
  const [selectedStatCatIdx, setSelectedStatCatIdx] = useState<number>(0);
  const selectedCat = statistics[selectedStatCatIdx] || statistics[0];
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemValue, setNewItemValue] = useState<number | ''>('');
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Custom Statistics Category & Multi-dimensions Adders
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatType, setNewCatType] = useState<'bar' | 'line' | 'pie' | 'donut'>('bar');
  const [tableWay, setTableWay] = useState<'1' | '2' | '3'>('1');
  const [multiDimLabel, setMultiDimLabel] = useState('');
  const [multiDimSubLabel, setMultiDimSubLabel] = useState('');
  const [multiDimSubValuePria, setMultiDimSubValuePria] = useState<number | ''>('');
  const [multiDimSubValueWanita, setMultiDimSubValueWanita] = useState<number | ''>('');

  // Selected Importer Template Type
  const [imporTemplateType, setImporTemplateType] = useState<'1' | '2' | '3'>('1');

  // GALLERY States & Multi-Photo modes
  const [galleryForm, setGalleryForm] = useState({
    url: '',
    title: '',
    category: 'Kegiatan',
  });
  const [multiUrlsText, setMultiUrlsText] = useState('');
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [isEditingGalleryMode, setIsEditingGalleryMode] = useState(false);

  // PROFILE States
  const [localProfileForm, setLocalProfileForm] = useState({
    name: adminProfile.name,
    username: adminProfile.username,
    email: adminProfile.email,
    password: adminProfile.password || '',
    avatarUrl: adminProfile.avatarUrl,
  });

  // VILLAGE PROFILE States & Staff fields
  const [villageForm, setVillageForm] = useState<VillageProfile>({ ...villageProfile });
  const [newMissionBullet, setNewMissionBullet] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhoto, setNewStaffPhoto] = useState('');

  // Toast trigger
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Base64 file reader utility
  const handleImageFileReader = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        callback(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // 1. SAVE VILLAGE PROFILE
  const handleSaveVillageProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setVillageProfile(villageForm);
    showToast(`Profil ${unitLabel} berhasil diperbarui dan dipublikasikan!`);
  };

  const handleAddMission = () => {
    if (!newMissionBullet.trim()) return;
    setVillageForm(prev => ({
      ...prev,
      mission: [...prev.mission, newMissionBullet.trim()]
    }));
    setNewMissionBullet('');
  };

  const handleRemoveMission = (idxToDelete: number) => {
    setVillageForm(prev => ({
      ...prev,
      mission: prev.mission.filter((_, i) => i !== idxToDelete)
    }));
  };

  // Staff operations
  const handleAddStaff = () => {
    if (!newStaffName.trim() || !newStaffRole.trim()) {
      showToast('Nama dan Jabatan wajib diisi!', 'info');
      return;
    }
    const newMember = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      role: newStaffRole.trim(),
      photoUrl: newStaffPhoto.trim() || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop'
    };
    setVillageForm(prev => ({
      ...prev,
      staff: [...(prev.staff || []), newMember]
    }));
    setNewStaffName('');
    setNewStaffRole('');
    setNewStaffPhoto('');
    showToast('Perangkat desa baru berhasil ditambahkan.');
  };

  const handleUpdateStaffMember = (idx: number, field: 'name' | 'role', value: string) => {
    setVillageForm(prev => {
      const currentStaff = [...(prev.staff || [])];
      if (currentStaff[idx]) {
        currentStaff[idx] = { ...currentStaff[idx], [field]: value };
      }
      return { ...prev, staff: currentStaff };
    });
  };

  const handleDeleteStaffMember = (idx: number) => {
    setVillageForm(prev => ({
      ...prev,
      staff: (prev.staff || []).filter((_, i) => i !== idx)
    }));
    showToast('Perangkat desa dihapus.');
  };

  // 2. STATISTICS MANAGERS
  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitle.trim()) return;

    const newCategory: StatisticCategory = {
      id: `stat_${Date.now()}`,
      title: newCatTitle.trim(),
      description: newCatDesc.trim() || 'Kategori statistik desa dinamis.',
      type: newCatType,
      items: []
    };

    setStatistics([...statistics, newCategory]);
    setNewCatTitle('');
    setNewCatDesc('');
    setShowAddCat(false);
    setSelectedStatCatIdx(statistics.length);
    showToast(`Kategori data "${newCatTitle}" berhasil ditambahkan!`);
  };

  const handleAddStatItem = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStats = [...statistics];
    const categoryToEdit = updatedStats[selectedStatCatIdx];

    if (tableWay === '1') {
      if (!newItemLabel.trim() || newItemValue === '') return;
      categoryToEdit.items.push({
        label: newItemLabel.trim(),
        value: Number(newItemValue)
      });
      showToast(`Data "${newItemLabel}" ditambahkan ke ${categoryToEdit.title}!`);
    } else {
      // 2 or 3 way multi-dimensional add
      if (!multiDimLabel.trim() || !multiDimSubLabel.trim()) {
        showToast('Label utama dan sub-label wajib diisi!', 'info');
        return;
      }
      if (multiDimSubValuePria !== '') {
        categoryToEdit.items.push({
          label: `${multiDimLabel.trim()} - ${multiDimSubLabel.trim()} (Pria)`,
          value: Number(multiDimSubValuePria)
        });
      }
      if (multiDimSubValueWanita !== '') {
        categoryToEdit.items.push({
          label: `${multiDimLabel.trim()} - ${multiDimSubLabel.trim()} (Wanita)`,
          value: Number(multiDimSubValueWanita)
        });
      }
      showToast(`Data parameter multiaspek "${multiDimLabel}" berhasil diproses!`);
    }

    setStatistics(updatedStats);
    setNewItemLabel('');
    setNewItemValue('');
    setMultiDimLabel('');
    setMultiDimSubLabel('');
    setMultiDimSubValuePria('');
    setMultiDimSubValueWanita('');
  };

  const handleDeleteStatItem = (itemIdx: number) => {
    const updatedStats = [...statistics];
    const categoryToEdit = updatedStats[selectedStatCatIdx];
    const deletedLabel = categoryToEdit.items[itemIdx].label;
    
    categoryToEdit.items = categoryToEdit.items.filter((_, i) => i !== itemIdx);
    setStatistics(updatedStats);
    showToast(`Data "${deletedLabel}" dihapus.`);
  };

  const handleBulkImportStats = () => {
    if (!bulkCsvText.trim()) return;
    // Parse formatting: "Kategori, Nilai"
    const lines = bulkCsvText.split('\n');
    const importedItems: { label: string; value: number }[] = [];

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const value = parseInt(parts[1].trim());
        if (label && !isNaN(value)) {
          importedItems.push({ label, value });
        }
      }
    });

    if (importedItems.length === 0) {
      showToast('Waduh! Format data tidak sesuai. Pastikan menggunakan format: NamaKategori,Angka', 'info');
      return;
    }

    const updatedStats = [...statistics];
    const categoryToEdit = updatedStats[selectedStatCatIdx];
    categoryToEdit.items = [...categoryToEdit.items, ...importedItems];
    setStatistics(updatedStats);
    setBulkCsvText('');
    setShowBulkImport(false);
    showToast(`Sukses mengimpor ${importedItems.length} baris data statistik!`);
  };

  // 3. NEWS CRUD
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim()) return;

    if (editingNews) {
      // Edit mode
      const updatedNews = news.map((item) =>
        item.id === editingNews.id
          ? {
              ...item,
              title: newsForm.title,
              content: newsForm.content,
              category: newsForm.category,
              thumbnail: newsForm.thumbnail || 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop',
              status: newsForm.status,
              datePublished: item.datePublished || new Date().toISOString().split('T')[0],
            }
          : item
      );
      setNews(updatedNews);
      setEditingNews(null);
      showToast('Berita berhasil diperbarui!');
    } else {
      // Add mode
      const newArticle: News = {
        id: String(Date.now()),
        title: newsForm.title,
        content: newsForm.content,
        category: newsForm.category,
        thumbnail: newsForm.thumbnail || 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?q=80&w=600&auto=format&fit=crop',
        status: newsForm.status,
        datePublished: new Date().toISOString().split('T')[0],
      };
      setNews([newArticle, ...news]);
      setIsAddingNews(false);
      showToast('Berita baru berhasil dipublikasikan!');
    }

    // Reset Form
    setNewsForm({
      title: '',
      content: '',
      category: 'Umum',
      thumbnail: '',
      status: 'Published',
    });
  };

  const handleEditNewsClick = (item: News) => {
    setEditingNews(item);
    setNewsForm({
      title: item.title,
      content: item.content,
      category: item.category,
      thumbnail: item.thumbnail,
      status: item.status,
    });
    setIsAddingNews(true);
  };

  const handleDeleteNews = (id: string) => {
    const confirmation = confirm('Apakah Anda yakin ingin menghapus berita ini secara permanen?');
    if (!confirmation) return;
    setNews(news.filter(n => n.id !== id));
    showToast('Berita berhasil dihapus.');
  };

  // 4. GALLERY OPERATIONS
  const handleAddGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.title.trim()) {
      showToast('Judul dokumentasi wajib diisi!', 'info');
      return;
    }

    // Split custom multiUrlsText input into robust arrays of strings
    const extraUrls = multiUrlsText
      .split(/[\n,]+/)
      .map(line => line.trim())
      .filter(line => line.startsWith('http') || line.startsWith('data:image'));

    const primaryUrl = galleryForm.url.trim() || extraUrls[0] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop';
    
    // Combine primary and extra urls, deduplicating them nicely
    const allUrls = Array.from(new Set([primaryUrl, ...extraUrls])).filter(Boolean);

    if (isEditingGalleryMode && editingGalleryItem) {
      // Edit gallery item in place
      const updatedGallery = gallery.map((g) =>
        g.id === editingGalleryItem.id
          ? {
              ...g,
              title: galleryForm.title.trim(),
              category: galleryForm.category,
              url: primaryUrl,
              urls: allUrls,
            }
          : g
      );
      setGallery(updatedGallery);
      showToast('Item album galeri berhasil diperbarui!');
    } else {
      // Add new gallery item
      const newItem: GalleryItem = {
        id: `g_${Date.now()}`,
        url: primaryUrl,
        urls: allUrls,
        title: galleryForm.title.trim(),
        category: galleryForm.category,
        dateAdded: new Date().toISOString().split('T')[0]
      };
      setGallery([newItem, ...gallery]);
      showToast('Album galeri baru berhasil dibuat dengan carousel foto!');
    }

    // Reset Gallery Fields
    setGalleryForm({ url: '', title: '', category: 'Kegiatan' });
    setMultiUrlsText('');
    setEditingGalleryItem(null);
    setIsEditingGalleryMode(false);
  };

  const handleEditGalleryClick = (item: GalleryItem) => {
    setEditingGalleryItem(item);
    setIsEditingGalleryMode(true);
    setGalleryForm({
      url: item.url,
      title: item.title,
      category: item.category || 'Kegiatan',
    });
    setMultiUrlsText((item.urls || [item.url]).join('\n'));
    showToast(`Mengedit album "${item.title}"...`, 'info');
  };

  const handleDeleteGalleryItem = (id: string) => {
    const confirmation = confirm('Apakah Anda yakin ingin menghapus album galeri ini?');
    if (!confirmation) return;
    setGallery(gallery.filter(g => g.id !== id));
    showToast('Foto galeri berhasil dihapus dari album.');
  };

  // 5. PROFILE ACCOUNT ADMIN SETTINGS
  const handleSaveProfileAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localProfileForm.username.trim() || !localProfileForm.name.trim()) return;

    setAdminProfile({
      name: localProfileForm.name,
      username: localProfileForm.username,
      email: localProfileForm.email,
      password: localProfileForm.password,
      avatarUrl: localProfileForm.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
    });

    showToast('Profil Akun Admin dan Password berhasil diperbarui!');
  };

  return (
    <div id="admin-dashboard-container" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN NAVIGATION SIDEBAR (3 Columns on desktop) */}
      <aside className="lg:col-span-3 bg-slate-900 text-slate-200 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center space-x-3 pb-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500 shrink-0">
            <img src={adminProfile.avatarUrl} alt={adminProfile.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight text-white leading-none">{adminProfile.name}</h4>
            <p className="text-[10px] text-amber-400 mt-1 uppercase tracking-widest font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{roleLabel}</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight">{scopeLabel}</p>
          </div>
        </div>

        {/* Dynamic Nav link Items */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'overview' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('profil')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'profil' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <Landmark className="h-4 w-4 shrink-0" />
            <span>Kelola Profil {unitLabel}</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'stats' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span>Kelola Data & Statistik</span>
          </button>

          <button
            onClick={() => setActiveTab('news')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'news' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <Newspaper className="h-4 w-4 shrink-0" />
            <span>Kelola Warta Berita</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'gallery' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>Kelola Album Galeri</span>
          </button>

          <button
            onClick={() => setActiveTab('profile_admin')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'profile_admin' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>ID Admin & Password</span>
          </button>
        </nav>

        <div className="h-px bg-slate-800 my-4" />

        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-slate-905 border border-slate-850 hover:bg-red-950 text-red-200 hover:text-white transition-all text-xs font-bold uppercase rounded-md text-center cursor-pointer"
        >
          LOGOUT ADMIN
        </button>
      </aside>

      {/* RIGHT COLUMN DYNAMIC CONTENT VIEWER (9 Columns on desktop) */}
      <main className="lg:col-span-9 bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-sm min-h-[500px]">
        
        {/* Floater Notice Banner Toast */}
        {notification && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-xs rounded-xl flex items-center gap-2 animate-slideUp">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-100">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Selamat Bekerja, Operator Desa!</h2>
              <p className="text-gray-500 text-xs mt-1">
                Gunakan menu navigasi panel kiri untuk mengelola berbagai instrumen data, visualisasi profil, warta desa digital, dan kredensial administrasi.
              </p>
            </div>

            {/* Micro Dashboard stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-150 p-5 rounded-2xl bg-gray-50/50">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Warta Berita</span>
                <p className="text-3xl font-black text-gray-900 mt-1">{news.length}</p>
                <p className="text-[10px] text-teal-600 font-semibold mt-1">
                  Published: {news.filter(n => n.status === 'Published').length} | Draft: {news.filter(n => n.status === 'Draft').length}
                </p>
              </div>

              <div className="border border-gray-150 p-5 rounded-2xl bg-gray-50/50">
                <span className="text-[10px] uppercase font-bold text-gray-400">Album Foto Galeri</span>
                <p className="text-3xl font-black text-gray-900 mt-1">{gallery.length}</p>
                <p className="text-[10px] text-indigo-500 font-semibold mt-1">Rilis publikasi gambar terdokumentasi.</p>
              </div>

              <div className="border border-gray-150 p-5 rounded-2xl bg-gray-50/50">
                <span className="text-[10px] uppercase font-bold text-gray-400">Statistik Kependudukan</span>
                <p className="text-3xl font-black text-gray-900 mt-1">{statistics.length} Kategori</p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">Visualisasi grafik batang, garis, pie, donut.</p>
              </div>
            </div>

            {/* Quick Action guides */}
            <div className="p-5 bg-teal-50 border border-teal-100/50 rounded-2xl text-teal-900 flex items-start space-x-4">
              <AlertCircle className="h-5 w-5 mt-0.5 text-teal-600 shrink-0" />
              <div className="space-y-1 text-xs leading-relaxed text-justify">
                <h5 className="font-bold text-teal-950">Informasi Pembaruan Data Offline:</h5>
                <p>
                  Sistem beroperasi menggunakan database simulated `localStorage` di browser Anda. Setiap pemutakhiran berita, gambar galeri, dan data sensus statistik di panel ini <strong>langsung merefleksikan perubahan di halaman depan website secara instan!</strong> Warga dapat menguji fungsionalitas dengan langsung melihat perubahannya di website publik.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PORTAL PROFIL EDIT */}
        {activeTab === 'profil' && (
          <form onSubmit={handleSaveVillageProfile} className="space-y-6">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Kelola Informasi Profil {unitLabel}</h2>
                <p className="text-gray-550 text-xs mt-1">Perbarui sejarah latar, visi kepemimpinan, dan tautan gambar struktur organisasi.</p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold text-xs tracking-wide flex items-center space-x-1.5 transition-all shadow active:scale-95 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan Profil</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5Col. md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Nama Lembaga Desa</label>
                <input
                  type="text"
                  value={villageForm.name}
                  onChange={(e) => setVillageForm({ ...villageForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Nama {headRole}</label>
                <input
                  type="text"
                  value={villageForm.headName}
                  onChange={(e) => setVillageForm({ ...villageForm, headName: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 bg-gray-50/55 rounded-xl border border-gray-150">
                <label className="text-xs font-bold text-gray-650 uppercase block">Foto Potret {headRole}</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="upload-kades-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileReader(file, (base64) => setVillageForm({ ...villageForm, headPhotoUrl: base64 }));
                    }}
                    className="hidden"
                  />
                  <label htmlFor="upload-kades-file" className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/80 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center shrink-0">
                    <Upload className="h-4 w-4 mr-1 text-indigo-650" />
                    Pilih File
                  </label>
                  <input
                    type="text"
                    value={villageForm.headPhotoUrl}
                    onChange={(e) => setVillageForm({ ...villageForm, headPhotoUrl: e.target.value })}
                    placeholder="Atau tautan foto URL..."
                    className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 bg-gray-50/55 rounded-xl border border-gray-150">
                <label className="text-xs font-bold text-gray-650 uppercase block">Bagan Struktur Organisasi</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="upload-bagan-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFileReader(file, (base64) => setVillageForm({ ...villageForm, organizationStructureUrl: base64 }));
                    }}
                    className="hidden"
                  />
                  <label htmlFor="upload-bagan-file" className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/80 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center shrink-0">
                    <Upload className="h-4 w-4 mr-1 text-indigo-650" />
                    Pilih File
                  </label>
                  <input
                    type="text"
                    value={villageForm.organizationStructureUrl}
                    onChange={(e) => setVillageForm({ ...villageForm, organizationStructureUrl: e.target.value })}
                    placeholder="Atau tautan gambar URL..."
                    className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase">Kata Sambutan {headRole}</label>
              <textarea
                value={villageForm.welcomeText}
                onChange={(e) => setVillageForm({ ...villageForm, welcomeText: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase">Narasi Sejarah Pendirian Desa</label>
              <textarea
                value={villageForm.history}
                onChange={(e) => setVillageForm({ ...villageForm, history: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase">Rumusan Visi Strategis</label>
              <input
                type="text"
                value={villageForm.vision}
                onChange={(e) => setVillageForm({ ...villageForm, vision: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none"
                required
              />
            </div>

            {/* Misi Bullet points Manager */}
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-150">
              <label className="text-xs font-bold text-gray-600 uppercase block">Rumusan Misi Operasional</label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMissionBullet}
                  onChange={(e) => setNewMissionBullet(e.target.value)}
                  placeholder="Tambahkan butir misi operasional baru..."
                  className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMission}
                  className="px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold"
                >
                  Tambah Misi
                </button>
              </div>

              <ul className="space-y-2 mt-2">
                {villageForm.mission.map((mis, index) => (
                  <li key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 text-xs">
                    <span className="text-gray-700 font-semibold">{index + 1}. {mis}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMission(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. DAFTAR APARATUR / PERANGKAT DESA MANAGER */}
            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-indigo-100/50">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                <span className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider block">Kelola Aparatur & Perangkat Desa</span>
                <span className="text-[10px] bg-indigo-100 font-bold text-indigo-800 px-2 py-0.5 rounded font-mono">
                  {(villageForm.staff || []).length} Perangkat Terdaftar
                </span>
              </div>

              {/* Add Staff form block */}
              <div className="p-4 bg-white rounded-xl border border-gray-250/80 mt-2 space-y-3">
                <h5 className="text-xs font-bold text-gray-800">Tambah Perangkat Desa Baru</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Nama Perangkat</label>
                    <input
                      type="text"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="Agus Setiawan, S.AP"
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white transition-all focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Jabatan / Peran</label>
                    <input
                      type="text"
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value)}
                      placeholder="Sekretaris Desa"
                      className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white transition-all focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 font-bold uppercase">Foto Perangkat (Pasfoto)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        id="new-staff-photo-uploader"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageFileReader(file, (base64) => setNewStaffPhoto(base64));
                          }
                        }}
                        className="hidden"
                      />
                      <label htmlFor="new-staff-photo-uploader" className="px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-bold text-indigo-700 cursor-pointer text-center flex items-center justify-center hover:bg-indigo-100 select-none">
                        Upload
                      </label>
                      <input
                        type="text"
                        value={newStaffPhoto}
                        onChange={(e) => setNewStaffPhoto(e.target.value)}
                        placeholder="Atau tautan URL..."
                        className="flex-grow px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-[10px] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddStaff}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambahkan Perangkat</span>
                  </button>
                </div>
              </div>

              {/* Roster list */}
              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Daftar Aparatur Aktif</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Area Leader (Default Main) */}
                  <div className="p-3 bg-indigo-50/60 border border-indigo-150 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={villageForm.headPhotoUrl} className="w-10 h-12 object-cover rounded-lg border border-indigo-200 shadow-sm shrink-0" />
                      <div>
                        <h6 className="font-extrabold text-xs text-indigo-950">{villageForm.headName}</h6>
                        <p className="text-[10px] text-indigo-700 font-semibold uppercase font-mono">{headRole}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-indigo-100 text-indigo-850 font-bold px-1.5 py-0.5 rounded font-mono">UTAMA</span>
                  </div>

                  {/* Staff List */}
                  {(villageForm.staff || []).map((staff, sIdx) => (
                    <div key={staff.id || sIdx} className="p-3 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <img src={staff.photoUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} className="w-10 h-12 object-cover rounded-lg border border-gray-150 shrink-0" />
                        <div className="space-y-1 overflow-hidden">
                          <input
                            type="text"
                            value={staff.name}
                            onChange={(e) => handleUpdateStaffMember(sIdx, 'name', e.target.value)}
                            className="font-bold text-xs text-gray-800 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:bg-gray-50 focus:outline-none px-1 rounded truncate block w-full"
                          />
                          <input
                            type="text"
                            value={staff.role}
                            onChange={(e) => handleUpdateStaffMember(sIdx, 'role', e.target.value)}
                            className="text-[10px] text-gray-500 font-bold bg-transparent border-b border-transparent hover:border-gray-200 focus:border-indigo-400 focus:bg-gray-50 focus:outline-none px-1 rounded truncate block w-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaffMember(sIdx)}
                        className="p-1 px-1.5 bg-red-50 hover:bg-red-550 text-red-650 hover:text-white rounded-lg transition-all"
                        title="Hapus Aparatur"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                </div>
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: STATISTIC DATA MANAGER */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-sans">Visualisasi & Management Statistik</h2>
                <p className="text-gray-550 text-xs mt-1">Ubah baris data demografis warga dan komoditas pertanian daerah.</p>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddCat(!showAddCat)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Jenis Data</span>
                </button>
                <button
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="px-3.5 py-2 border border-gray-200 hover:border-amber-500 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Simulasi Impor Excel / CSV</span>
                </button>
              </div>
            </div>

            {/* Expander Panel: Add Custom Statistics Category Form */}
            {showAddCat && (
              <form onSubmit={handleAddCustomCategory} className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-150 space-y-4 animate-slideDown">
                <div className="border-b border-indigo-100 pb-2 flex justify-between items-center">
                  <h4 className="font-extrabold text-indigo-950 text-xs uppercase">Tambah Kategori / Jenis Data Sensus Baru</h4>
                  <button type="button" onClick={() => setShowAddCat(false)} className="text-gray-400 hover:text-gray-600 text-xs font-bold">Tutup</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-indigo-905 uppercase font-bold">Judul Kategori Data</label>
                    <input
                      type="text"
                      value={newCatTitle}
                      onChange={(e) => setNewCatTitle(e.target.value)}
                      placeholder="Contoh: Statistik Sarana Kesehatan"
                      className="w-full px-3 py-2 bg-white border border-gray-255 rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-indigo-905 uppercase font-bold">Deskripsi Pendukung</label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Contoh: Jumlah apotek, klinik bersalin..."
                      className="w-full px-3 py-2 bg-white border border-gray-255 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-indigo-905 uppercase font-bold">Model Visual Grafik</label>
                    <select
                      value={newCatType}
                      onChange={(e) => setNewCatType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-gray-255 rounded-lg text-xs text-gray-700 font-bold"
                    >
                      <option value="bar">Bar (Batang Akumulatif)</option>
                      <option value="line">Line (Garis Fluktuasi)</option>
                      <option value="pie">Pie (Lingkaran Proporsi)</option>
                      <option value="donut">Donut (Donat Cincin)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs">
                    Buat Kategori Statistik
                  </button>
                </div>
              </form>
            )}

            {/* Select active category subset */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pilih Kategori Aktif Yang Dikelola:</label>
              <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200">
                {statistics.map((cat, index) => (
                  <button
                    key={cat.id || index}
                    onClick={() => setSelectedStatCatIdx(index)}
                    className={`flex-grow md:flex-initial text-left md:text-center font-bold text-xs py-2 px-3.5 rounded-lg transition-all ${
                      selectedStatCatIdx === index
                        ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                        : 'text-gray-650 hover:text-gray-950 hover:bg-gray-200 font-semibold'
                    }`}
                  >
                    <span>📊 {cat.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk Import Dialog Drawer with 1/2/3 Way Excel Templates */}
            {showBulkImport && (
              <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-300 space-y-4 animate-slideDown">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h4 className="font-extrabold text-xs text-amber-950 uppercase tracking-wide">Template & Generator Excel Impor Massal</h4>
                  <span className="text-[9px] bg-amber-100 px-2 py-0.5 font-bold font-mono text-amber-900 rounded">SANDBOX IMPORE_XLS</span>
                </div>
                
                {/* 3 Template Selection Buttons */}
                <div className="space-y-2">
                  <label className="text-[10px] text-amber-900 font-bold uppercase block">Pilih Model Template Tabel:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImporTemplateType('1');
                        setBulkCsvText("Dusun Girimukti,240\nDusun Sukacita,180\nDusun Mekarsari,310");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        imporTemplateType === '1'
                          ? 'bg-amber-600 text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                      }`}
                    >
                      Tabel 1 Arah (Sederhana)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImporTemplateType('2');
                        setBulkCsvText("Parit Irigasi,Pembangunan Irigasi,120,95\nBalai Pertemuan,Rehabilitasi Gedung,80,90");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        imporTemplateType === '2'
                          ? 'bg-amber-600 text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                      }`}
                    >
                      Tabel 2 Arah (Aspek Baris x Kolom)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImporTemplateType('3');
                        setBulkCsvText("Dusun 1,Usia Balita,110,85\nDusun 1,Usia Lansia,45,60\nDusun 2,Usia Balita,130,120");
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        imporTemplateType === '3'
                          ? 'bg-amber-600 text-white border-transparent'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                      }`}
                    >
                      Tabel 3 Arah (Multi-Atribut Bersarang)
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white/70 rounded-xl border border-amber-200 space-y-1.5 text-[11px] text-amber-900">
                  <span className="font-extrabold text-[10px] block uppercase text-amber-955">
                    {imporTemplateType === '1' && "💡 FORMAT TEMPLATE 1 ARAH: [Nama_Indikator, Jumlah_Akumulasi]"}
                    {imporTemplateType === '2' && "💡 FORMAT TEMPLATE 2 ARAH: [Kategori_Utama, Sub_Kategori, Angka_Pria, Angka_Wanita]"}
                    {imporTemplateType === '3' && "💡 FORMAT TEMPLATE 3 ARAH: [Dusun/Wilayah, Kelompok_Aspek, Angka_Pria, Angka_Wanita]"}
                  </span>
                  <p className="text-[10px] text-amber-800 leading-normal">
                    {imporTemplateType === '1' && "Gunakan untuk data tunggal non-silang (contoh: Jumlah penduduk per Golongan Darah, Pekerjaan)."}
                    {imporTemplateType === '2' && "Gunakan untuk dua dimensi bersilangan (contoh: Pembangunan fisik x Target realisasi realitas)."}
                    {imporTemplateType === '3' && "Gunakan untuk tiga aspek komparasi mendalam (contoh: Dusun Wilayah x Kategori Rentang Umor x Laki-laki & Perempuan)."}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-amber-900 uppercase font-bold">Sandbox Editor Pengisian Data Excel / CSV:</label>
                  <textarea
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    placeholder="Masukkan baris data koma terpisah..."
                    rows={4}
                    className="w-full p-3 bg-white border border-amber-250 rounded-xl text-xs font-mono font-bold text-gray-700 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!bulkCsvText.trim()) return;
                      const updatedStats = [...statistics];
                      const categoryToEdit = updatedStats[selectedStatCatIdx];
                      const lines = bulkCsvText.split('\n');
                      let count = 0;

                      lines.forEach((line) => {
                        const parts = line.split(',');
                        if (imporTemplateType === '1') {
                          if (parts.length >= 2) {
                            const lbl = parts[0].trim();
                            const val = Number(parts[1].trim());
                            if (lbl && !isNaN(val)) {
                              categoryToEdit.items.push({ label: lbl, value: val });
                              count++;
                            }
                          }
                        } else {
                          // 2 and 3 Arah parser flattener
                          if (parts.length >= 4) {
                            const mainLbl = parts[0].trim();
                            const subLbl = parts[1].trim();
                            const valPria = Number(parts[2].trim());
                            const valWanita = Number(parts[3].trim());
                            if (mainLbl && !isNaN(valPria)) {
                              categoryToEdit.items.push({ label: `${mainLbl} - ${subLbl} (Pria)`, value: valPria });
                            }
                            if (mainLbl && !isNaN(valWanita)) {
                              categoryToEdit.items.push({ label: `${mainLbl} - ${subLbl} (Wanita)`, value: valWanita });
                            }
                            count += 2;
                          } else if (parts.length === 3) {
                            const mainLbl = parts[0].trim();
                            const valPria = Number(parts[1].trim());
                            const valWanita = Number(parts[2].trim());
                            if (mainLbl && !isNaN(valPria)) {
                              categoryToEdit.items.push({ label: `${mainLbl} (Pria)`, value: valPria });
                            }
                            if (mainLbl && !isNaN(valWanita)) {
                              categoryToEdit.items.push({ label: `${mainLbl} (Wanita)`, value: valWanita });
                            }
                            count += 2;
                          }
                        }
                      });

                      setStatistics(updatedStats);
                      setBulkCsvText('');
                      setShowBulkImport(false);
                      showToast(`Sukses simulasi impor! ${count} parameter data ditambahkan ke ${categoryToEdit.title}.`);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-550 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Jalankan Pemrosesan Impor
                  </button>
                  <button
                    onClick={() => {
                      // Trigger copy template
                      navigator.clipboard.writeText(bulkCsvText);
                      showToast('Format salinan template berhasil disalin ke clipboard Anda!', 'info');
                    }}
                    className="px-3.5 py-2 bg-white border border-gray-200 text-slate-700 hover:bg-gray-100 rounded-lg text-xs font-bold"
                  >
                    Salin Contoh Format (Excel)
                  </button>
                  <button
                    onClick={() => setShowBulkImport(false)}
                    className="px-3 py-2 bg-white text-gray-500 rounded-lg border border-gray-200 text-xs"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Active List of categories indicators */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Add form row (5 cols) */}
              <div className="md:col-span-4 bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                <div className="border-b border-gray-200 pb-2">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Menu Pengisian Data</h4>
                </div>

                {/* Table Dimensions selector */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Dimensi Model Tabel</label>
                  <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setTableWay('1')}
                      className={`py-1 text-[10px] font-bold rounded ${
                        tableWay === '1' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Tabel 1 Arah
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableWay('2')}
                      className={`py-1 text-[10px] font-bold rounded ${
                        tableWay !== '1' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      Tabel 2 & 3 Arah
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddStatItem} className="space-y-3">
                  {tableWay === '1' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400">Nama Indikator</label>
                        <input
                          type="text"
                          value={newItemLabel}
                          autoComplete="off"
                          onChange={(e) => setNewItemLabel(e.target.value)}
                          placeholder="Contoh: Dusun C, Sarjana"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-gray-400">Jumlah Angka</label>
                        <input
                          type="number"
                          value={newItemValue}
                          onChange={(e) => setNewItemValue(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Angka akademis..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-indigo-700">Dimensi Baris (Kategori/Dusun)</label>
                        <input
                          type="text"
                          value={multiDimLabel}
                          autoComplete="off"
                          onChange={(e) => setMultiDimLabel(e.target.value)}
                          placeholder="Contoh: Dusun Giriasri, Lansia"
                          className="w-full px-3 py-2 bg-white border border-indigo-200 focus:border-indigo-400 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-indigo-700 font-mono">Dimensi Kolom (Kondisi/Aspek)</label>
                        <input
                          type="text"
                          value={multiDimSubLabel}
                          autoComplete="off"
                          onChange={(e) => setMultiDimSubLabel(e.target.value)}
                          placeholder="Contoh: Produktif, Buta Huruf"
                          className="w-full px-3 py-2 bg-white border border-indigo-200 focus:border-indigo-400 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400">Total Pria</label>
                          <input
                            type="number"
                            value={multiDimSubValuePria}
                            onChange={(e) => setMultiDimSubValuePria(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Anak Pria"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-bold text-gray-400">Total Wanita</label>
                          <input
                            type="number"
                            value={multiDimSubValueWanita}
                            onChange={(e) => setMultiDimSubValueWanita(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Anak Wanita"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 shadow-xs transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Tambahkan Data Multi-Arah</span>
                  </button>
                </form>
              </div>

              {/* Data Table rows list (8 cols) */}
              <div className="md:col-span-8 bg-white border border-gray-200 rounded-2xl overflow-hidden shrink-0">
                <div className="p-3 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700 tracking-tight">{selectedCat.title}</span>
                  <span className="text-[10px] py-0.5 px-2 bg-amber-50 font-bold text-amber-800 rounded">
                    Total: {selectedCat.items.reduce((sum, e) => sum + e.value, 0).toLocaleString()} warga
                  </span>
                </div>
                <div className="overflow-y-auto max-h-[300px]">
                  <table className="w-full text-left text-xs text-gray-650">
                    <thead className="bg-[#fcfdfd] text-gray-700 font-bold border-b border-gray-150">
                      <tr>
                        <th className="p-3">Nama Keterangan</th>
                        <th className="p-3 text-right">Jumlah / Nilai</th>
                        <th className="p-3 text-center">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {selectedCat.items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-gray-400 italic">Belum ada baris deskriptif.</td>
                        </tr>
                      ) : (
                        selectedCat.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3 font-semibold text-gray-800">{it.label}</td>
                            <td className="p-3 text-right font-mono font-bold text-gray-900">{it.value.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteStatItem(idx)}
                                className="p-1 hover:bg-red-50 text-red-650 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NEWS ARTICLE CRUD */}
        {activeTab === 'news' && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-sans">Pengurus Warta Kabar Berita</h2>
                <p className="text-gray-550 text-xs mt-1">Kelola publikasi artikel seputar program dan pembangunan desa.</p>
              </div>
              {!isAddingNews && (
                <button
                  id="add-news-btn"
                  onClick={() => {
                    setEditingNews(null);
                    setNewsForm({ title: '', content: '', category: 'Pemerintahan', thumbnail: '', status: 'Published' });
                    setIsAddingNews(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-teal-700 to-teal-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow active:scale-95 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Berita Baru</span>
                </button>
              )}
            </div>

            {/* Display list or display Form container */}
            {isAddingNews ? (
              <form onSubmit={handleSaveNews} className="space-y-4 bg-gray-50 p-5 rounded-3xl border border-gray-150 relative">
                <h3 className="font-extrabold text-sm text-slate-900 border-b border-gray-250 pb-2 flex items-center space-x-1.5">
                  <Edit3 className="h-4 w-4 text-teal-600" />
                  <span>{editingNews ? `Edit: ${editingNews.title.slice(0, 40)}...` : 'Rilis Baru Portal Warta Kabar'}</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase">Judul Warta Berita</label>
                  <input
                    type="text"
                    value={newsForm.title}
                    onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                    required
                    placeholder="Contoh: Penyerahan Raskin Beras Gogo Secara Merata di Posyandu Melati..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Rubrik Kategori</label>
                    <select
                      value={newsForm.category}
                      onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-700 font-semibold"
                    >
                      <option value="Pemerintahan">Pemerintahan</option>
                      <option value="Ekonomi">Ekonomi</option>
                      <option value="Infrastruktur">Infrastruktur</option>
                      <option value="Pendidikan">Pendidikan</option>
                      <option value="Umum">Umum / Sosialisasi</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">Status Rilis</label>
                    <select
                      value={newsForm.status}
                      onChange={(e) => setNewsForm({ ...newsForm, status: e.target.value as 'Published' | 'Draft' })}
                      required
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none text-gray-700 font-semibold"
                    >
                      <option value="Published">Published (Situs Publik)</option>
                      <option value="Draft">Draft (Arsip Internal)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase">URL Thumbnail Sampul</label>
                    <input
                      type="text"
                      value={newsForm.thumbnail}
                      onChange={(e) => setNewsForm({ ...newsForm, thumbnail: e.target.value })}
                      placeholder="Masukkan URL foto Unsplash..."
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 uppercase font-mono">Kerangka Narasi Berita</label>
                  <textarea
                    value={newsForm.content}
                    onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                    required
                    rows={8}
                    placeholder="Ketik rincian narasi detail berita desa. Pisahkan paragraf ganda dengan baris kosong ganda..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingNews ? 'Perbarui Rilis' : 'Terbitkan Berita'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNews(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Undo2 className="h-4 w-4" />
                    <span>Batal</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-inner">
                <table className="w-full text-left text-xs text-gray-600 border-collapse">
                  <thead className="bg-gray-50/70 py-3 block border-b border-gray-200 text-gray-800 font-bold">
                    <tr className="flex">
                      <th className="p-3 w-16">No</th>
                      <th className="p-3 flex-1">Judul Artikel Warta</th>
                      <th className="p-3 w-32 text-center">Rubrik</th>
                      <th className="p-3 w-28 text-center">Rilis Status</th>
                      <th className="p-3 w-28 text-center">Operasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 block max-h-[360px] overflow-y-auto">
                    {news.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors flex items-center">
                        <td className="p-3 w-16 font-semibold font-mono text-gray-450">{index + 1}</td>
                        <td className="p-3 flex-1">
                          <p className="font-extrabold text-gray-900 leading-snug line-clamp-1">{item.title}</p>
                          <p className="text-[10px] text-gray-400 font-medium font-mono mt-0.5">{item.datePublished}</p>
                        </td>
                        <td className="p-3 w-32 text-center font-bold text-gray-600">
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 w-28 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            item.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 w-28 text-center flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditNewsClick(item)}
                            title="Edit"
                            className="p-1 hover:bg-teal-50 text-teal-650 rounded"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNews(item.id)}
                            title="Delete"
                            className="p-1 hover:bg-red-50 text-red-650 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GALLERY COMPREHENSIVE ORGANIZER */}
        {activeTab === 'gallery' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="pb-3 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-sans">Kelola Galeri & Dokumentasi Kegiatan</h2>
                <p className="text-gray-550 text-xs mt-1 font-sans">Ubah dokumen album foto, integrasikan multi-photo carousel, dan edit rilis publik.</p>
              </div>

              {isEditingGalleryMode && (
                <button
                  onClick={() => {
                    setGalleryForm({ url: '', title: '', category: 'Kegiatan' });
                    setMultiUrlsText('');
                    setEditingGalleryItem(null);
                    setIsEditingGalleryMode(false);
                    showToast('Edit dibatalkan.', 'info');
                  }}
                  className="px-3.5 py-2 bg-white border border-gray-200 text-gray-600 hover:text-slate-900 hover:bg-gray-50 rounded-lg text-xs font-bold font-sans flex items-center space-x-1 transition-all"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>Batal Edit</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form upload (5 columns) */}
              <div className="lg:col-span-5 bg-gray-50 border border-gray-150 p-5 rounded-2xl space-y-4">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase">
                  {isEditingGalleryMode ? '📝 Edit Item Galeri' : '✨ Buat Album Kegiatan Baru'}
                </h4>
                
                <form id="add-gallery-photo-form" onSubmit={handleAddGalleryItem} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Judul Kegiatan / Album</label>
                    <input
                      type="text"
                      value={galleryForm.title}
                      onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                      placeholder="Contoh: Festival Panen Raya, Perbaikan Jalan Desa..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 p-3 bg-white rounded-xl border border-gray-150">
                    <label className="text-[10px] uppercase font-bold text-gray-600 block">Gambar Sampul Utama</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="upload-gallery-main"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageFileReader(file, (base64) => setGalleryForm(prev => ({ ...prev, url: base64 })));
                          }
                        }}
                        className="hidden"
                      />
                      <label htmlFor="upload-gallery-main" className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-bold text-indigo-700 cursor-pointer text-center flex items-center shrink-0 hover:bg-indigo-100 select-none">
                        Upload File
                      </label>
                      <input
                        type="text"
                        value={galleryForm.url}
                        onChange={(e) => setGalleryForm({ ...galleryForm, url: e.target.value })}
                        placeholder="Atau tempel URL gambar..."
                        className="flex-grow px-2 py-1 bg-white border border-gray-200 rounded text-[10px] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Multi images carousel uploader */}
                  <div className="space-y-1.5 p-3 bg-white rounded-xl border border-gray-150">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-gray-600">Foto Pendukung (Carousel Pendukung)</label>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
                        {multiUrlsText ? multiUrlsText.split(/[\n,]+/).filter(line => line.trim()).length : 0} Terunggah
                      </span>
                    </div>
                    
                    <textarea
                      value={multiUrlsText}
                      onChange={(e) => setMultiUrlsText(e.target.value)}
                      rows={3}
                      placeholder="Tempel tautan gambar pisahkan dengan koma atau baris baru..."
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-mono leading-relaxed mt-1"
                    />

                    <div className="flex gap-1.5 justify-end">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="upload-gallery-carousel"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          files.forEach((file) => {
                            handleImageFileReader(file, (base64) => {
                              setMultiUrlsText(prev => prev ? `${prev}\n${base64}` : base64);
                            });
                          });
                        }}
                        className="hidden"
                      />
                      <label htmlFor="upload-gallery-carousel" className="px-2 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded text-[9px] font-extrabold text-indigo-700 cursor-pointer flex items-center justify-center">
                        <Upload className="h-3 w-3 mr-1" />
                        Tambah Foto Tambahan
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500">Golongan Kategori</label>
                    <select
                      value={galleryForm.category}
                      onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 font-bold"
                    >
                      <option value="Kegiatan">Kegiatan</option>
                      <option value="Pembangunan">Pembangunan</option>
                      <option value="Budaya">Budaya</option>
                      <option value="Masyarakat">Masyarakat</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-650 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isEditingGalleryMode ? (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Simpan Perubahan Album</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Publikasikan Album Kegiatan</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Photos deletion, visual preview and edit list table (7 columns) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-slate-800 flex justify-between items-center">
                  <span>Daftar Album Foto Aktif ({gallery.length})</span>
                  <span className="text-[10px] font-medium text-gray-400">Klik ikon pensil untuk mengedit foto & deskripsi</span>
                </div>
                
                <div className="overflow-y-auto max-h-[460px]">
                  <div className="divide-y divide-gray-150">
                    {gallery.map((img) => {
                      const totalPhotos = Array.isArray(img.urls) ? img.urls.length : 1;
                      return (
                        <div key={img.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="relative group shrink-0">
                              <img
                                src={img.url}
                                alt={img.title}
                                className="w-14 h-14 object-cover rounded-xl border border-gray-150 shadow-sm shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              {totalPhotos > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-white shadow-sm font-mono scale-[0.85]">
                                  {totalPhotos}x
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 overflow-hidden">
                              <h5 className="font-extrabold text-xs text-slate-900 truncate leading-snug">{img.title}</h5>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 font-extrabold rounded">
                                  {img.category}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[9px] text-gray-400 font-bold font-mono">{img.dateAdded}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 mt-1">
                            <button
                              onClick={() => handleEditGalleryClick(img)}
                              title="Edit Album"
                              className="p-1 px-1.5 bg-teal-50 hover:bg-teal-650 text-teal-650 hover:text-white rounded-lg transition-all"
                            >
                              <Edit3 className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteGalleryItem(img.id)}
                              title="Hapus Album"
                              className="p-1 px-1.5 bg-red-50 hover:bg-red-650 text-red-600 hover:text-white rounded-lg transition-all"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SECURITY CREDENTIALS RESET (PROFIL ADMIN) */}
        {activeTab === 'profile_admin' && (
          <form onSubmit={handleSaveProfileAdmin} className="space-y-6">
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-sans">Kredensial Profil & Password</h2>
                <p className="text-gray-550 text-xs mt-1">Ubah kata kunci pengaman sandi login operator admin portal terpadu.</p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow active:scale-95 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan Kredensial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Nama Lengkap Operator</label>
                <input
                  type="text"
                  value={localProfileForm.name}
                  onChange={(e) => setLocalProfileForm({ ...localProfileForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase font-mono">Username Login</label>
                <input
                  type="text"
                  value={localProfileForm.username}
                  onChange={(e) => setLocalProfileForm({ ...localProfileForm, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase">Alamat Email Korespondensi</label>
                <input
                  type="email"
                  value={localProfileForm.email}
                  onChange={(e) => setLocalProfileForm({ ...localProfileForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase font-mono">Simulasi Kata Sandi Baru</label>
                <input
                  type="password"
                  value={localProfileForm.password}
                  onChange={(e) => setLocalProfileForm({ ...localProfileForm, password: e.target.value })}
                  placeholder="Ketik rahasia sandi baru..."
                  className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none ring-2 ring-amber-500/10 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase">URL Photo Avatar Avatar (URL)</label>
              <input
                type="text"
                value={localProfileForm.avatarUrl}
                onChange={(e) => setLocalProfileForm({ ...localProfileForm, avatarUrl: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            {/* Quick warning */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3 text-amber-900 text-xs">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-normal">
                <p className="font-extrabold">Harap Catat Sandi Baru Anda!</p>
                <p className="text-amber-800">
                  Perubahan kredensial username dan password di atas akan segera disimpan ke `localStorage`. Pastikan untuk mencatat kata kunci sandi terbaru sebelum menyimpannya agar dapat lolos autentikasi panel masuk berikutnya. Untuk saat ini, kredensial bawaan adalah: <strong className="font-mono text-emerald-800">admin / admin</strong>.
                </p>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
