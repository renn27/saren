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

4. **Dilarang Melakukan Git Push Tanpa Perintah Eksplisit**:
   * AI Agent **DILARANG KERAS** menjalankan `git push origin main` atau perintah push lainnya secara otomatis tanpa permintaan/perintah langsung dari pengguna.

---

## 🛠️ Stack Teknologi & Desain Sistem

### 1. Framework & Routing
* **Next.js (App Router)**: Proyek ini menggunakan App Router.
* **Prisma ORM**: Digunakan untuk berinteraksi dengan database.
  * **Optimasi Indeks Database**: 
    - `Garapan`: `@@index([tahun, bulan])`, `@@unique([bulan, tahun])`
    - `Aplikasi`: `@@index([garapanId])`, `@@index([garapanId, kategori])`, `@@index([kategori])`
    - `Akun`: `@@index([aplikasiId, urutan])`
    - `Kolom`: `@@index([aplikasiId, urutan])`
    - `Nomor`: `@@index([masaAktif])`
    - `Note`: `@@index([isTrashed, isArchived, isPinned])`, `@@index([updatedAt])`, `@@index([folderId, isTrashed, isArchived])`
  * **Prisma Projection (`select`)**: Query list pada Server Actions/Pages menggunakan `select` projection untuk membatasi kolom data yang ditarik, menghemat beban payload JSON hingga ~50%.
* **Optimasi Performa Client**:
  * **Kategori Aplikasi Standalone & Filter Pills**: Pada halaman `/aplikasi`, aplikasi master dapat dikategorikan (misal `E-Wallet`, `Bank`, `Investasi`). Pengguna dapat menambah kategori baru atau memilih dari daftar kategori existing. Dashboard menyajikan **Pills Filter Kategori** horizontal (`Semua`, `Tanpa Kategori`, `E-Wallet (2)`, `Bank (1)`) untuk memfilter kartu secara instan. Kartu aplikasi tetap tampil bersih tanpa teks badge kategori.
  * **Filter Pills Tahun & Badge Bulan Ini (Garapan)**: Pada halaman utama Garapan (`/`), daftar garapan dapat difilter berdasarkan tahun via **Filter Pills Horizontal** (`Semua`, `2026`, `2025`). Kartu garapan pada bulan & tahun berjalan ditandai secara otomatis dengan badge **"Bulan Ini"** (glowing pulse dot + accent background) dan menampilkan metadata ringkas jumlah aplikasi yang tercatat. Kartu aplikasi tetap tampil bersih tanpa teks badge tahun.
  * **Fitur Impor Aplikasi Standalone (`importAplikasiToGarapan`)**: Pengguna dapat menambahkan aplikasi baru ke dalam garapan bulanan dengan mengimpor master aplikasi standalone (`Bareksa`, `Klik X GoPay`, dll). Seluruh akun (`nama`, `device`, `nomorHp`) dan logo aplikasi otomatis terfoto/terduplikasi ke garapan baru, sementara kolom target dibuat secara manual per bulan.
  * **Cadangan & Pemulihan Data (.json Backup/Restore)**: Menyediakan Server Action `exportFullBackup` dan `restoreFullBackup` di `@/lib/actions/backup.ts` untuk mengunduh dan memulihkan seluruh data sistem (Garapan, Aplikasi, Akun, Kolom, Nomor, Note, Folder, Label) dalam format `.json`. Mendukung dua mode restore: `Merge` (gabungkan tanpa duplikasi) dan `Overwrite` (hapus total lalu timpa).
  * **Filter Akun Berdasarkan Device (Pills & Chips)**: Pada halaman detail aplikasi garapan dan standalone (`AplikasiDetailClient.tsx`), daftar perangkat diekstrak secara otomatis untuk menyajikan **Bar Filter Device Horizontal** (`Semua Device`, `Tanpa Device`, `Samsung A54 (4)`, dll.). Mengklik chip device pada baris akun memfilter tabel secara instan per perangkat.
  * **Optimistic UI Updates (0ms Response)**: Semua interaksi mutasi data (edit sel inline, toggle centang, swap urutan akun/kolom, tambah/edit/hapus garapan & aplikasi) memperbarui state React lokal terlebih dahulu secara instan (0ms) sebelum memproses Server Action di latar belakang.
  * **Lazy Loading XLSX (-700KB JS Bundle)**: Library `xlsx` dieksekusi via Dynamic Import (`await import("xlsx")`) hanya ketika pengguna mengekspor data, mengurangi bundle JS awal sebesar 700KB.
  * **Instant Route Prefetching**: Komponen navigasi utama (`AppNavigation`) menggunakan `prefetch={true}` untuk memuat halaman tujuan di latar belakang saat awal render.
  * **Non-blocking Font Loading**: Pengaturan font Google (`Inter`, `Plus_Jakarta_Sans`, `IBM_Plex_Mono`) menggunakan `display: "swap"`.
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
* **Mode Pengaturan Tabel (Table Editor)**: Di dalam `TableEditor`, tombol hapus baris, hapus kolom, tambah kolom, tombol **`Total`** (dengan ikon `Sigma` untuk menjumlahkan kolom otomatis), serta tombol **`Tipe Kolom`** (berganti antara `Teks`, `Tanggal` dengan date picker, dan `Centang` dengan Checkbox) disembunyikan secara default untuk mencegah visual yang terlalu ramai. Semua tombol konfigurasi ini dikendalikan melalui tombol toggle **`Atur Kolom & Baris`** (ikon gerigi `Settings`) di bawah tabel. Ketika dinonaktifkan, tabel terlihat bersih dan hanya menampilkan elemen interaktif data (input teks, input date picker, atau checkbox) serta baris Total jika diaktifkan. Fitur ini juga terender pada pratinjau kartu di dashboard utama.

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

