<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SAREN Note - Panduan & Aturan Pengembangan Sistem (Mobile-First)

Dokumen ini berisi rangkuman sistem, spesifikasi teknologi, pedoman gaya (*styling*), dan alur kerja utama untuk proyek SAREN. **Semua AI Agent pengembang wajib membaca, memahami, dan mematuhi panduan ini.**

---

## 🚨 ATURAN KRITIS: PRIORITAS MOBILE-FIRST (TIDAK BOLEH HOVER)

Aplikasi SAREN dirancang dan dioptimalkan secara penuh untuk **perangkat layar sentuh / mobile**, bukan perangkat desktop. Oleh karena itu, aturan-aturan berikut wajib dipatuhi tanpa pengecualian:

1. **Dilarang Menggunakan Interaksi Hover untuk Elemen Kritis**:
   * Jangan menyembunyikan tombol aksi utama (seperti Hapus, Sematkan/Pin, Arsipkan) di balik status *hover* (misalnya menggunakan kelas `opacity-0 group-hover:opacity-100`).
   * Di layar sentuh, tidak ada pointer mouse yang bisa "melayang" (*hover*). Menyembunyikan tombol di balik *hover* akan membuat fitur tersebut tidak dapat diakses atau membingungkan pengguna mobile.
   * **Semua tombol fungsional harus selalu terlihat secara permanen.**

2. **Dilarang Memotong Dropdown Melayang (CSS Overflow clipping)**:
   * Pada komponen kartu (seperti `NoteCard`), **jangan gunakan kelas `overflow-hidden`** jika di dalamnya terdapat menu dropdown atau popover melayang absolut (seperti pemilih warna, pemilih label, menu titik tiga).
   * Penggunaan `overflow-hidden` pada pembungkus kartu akan memotong semua menu absolut yang melebihi batas kartu, sehingga tidak terlihat oleh pengguna.
   * Sebagai gantinya, jika Anda perlu mempertahankan sudut melengkung pada bar bawah kartu (seperti toolbar), terapkan kelas pembulatan sudut secara eksplisit pada bar itu sendiri (contoh: `rounded-b-2xl` untuk mencocokkan kartu yang menggunakan `rounded-2xl`).

3. **Ukuran Target Sentuh (Touch Targets)**:
   * Pastikan semua tombol memiliki jarak sentuh (*padding* / *gap*) yang cukup renggang dan ukuran ikon yang memadai agar tidak terjadi salah sentuh (*fat-finger errors*) di ponsel.

---

## 🛠️ Stack Teknologi & Desain Sistem

### 1. Framework & Routing
* **Next.js (App Router)**: Proyek ini menggunakan App Router.
* **Prisma ORM**: Digunakan untuk berinteraksi dengan database.
  * **Optimasi Indeks**: Model `Note` memiliki indeks database khusus (`@@index([isTrashed, isArchived, isPinned])` dan `@@index([updatedAt])`) untuk mempercepat penyaringan dan pengurutan data di PostgreSQL.
* **Server Actions**: Interaksi mutasi database (create, update, delete) dilakukan melalui Server Actions di `@/lib/actions/`.

