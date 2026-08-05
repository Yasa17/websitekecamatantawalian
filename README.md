# Portal Kecamatan Tawalian

Portal publik dan panel admin untuk Kecamatan Tawalian beserta desa/kelurahannya.
Aplikasi terdiri dari frontend React/Vite, backend Express, dan PostgreSQL sebagai
database persisten. Berkas `database.json` tidak lagi dipakai oleh aplikasi.

## Persiapan database

Prasyarat: Node.js 20 atau lebih baru dan PostgreSQL yang sudah berjalan.

1. Buat database PostgreSQL kosong beserta user khusus untuk aplikasi ini.
2. Salin `.env.example` menjadi `.env`.
3. Isi sendiri `DATABASE_URL` dan `INITIAL_ADMIN_PASSWORD` di `.env`. Jangan
   mengirim atau commit berkas tersebut.
4. Pasang dependency dan jalankan migrasi:

```bash
npm install
npm run db:migrate
```

Migrasi membuat tabel berikut:

- `portal_entities`: profil, statistik, berita, dan galeri setiap wilayah dalam
  kolom PostgreSQL `JSONB`
- `admins`: identitas, hak akses, dan hash password admin
- `admin_sessions`: sesi login persisten; token mentah tidak disimpan
- `schema_migrations`: riwayat migrasi skema

## Memasukkan data pertama kali

Pilih tepat salah satu cara berikut.

Untuk mempertahankan seluruh data yang saat ini ada di
`server/data/database.json`:

```bash
npm run db:import-json
```

Import tersebut juga mempertahankan hash password admin lama. Berkas JSON tidak
dihapus otomatis sehingga masih dapat dijadikan backup sampai hasil import Anda
periksa.

Untuk database baru tanpa mengambil data JSON lama:

```bash
npm run db:seed
```

Seed mengambil konten awal project dan memakai `INITIAL_ADMIN_PASSWORD` dari
`.env`. Seed/import aman dijalankan ulang: proses dilewati jika database sudah
memiliki data dan tidak menimpa isi yang ada.

## Menjalankan aplikasi

```bash
npm run dev
```

Perintah tersebut menjalankan:

- website di `http://localhost:3000`
- backend API di `http://localhost:8787`
- pemuatan ulang backend otomatis ketika berkas di folder `server` berubah

Backend juga menjalankan migrasi yang belum diterapkan ketika startup. Untuk
produksi:

```bash
npm run build
npm start
```

Setelah build, backend melayani API dan hasil frontend dari
`http://localhost:8787`.

## Deployment Cloudflare Pages

Project Pages menggunakan konfigurasi build berikut:

- perintah build: `npm run build`
- direktori output: `dist`
- branch produksi: `main`
- compatibility flag: `nodejs_compat`
- binding Hyperdrive: `HYPERDRIVE`

Folder `functions/api` menjalankan adaptor Fetch native sebagai Pages Function;
Express hanya digunakan oleh server lokal Node.js.
Frontend tetap memakai alamat relatif `/api`, sehingga tidak membutuhkan URL API
atau pengaturan CORS tambahan. Berkas `public/_routes.json` memastikan hanya
permintaan `/api/*` yang menjalankan Function; aset React tetap dilayani sebagai
Pages statis.

Berkas `wrangler.jsonc` adalah sumber konfigurasi deployment Pages. Berkas ini
memuat compatibility flag dan ID binding Hyperdrive yang bukan rahasia. Connection
string, password database, dan `localConnectionString` tidak boleh dimasukkan ke
berkas tersebut atau disimpan di Git.

Hyperdrive harus dibuat memakai **Direct connection** Supabase, bukan Session
pooler, karena Hyperdrive sudah menangani connection pooling. Connection string
dan password disimpan oleh konfigurasi Hyperdrive di Cloudflare dan tidak boleh
dimasukkan ke source code, GitHub, atau Variables and secrets Pages. Migrasi
database tetap dijalankan dari komputer/server tepercaya dengan `npm run
db:migrate`, bukan pada setiap permintaan Pages Function.

Periksa bundle Pages Function sebelum push:

```bash
npm run test:cloudflare
```

## Akun awal

- Kecamatan (kelola konten dan rekap data baca-saja): `admin`
- Desa Tawalian Timur: `tawalian-timur`
- Desa Kariango: `kariango`
- Kelurahan Tawalian: `kelurahan-tawalian`
- Desa Rantetangnga: `rantetangnga`

Untuk seed baru, password awalnya adalah nilai rahasia
`INITIAL_ADMIN_PASSWORD` yang Anda isi sendiri. Untuk hasil import JSON, gunakan
password admin yang sebelumnya berlaku. Ubah password melalui profil admin
setelah login pertama.

## Environment database

- `DATABASE_URL` wajib dan tidak memiliki nilai default. Untuk Supabase, gunakan
  URI **Session pooler** yang masih memuat `[YOUR-PASSWORD]`.
- `DATABASE_PASSWORD` diisi terpisah; backend otomatis mengamankan simbol pada
  password sebelum membuka koneksi.
- `DATABASE_SSL=false` sesuai untuk PostgreSQL lokal pada umumnya.
- Untuk Supabase gunakan `DATABASE_SSL=true`. Backend memverifikasi server dengan
  `server/prod-ca-2021.crt`; lokasinya dapat dioverride melalui
  `DATABASE_CA_CERT_PATH`.
- `.gitignore` sudah mengecualikan seluruh `.env*` selain `.env.example`.
- Pengujian API memakai PostgreSQL in-memory yang terisolasi dan tidak membaca
  `DATABASE_URL` atau data rahasia Anda.

## Aturan galeri

- Jumlah album galeri tidak dibatasi.
- Setiap album berisi minimal 1 dan maksimal 5 foto.
- Foto dari perangkat diproses di browser terlebih dahulu, bukan langsung
  diunggah dalam format aslinya.
- Hasil dikonversi menjadi WebP dengan ukuran lebih dari 0 KB dan maksimal 500 KB.
- Backend memvalidasi kembali format, ukuran, dan jumlah foto.
- Foto profil wilayah, struktur organisasi, perangkat, thumbnail berita, dan
  avatar admin juga dipilih dari perangkat dan diproses dengan aturan yang sama;
  panel admin tidak menyediakan input URL gambar.

## Pemeriksaan

```bash
npm run lint
npm run test:server
npm run test:statistics
npm run test:cloudflare
npm run build
```
