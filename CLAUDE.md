# SAREN (Super App Rendi) — Dokumen Arsitektur & Panduan Sistem

Dokumen ini berisi panduan komprehensif arsitektur sistem **SAREN**, mencakup backend, frontend, database, sistem performa, serta aturan pengembangan mobile-first. **Setiap AI Agent pengembang wajib membaca dokumen ini sebelum melakukan pengkodean.**

---

## 🛠️ 1. Stack Teknologi

* **Framework**: Next.js 15+ (App Router)
* **Bahasa**: TypeScript (Strict Mode)
* **Database & ORM**: PostgreSQL (Supabase) via Prisma ORM v6
* **Styling & UI**: Tailwind CSS v4, Vanilla CSS Custom Variables (Dark/Light mode)
* **Icons**: `lucide-react`
* **Notification / Toasts**: `sonner`
* **PWA & Service Worker**: Custom SW (`public/sw.js`) + Push Notifications

---

## 🏗️ 2. Arsitektur Backend & Data Layer

### A. Skema Database (`prisma/schema.prisma`)
1. **`Garapan`**: Mengelompokkan pekerjaan berdasarkan bulan & tahun.
   - Relasi `1:N` ke `Aplikasi`.
2. **`Aplikasi`**: Aplikasi yang dikerjakan (dapat terikat pada `Garapan` atau `standalone` jika `garapanId = null`).
   - Relasi `1:N` ke `Kolom` dan `Akun`.
   - `@@index([garapanId])`
3. **`Kolom`**: Dynamic Custom Column per aplikasi.
   - Tipe: `TEKS`, `NOMOR`, `NOMINAL`, `CENTANG`, `TANGGAL`, `RUMUS`.
   - Menunjukkan `isTarget`, `nilaiTarget`, `isAccumulated`, `rumus`.
   - `@@index([aplikasiId, urutan])`
4. **`Akun`**: Data akun per aplikasi.
   - Kolom bawaan: `nama`, `device`, `nomorHp`.
   - Custom fields: Disimpan di JSON `customValues`.
   - `@@index([aplikasiId, urutan])`
5. **`Nomor`**: Manajemen nomor telepon / kartu perdana.
   - Kolom: `provider`, `nomorKartu`, `pulsa` (integer Rupiah), `masaAktif` (DateTime).
   - `@@index([masaAktif])`
6. **`Note`**, **`ListItem`**, **`Label`**, **`Folder`**: Modul Keep Notes Premium.
   - `@@index([isTrashed, isArchived, isPinned])`, `@@index([updatedAt])`

### B. Server Actions (`lib/actions/`)
Seluruh mutasi & pembacaan data dilakukan melalui Next.js Server Actions:
* `garapan.ts`: CRUD Garapan (`getGarapanList`, `createGarapan`, `updateGarapan`, `deleteGarapan`).
* `aplikasi.ts`: CRUD Aplikasi & Upload Logo via Vercel Blob (`getAplikasiList`, `createAplikasi`, `updateAplikasi`, `deleteAplikasi`).
* `kolom.ts`: CRUD Kolom Kustom & Swap Urutan Kolom (`createKolom`, `updateKolom`, `deleteKolom`, `swapKolomUrutan`, `clearKolomData`).
* `akun.ts`: CRUD Akun, Bulk Centang, Inline Save, & Swap Urutan Akun (`createAkun`, `updateAkun`, `deleteAkun`, `swapAkunUrutan`, `bulkUpdateCentang`).
* `nomor.ts`: CRUD Nomor & Masa Aktif Kartu (`createNomor`, `updateNomor`, `deleteNomor`).
* `note.ts`: CRUD Catatan, Checklists, Batching `$transaction`, Link Metadata Fetcher.
* `push.ts`: Registrasi Push Notifications Web Push VAPID.

### C. Evaluator Rumus Kustom (`lib/utils/formulaEvaluator.ts`)
* Menghitung kolom bertipe `RUMUS` secara otomatis per baris (seperti Excel).
* Menggunakan algoritma **Shunting-yard** tanpa `eval()` demi keamanan.
* Mendukung operator `+`, `-`, `*`, `/`, `%`, `^`, tanda kurung `()`, serta parameter target (contoh: `target Limit - Limit`).

