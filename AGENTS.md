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
    - `Akun`: `@@index([aplikasiId, urutan])`, `@@index([aplikasiId, nama])`
    - `Kolom`: `@@index([aplikasiId, urutan])`
    - `Nomor`: `@@index([masaAktif])`
    - `Note`: `@@index([isTrashed, isArchived, isPinned])`, `@@index([updatedAt])`, `@@index([createdAt])`, `@@index([folderId, isTrashed, isArchived])`
    - `NoteListItem`: `@@index([noteId, urutan])`, `@@index([noteId])`
  * **Prisma Projection (`select`)**: Query list pada Server Actions/Pages menggunakan `select` projection untuk membatasi kolom data yang ditarik, menghemat beban payload JSON hingga ~50%.
  * **Token Cache Mesin Rumus (`parsedFormulaCache`)**: Evaluasi rumus matematika pada tabel menggunakan LRU cache token internal untuk memangkas waktu kalkulasi menjadi sub-millisecond (<0.01ms) pada semua baris akun/catatan.
  * **Normalisasi Tanggal Date-Only (`Timezone Safe`)**: Perhitungan masa aktif kartu SIM dan perbandingan hari dinormalisasi menggunakan `Date.UTC` untuk mencegah pergeseran status kadaluarsa akibat offset zona waktu lokal (WIB UTC+7).
  * **Batching Duplikasi Garapan**: Duplikasi garapan bulanan mengeksekusi akun dalam satu batch `createMany` per aplikasi, memangkas waktu duplikasi dari ~3 detik menjadi instan (<200ms).