### Fitur Tabel Nomor & Notifikasi PWA
* **Kolom Sticky "Kartu"**: Kolom pertama menggunakan `sticky left-0` dengan background `bg-bg-surface` — **jangan gunakan `bg-bg-page`** agar konsisten dengan warna header tabel.
* **Inline Edit Pulsa & Masa Aktif**: Klik sel untuk mengedit nilai pulsa/tanggal secara langsung.
* **Klik-untuk-Salin Nomor**: Mengklik sel Nomor langsung menyalin ke clipboard.
* **Highlight Masa Aktif**: 🟢 Hijau (>1 thn), 🟡 Kuning (masa tenggang <30 hr), 🔴 Merah (hangus >30 hr).
* **Kolom "Terakhir Diedit"**: Ditampilkan di sebelah kanan kolom "Masa Aktif" (sebelum kolom Aksi), menyajikan tanggal dan waktu perbaruan terakhir data nomor (`updatedAt`).
* **Aturan Pengiriman Notifikasi PWA Kartu**:
  1. **Masa Aktif Habis**: Notifikasi PWA dikirim **hanya pada hari H masa aktif habis** (`diffDays === 0`).
  2. **Masa Tenggang Sisa ≤ 5 Hari**: Notifikasi PWA dikirim **harian secara intensif** saat sisa masa tenggang $\le 5$ hari (sisa 5, 4, 3, 2, 1, 0 hari sebelum kartu hangus permanen).

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

### Standar Seleksi Sel Dua-Langkah & Presisi Input Edit
* **Sistem Dua-Langkah (2-Step Edit)**:
  - **Klik 1x**: Menyeleksi sel (`selectedCell`) dan menampilkan kotak Cyan melengkung (`rounded-lg border border-accent text-accent font-semibold shadow-2xs`).
  - **Klik 2x / Double Click**: Masuk ke mode edit (`editingCell`).
* **Presisi Lebar & Perataan Teks (0px Layout Shift)**:
  - Tipe kolom `NOMOR` & `NOMINAL`: Selalu gunakan `text-right font-mono` pada `<input>` dan `justify-end font-mono` pada `<div>` seleksi.
  - Untuk mencegah kolom meledak/melebar saat beralih ke mode edit, batasi lebar `<TableHead>` dengan `min-w-[90px] sm:min-w-[130px]` dan berikan kelas `w-full box-border` pada input mode edit tanpa `min-w-[160px]` berlebihan pada `<TableCell>`.

---

## 🧮 Fitur Kolom Rumus (Formula Column)

* **Tipe Kolom `RUMUS`**: Kolom kustom yang menghitung nilainya secara otomatis per baris berdasarkan ekspresi matematika dari kolom lain (seperti Excel).
* **Evaluator Matematika (`lib/utils/formulaEvaluator.ts`)**:
  * Menggunakan parser matematika aman (Shunting-yard algorithm) tanpa `eval()`.
  * Mendukung operator `+`, `-`, `*`, `/`, `%`, `^`, dan tanda kurung `(`, `)`.
  * Menggantikan nama kolom atau `[NamaKolom]` secara case-insensitive dengan nilai numerik dari baris akun (`customValues`).
  * **Dukungan Parameter Target**: Mendukung referensi ke nilai target kolom spesifik (misal: `target Limit - Limit` atau `target [Limit] - [Limit]`). `target` akan mengambil nilai numerik `nilaiTarget` dari kolom yang bersangkutan.
  * Penanganan kesalahan: pembagian dengan nol menghasilkan `0`, deteksi ketergantungan sirkular (recursive cycle protection).
* **Tampilan & Interaksi**:
  * Sel bertipe `RUMUS` bersifat **read-only** di tabel dan tidak memicu modal edit inline.
  * Header kolom `RUMUS` ditandai dengan badge `fx`.
  * Modal Tambah/Edit Kolom menyediakan input rumus dilengkapi tombol pembantu (*chips*) nama kolom lain dan tombol operator matematika.
  * Mendukung **Total Akumulasi** (penjumlahan hasil rumus seluruh baris) dan **Jadikan Target** (highlight hijau jika hasil kalkulasi mencapai target).
  * Pada ekspor Excel/CSV, hasil kalkulasi rumus disertakan sebagai angka numerik.

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
