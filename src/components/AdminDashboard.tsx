/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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
  AlertCircle,
  LoaderCircle,
  MessagesSquare,
  PhoneCall,
} from 'lucide-react';
import { VillageProfile, StatisticCategory, News, GalleryItem, AdminProfile } from '../types';
import { formatImageSize, processImageToWebP, type ProcessedImage } from '../utils/imageUpload';
import { DistrictDataRecap, type DistrictEntitySummary } from './DistrictSummary';
import StatisticTableManager from './StatisticTableManager';
import ContactSettingsEditor from './ContactSettingsEditor';
import CitizenSubmissionManager from './CitizenSubmissionManager';

interface AdminDashboardProps {
  villageProfile: VillageProfile;
  setVillageProfile: (p: VillageProfile) => Promise<boolean>;
  statistics: StatisticCategory[];
  setStatistics: (s: StatisticCategory[]) => Promise<boolean>;
  news: News[];
  setNews: (n: News[]) => Promise<boolean>;
  gallery: GalleryItem[];
  setGallery: (g: GalleryItem[]) => Promise<boolean>;
  adminProfile: AdminProfile;
  setAdminProfile: (a: AdminProfile, currentPassword?: string) => Promise<boolean>;
  districtEntities?: DistrictEntitySummary[];
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
  districtEntities = [],
  onLogout,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'profil' | 'contact' | 'submissions' | 'stats' | 'news' | 'gallery' | 'profile_admin'>('overview');
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : 'Kepala Desa');
  const roleLabel = adminProfile.role === 'super_admin' ? 'ADMIN KECAMATAN' : `ADMIN ${unitLabel.toUpperCase()}`;
  const scopeLabel = adminProfile.assignedEntityLabel || villageProfile.name;

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

  // GALLERY States & Multi-Photo modes
  const [galleryForm, setGalleryForm] = useState({
    url: '',
    title: '',
    category: 'Kegiatan',
  });
  const [galleryPhotoUrls, setGalleryPhotoUrls] = useState<string[]>([]);
  const [processedGalleryImages, setProcessedGalleryImages] = useState<ProcessedImage[]>([]);
  const [isProcessingGalleryImage, setIsProcessingGalleryImage] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [isEditingGalleryMode, setIsEditingGalleryMode] = useState(false);

  // PROFILE States
  const [localProfileForm, setLocalProfileForm] = useState({
    name: adminProfile.name,
    username: adminProfile.username,
    email: adminProfile.email,
    password: '',
    avatarUrl: adminProfile.avatarUrl,
  });
  const [currentPassword, setCurrentPassword] = useState('');
  const [processingImageField, setProcessingImageField] = useState<string | null>(null);
  const [savingOperation, setSavingOperation] = useState<
    null | 'profile' | 'news' | 'gallery' | 'credentials'
  >(null);

  // VILLAGE PROFILE States & Staff fields
  const [villageForm, setVillageForm] = useState<VillageProfile>({ ...villageProfile });
  const [newMissionBullet, setNewMissionBullet] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [newStaffPhoto, setNewStaffPhoto] = useState('');

  useEffect(() => {
    setVillageForm({ ...villageProfile });
  }, [villageProfile]);

  useEffect(() => {
    setLocalProfileForm((current) => ({
      ...current,
      name: adminProfile.name,
      username: adminProfile.username,
      email: adminProfile.email,
      avatarUrl: adminProfile.avatarUrl,
    }));
  }, [adminProfile]);

  // Toast trigger
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSingleImageUpload = async (
    file: File,
    fieldName: string,
    onComplete: (dataUrl: string) => void,
  ) => {
    setProcessingImageField(fieldName);
    try {
      const processed = await processImageToWebP(file);
      onComplete(processed.dataUrl);
      showToast(
        `Gambar dikonversi ke WebP (${formatImageSize(processed.size)}).`,
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Gambar gagal diproses.',
        'info',
      );
    } finally {
      setProcessingImageField(null);
    }
  };

  const handleGalleryImagesChange = async (files: File[]) => {
    const remainingSlots = 5 - galleryPhotoUrls.length;
    if (remainingSlots <= 0) {
      showToast('Satu album maksimal berisi 5 foto.', 'info');
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    setIsProcessingGalleryImage(true);
    try {
      const results = await Promise.allSettled(
        selectedFiles.map((file) => processImageToWebP(file)),
      );
      const processed = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      const firstFailure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );

      if (processed.length) {
        setProcessedGalleryImages((current) => [...current, ...processed]);
        setGalleryPhotoUrls((current) => [
          ...current,
          ...processed.map((image) => image.dataUrl),
        ].slice(0, 5));
        setGalleryForm((current) => ({
          ...current,
          url: current.url || processed[0].dataUrl,
        }));
        showToast(`${processed.length} foto berhasil dikonversi ke WebP.`);
      }
      if (files.length > remainingSlots) {
        showToast(
          `Hanya ${remainingSlots} foto yang diproses karena satu album maksimal 5 foto.`,
          'info',
        );
      } else if (firstFailure) {
        showToast(
          firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : 'Sebagian foto gagal diproses.',
          'info',
        );
      }
    } finally {
      setIsProcessingGalleryImage(false);
    }
  };

  const handleRemoveGalleryPhoto = (index: number) => {
    const removedUrl = galleryPhotoUrls[index];
    const nextUrls = galleryPhotoUrls.filter((_, photoIndex) => photoIndex !== index);
    setGalleryPhotoUrls(nextUrls);
    setProcessedGalleryImages((current) =>
      current.filter((image) => image.dataUrl !== removedUrl),
    );
    setGalleryForm((current) => ({ ...current, url: nextUrls[0] || '' }));
  };

  // 1. SAVE VILLAGE PROFILE
  const handleSaveVillageProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingOperation) return;
    setSavingOperation('profile');
    try {
      const success = await setVillageProfile(villageForm);
      if (success) showToast(`Profil ${unitLabel} berhasil diperbarui dan dipublikasikan!`);
    } finally {
      setSavingOperation(null);
    }
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
    if (!newStaffName.trim() || !newStaffRole.trim() || !newStaffPhoto) {
      showToast('Nama, jabatan, dan foto perangkat wajib diisi!', 'info');
      return;
    }
    const newMember = {
      id: `staff_${Date.now()}`,
      name: newStaffName.trim(),
      role: newStaffRole.trim(),
      photoUrl: newStaffPhoto,
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

  const handleUpdateStaffPhoto = (idx: number, dataUrl: string) => {
    setVillageForm((current) => ({
      ...current,
      staff: (current.staff || []).map((staff, staffIndex) =>
        staffIndex === idx ? { ...staff, photoUrl: dataUrl } : staff,
      ),
    }));
  };

  const handleDeleteStaffMember = (idx: number) => {
    setVillageForm(prev => ({
      ...prev,
      staff: (prev.staff || []).filter((_, i) => i !== idx)
    }));
    showToast('Perangkat desa dihapus.');
  };

  // 2. NEWS CRUD
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim() || !newsForm.thumbnail) {
      showToast('Judul, isi berita, dan thumbnail wajib diisi.', 'info');
      return;
    }
    if (savingOperation) return;
    setSavingOperation('news');

    try {
      if (editingNews) {
        const updatedNews = news.map((item) =>
          item.id === editingNews.id
            ? {
                ...item,
                title: newsForm.title,
                content: newsForm.content,
                category: newsForm.category,
                thumbnail: newsForm.thumbnail,
                status: newsForm.status,
                datePublished: item.datePublished || new Date().toISOString().split('T')[0],
              }
            : item
        );
        const success = await setNews(updatedNews);
        if (!success) return;
        setEditingNews(null);
        setIsAddingNews(false);
        showToast('Berita berhasil diperbarui!');
      } else {
        const newArticle: News = {
          id: String(Date.now()),
          title: newsForm.title,
          content: newsForm.content,
          category: newsForm.category,
          thumbnail: newsForm.thumbnail,
          status: newsForm.status,
          datePublished: new Date().toISOString().split('T')[0],
        };
        const success = await setNews([newArticle, ...news]);
        if (!success) return;
        setIsAddingNews(false);
        showToast('Berita baru berhasil dipublikasikan!');
      }

      setNewsForm({
        title: '',
        content: '',
        category: 'Umum',
        thumbnail: '',
        status: 'Published',
      });
    } finally {
      setSavingOperation(null);
    }
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

  const handleDeleteNews = async (id: string) => {
    const confirmation = confirm('Apakah Anda yakin ingin menghapus berita ini secara permanen?');
    if (!confirmation) return;
    const success = await setNews(news.filter(n => n.id !== id));
    if (success) showToast('Berita berhasil dihapus.');
  };

  // 4. GALLERY OPERATIONS
  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.title.trim()) {
      showToast('Judul dokumentasi wajib diisi!', 'info');
      return;
    }

    if (galleryPhotoUrls.length < 1 || galleryPhotoUrls.length > 5) {
      showToast('Setiap album wajib berisi minimal 1 dan maksimal 5 foto.', 'info');
      return;
    }
    if (savingOperation) return;
    setSavingOperation('gallery');
    const primaryUrl = galleryPhotoUrls[0];

    try {
      if (isEditingGalleryMode && editingGalleryItem) {
        const updatedGallery = gallery.map((g) =>
          g.id === editingGalleryItem.id
            ? {
                ...g,
                title: galleryForm.title.trim(),
                category: galleryForm.category,
                url: primaryUrl,
                urls: galleryPhotoUrls,
              }
            : g
        );
        const success = await setGallery(updatedGallery);
        if (!success) return;
        showToast('Item album galeri berhasil diperbarui!');
      } else {
        const newItem: GalleryItem = {
          id: `g_${Date.now()}`,
          url: primaryUrl,
          urls: galleryPhotoUrls,
          title: galleryForm.title.trim(),
          category: galleryForm.category,
          dateAdded: new Date().toISOString().split('T')[0]
        };
        const success = await setGallery([newItem, ...gallery]);
        if (!success) return;
        showToast(`Album galeri baru berhasil dibuat dengan ${galleryPhotoUrls.length} foto!`);
      }

      setGalleryForm({ url: '', title: '', category: 'Kegiatan' });
      setGalleryPhotoUrls([]);
      setProcessedGalleryImages([]);
      setEditingGalleryItem(null);
      setIsEditingGalleryMode(false);
    } finally {
      setSavingOperation(null);
    }
  };

  const handleEditGalleryClick = (item: GalleryItem) => {
    setEditingGalleryItem(item);
    setIsEditingGalleryMode(true);
    setGalleryForm({
      url: item.url,
      title: item.title,
      category: item.category || 'Kegiatan',
    });
    setGalleryPhotoUrls(
      Array.isArray(item.urls) && item.urls.length ? item.urls.slice(0, 5) : [item.url],
    );
    setProcessedGalleryImages([]);
    showToast(`Mengedit album "${item.title}"...`, 'info');
  };

  const handleDeleteGalleryItem = async (id: string) => {
    const confirmation = confirm('Apakah Anda yakin ingin menghapus album galeri ini?');
    if (!confirmation) return;
    const success = await setGallery(gallery.filter(g => g.id !== id));
    if (success) showToast('Album galeri berhasil dihapus.');
  };

  // 5. PROFILE ACCOUNT ADMIN SETTINGS
  const handleSaveProfileAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localProfileForm.username.trim() || !localProfileForm.name.trim()) return;
    if (localProfileForm.password && !currentPassword) {
      showToast('Masukkan kata sandi saat ini untuk mengganti kata sandi.', 'info');
      return;
    }
    if (savingOperation) return;
    setSavingOperation('credentials');

    try {
      const success = await setAdminProfile({
        name: localProfileForm.name,
        username: localProfileForm.username,
        email: localProfileForm.email,
        password: localProfileForm.password,
        avatarUrl: localProfileForm.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop'
      }, currentPassword);

      if (!success) return;

      setCurrentPassword('');
      setLocalProfileForm((current) => ({ ...current, password: '' }));
      showToast('Profil admin berhasil disimpan ke backend.');
    } finally {
      setSavingOperation(null);
    }
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
            onClick={() => setActiveTab('contact')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'contact' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <PhoneCall className="h-4 w-4 shrink-0" />
            <span>Informasi Penghubung</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'submissions' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <MessagesSquare className="h-4 w-4 shrink-0" />
            <span>Aspirasi & Aduan</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold leading-none flex items-center space-x-3 transition-colors ${
              activeTab === 'stats' ? 'bg-amber-600 text-white shadow-md font-extrabold' : 'hover:bg-slate-800 text-slate-350'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span>{adminProfile.role === 'super_admin' ? 'Rekap Data Wilayah' : 'Kelola Data & Statistik'}</span>
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
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">Selamat Bekerja, Operator {unitLabel}!</h2>
              <p className="text-gray-500 text-xs mt-1">
                {adminProfile.role === 'super_admin'
                  ? 'Kelola profil, berita, dan galeri kegiatan kecamatan. Data statistik ditampilkan sebagai rekap otomatis dari desa dan kelurahan.'
                  : 'Gunakan menu panel untuk mengelola data, profil, berita, galeri, dan kredensial administrasi wilayah.'}
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
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  {adminProfile.role === 'super_admin' ? 'Wilayah dalam Rekap' : 'Statistik Kependudukan'}
                </span>
                <p className="text-3xl font-black text-gray-900 mt-1">
                  {adminProfile.role === 'super_admin' ? districtEntities.length : statistics.length}
                  {adminProfile.role === 'super_admin' ? ' Wilayah' : ' Kategori'}
                </p>
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  {adminProfile.role === 'super_admin'
                    ? 'Data desa dan kelurahan dijumlahkan otomatis.'
                    : 'Visualisasi grafik batang, garis, pie, donut.'}
                </p>
              </div>
            </div>

            {/* Quick Action guides */}
            <div className="p-5 bg-teal-50 border border-teal-100/50 rounded-2xl text-teal-900 flex items-start space-x-4">
              <AlertCircle className="h-5 w-5 mt-0.5 text-teal-600 shrink-0" />
              <div className="space-y-1 text-xs leading-relaxed text-justify">
                <h5 className="font-bold text-teal-950">Informasi Penyimpanan Data:</h5>
                <p>
                  {adminProfile.role === 'super_admin'
                    ? <>Pembaruan profil, berita, dan galeri kecamatan disimpan ke backend dan <strong>langsung direfleksikan pada halaman publik.</strong> Data statistik tetap baca-saja karena berasal dari penjumlahan data wilayah.</>
                    : <>Setiap pemutakhiran berita, galeri, dan data statistik disimpan ke backend lalu <strong>langsung direfleksikan pada halaman publik.</strong> Data tetap tersedia saat aplikasi dibuka dari perangkat atau browser lain.</>}
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
                <p className="text-gray-550 text-xs mt-1">Perbarui sejarah, visi kepemimpinan, dan gambar profil melalui unggahan WebP.</p>
              </div>
              <button
                type="submit"
                disabled={processingImageField !== null || savingOperation !== null}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg text-white font-bold text-xs tracking-wide flex items-center space-x-1.5 transition-all shadow active:scale-95 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingOperation === 'profile' ? 'Menyimpan...' : 'Simpan Profil'}</span>
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
                <div className="flex items-center gap-3">
                  {villageForm.headPhotoUrl && (
                    <img src={villageForm.headPhotoUrl} alt={`Foto ${headRole}`} className="h-16 w-14 rounded-lg border border-gray-200 object-cover" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    id="upload-kades-file"
                    disabled={processingImageField === 'head-photo'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleSingleImageUpload(file, 'head-photo', (dataUrl) =>
                          setVillageForm((current) => ({ ...current, headPhotoUrl: dataUrl })),
                        );
                      }
                      e.currentTarget.value = '';
                    }}
                    className="hidden"
                  />
                  <label htmlFor="upload-kades-file" className="flex-grow px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/80 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center">
                    {processingImageField === 'head-photo' ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1 text-indigo-650" />}
                    {processingImageField === 'head-photo' ? 'Mengonversi...' : 'Pilih Foto'}
                  </label>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 bg-gray-50/55 rounded-xl border border-gray-150">
                <label className="text-xs font-bold text-gray-650 uppercase block">Bagan Struktur Organisasi</label>
                <div className="space-y-2">
                  {villageForm.organizationStructureUrl && (
                    <img src={villageForm.organizationStructureUrl} alt="Struktur organisasi" className="h-16 w-full rounded-lg border border-gray-200 bg-white object-contain" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    id="upload-bagan-file"
                    disabled={processingImageField === 'organization-structure'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleSingleImageUpload(file, 'organization-structure', (dataUrl) =>
                          setVillageForm((current) => ({ ...current, organizationStructureUrl: dataUrl })),
                        );
                      }
                      e.currentTarget.value = '';
                    }}
                    className="hidden"
                  />
                  <label htmlFor="upload-bagan-file" className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/80 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center">
                    {processingImageField === 'organization-structure' ? <LoaderCircle className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1 text-indigo-650" />}
                    {processingImageField === 'organization-structure' ? 'Mengonversi...' : 'Pilih Gambar Struktur'}
                  </label>
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
                    <div className="flex items-center gap-2">
                      {newStaffPhoto && (
                        <img src={newStaffPhoto} alt="Foto perangkat baru" className="h-10 w-9 rounded object-cover border border-gray-200" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="new-staff-photo-uploader"
                        disabled={processingImageField === 'new-staff-photo'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleSingleImageUpload(
                              file,
                              'new-staff-photo',
                              setNewStaffPhoto,
                            );
                          }
                          e.currentTarget.value = '';
                        }}
                        className="hidden"
                      />
                      <label htmlFor="new-staff-photo-uploader" className="flex-grow px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-bold text-indigo-700 cursor-pointer text-center flex items-center justify-center hover:bg-indigo-100 select-none">
                        {processingImageField === 'new-staff-photo' ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />}
                        {processingImageField === 'new-staff-photo' ? 'Mengonversi...' : 'Pilih Foto'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddStaff}
                    disabled={processingImageField !== null || savingOperation !== null}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg flex items-center space-x-1"
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
                        <div className="relative shrink-0">
                          <input
                            type="file"
                            accept="image/*"
                            id={`staff-photo-${staff.id || sIdx}`}
                            disabled={processingImageField === `staff-photo-${sIdx}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                void handleSingleImageUpload(
                                  file,
                                  `staff-photo-${sIdx}`,
                                  (dataUrl) => handleUpdateStaffPhoto(sIdx, dataUrl),
                                );
                              }
                              e.currentTarget.value = '';
                            }}
                            className="hidden"
                          />
                          <label htmlFor={`staff-photo-${staff.id || sIdx}`} className="group block cursor-pointer">
                            <img src={staff.photoUrl} alt={staff.name} className="w-10 h-12 object-cover rounded-lg border border-gray-150" />
                            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                              {processingImageField === `staff-photo-${sIdx}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </span>
                          </label>
                        </div>
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

        {activeTab === 'contact' && (
          <ContactSettingsEditor
            villageProfile={villageProfile}
            onSave={setVillageProfile}
            showToast={showToast}
          />
        )}

        {activeTab === 'submissions' && <CitizenSubmissionManager />}

        {/* TAB 3: STATISTIC DATA MANAGER */}
        {activeTab === 'stats' && (
          adminProfile.role === 'super_admin' ? (
            <DistrictDataRecap entities={districtEntities} />
          ) : (
            <StatisticTableManager
              statistics={statistics}
              setStatistics={setStatistics}
              showToast={showToast}
            />
          )
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
                    <label className="text-xs font-bold text-gray-600 uppercase">Thumbnail Sampul</label>
                    <input
                      type="file"
                      accept="image/*"
                      id="news-thumbnail-upload"
                      disabled={processingImageField === 'news-thumbnail'}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          void handleSingleImageUpload(file, 'news-thumbnail', (dataUrl) =>
                            setNewsForm((current) => ({ ...current, thumbnail: dataUrl })),
                          );
                        }
                        e.currentTarget.value = '';
                      }}
                      className="hidden"
                    />
                    <label htmlFor="news-thumbnail-upload" className="w-full px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center">
                      {processingImageField === 'news-thumbnail' ? <LoaderCircle className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                      {processingImageField === 'news-thumbnail' ? 'Mengonversi...' : 'Pilih Gambar'}
                    </label>
                    {newsForm.thumbnail && (
                      <img src={newsForm.thumbnail} alt="Pratinjau thumbnail" className="h-20 w-full rounded-lg border border-gray-200 object-cover" />
                    )}
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
                    disabled={processingImageField !== null || savingOperation !== null}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {savingOperation === 'news'
                        ? 'Menyimpan...'
                        : editingNews ? 'Perbarui Rilis' : 'Terbitkan Berita'}
                    </span>
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
                <p className="text-gray-550 text-xs mt-1 font-sans">Jumlah album tidak dibatasi. Setiap album dapat memuat 1–5 foto WebP.</p>
              </div>

              {isEditingGalleryMode && (
                <button
                  onClick={() => {
                    setGalleryForm({ url: '', title: '', category: 'Kegiatan' });
                    setGalleryPhotoUrls([]);
                    setProcessedGalleryImages([]);
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
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] uppercase font-bold text-gray-600 block">Foto dalam Album</label>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700">
                        {galleryPhotoUrls.length}/5 foto
                      </span>
                    </div>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        id="upload-gallery-main"
                        disabled={isProcessingGalleryImage || galleryPhotoUrls.length >= 5}
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          if (files.length) void handleGalleryImagesChange(files);
                          e.currentTarget.value = '';
                        }}
                        className="hidden"
                      />
                      <label htmlFor="upload-gallery-main" className={`w-full px-3 py-2.5 border rounded-lg text-[10px] font-bold text-center flex items-center justify-center gap-2 select-none ${isProcessingGalleryImage || galleryPhotoUrls.length >= 5 ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 border-indigo-200 text-indigo-700 cursor-pointer hover:bg-indigo-100'}`}>
                        {isProcessingGalleryImage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isProcessingGalleryImage
                          ? 'Mengonversi foto ke WebP...'
                          : galleryPhotoUrls.length >= 5
                            ? 'Batas 5 Foto dalam Album Tercapai'
                            : 'Pilih 1–5 Foto dari Perangkat'}
                      </label>
                    </div>
                    {galleryPhotoUrls.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {galleryPhotoUrls.map((url, index) => {
                          const processed = processedGalleryImages.find(
                            (image) => image.dataUrl === url,
                          );
                          return (
                            <div key={`${url.slice(0, 32)}-${index}`} className="relative rounded-lg border border-gray-200 bg-gray-50 p-1.5">
                              <img src={url} alt={`Foto album ${index + 1}`} className="h-20 w-full rounded-md object-cover" />
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryPhoto(index)}
                                className="absolute right-2 top-2 rounded-md bg-red-600 p-1 text-white shadow hover:bg-red-700"
                                title={`Hapus foto ${index + 1}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <p className="mt-1 truncate text-[9px] font-bold text-gray-600">
                                Foto {index + 1}
                                {processed ? ` · WebP ${formatImageSize(processed.size)}` : ' · Tersimpan'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-2 text-[10px] leading-relaxed text-amber-700">
                      Foto kamera tidak langsung diunggah. Setiap foto dikonversi ke WebP dengan ukuran maksimal 500 KB. Satu album wajib berisi 1–5 foto.
                    </p>
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
                    disabled={isProcessingGalleryImage || savingOperation !== null}
                    className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-650 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {savingOperation === 'gallery' ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : isEditingGalleryMode ? (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Simpan Perubahan Album</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Publikasikan Album</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Photos deletion, visual preview and edit list table (7 columns) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden shrink-0 shadow-sm">
                <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-slate-800 flex justify-between items-center">
                  <span>Daftar Album Galeri ({gallery.length})</span>
                  <span className="text-[10px] font-medium text-gray-400">Setiap album berisi maksimal 5 foto</span>
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
                disabled={processingImageField !== null || savingOperation !== null}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow active:scale-95 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{savingOperation === 'credentials' ? 'Menyimpan...' : 'Simpan Kredensial'}</span>
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
                <label className="text-xs font-bold text-gray-600 uppercase font-mono">Kata Sandi Baru (Opsional)</label>
                <input
                  type="password"
                  value={localProfileForm.password}
                  onChange={(e) => setLocalProfileForm({ ...localProfileForm, password: e.target.value })}
                  placeholder="Minimal 8 karakter"
                  className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-lg text-xs focus:outline-none ring-2 ring-amber-500/10 focus:ring-amber-500"
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase font-mono">Kata Sandi Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Wajib diisi hanya saat mengganti kata sandi"
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase">Foto Avatar Admin</label>
              <input
                type="file"
                accept="image/*"
                id="admin-avatar-upload"
                disabled={processingImageField === 'admin-avatar'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleSingleImageUpload(file, 'admin-avatar', (dataUrl) =>
                      setLocalProfileForm((current) => ({ ...current, avatarUrl: dataUrl })),
                    );
                  }
                  e.currentTarget.value = '';
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {localProfileForm.avatarUrl && (
                  <img src={localProfileForm.avatarUrl} alt="Avatar admin" className="h-16 w-16 rounded-xl border border-gray-200 object-cover" />
                )}
                <label htmlFor="admin-avatar-upload" className="flex-grow px-4 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-xs font-bold text-indigo-700 cursor-pointer flex items-center justify-center">
                  {processingImageField === 'admin-avatar' ? <LoaderCircle className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                  {processingImageField === 'admin-avatar' ? 'Mengonversi...' : 'Pilih Foto Avatar'}
                </label>
              </div>
            </div>

            {/* Quick warning */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3 text-amber-900 text-xs">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-normal">
                <p className="font-extrabold">Kredensial Disimpan dengan Aman</p>
                <p className="text-amber-800">
                  Perubahan profil disimpan ke backend. Kata sandi tidak disimpan di browser dan dicatat sebagai hash. Untuk mengganti kata sandi, masukkan kata sandi saat ini terlebih dahulu.
                </p>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