* **Optimasi Performa Client**:
  * **Kategori Aplikasi Standalone & Filter Pills**: Pada halaman `/aplikasi`, aplikasi master dapat dikategorikan (misal `E-Wallet`, `Bank`, `Investasi`). Pengguna dapat menambah kategori baru atau memilih dari daftar kategori existing. Dashboard menyajikan **Pills Filter Kategori** horizontal (`Semua`, `Tanpa Kategori`, `E-Wallet (2)`, `Bank (1)`) untuk memfilter kartu secara instan. Kartu aplikasi tetap tampil bersih tanpa teks badge kategori.
  * **Filter Pills Tahun & Badge Bulan Ini (Garapan)**: Pada halaman utama Garapan (`/`), daftar garapan dapat difilter berdasarkan tahun via **Filter Pills Horizontal** (`Semua`, `2026`, `2025`). Kartu garapan pada bulan & tahun berjalan ditandai secara otomatis dengan badge **"Bulan Ini"** (glowing pulse dot + accent background) dan menampilkan metadata ringkas jumlah aplikasi yang tercatat. Kartu aplikasi tetap tampil bersih tanpa teks badge tahun.
  * **Fitur Impor Aplikasi Standalone (`importAplikasiToGarapan`)**: Pengguna dapat menambahkan aplikasi baru ke dalam garapan bulanan dengan mengimpor master aplikasi standalone (`Bareksa`, `Klik X GoPay`, dll). Seluruh akun (`nama`, `device`, `nomorHp`) dan logo aplikasi otomatis terfoto/terduplikasi ke garapan baru, sementara kolom target dibuat secara manual per bulan.
  * **Cadangan & Pemulihan Data (.json Backup/Restore Batching)**: Menyediakan Server Action `exportFullBackup` dan `restoreFullBackup` di `@/lib/actions/backup.ts` untuk mengunduh dan memulihkan seluruh data sistem (Garapan, Aplikasi, Akun, Kolom, Nomor, Note, Folder, Label) dalam format `.json`. Mendukung dua mode restore: `Merge` (gabungkan tanpa duplikasi) dan `Overwrite` (hapus total lalu timpa menggunakan batch `createMany` untuk restore data berukuran besar dalam <200ms).
  * **Navigasi Tombol Enter & Mode Input Sel Tabel (`Spreadsheet Navigation`)**: Sel pada tabel catatan mendukung tombol `Enter` untuk otomatis pindah dan memilih sel pada baris bawahnya (atau membuat baris baru jika di baris akhir). Sel bertipe `NOMINAL` dilengkapi `inputMode="decimal"` agar perangkat mobile langsung membuka keypad numerik.
  * **Kalkulator Mini Melayang (`CalculatorPopover`)**: Komponen kalkulator melayang compact di `@/components/ui/calculator-popover.tsx` yang muncul saat sel `NOMINAL` / `NOMOR` atau `Pulsa` SIM dipilih. Dilengkapi tombol keypad `000` (triple zero) untuk menginput nominal ribuan Rupiah secara cepat.
  * **Geser Urutan Kolom Drag & Drop (`Interactive Column Dragging`)**: Pada mode *"Atur Urutan"* (`isReorderMode`), header kolom dilengkapi drag handle `GripVertical` dan event handler drag & drop HTML5/touch untuk menggeser posisi kolom ke kiri/kanan secara interaktif.
  * **Optimistic UI Updates (0ms Response)**: Semua interaksi mutasi data (edit sel inline, toggle centang, swap urutan akun/kolom, tambah/edit/hapus garapan & aplikasi) memperbarui state React lokal terlebih dahulu secara instan (0ms) sebelum memproses Server Action di latar belakang.
  * **Lazy Loading XLSX (-700KB JS Bundle)**: Library `xlsx` dieksekusi via Dynamic Import (`await import("xlsx")`) hanya ketika pengguna mengekspor data, mengurangi bundle JS awal sebesar 700KB.
  * **Instant Route Prefetching & Fallback Slug Garapan**: Komponen navigasi utama (`AppNavigation`) menggunakan `prefetch={true}`. Fungsi `getGarapan(id)` pada Server Action mendukung pencarian `id` CUID serta pencarian fallback berdasarkan nama bulan (`agustus`), angka bulan (`8`), atau format bulan-tahun (`8-2026`), mencegah error 404 ketika ID CUID berbeda atau URL diakses secara fleksibel.
  * **Toggle Kolom Perangkat & Nomor HP (`Switch Toggle di Detail Akun`)**: Pada modal *Detail Akun* (yang muncul saat sel akun di klik pada halaman garapan maupun master aplikasi), tersedia tombol `Switch` untuk informasi **Perangkat** dan **Nomor HP**. Ketika switch diaktifkan, kolom *Perangkat* dan/atau *Nomor HP* akan otomatis ditampilkan sebagai kolom tabel. Status switch disimpan di `localStorage` (`saren_show_device_col` & `saren_show_phone_col`) agar preferensi tampilan tabel tetap persisten.
  * **Pencarian Cepat & Pembatasan Salin Data Akun (`AccountAutofillPicker`)**: Modal pembuatan akun pada detail garapan dan aplikasi dilengkapi komponen pencarian instan yang membatasi hasil awal (maks 6 akun) dan hasil pencarian (maks 8 akun). Dropdown popover compact (`max-h-52`) mencegah dropdown melebar tak terhingga saat data akun berjumlah ratusan, menampilkan preview `Device` dan `Nomor HP`, serta menjaga waktu respon pencarian tetap 0ms.
  * **Kompresi Otomatis Logo & Gambar Klien (`compressImageFile`)**: Utilitas terpusat di `@/lib/utils/imageCompressor.ts` yang mengompresi logo aplikasi dan gambar catatan secara otomatis di sisi klien menggunakan HTML5 Canvas ke format modern `.webp` sebelum diunggah ke FormData/server. Menghemat bandwidth hingga 80-90% dan mempercepat proses upload di koneksi seluler.
  * **Non-blocking Font Loading**: Pengaturan font Google (`Inter`, `Plus_Jakarta_Sans`, `IBM_Plex_Mono`) menggunakan `display: "swap"`.
  * **Navigasi Bawah Modern Mobile (`AppNavigationBottom`)**: Menggunakan tinggi proporsional `h-16` (64px) dengan efek *glassmorphism* `backdrop-blur-xl bg-bg-surface/92`. Status aktif menggunakan *capsule badge* oval (`h-8 px-4 rounded-full bg-accent-soft text-accent border border-accent/25`) di sekeliling ikon dengan label teks terpusat di bawahnya (`text-[11px] font-bold text-accent`), menghindari tumpang tindih visual dan memberikan ruang sentuh ergonomis.
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
* **Perilaku Klik Checklist Preview & Animasi Halus (Smooth Transitions)**:
  * Pemicu centang (*checkbox*) harus menggunakan `e.stopPropagation()` pada elemen `<input type="checkbox" />` secara langsung.
  * **Dilarang keras meletakkan `e.stopPropagation()` pada pembungkus baris checklist** (kontainer `div` baris teks). Klik pada area teks catatan checklist harus tetap dapat memicu event klik kartu (`onClick={onSelect}`) agar kartu dapat dibuka untuk masuk ke halaman detail catatan.
  * **Animasi Transisi Checklist Halus**: Saat item checklist dicentang, sistem memberikan feedback instan (checkbox tercentang, pop `animate-check-pop`, teks tercoret *strikethrough*), lalu meluncur turun dan mengecil secara halus (`animate-checklist-down`) sebelum dipindahkan/disembunyikan setelah 320ms, mencegah perubahan tampilan yang mendadak/kasar.
  * **Animasi Hapus Baris Checklist**: Menghapus item checklist menggunakan animasi geser keluar (`animate-checklist-remove`) selama 220ms sehingga baris di bawahnya naik secara halus.
