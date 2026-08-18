"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, MoreVertical, Edit2, Trash2, AppWindow, Plus, Upload, X, Calendar, Copy, CheckCircle2, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { createAplikasi, updateAplikasi, deleteAplikasi, importAplikasiToGarapan } from "@/lib/actions/aplikasi";
import { Select } from "@/components/ui/select";
import { duplicateGarapan } from "@/lib/actions/garapan";
import { checkAppTargetCompleted } from "@/lib/utils/formulaEvaluator";
import { compressImageFile } from "@/lib/utils/imageCompressor";

interface Garapan {
  id: string;
  bulan: number;
  tahun: number;
}

interface StandaloneAplikasiItem {
  id: string;
  namaAplikasi: string;
  logoUrl: string | null;
  deskripsi: string | null;
  _count?: { akun: number };
  akun?: any[];
}

interface AplikasiItem {
  id: string;
  namaAplikasi: string;
  logoUrl: string | null;
  deskripsi: string | null;
  kategori?: string | null;
  kolom?: any[];
  akun?: any[];
}

interface AplikasiListClientProps {
  garapan: Garapan;
  initialList: AplikasiItem[];
  standaloneList?: StandaloneAplikasiItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Color palette for app logo placeholders, picked by hashing the app name
const APP_COLORS = [
  "from-cyan-400/25 to-sky-400/15 text-cyan-600 dark:text-cyan-400",
  "from-violet-400/25 to-purple-400/15 text-violet-600 dark:text-violet-400",
  "from-rose-400/25 to-pink-400/15 text-rose-600 dark:text-rose-400",
  "from-emerald-400/25 to-teal-400/15 text-emerald-600 dark:text-emerald-400",
  "from-amber-400/25 to-orange-400/15 text-amber-600 dark:text-amber-400",
  "from-indigo-400/25 to-blue-400/15 text-indigo-600 dark:text-indigo-400",
  "from-fuchsia-400/25 to-pink-400/15 text-fuchsia-600 dark:text-fuchsia-400",
  "from-teal-400/25 to-cyan-400/15 text-teal-600 dark:text-teal-400",
];

function getAppColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return APP_COLORS[Math.abs(hash) % APP_COLORS.length];
}

