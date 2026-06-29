"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, MoreVertical, Edit2, Trash2, AppWindow, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createAplikasi, updateAplikasi, deleteAplikasi } from "@/lib/actions/aplikasi";

interface Garapan {
  id: string;
  bulan: number;
  tahun: number;
}

interface AplikasiItem {
  id: string;
  namaAplikasi: string;
  logoUrl: string | null;
  deskripsi: string | null;
}

interface AplikasiListClientProps {
  garapan: Garapan;
  initialList: AplikasiItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function compressImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
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
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export function AplikasiListClient({ garapan, initialList }: AplikasiListClientProps) {
  const router = useRouter();
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AplikasiItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<AplikasiItem | null>(null);

  // Form states
  const [namaAplikasi, setNamaAplikasi] = React.useState("");
  const [deskripsi, setDeskripsi] = React.useState("");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [clearLogo, setClearLogo] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modals open/close
  React.useEffect(() => {
    if (isAddOpen) {
      setNamaAplikasi("");
      setDeskripsi("");
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
      setLogoFile(null);
      setLogoPreview(editingItem.logoUrl);
      setClearLogo(false);
      setFormError(null);
    }
  }, [editingItem]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFormError("Ukuran logo maksimal 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate type
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setFormError("Format logo harus JPG, PNG, atau WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFormError(null);
    setLogoFile(file);
    setClearLogo(false);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setClearLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    if (clearLogo) {
      formData.append("clearLogo", "true");
    }

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

  const formattedMonthYear = `${MONTH_NAMES[garapan.bulan - 1]} ${garapan.tahun}`;

  return (
    <div className="w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-2.5 mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent/80 transition-colors gap-1 group font-sans w-fit"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Garapan</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-[20px] font-semibold text-text-primary font-display tracking-tight leading-tight">
            {formattedMonthYear}
          </h2>
          {initialList.length > 0 && (
            <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <Plus className="h-4 w-4" />
              <span>Tambah Aplikasi</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid or Empty State */}
      {initialList.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={AppWindow}
            title="Belum ada aplikasi"
            description="Tambahkan aplikasi pertama Anda di bulan ini untuk mulai mengelola akun."
            actionLabel="Tambah Aplikasi Pertama"
            onAction={() => setIsAddOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {initialList.map((item) => (
            <Card
              key={item.id}
              hoverable
              onClick={() => router.push(`/garapan/${garapan.id}/aplikasi/${item.id}`)}
              className="relative group pr-10 sm:pr-12 flex flex-col justify-between min-h-[120px] sm:min-h-[136px] p-4 sm:p-5"
            >
              {/* App logo or placeholder with gradient */}
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl border border-border-soft overflow-hidden bg-gradient-to-tr from-accent-soft to-accent/15 flex items-center justify-center text-accent select-none mb-3 sm:mb-4 shadow-sm">
                {item.logoUrl ? (
                  <img
                    src={item.logoUrl}
                    alt={item.namaAplikasi}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs sm:text-[15px] font-semibold font-display">
                    {item.namaAplikasi.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-text-primary font-display truncate">
                {item.namaAplikasi}
              </h3>

              {/* Dropdown Menu */}
              <div className="absolute right-2 top-4 sm:right-3 sm:top-5">
                <DropdownMenu
                  trigger={
                    <button className="p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/80 hover:text-text-primary transition-colors cursor-pointer">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  }
                >
                  <DropdownMenuItem
                    onClick={() => setEditingItem(item)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    isDanger
                    onClick={() => setDeletingItem(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </DropdownMenuItem>
                </DropdownMenu>
              </div>
            </Card>
          ))}
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Nama Aplikasi</label>
            <Input
              type="text"
              value={namaAplikasi}
              onChange={(e) => setNamaAplikasi(e.target.value)}
              placeholder="Contoh: Shopee, Tokopedia, TikTok"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Deskripsi (Opsional)</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Tugas harian mendapatkan poin check-in dan klaim bonus kupon OVO."
              className="w-full min-h-[70px] p-3 text-sm bg-bg-page border border-border-soft rounded-xl text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all font-sans resize-y"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Logo Aplikasi (Opsional)</label>
            <div className="flex items-center gap-4 border border-dashed border-border-soft p-4 rounded-xl bg-bg-page/50">
              <div className="h-12 w-12 rounded-xl border border-border-soft overflow-hidden bg-accent-soft flex items-center justify-center text-accent shrink-0 select-none">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="h-5 w-5 opacity-70" />
                )}
              </div>
              <div className="flex flex-col gap-1.5 grow">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="logo-upload"
                    className="h-9 px-3 text-xs font-medium border border-border-soft rounded-lg bg-bg-surface text-text-primary hover:bg-accent-soft/30 cursor-pointer flex items-center justify-center transition-colors focus-within:ring-2 focus-within:ring-accent"
                  >
                    Pilih File
                  </label>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="h-9 text-xs text-danger hover:bg-danger-soft/50 font-medium"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary">
                  Format JPG, PNG, WEBP (Maksimal 2MB)
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-lg border border-danger/10">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-2">
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
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