### D. Optimasi Database & Query Performance
* **Prisma Projection (`select`)**: Query pada Server Component & Server Actions membatasi kolom data yang ditarik hanya yang dibutuhkan UI (menghemat payload JSON ~50%).
* **Parallel Querying**: Server Component menggunakan `Promise.all()` untuk fetching data database secara sejajar.
* **Batching Transactions**: Operasi mutasi berantai dibungkus dalam `db.$transaction([])`.

---

## 🎨 3. Arsitektur Frontend & Performa Client

### 🚨 Aturan Kritis Mobile-First (Wajib Dipatuhi)
1. **Dilarang Menyembunyikan Tombol di Balik Hover**:
   * Aplikasi dioptimalkan untuk layar sentuh ponsel.
   * **Semua tombol fungsional (Hapus, Edit, Pin, Arsip, Swap) harus terlihat permanen.**
2. **Dilarang Memotong Dropdown Melayang (`overflow-hidden`)**:
   * Jangan gunakan `overflow-hidden` pada kartu yang memiliki menu dropdown/popover melayang absolut agar tidak terpotong CSS.
3. **Ukuran Target Sentuh (Touch Targets)**:
   * Jarak sentuh tombol minimal `py-2` / `p-2` dengan ikon yang renggang untuk mencegah salah tekan jari mobile.

### ⚡ Fitur Optimasi Performa & Indikator Target Client
1. **Kategori Aplikasi Standalone & Filter Pills (`/aplikasi`)**:
   * Menambahkan kolom `kategori` pada skema Prisma `Aplikasi`.
   * Saat menambahkan/mengedit aplikasi standalone, pengguna dapat memilih kategori dari daftar existing (misal `E-Wallet`, `Bank`, `Investasi`) atau menambahkan kategori baru secara kustom.
   * Dashboard `/aplikasi` menampilkan **Baris Filter Pills Kategori** horizontal melayang (`Semua (15)`, `E-Wallet (5)`, `Bank (3)`) yang memfilter kartu aplikasi secara instan.
2. **Fitur Impor Master Aplikasi Standalone (`importAplikasiToGarapan`)**:
   * Saat menambahkan aplikasi di bulan garapan (misal `/garapan/[garapanId]`), pengguna dapat memilih aplikasi master standalone (misal `Bareksa (5 Akun)` atau `Klik X GoPay (5 Akun)`).
   * Nama aplikasi, deskripsi, logo, dan seluruh daftar akun (`Rendi`, `Ibu`, `Ayah`, dll.) otomatis diimpor ke garapan bulan tersebut.
   * Kolom target untuk bulan tersebut tetap disiapkan bersih agar pengguna dapat menambahkan kolom secara manual sesuai kebutuhan garapan bulan terkait.
3. **Aturan Pengiriman Notifikasi PWA Kartu Perdana (`/nomor`)**:
   * **Aturan 1 (Masa Aktif Habis)**: Notifikasi PWA dikirim **hanya pada hari H saat masa aktif kartu habis** (misal tanggal 15 Juli ➔ notifikasi dikirim hanya di tanggal 15 Juli).
   * **Aturan 2 (Masa Tenggang Sisa ≤ 5 Hari)**: Notifikasi PWA dikirim **harian berturut-turut** mulai dari **5 hari sebelum masa tenggang habis** (sisa 5, 4, 3, 2, 1, dan 0 hari) untuk mencegah kartu hangus permanen.
   * Menggunakan helper `checkAppTargetCompleted(app)` dari `@/lib/utils/formulaEvaluator`.
   * Jika seluruh akun pada suatu aplikasi telah mencapai target (misalnya `Bareksa` di mana seluruh akun telah mencapai `Point Rp 100.000`), kartu aplikasi secara otomatis menampilkan badge hijau `100% Target` dengan ikon centang `CheckCircle2`.
   * Jika seluruh aplikasi dalam suatu garapan bulan mencapai 100% target, kartu garapan bulan di dashboard utama juga secara otomatis menampilkan badge hijau `100%`.
