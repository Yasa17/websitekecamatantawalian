/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface News {
  id: string;
  title: string;
  content: string;
  category: string;
  thumbnail: string;
  status: 'Draft' | 'Published';
  datePublished: string;
}

export interface StatisticItem {
  id?: string;
  label: string;
  value: number;
}

export type StatisticCellValue = string | number;

export interface StatisticTableColumn {
  id: string;
  label: string;
  kind: 'group' | 'column';
  dataType?: 'text' | 'number';
  children?: StatisticTableColumn[];
}

export interface StatisticTableRow {
  id: string;
  values: Record<string, StatisticCellValue>;
}

export interface StatisticTable {
  columns: StatisticTableColumn[];
  rows: StatisticTableRow[];
}

export interface StatisticCategory {
  id: string; // e.g., 'kependudukan', 'pendidikan', 'pekerjaan', 'pertanian'
  title: string;
  description: string;
  type: 'bar' | 'line' | 'pie' | 'donut';
  items: StatisticItem[];
  /**
   * Struktur tabel fleksibel untuk dataset baru. `items` tetap disimpan sebagai
   * proyeksi data numerik agar grafik dan data lama tetap kompatibel.
   */
  table?: StatisticTable;
}

export interface GalleryItem {
  id: string;
  url: string;
  urls?: string[]; // multiple photos for gallery carousel
  title: string;
  category: string; // e.g., 'Kegiatan', 'Pembangunan', 'Budaya'
  dateAdded: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
}

export interface AdminProfile {
  id?: string;
  name: string;
  username: string;
  email: string;
  password?: string; // only used as a transient new-password form value
  avatarUrl: string;
  role?: 'super_admin' | 'admin';
  assignedEntityId?: string;
  assignedEntityLabel?: string;
}

export interface VillageProfile {
  administrationLevel?: 'kecamatan' | 'desa' | 'kelurahan';
  headRole?: string;
  officeLabel?: string;
  contentLabel?: string;
  name: string;
  subdistrict: string;
  regency: string;
  province: string;
  headName: string;
  headPhotoUrl: string;
  welcomeText: string;
  history: string;
  vision: string;
  mission: string[]; // split into points
  organizationStructureUrl: string;
  address: string;
  phone: string;
  email: string;
  mapEmbedUrl: string;
  geographicData: {
    area: string; // e.g., "124.5 Ha"
    northBoundary: string;
    eastBoundary: string;
    southBoundary: string;
    westBoundary: string;
  };
  staff?: StaffMember[]; // customizable list of staff members / aparatur
}

export interface PortalEntityContent {
  profile: VillageProfile;
  statistics: StatisticCategory[];
  news: News[];
  gallery: GalleryItem[];
}

export interface PortalEntity {
  id: string;
  type: 'kecamatan' | 'desa' | 'kelurahan';
  label: string;
  shortLabel: string;
  content: PortalEntityContent;
}

export interface PortalData {
  entities: PortalEntity[];
}
