"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreVertical, Edit2, Trash2, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { createGarapan, updateGarapan, deleteGarapan } from "@/lib/actions/garapan";

interface GarapanItem {
  id: string;
  bulan: number;
  tahun: number;
}

interface GarapanListClientProps {
  initialList: GarapanItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function GarapanListClient({ initialList }: GarapanListClientProps) {
  const router = useRouter();
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<GarapanItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<GarapanItem | null>(null);

  // Form states
  const [bulan, setBulan] = React.useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = React.useState(new Date().getFullYear());
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isAddOpen) {
      setBulan(new Date().getMonth() + 1);
      setTahun(new Date().getFullYear());
      setFormError(null);
    }
  }, [isAddOpen]);

  React.useEffect(() => {
    if (editingItem) {
      setBulan(editingItem.bulan);
      setTahun(editingItem.tahun);
      setFormError(null);
    }
  }, [editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tahun < 2000 || tahun > 2100) {
      setFormError("Tahun harus di antara 2000 dan 2100.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const data = { bulan, tahun };
    
    if (editingItem) {
      const res = await updateGarapan(editingItem.id, data);
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Garapan diperbarui");
        setEditingItem(null);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal memperbarui garapan.");
      }
    } else {
      const res = await createGarapan(data);
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Garapan ditambahkan");
        setIsAddOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal menambahkan garapan.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const res = await deleteGarapan(deletingItem.id);
    if (res.success) {
      toast.success("Garapan dihapus");
      setDeletingItem(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal menghapus garapan.");
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-text-primary font-display leading-tight">
            Daftar Garapan
          </h2>
          <p className="text-text-secondary text-[13px] font-sans mt-0.5">
            Daftar catatan pekerjaan bulanan yang dikelompokkan berdasarkan bulan dan tahun.
          </p>
        </div>
        
        {initialList.length > 0 && (
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4" />
            <span>Tambah Garapan</span>
          </Button>
        )}
      </div>

      {/* Grid or Empty State */}
      {initialList.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Calendar}
            title="Belum ada garapan"
            description="Tambahkan bulan dan tahun pertamamu untuk mulai mencatat pekerjaan."
            actionLabel="Tambah Garapan Pertama"
            onAction={() => setIsAddOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {initialList.map((item) => (
            <Card
              key={item.id}
              hoverable
              onClick={() => router.push(`/garapan/${item.id}`)}
              className="relative group pr-12 min-h-[96px] flex items-center p-5 gap-4"
            >
              {/* Calendar Icon Indicator */}
              <div className="h-10 w-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 shadow-sm border border-accent/5">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col grow min-w-0">
                <h3 className="text-[15px] font-semibold text-text-primary font-display truncate">
                  {MONTH_NAMES[item.bulan - 1]}
                </h3>
                <p className="text-text-secondary text-xs font-sans mt-0.5">
                  Tahun {item.tahun}
                </p>
              </div>

              {/* Dropdown Action Menu */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
        title={editingItem ? "Edit Garapan" : "Tambah Garapan"}
        description={
          editingItem
            ? "Ubah bulan dan tahun garapan kerja ini."
            : "Tambahkan bulan dan tahun baru untuk mengelompokkan pekerjaan."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Bulan</label>
            <Select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={index} value={index + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Tahun</label>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              placeholder="Contoh: 2026"
              required
            />
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
        title="Hapus Garapan?"
        description="Menghapus garapan ini akan menghapus semua aplikasi, akun, dan kolom di dalamnya secara permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Hapus Permanen"
      />
    </div>
  );
}