* **Penyembunyian Item Selesai di Kartu**: Item checklist yang sudah dicentang (selesai) tidak ditampilkan pada pratinjau kartu (`NoteCard`) di dashboard utama.

### 4. Komponen Edit & Detail Catatan (`NoteEditClient.tsx`)
Mengelola alur pengeditan satu catatan secara mendalam, dioptimalkan sepenuhnya untuk kenyamanan ponsel (mobile):
* **Bebas Header & Navigasi Global**: Di halaman `/note/[id]`, Header Utama aplikasi dan Navigasi Bawah disembunyikan lewat `LayoutWrapper.tsx` untuk memberikan ruang kerja maksimal dan menghindari tombol gigi ganda.
* **Header Minimalis & Centered Status**: Header atas hanya berisi tombol Kembali dan tombol Sematkan (Pin). Informasi `"Diedit [Waktu]"` wajib diletakkan di tengah-tengah header atas secara absolut (`absolute left-1/2 -translate-x-1/2`) agar simetris dan mudah dibaca.
* **Toolbar Aksi Bawah (Thumb Zone) & Popover Pegas (`animate-popover-up`)**: Semua aksi modifikasi diletakkan pada toolbar melayang di bagian bawah layar (`fixed bottom-0 left-0 right-0 z-30 h-12`) dengan efek *backdrop-blur*. Popover menu warna, label, dan tipe muncul dengan animasi pegas GPU melayang dari bawah (`animate-popover-up`).
  * 🎨 **Ubah Warna** (popover melayang ke atas: `bottom-14`)
  * 🏷️ **Ubah Label** (popover melayang ke atas: `bottom-14`)
  * 📝 **Ubah Tipe** (popover melayang ke atas: `bottom-14`)
  * 📥 **Arsipkan / Pulihkan**
  * 📋 **Duplikat**
  * 🗑️ **Hapus ke Sampah** (berwarna merah `text-danger` secara permanen, dan wajib memicu dialog konfirmasi `confirm()` sebelum menghapus).