2. **Optimistic UI Updates (0ms Response)**:
   * Semua mutasi (centang checkbox, edit inline, swap urutan, tambah/edit/hapus garapan & aplikasi) memperbarui state React lokal (`setList`, `setAkunList`) secara **instan (0ms)** sebelum Server Action selesai.
2. **Lazy Loading XLSX (-700KB JS Bundle)**:
   * Library SheetJS (`xlsx`) dieksekusi via Dynamic Import (`await import("xlsx")`) hanya saat tombol Export diklik.
3. **Instant Route Prefetching**:
   * Komponen navigasi utama (`AppNavigation`) menggunakan `prefetch={true}` pada Link tujuan.
4. **Skeleton Loading UI (`loading.tsx`)**:
   * Setiap sub-modul (`/garapan/[id]`, `/aplikasi`, `/nomor`, `/note`) memiliki `loading.tsx` Skeleton berpendar khusus.
5. **Non-blocking Font Loading**:
   * Font Google (`Inter`, `Plus_Jakarta_Sans`, `IBM_Plex_Mono`) menggunakan `display: "swap"`.
6. **Component Memoization**:
   * `NoteCard` dibungkus dengan `React.memo()` untuk mencegah re-rendering kartu lain saat mengetik di search bar.
7. **PWA Status Alert & Offline Support**:
   * `public/sw.js` menerapkan strategi Cache-First untuk aset statis dan Network-First untuk HTML.
   * `ServiceWorkerRegistrar.tsx` memiliki toast listener online/offline.

---

## 📁 4. Struktur Berkas Proyek

```
d:\A DEV\SAREN\
├── app/                        # Next.js App Router
│   ├── page.tsx                # Halaman Utama (Daftar Garapan)
│   ├── loading.tsx             # Root Skeleton Loader (Garapan List)
│   ├── GarapanListClient.tsx   # Client Component Daftar Garapan (Optimistic)
│   ├── garapan/
│   │   └── [garapanId]/        # Halaman Detail Garapan / List Aplikasi
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       └── AplikasiListClient.tsx
│   ├── aplikasi/
│   │   ├── page.tsx            # Daftar Aplikasi Standalone
│   │   ├── loading.tsx
│   │   ├── AplikasiListClient.tsx
│   │   └── [aplikasiId]/       # Detail Tabel Aplikasi & Akun
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       └── AplikasiDetailClient.tsx
│   ├── nomor/                  # Manajemen Kartu Perdana & Pulsa
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── NomorClient.tsx
│   └── note/                   # Keep Notes Premium
│       ├── page.tsx
│       ├── loading.tsx
│       ├── NoteClient.tsx
│       └── components/         # Sub-komponen Notes (NoteCard, Editor, dll)
├── components/                 # Shared UI Components (Button, Card, Dialog, Table, dll)
├── lib/
│   ├── actions/                # Server Actions (garapan, aplikasi, kolom, akun, nomor, note)
│   ├── db.ts                   # Prisma Client Singleton Instance
│   └── utils/
│       └── formulaEvaluator.ts # Parser Rumus Matematika (Shunting-yard)
├── prisma/
│   └── schema.prisma           # Skema Prisma & Indeks Database
├── public/
│   ├── sw.js                   # Custom Service Worker (PWA)
│   └── manifest.json           # PWA Web App Manifest
├── next.config.ts              # NextConfig (Security Headers, Remote Patterns, ServerActions)
└── AGENTS.md                   # Aturan & Pedoman Gaya Pengembang AI
```

---

## 🧪 5. Perintah Pengembangan & Verifikasi

* **Jalankan Development Server**:
  ```bash
  npm run dev
  ```
* **Cek Tipe TypeScript (Wajib 0 Errors)**:
  ```bash
  npx tsc --noEmit
  ```
* **Sinkronisasi Skema Database**:
  ```bash
  npx prisma db push
  ```
* **Build Produksi**:
  ```bash
  npm run build
  ```
