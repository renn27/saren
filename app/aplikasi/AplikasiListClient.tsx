"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { twMerge } from "tailwind-merge";
import { Select } from "@/components/ui/select";
import { MoreVertical, Edit2, Trash2, AppWindow, Plus, Upload, X, AppWindow as AppIcon, Search, CheckCircle2, Tag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createAplikasi, updateAplikasi, deleteAplikasi } from "@/lib/actions/aplikasi";
import { checkAppTargetCompleted } from "@/lib/utils/formulaEvaluator";

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
  initialList: AplikasiItem[];
}

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

function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal membuat context 2D"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Kompresi gambar gagal"));
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = (err: any) => reject(err);
    };
    reader.onerror = (err: any) => reject(err);
  });
}

export function AplikasiListClient({ initialList }: AplikasiListClientProps) {
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

  // Search & Category Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("Semua");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Extract unique category list from list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    list.forEach((item) => {
      if (item.kategori && item.kategori.trim()) {
        set.add(item.kategori.trim());
      }
    });
    return Array.from(set).sort();
  }, [list]);

  // Count apps without category
  const uncategorizedCount = React.useMemo(() => {
    return list.filter((item) => !item.kategori || !item.kategori.trim()).length;
  }, [list]);

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
    }
  }, [isAddOpen]);

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
    }
  }, [editingItem]);

  const filteredList = React.useMemo(() => {
    return list.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.namaAplikasi.toLowerCase().includes(q) ||
        (item.deskripsi && item.deskripsi.toLowerCase().includes(q)) ||
        (item.kategori && item.kategori.toLowerCase().includes(q));

      let matchesCategory = true;
      if (selectedCategory === "Semua") {
        matchesCategory = true;
      } else if (selectedCategory === "__NONE__") {
        matchesCategory = !item.kategori || !item.kategori.trim();
      } else {
        matchesCategory = !!(item.kategori && item.kategori.trim().toLowerCase() === selectedCategory.toLowerCase());
      }

      return matchesSearch && matchesCategory;
    });
  }, [list, searchQuery, selectedCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("File harus berupa gambar.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Ukuran file maksimal 5MB.");
      return;
    }

    setLogoFile(file);
    setClearLogo(false);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
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

    const formData = new FormData();
    formData.append("namaAplikasi", namaAplikasi);
    formData.append("deskripsi", deskripsi);
    if (kategoriInput.trim()) {
      formData.append("kategori", kategoriInput.trim());
    }
    if (logoFile) {
      try {
        const compressedBlob = await compressImage(logoFile, 128, 128, 0.8);
        const compressedFile = new File([compressedBlob], logoFile.name.replace(/\.[^/.]+$/, "") + ".webp", {
          type: "image/webp",
          lastModified: Date.now(),
        });
        formData.append("logo", compressedFile);
      } catch (err) {
        console.error("Gagal kompresi logo, menggunakan file asli:", err);
        formData.append("logo", logoFile);
      }
    }
    if (clearLogo) formData.append("clearLogo", "true");

    if (editingItem) {
      const res = await updateAplikasi(editingItem.id, null, formData);
      setIsSubmitting(false);
      if (res.success && res.data) {
        toast.success("Aplikasi diperbarui");
        const updated = res.data;
        setList((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
        setEditingItem(null);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal memperbarui aplikasi.");
      }
    } else {
      const res = await createAplikasi(null, formData);
      setIsSubmitting(false);
      if (res.success && res.data) {
        toast.success("Aplikasi ditambahkan");
        const newItem = res.data;
        setList((prev) => [newItem, ...prev]);
        setIsAddOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal menambahkan aplikasi.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    const prevList = [...list];
    setList((prev) => prev.filter((item) => item.id !== targetId));
    setDeletingItem(null);

    const res = await deleteAplikasi(targetId, null);
    if (res.success) {
      toast.success("Aplikasi dihapus");
      router.refresh();
    } else {
      setList(prevList);
      toast.error(res.error || "Gagal menghapus aplikasi.");
    }
  };

  return (
    <div key={pathname} className={`w-full transition-all duration-300 ${isExiting ? 'opacity-0 scale-[0.98] blur-[2px]' : 'animate-in fade-in slide-in-from-bottom-4 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}>
      <Card className="relative flex flex-col gap-4 p-4 sm:p-5 mb-4">
        {/* Top Row: Title */}
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
              <AppIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[19px] sm:text-[21px] font-semibold text-text-primary font-display tracking-tight leading-tight select-none">
                Daftar Aplikasi
              </h2>
              <p className="text-xs text-text-secondary font-sans mt-0.5">
                {filteredList.length !== list.length
                  ? `${filteredList.length} dari ${list.length} aplikasi`
                  : `${list.length} aplikasi mandiri`}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Add Button Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              type="text"
              placeholder="Cari nama aplikasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-11 w-full text-[13px] bg-bg-page/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-secondary hover:bg-accent-soft/50 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Add Button */}
          <Button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 justify-center w-full sm:w-auto h-11 px-5 text-sm font-semibold shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Tambah Aplikasi</span>
          </Button>
        </div>

        {/* Category Filter Pills Bar */}
        {(categories.length > 0 || uncategorizedCount > 0) && list.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar w-full select-none border-t border-border-soft/60">
            <button
              type="button"
              onClick={() => setSelectedCategory("Semua")}
              className={twMerge(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border",
                selectedCategory === "Semua"
                  ? "bg-accent text-white border-accent shadow-xs"
                  : "bg-bg-page/70 text-text-secondary border-border-soft hover:border-accent/40"
              )}
            >
              Semua ({list.length})
            </button>

            {uncategorizedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory("__NONE__")}
                className={twMerge(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5",
                  selectedCategory === "__NONE__"
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-bg-page/70 text-text-secondary border-border-soft hover:border-accent/40"
                )}
              >
                <span>Tanpa Kategori</span>
                <span className={twMerge("px-1.5 py-0.2 rounded-full text-[10px] font-bold", selectedCategory === "__NONE__" ? "bg-white/20 text-white" : "bg-bg-surface text-text-secondary border border-border-soft/40")}>
                  {uncategorizedCount}
                </span>
              </button>
            )}

            {categories.map((cat) => {
              const count = list.filter((i) => i.kategori?.trim().toLowerCase() === cat.toLowerCase()).length;
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={twMerge(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5",
                    isSelected
                      ? "bg-accent text-white border-accent shadow-xs"
                      : "bg-bg-page/70 text-text-secondary border-border-soft hover:border-accent/40"
                  )}
                >
                  <span>{cat}</span>
                  <span className={twMerge("px-1.5 py-0.2 rounded-full text-[10px] font-bold", isSelected ? "bg-white/20 text-white" : "bg-bg-surface text-text-secondary border border-border-soft/40")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Grid or Empty State */}
      {initialList.length === 0 ? (
        <div className="py-16">
          <EmptyState
            icon={AppWindow}
            title="Belum ada aplikasi"
            description="Tambahkan aplikasi pertama Anda untuk mulai mengelola akun."
            actionLabel="Tambah Aplikasi Pertama"
            onAction={() => setIsAddOpen(true)}
          />
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-12 bg-bg-surface border border-border-soft rounded-3xl text-center p-8 shadow-sm">
          <p className="text-text-secondary text-sm font-sans">
            Tidak ada aplikasi yang cocok dengan pencarian "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {filteredList.map((item) => {
            const colorClass = getAppColor(item.namaAplikasi);
            const isTargetCompleted = checkAppTargetCompleted(item);

            return (
              <Card
                key={item.id}
                hoverable
                onClick={() => handleNavigate(`/aplikasi/${item.id}`)}
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
                      <button 
                        type="button"
                        className="p-1.5 rounded-xl text-text-secondary hover:bg-accent-soft/80 hover:text-text-primary transition-all duration-150 cursor-pointer"
                      >
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
            : "Tambahkan aplikasi baru ke dalam daftar aplikasi mandiri."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                onChange={handleFileSelect}
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
    </div>
  );
}