* **Target Sentuh Checklist & Animasi Transisi**: Di dalam `ChecklistEditor`, setiap baris memiliki padding vertikal longgar (`py-1.5`) dengan ukuran checkbox `h-4.5 w-4.5` (18px) dan kelengkungan `rounded-md` untuk kenyamanan jari mobile. Saat mencentang item aktif, item menampilkan pop centang dan mencoret teks, lalu meluncur turun (`animate-checklist-down`) ke bagian selesai. Sebaliknya, saat membatalkan centang pada daftar tugas selesai, item meluncur naik (`animate-checklist-up`) dan masuk kembali ke daftar aktif dengan animasi masuk (`animate-checklist-enter`). Tombol hapus item (`X`) di kanan baris tidak menggunakan status hover tersembunyi, melainkan hanya dimunculkan secara dinamis saat baris input teks yang bersangkutan sedang berfokus/diedit (menggunakan state focus).
* **Pengaturan Urutan (Drag and Drop)**: Setiap item aktif pada `ChecklistEditor` dilengkapi dengan tombol drag handle (`GripVertical`) di sebelah kiri untuk melakukan drag and drop guna mengatur urutan item secara interaktif.
* **Auto-collapse Item Selesai**: Secara default, ketika halaman edit dibuka, daftar tugas yang sudah diselesaikan (`done`) disembunyikan dalam keadaan tertutup/terlipat (*auto-collapse*). Pengguna dapat membukanya kembali dengan menekan tombol toggle *"Selesai (Jumlah)"*.
* **Mode Pengaturan Tabel (Table Editor) & Modal Pengaturan Kolom (`ColumnConfigDialog`)**: 
  - Header tabel tetap bersih dan rapi. Pada mode edit (`isEditMode`), setiap kolom dilengkapi tombol badge jenis kolom yang jika diklik akan membuka **Modal Dialog Pengaturan Kolom** (`Dialog`).
  - **Fitur di dalam Modal Pengaturan Kolom**:
    1. **Nama Kolom**: Input teks fleksibel untuk mengubah judul kolom.
    2. **Jenis Tipe Data**: 5 kartu pilihan interaktif berikon: `Teks / Angka` (Type), `Nominal (Rp)` (Banknote), `Tanggal` (Calendar), `Centang` (CheckSquare), dan `Rumus Dinamis` (Calculator).
    3. **Hitung Total Akumulasi ($\Sigma$)**: Switch toggle untuk mengaktifkan penjumlahan kolom di baris bawah tabel (otomatis berformat `Rp ...` jika tipe kolom Nominal).
    4. **Konfigurasi Rumus Terpadu (Khusus Tipe Rumus)**: Dilengkapi kotak input ekspresi rumus `fx =`, chip rumus cepat bulan lalu (`selisih([Kolom])`, `persen([Kolom])`), chip penyisipan variabel `[Kolom]`, keypad operator (`+`, `-`, `*`, `/`, `(`, `)`, `%`, `^`), serta panduan rumus ringkas.
  * **Kolom Rumus pada Catatan Tabel (`RUMUS`)**:
    - Mendukung ekspresi matematika fleksibel: referensi kolom langsung `[Kolom]`, referensi baris sebelumnya `prev([Kolom])`, shortcut selisih `selisih([Kolom])`, persentase kenaikan `persen([Kolom])`, dan kumulatif `kumulatif([Kolom])`.
    - Penanganan baris pertama (base row): baris awal otomatis aman dari pembagian dengan 0 dan tidak menghasilkan NaN / error (menghasilkan `-` atau `0`).
    - Format output otomatis: mendukung angka desimal koma Indonesia (misal `2,4492`) dan akhiran `%` otomatis jika rumus merupakan persentase.
    - Hasil rumus terhitung secara instan (0ms client-side evaluation), dapat diakumulasikan ke baris Total ($\Sigma$), serta ter-render pada pratinjau kartu dashboard, salin teks tabel, dan export kanvas gambar.

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
* **Klik-untuk-Salin Nomor & Micro-Check Animasi**: Mengklik sel Nomor langsung menyalin ke clipboard dan memunculkan badge centang hijau mikro (`Check` `text-success animate-check-pop`) langsung di dalam sel selama 1.5 detik sebagai konfirmasi visual instan.
* **Flash Highlight Simpan Pulsa**: Saat saldo pulsa diedit inline dan berhasil disimpan, sel memberikan kilatan warna lembut (`flashSavedId` selama 800ms) untuk konfirmasi visual nilai baru.
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