### 2. Penataan Gaya (Tailwind CSS)
Aplikasi ini menggunakan Tailwind CSS dengan variabel tema khusus. Selalu gunakan kelas-kelas utilitas yang sesuai dengan desain sistem berikut:
* **Backgrounds**: `bg-bg-page` (halaman utama), `bg-bg-surface` (permukaan kartu/sidebar), `bg-accent-soft` (warna sorotan lembut).
* **Borders**: `border-border-soft` (border tipis abu-abu lembut).
* **Texts**: `text-text-primary` (warna teks utama gelap/terang), `text-text-secondary` (warna teks sekunder abu-abu), `text-accent` (teks sorotan biru/teal).
* **Colors**: `colorMap` didefinisikan secara khusus untuk Keep Premium di `NoteClient.tsx` (termasuk `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `darkblue`, `purple`, `pink`, `brown`, `gray`, `default`).

### 3. Pustaka Pendukung
* **Icons**: `lucide-react` (seperti `Pin`, `Archive`, `Trash2`, `Palette`, `Tag`, `Copy`, `MoreVertical`, dll.).
* **Toasts**: `sonner` (untuk menampilkan toast pemberitahuan).

---

## 🗂️ Arsitektur & Alur Kerja Komponen Catatan (Note)

Sistem catatan berfokus pada halaman utama `app/note/` dengan arsitektur sebagai berikut:

### 1. Entri Halaman Utama (`app/note/page.tsx` & `app/note/[id]/page.tsx`)
Merupakan Server Component yang bertugas mengambil data dari database. 
* **Parallel Loading**: Semua query ke database wajib dijalankan secara paralel menggunakan `Promise.all` untuk performa loading maksimal (contoh: mengambil catatan dan label secara bersamaan).
* **Entri Halaman Edit/Detail**: Me-render komponen klien `<NoteEditClient initialNote={...} initialLabels={...} />`.

### 2. Komponen Utama Klien (`app/note/NoteClient.tsx`)
Mengelola state catatan secara lokal menggunakan React `useState` agar interaksi instan.
* **Optimistic Update**: Untuk menjaga performa tetap terasa instan, aksi-aksi seperti *Sematkan (Pin)*, *Ubah Warna*, *Arsipkan*, dan *Hapus ke Sampah* diperbarui di tingkat state React terlebih dahulu sebelum memanggil Server Actions di latar belakang. Jika Server Action gagal, data baru akan di-rollback.

### 3. Komponen Kartu Catatan (`NoteCard`)
Merupakan sub-komponen di dalam `NoteClient.tsx` yang bertanggung jawab merender kartu individu catatan.
* **Layout Vertikal & Spacer**: Kartu menggunakan susunan Flexbox vertikal (`flex flex-col`). Bagian toolbar bawah menggunakan kelas `mt-auto` untuk memastikan toolbar selalu berada di posisi paling dasar dari kartu tanpa perlu ruang kosong buatan.
* **Susunan Tombol Toolbar Utama (Terluar)**:
  * 📥 **Arsipkan** (`Archive`)
  * 📋 **Buat Salinan** (`Copy` / duplikat catatan)
  * 🗑️ **Hapus** (`Trash2` / buang ke sampah)
  * ░ **Opsi Lainnya** (`MoreVertical` / pemicu dropdown) - Diposisikan rata kanan menggunakan `ml-auto`.
* **Dropdown Menu "Opsi Lainnya"**:
  * 🎨 **Ubah Warna** (`Palette` / membuka sub-dropdown pilihan warna melayang)
  * 🏷️ **Ubah Label** (`Tag` / membuka sub-dropdown pilihan label melayang)
  * 📝 **Ubah Tipe Catatan** (`FileText` / `CheckSquare` / mengubah tipe antara teks catatan biasa dan checklist)
* **Penempatan Dropdown**: Semua dropdown menu melayang diposisikan di dalam kontainer `relative ml-auto` pembungkus tombol tiga titik dengan kelas `absolute right-0 bottom-8 z-50` agar melayang rapi di atas toolbar sebelah kanan dan tidak melebihi lebar layar.
* **Perilaku Klik Checklist Preview**:
  * Pemicu centang (*checkbox*) harus menggunakan `e.stopPropagation()` pada elemen `<input type="checkbox" />` secara langsung.
  * **Dilarang keras meletakkan `e.stopPropagation()` pada pembungkus baris checklist** (kontainer `div` baris teks). Klik pada area teks catatan checklist harus tetap dapat memicu event klik kartu (`onClick={onSelect}`) agar kartu dapat dibuka untuk masuk ke halaman detail catatan.
* **Penyembunyian Item Selesai di Kartu**: Item checklist yang sudah dicentang (selesai) tidak ditampilkan pada pratinjau kartu (`NoteCard`) di dashboard utama.

### 4. Komponen Edit & Detail Catatan (`NoteEditClient.tsx`)
Mengelola alur pengeditan satu catatan secara mendalam, dioptimalkan sepenuhnya untuk kenyamanan ponsel (mobile):
* **Bebas Header & Navigasi Global**: Di halaman `/note/[id]`, Header Utama aplikasi dan Navigasi Bawah disembunyikan lewat `LayoutWrapper.tsx` untuk memberikan ruang kerja maksimal dan menghindari tombol gigi ganda.
* **Header Minimalis & Centered Status**: Header atas hanya berisi tombol Kembali dan tombol Sematkan (Pin). Informasi `"Diedit [Waktu]"` wajib diletakkan di tengah-tengah header atas secara absolut (`absolute left-1/2 -translate-x-1/2`) agar simetris dan mudah dibaca.
* **Toolbar Aksi Bawah (Thumb Zone)**: Semua aksi modifikasi diletakkan pada toolbar melayang di bagian bawah layar (`fixed bottom-0 left-0 right-0 z-30 h-12`) dengan efek *backdrop-blur*. Tombol-tombol di dalam toolbar bawah:
  * 🎨 **Ubah Warna** (popover melayang ke atas: `bottom-14`)
  * 🏷️ **Ubah Label** (popover melayang ke atas: `bottom-14`)
  * 📝 **Ubah Tipe** (popover melayang ke atas: `bottom-14`)
  * 📥 **Arsipkan / Pulihkan**
  * 📋 **Duplikat**
  * 🗑️ **Hapus ke Sampah** (berwarna merah `text-danger` secara permanen, dan wajib memicu dialog konfirmasi `confirm()` sebelum menghapus).
* **Target Sentuh Checklist**: Di dalam `ChecklistEditor`, setiap baris memiliki padding vertikal longgar (`py-1.5`) dengan ukuran checkbox `h-4.5 w-4.5` (18px) dan kelengkungan `rounded-md` untuk kenyamanan jari mobile. Tombol hapus item (`X`) di kanan baris tidak menggunakan status hover tersembunyi, melainkan hanya dimunculkan secara dinamis saat baris input teks yang bersangkutan sedang berfokus/diedit (menggunakan state focus).
* **Pengaturan Urutan (Drag and Drop)**: Setiap item aktif pada `ChecklistEditor` dilengkapi dengan tombol drag handle (`GripVertical`) di sebelah kiri untuk melakukan drag and drop guna mengatur urutan item secara interaktif.
* **Auto-collapse Item Selesai**: Secara default, ketika halaman edit dibuka, daftar tugas yang sudah diselesaikan (`done`) disembunyikan dalam keadaan tertutup/terlipat (*auto-collapse*). Pengguna dapat membukanya kembali dengan menekan tombol toggle *"Selesai (Jumlah)"*.
* **Mode Pengaturan Tabel (Table Editor)**: Di dalam `TableEditor`, tombol hapus baris, hapus kolom, tambah kolom, serta tombol **`Total`** (dengan ikon `Sigma` untuk menjumlahkan kolom otomatis) disembunyikan secara default untuk mencegah visual yang terlalu ramai. Semua tombol konfigurasi ini dikendalikan melalui tombol toggle **`Atur Kolom & Baris`** (ikon gerigi `Settings`) di bawah tabel. Ketika dinonaktifkan, tabel terlihat bersih dan hanya menampilkan input teks data, serta baris Total di bagian paling bawah tabel jika terdapat setidaknya satu kolom yang diaktifkan akumulasinya. Fitur total ini juga akan terender secara otomatis pada pratinjau kartu di dashboard utama dengan simbol awalan `Σ`.

---

## 🎨 Pedoman Desain & Styling Konsisten (Tailwind CSS)

Semua halaman, komponen, atau fitur baru yang akan dikembangkan wajib mematuhi standar ukuran, warna, jarak, dan sudut melengkung berikut demi konsistensi visual:

### 1. Sistem Warna Kustom (Tailwind CSS v4)
Selalu gunakan variabel warna bawaan yang mendukung Light Mode & Dark Mode secara otomatis:
* **Latar Belakang Halaman**: `bg-bg-page` (Light: `#F4F6F8`, Dark: `#080D14`)
* **Latar Belakang Kartu / Box**: `bg-bg-surface` (Light: `#FFFFFF`, Dark: `#0F1623`)
* **Warna Border Lembut**: `border-border-soft` (Light: `#E2E8F0`, Dark: `#1A2438`)
* **Teks Utama**: `text-text-primary` (Light: `#0F172A`, Dark: `#F1F5F9`)
* **Teks Sekunder (Keterangan)**: `text-text-secondary` (Light: `#64748B`, Dark: `#94A3B8`)
* **Sorotan Utama / Accent**: `text-accent` atau `bg-accent` (Light: `#0891B2`, Dark: `#05B6D4`)
* **Warna Sorotan Lembut**: `bg-accent-soft` (Light: `rgba(8, 145, 178, 0.09)`, Dark: `rgba(5, 182, 212, 0.12)`)
* **Teks Bahaya/Error**: `text-danger` / `bg-danger` (Light: `#E11D48`, Dark: `#F43F5E`)

### 2. Tipografi & Ukuran Font
Gunakan keluarga font (`font-sans`, `font-display`, `font-mono`) dan rentang ukuran yang konsisten:
* **Judul Utama Halaman**: `text-base` atau `text-lg` dengan kelas `font-semibold font-display`
* **Judul Kartu / Catatan**: `text-[13.5px] font-semibold tracking-tight`
* **Isi Catatan / Deskripsi**: `text-[12.5px] leading-relaxed`
* **Checklist / Item Tugas**: `text-[13px] text-text-primary`
* **Teks Menu / Pilihan Dropdown / Tombol Kecil**: `text-xs` atau `text-[11px]`
* **Pills Label / Tag**: `text-[9px] font-semibold`

### 3. Jarak Vertikal & Horisontal (Margin & Padding)
Jaga kerapian antarmuka mobile dengan jarak yang renggang namun proporsional:
* **Padding Kontainer Halaman Utama**: `px-4 md:px-8 py-4 pb-6` (pada mobile, area scroll berakhir tepat di atas bottom nav secara otomatis, sehingga tidak memerlukan padding bawah `pb-20` lagi)
* **Jarak Antar Kartu (Grid/List)**: `gap-2.5 md:gap-3` (untuk Grid) atau `gap-2.5` (untuk List)
* **Jarak Dalam Kartu (Card Padding)**:
  * Area Header (Judul): `px-4 pt-3.5 pb-1`
  * Area Konten (Catatan): `px-4 py-2`
  * Area Toolbar Bawah: `px-3 py-1` (dengan tinggi tetap `h-9` atau 36px)
* **Padding Tombol Toolbar**: `p-1` (ukuran ikon rata-rata `h-3.5 w-3.5`)
* **Form Input (Pembuatan Catatan)**: `px-5 py-4` saat menciut, dan `px-5 py-3` saat melebar.

### 4. Kelengkungan Sudut (Border Radius)
* **Kartu Catatan (NoteCard)**: `rounded-2xl` (16px)
* **Input Search, Toolbar Button, Menu Dropdown**: `rounded-xl` (12px)
* **Halaman Dialog / Modal**: `rounded-3xl` (24px)
* **Label Tag / Badge**: `rounded-full` (9999px)

---

## 📝 PEMELIHARAAN DOKUMEN AGENTS.md

Setiap kali Anda (AI Agent) melakukan modifikasi sistem yang berdampak pada:
1. **Struktur File atau API** (misalnya penambahan berkas action baru atau perubahan skema Prisma).
2. **Desain Sistem & Styling** (misalnya penambahan token warna baru atau perubahan kelas layout global).
3. **Alur Pengguna & Interaksi** (misalnya pengelompokan tombol baru atau perubahan logika modal).

**Anda WAJIB memperbarui dokumen `AGENTS.md` ini.** Jaga agar dokumen ini tetap akurat, mutakhir, dan komprehensif agar agen AI berikutnya dapat langsung bekerja secara efisien tanpa tebak-tebakan.

---

## 📱 Halaman Nomor (`app/nomor/`)

### Skema Database (`model Nomor`)
Model `Nomor` memiliki kolom-kolom berikut di Prisma schema:
* `id` — cuid
* `provider` — nama kartu (Telkomsel, By.U, Tri, dll)
* `nomorKartu` — nomor telepon
* `pulsa` — saldo pulsa dalam **satuan Rupiah integer** (contoh: `50000` = Rp 50.000), default `0`
* `masaAktif` — tanggal masa aktif kartu
* `createdAt`, `updatedAt`

### Konvensi Penting
* **Format Rupiah**: Gunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })` untuk menampilkan nilai pulsa.
* **Tampilan kosong**: Jika `pulsa === 0` atau tidak ada nilai, tampilkan tanda `-` (bukan `Rp 0`).
* **Serialisasi Tanggal di Server Action**: Selalu gunakan `masaAktif: Date | string` pada tipe parameter Server Action dan bungkus dengan `new Date(data.masaAktif)` sebelum dikirim ke Prisma. Ini mencegah error serialisasi Next.js ketika `Date` object diubah menjadi string saat melewati batas server-client.

### Fitur Tabel Nomor
* **Kolom Sticky "Kartu"**: Kolom pertama menggunakan `sticky left-0` dengan background `bg-bg-surface` — **jangan gunakan `bg-bg-page`** agar konsisten dengan warna header tabel.
* **Inline Edit Pulsa**: Klik sel Pulsa → langsung masuk mode input; Enter/blur menyimpan; Escape membatalkan. Menggunakan state `editingPulsaId`.
* **Inline Edit Masa Aktif**: Klik sel Masa Aktif → langsung masuk mode `<input type="date">`. Menggunakan state `editingDateId`.
* **Klik-untuk-Salin Nomor**: Mengklik sel Nomor langsung menyalin ke clipboard dan menampilkan toast `"[Provider] berhasil disalin!"` dengan ikon 📋. Menggunakan `e.stopPropagation()` agar tidak membuka dialog detail. Kursor berubah menjadi `cursor-copy`.
* **Highlight Masa Aktif**: Baris diberi warna latar berdasarkan status masa aktif:
  * 🟢 Hijau (`bg-target-bg`) — masa aktif lebih dari 1 tahun ke depan
  * 🟡 Kuning (`bg-warning-bg`) — sudah lewat tapi belum 30 hari
  * 🔴 Merah (`bg-danger-bg`) — sudah lewat lebih dari 30 hari

---

## 🗃️ Standar Komponen Tabel (`components/ui/table.tsx`)

### Header Tabel
* Background header menggunakan `bg-bg-surface` dengan `border-b-2 border-accent/30 shadow-sm` agar terlihat jelas terpisah dari isi tabel.
* Label kolom header menggunakan `text-accent font-bold uppercase tracking-[0.07em]`.
* **WAJIB**: Semua sel `<TableHead>` atau `<TableCell>` yang menggunakan `sticky left-0` **harus menggunakan `bg-bg-surface`** — bukan `bg-bg-page` atau `bg-bg-page/95`. Menggunakan warna berbeda akan menyebabkan header sticky terlihat berbeda dari kolom lain.

### Highlight Baris dengan Sticky Column
* Ketika baris (`TableRow`) memiliki warna highlight kondisional (misal: `bg-target-bg` untuk baris yang menyentuh target), sel sticky di baris yang sama **harus secara eksplisit** juga menggunakan `bg-target-bg group-hover:bg-target-hover` agar warna highlight tidak tertimpa oleh background default sel sticky.
* Contoh pola yang benar:
  ```tsx
  // Di TableRow
  className={meetsTarget ? "bg-target-bg hover:bg-target-hover" : ""}
  // Di TableCell sticky yang sama
  className={meetsTarget ? "bg-target-bg group-hover:bg-target-hover" : "bg-bg-surface"}
  ```

---

## 🌐 Offline Support (PWA)

### Arsitektur
SAREN mendukung mode offline menggunakan Service Worker di `public/sw.js` dengan strategi:

| Jenis Request | Strategi | Keterangan |
|---|---|---|
| Aset statis (`/_next/static/`) | **Cache-First** | Diprioritaskan dari cache lokal |
| Gambar & file publik | **Cache-First** | `saren_logo_*.png`, `manifest.json` |
| Halaman navigasi HTML | **Network-First + Cache Fallback** | Online = data fresh dari DB; Offline = data terakhir dari cache |
| Request lain | **Network-First + Cache** | Simpan ke cache jika berhasil |

### Cara Kerja Offline Data
* Karena SAREN menggunakan **Server Components + Prisma** (bukan REST API), data tertanam di dalam HTML halaman yang di-render server.
* Setiap kali halaman dibuka saat online, HTML-nya disimpan otomatis ke cache.
* Ketika offline, Service Worker menyajikan HTML tersebut dari cache → data terakhir yang terlihat saat online akan ditampilkan.
* Jika halaman belum pernah dibuka sebelumnya (tidak ada cache), Service Worker menampilkan `/offline.html`.

### Pendaftaran Service Worker
* Service Worker didaftarkan secara otomatis via `components/ServiceWorkerRegistrar.tsx` yang dirender di `app/layout.tsx`.
* **Catatan Pengembangan**: SW tidak aktif di `npm run dev` (Turbopack menonaktifkannya). Untuk menguji fitur offline, deploy ke Vercel atau jalankan production build.

### Cache Versions
Saat memperbarui Service Worker, naikkan `CACHE_VERSION` di `public/sw.js` agar cache lama otomatis dihapus dan cache baru dibuat ulang.

---

## ✨ Sistem Animasi (`app/globals.css`)

### Animasi yang Tersedia
* **`.card-stagger`** — animasi masuk staggered untuk grid kartu (sudah diterapkan di NoteClient)
* **`.empty-float`** — animasi mengambang untuk ikon empty state
* **`.page-enter`** — animasi fade-in + slide-up untuk konten halaman (diterapkan di `LayoutWrapper.tsx` dengan `key={pathname}` agar re-trigger setiap navigasi)

### Konvensi Global
* **Tombol & Link**: `transition` 0.15s untuk `opacity`, `background-color`, `color`, `transform`, `box-shadow`.
* **Input & Textarea**: `transition` 0.15s untuk `border-color` dan `box-shadow`.
* **Ganti Tema (Dark/Light)**: Semua elemen mendapat `transition: background-color, border-color, color 0.2s ease` secara global.
* **Efek Tekan Mobile**: Semua `button:active:not(:disabled)` mendapat `transform: scale(0.97)` untuk feedback sentuhan yang natural.
* **Hapus tap highlight**: `-webkit-tap-highlight-color: transparent` diterapkan global untuk menghilangkan kotak biru saat disentuh di Android.