export function AplikasiListClient({ garapan, initialList, standaloneList = [] }: AplikasiListClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local optimistic state
  const [list, setList] = React.useState<AplikasiItem[]>(initialList);

  React.useEffect(() => {
    setList(initialList);
  }, [initialList]);

  // Route transition state
  const [isExiting, setIsExiting] = React.useState(false);
  const handleNavigate = (url: string) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(url);
    }, 250);
  };

  // Modals state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AplikasiItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<AplikasiItem | null>(null);

  // Form states
  const [namaAplikasi, setNamaAplikasi] = React.useState("");
  const [deskripsi, setDeskripsi] = React.useState("");
  const [kategoriInput, setKategoriInput] = React.useState("");
  const [isCustomKategori, setIsCustomKategori] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [clearLogo, setClearLogo] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedStandaloneId, setSelectedStandaloneId] = React.useState("");

  // Extract category list from initialList and standaloneList
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    initialList.forEach((item) => {
      if (item.kategori && item.kategori.trim()) set.add(item.kategori.trim());
    });
    if (standaloneList) {
      standaloneList.forEach((item: any) => {
        if (item.kategori && item.kategori.trim()) set.add(item.kategori.trim());
      });
    }
    return Array.from(set).sort();
  }, [initialList, standaloneList]);

  // Duplication modal state
  const [isDuplicateOpen, setIsDuplicateOpen] = React.useState(false);
  const [duplicateBulan, setDuplicateBulan] = React.useState(new Date().getMonth() + 1);
  const [duplicateTahun, setDuplicateTahun] = React.useState(new Date().getFullYear());
  const [duplicateError, setDuplicateError] = React.useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isDuplicateOpen) {
      setDuplicateBulan(new Date().getMonth() + 1);
      setDuplicateTahun(new Date().getFullYear());
      setDuplicateError(null);
    }
  }, [isDuplicateOpen]);

  const handleDuplicateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duplicateTahun < 2000 || duplicateTahun > 2100) {
      setDuplicateError("Tahun harus di antara 2000 dan 2100.");
      return;
    }

    setIsDuplicating(true);
    setDuplicateError(null);

    const res = await duplicateGarapan(garapan.id, {
      bulan: duplicateBulan,
      tahun: duplicateTahun,
    });

    setIsDuplicating(false);

    if (res.success) {
      toast.success("Garapan berhasil diduplikat!");
      setIsDuplicateOpen(false);
      handleNavigate("/");
      router.refresh();
    } else {
      setDuplicateError(res.error || "Gagal menduplikat garapan.");
    }
  };

  // Reset form when modals open/close
  React.useEffect(() => {
    if (isAddOpen) {
      setNamaAplikasi("");
      setDeskripsi("");
      setKategoriInput("");
      setIsCustomKategori(false);
      setLogoFile(null);
      setLogoPreview(null);
      setClearLogo(false);
      setFormError(null);
      setSelectedStandaloneId("");
    }
  }, [isAddOpen]);

  const handleSelectStandalone = (id: string) => {
    setSelectedStandaloneId(id);
    if (!id || !standaloneList) return;
    const found = standaloneList.find((a) => a.id === id);
    if (found) {
      setNamaAplikasi(found.namaAplikasi);
      setDeskripsi(found.deskripsi || "");
      setKategoriInput((found as any).kategori || "");
      setLogoPreview(found.logoUrl || null);
      setLogoFile(null);
      setClearLogo(false);
    }
  };

  React.useEffect(() => {
    if (editingItem) {
      setNamaAplikasi(editingItem.namaAplikasi);
      setDeskripsi(editingItem.deskripsi || "");
      setKategoriInput(editingItem.kategori || "");
      setIsCustomKategori(false);
      setLogoFile(null);
      setLogoPreview(editingItem.logoUrl);
      setClearLogo(false);
      setFormError(null);
      setSelectedStandaloneId("");
    }
  }, [editingItem]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError("Ukuran logo maksimal 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setFormError("Format logo harus JPG, PNG, atau WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFormError(null);
    setLogoFile(file);
    setClearLogo(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLogoFile(null);
    setLogoPreview(null);
    setClearLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaAplikasi.trim()) {
      setFormError("Nama aplikasi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Jika mengimpor dari aplikasi standalone tanpa file logo baru yang diunggah
    if (!editingItem && selectedStandaloneId && !logoFile) {
      const res = await importAplikasiToGarapan(selectedStandaloneId, garapan.id);
      setIsSubmitting(false);
      if (res.success && res.aplikasi) {
        toast.success(`Aplikasi "${namaAplikasi}" & daftar akunnya berhasil diimpor!`);
        setIsAddOpen(false);
        setSelectedStandaloneId("");
        router.refresh();
      } else {
        setFormError(res.error || "Gagal mengimpor aplikasi.");
      }
      return;
    }

    const formData = new FormData();
    formData.append("namaAplikasi", namaAplikasi);
    formData.append("deskripsi", deskripsi);
    if (kategoriInput.trim()) {
      formData.append("kategori", kategoriInput.trim());
    }
    if (logoFile) {
      const compressedFile = await compressImageFile(logoFile, 256, 256, 0.85);
      formData.append("logo", compressedFile);
    }
    if (clearLogo) formData.append("clearLogo", "true");

    if (editingItem) {
      const res = await updateAplikasi(editingItem.id, garapan.id, formData);
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Aplikasi diperbarui");
        setEditingItem(null);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal memperbarui aplikasi.");
      }
    } else {
      const res = await createAplikasi(garapan.id, formData);
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Aplikasi ditambahkan");
        setIsAddOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal menambahkan aplikasi.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const res = await deleteAplikasi(deletingItem.id, garapan.id);
    if (res.success) {
      toast.success("Aplikasi dihapus");
      setDeletingItem(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal menghapus aplikasi.");
    }
  };

  // Memoize target completion for 0ms render latency
  const targetCompletedMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    list.forEach((item) => {
      map.set(item.id, checkAppTargetCompleted(item));
    });
    return map;
  }, [list]);

  const formattedMonthYear = `${MONTH_NAMES[garapan.bulan - 1]} ${garapan.tahun}`;

  return (
    <div key={pathname} className={`w-full transition-all duration-300 ${isExiting ? 'opacity-0 scale-[0.98] blur-[2px]' : 'animate-in fade-in slide-in-from-bottom-4 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}>
      {/* Back Button */}
      <div className="mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleNavigate("/")}
          className="h-9 px-3.5 gap-1.5 text-text-secondary w-fit"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span>Kembali ke Daftar Garapan</span>
        </Button>
      </div>

      <Card className="relative flex flex-col gap-4 p-4 sm:p-5 mb-4">
        {/* Top Row: Title & Duplicate Button */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[19px] sm:text-[21px] font-semibold text-text-primary font-display tracking-tight leading-tight select-none">
                {formattedMonthYear}
              </h2>
              <p className="text-xs text-text-secondary font-sans mt-0.5">
                {initialList.length} aplikasi
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDuplicateOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 whitespace-nowrap"
          >
            <Copy className="h-3.5 w-3.5 shrink-0" />
            <span>Duplikat</span>
          </Button>
        </div>

        {/* Bottom Row: Full Width Add Application Button */}
        <Button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 justify-center w-full h-11 text-sm font-semibold"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Tambah Aplikasi</span>
        </Button>
      </Card>

      {/* Grid or Empty State */}
      {list.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={AppWindow}
            title="Belum ada aplikasi"
            description="Tambahkan aplikasi pertama Anda di bulan ini untuk mulai mengelola akun."
            actionLabel="Tambah Aplikasi Pertama"
            onAction={() => setIsAddOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {list.map((item) => {
            const colorClass = getAppColor(item.namaAplikasi);
            const isTargetCompleted = targetCompletedMap.get(item.id);

            return (
              <Card
                key={item.id}
                hoverable
                onClick={() => handleNavigate(`/garapan/${garapan.id}/aplikasi/${item.id}`)}
                className="card-stagger relative group pr-10 sm:pr-11 flex flex-col justify-between min-h-[116px] sm:min-h-[132px] p-4 sm:p-5 hover:z-10 focus-within:z-10"
              >
                {/* Target Completed Check Badge */}
                {isTargetCompleted && (
                  <div className="absolute top-3 right-8 sm:top-4 sm:right-9 flex items-center justify-center h-6.5 w-6.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:text-emerald-400 select-none shadow-xs" title="Target Selesai">
                    <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.5] text-emerald-500" />
                  </div>
                )}

                {/* App logo or color placeholder */}
                <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl border border-border-soft overflow-hidden bg-gradient-to-br ${colorClass} flex items-center justify-center select-none mb-3 sm:mb-4`}>
                  {item.logoUrl ? (
                    <Image
                      src={item.logoUrl}
                      alt={item.namaAplikasi}
                      width={44}
                      height={44}
                      unoptimized={item.logoUrl.startsWith("data:")}
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300 ease-out"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-bold font-display group-hover:scale-110 transition-transform duration-300 ease-out">
                      {item.namaAplikasi.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <h3 className="text-[13px] sm:text-sm font-semibold text-text-primary font-display truncate leading-tight">
                  {item.namaAplikasi}
                </h3>

                {/* Dropdown Menu */}
                <div className="absolute right-2 top-3 sm:right-3 sm:top-4">
                  <DropdownMenu
                    trigger={
                      <button className="p-1.5 rounded-xl text-text-secondary hover:bg-accent-soft/80 hover:text-text-primary transition-all duration-150 cursor-pointer">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    }
                  >
                    <DropdownMenuItem onClick={() => setEditingItem(item)}>
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem isDanger onClick={() => setDeletingItem(item)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </DropdownMenuItem>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isAddOpen || !!editingItem}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "Edit Aplikasi" : "Tambah Aplikasi"}
        description={
          editingItem
            ? "Ubah nama atau logo aplikasi ini."
            : "Tambahkan aplikasi baru ke dalam daftar garapan bulanan ini."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {standaloneList && standaloneList.length > 0 && !editingItem && (
            <div className="flex flex-col gap-2 p-3.5 bg-accent-soft/10 border border-accent/20 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs font-bold text-accent tracking-wide select-none">
                <Sparkles className="h-4 w-4" />
                <span>Impor dari Master Aplikasi Standalone</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-tight select-none">
                Pilih aplikasi master untuk mengimpor nama, logo, dan seluruh daftar akunnya secara otomatis.
              </p>
              <Select
                value={selectedStandaloneId}
                onChange={(e) => handleSelectStandalone(e.target.value)}
              >
                <option value="">-- Buat Baru dari Awal --</option>
                {standaloneList.map((app) => (
                  <option key={app.id} value={app.id}>
                    📦 {app.namaAplikasi} ({app._count?.akun ?? app.akun?.length ?? 0} Akun)
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Nama Aplikasi</label>
            <Input
              type="text"
              value={namaAplikasi}
              onChange={(e) => setNamaAplikasi(e.target.value)}
              placeholder="Contoh: Shopee, Tokopedia, TikTok"
              required
            />
          </div>

          {/* Kategori Application Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary tracking-wide">Kategori Aplikasi (Opsional)</label>
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomKategori(!isCustomKategori);
                    if (!isCustomKategori) setKategoriInput("");
                  }}
                  className="text-[11px] font-semibold text-accent hover:underline cursor-pointer select-none"
                >
                  {isCustomKategori ? "Pilih Kategori Ada" : "+ Kategori Baru"}
                </button>
              )}
            </div>

            {categories.length === 0 || isCustomKategori ? (
              <Input
                type="text"
                value={kategoriInput}
                onChange={(e) => setKategoriInput(e.target.value)}
                placeholder="Contoh: E-Wallet, Bank, Investasi, Marketplace"
              />
            ) : (
              <Select
                value={kategoriInput}
                onChange={(e) => {
                  if (e.target.value === "__NEW__") {
                    setIsCustomKategori(true);
                    setKategoriInput("");
                  } else {
                    setKategoriInput(e.target.value);
                  }
                }}
              >
                <option value="">-- Tanpa Kategori --</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    📁 {cat}
                  </option>
                ))}
                <option value="__NEW__">➕ Tambah Kategori Baru...</option>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Deskripsi (Opsional)</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Tugas harian mendapatkan poin check-in dan klaim bonus kupon OVO."
              className="w-full min-h-[70px] p-3.5 text-sm bg-bg-surface border border-border-soft rounded-2xl text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all duration-200 font-sans resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-text-secondary tracking-wide select-none">Logo Aplikasi (Opsional)</span>
            <label
              htmlFor="logo-upload"
              className="flex items-center justify-center border border-dashed border-border-soft p-5 rounded-3xl bg-bg-page/50 cursor-pointer hover:bg-accent-soft/10 hover:border-accent/40 transition-all duration-200 min-h-[96px] w-full"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="logo-upload"
              />

              {!logoPreview ? (
                <div className="flex flex-col items-center justify-center text-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-accent-soft flex items-center justify-center text-accent select-none">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 select-none">
                    <span className="text-xs font-semibold text-text-primary">
                      Klik di sini untuk mengunggah logo
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      Format JPG, PNG, WEBP (Maksimal 2MB)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 w-full text-left">
                  <div className="h-12 w-12 rounded-2xl border border-border-soft overflow-hidden shrink-0 select-none shadow-sm bg-bg-surface">
                    <img src={logoPreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1.5 grow min-w-0">
                    <span className="text-xs font-semibold text-text-primary truncate">Logo Terpilih</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="h-8 text-xs text-danger hover:bg-danger-soft/50 font-semibold px-2.5 w-fit"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Hapus Logo
                    </Button>
                  </div>
                </div>
              )}
            </label>
          </div>

          {formError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-xl border border-danger/10">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddOpen(false);
                setEditingItem(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Delete Alert */}
      <AlertDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Hapus Aplikasi?"
        description="Menghapus aplikasi ini akan menghapus semua akun dan kolom kustom di dalamnya secara permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Hapus Permanen"
      />

      {/* Duplicate Dialog */}
      <Dialog
        isOpen={isDuplicateOpen}
        onClose={() => setIsDuplicateOpen(false)}
        title="Duplikat Bulan Garapan"
        description={`Salin seluruh data dari bulan ${MONTH_NAMES[garapan.bulan - 1]} ${garapan.tahun} ke bulan baru.`}
      >
        <form onSubmit={handleDuplicateSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Bulan Baru</label>
            <Select
              value={duplicateBulan}
              onChange={(e) => setDuplicateBulan(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={index} value={index + 1}>{name}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Tahun Baru</label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={duplicateTahun}
              onChange={(e) => setDuplicateTahun(Number(e.target.value))}
              placeholder="Contoh: 2026"
              required
            />
          </div>

          {duplicateError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-xl border border-danger/10">
              {duplicateError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDuplicateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isDuplicating}>
              {isDuplicating ? "Menduplikat..." : "Duplikat"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
