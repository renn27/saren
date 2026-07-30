"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { MoreVertical, Edit2, Trash2, Calendar, Plus, List, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createGarapan, updateGarapan, deleteGarapan } from "@/lib/actions/garapan";
import { checkAppTargetCompleted } from "@/lib/utils/formulaEvaluator";

interface GarapanItem {
  id: string;
  bulan: number;
  tahun: number;
  aplikasi?: any[];
}

interface GarapanListClientProps {
  initialList: GarapanItem[];
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Accent colors per month for subtle variety
const MONTH_ACCENTS = [
  "from-sky-400/20 to-cyan-400/10",    // Jan
  "from-rose-400/20 to-pink-400/10",   // Feb
  "from-emerald-400/20 to-teal-400/10",// Mar
  "from-violet-400/20 to-purple-400/10",// Apr
  "from-amber-400/20 to-orange-400/10",// Mei
  "from-sky-400/20 to-blue-400/10",    // Jun
  "from-red-400/20 to-orange-400/10",  // Jul
  "from-indigo-400/20 to-violet-400/10",// Aug
  "from-teal-400/20 to-emerald-400/10",// Sep
  "from-orange-400/20 to-amber-400/10",// Okt
  "from-blue-400/20 to-sky-400/10",    // Nov
  "from-purple-400/20 to-violet-400/10",// Des
];

export function GarapanListClient({ initialList }: GarapanListClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local optimistic state
  const [list, setList] = React.useState<GarapanItem[]>(initialList);

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
      const prevList = [...list];
      setList((prev) => prev.map((g) => (g.id === editingItem.id ? { ...g, ...data } : g)));
      const res = await updateGarapan(editingItem.id, data);
      setIsSubmitting(false);
      if (res.success) {
        toast.success("Garapan diperbarui");
        setEditingItem(null);
        router.refresh();
      } else {
        setList(prevList);
        setFormError(res.error || "Gagal memperbarui garapan.");
      }
    } else {
      const res = await createGarapan(data);
      setIsSubmitting(false);
      if (res.success && res.data) {
        toast.success("Garapan ditambahkan");
        const newItem = res.data;
        setList((prev) => [newItem, ...prev]);
        setIsAddOpen(false);
        router.refresh();
      } else {
        setFormError(res.error || "Gagal menambahkan garapan.");
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem.id;
    const prevList = [...list];
    setList((prev) => prev.filter((g) => g.id !== targetId));
    setDeletingItem(null);

    const res = await deleteGarapan(targetId);
    if (res.success) {
      toast.success("Garapan dihapus");
      router.refresh();
    } else {
      setList(prevList);
      toast.error(res.error || "Gagal menghapus garapan.");
    }
  };

  return (
    <div key={pathname} className={`w-full transition-all duration-300 ${isExiting ? 'opacity-0 scale-[0.98] blur-[2px]' : 'animate-in fade-in slide-in-from-bottom-4 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}>
      {/* Header Card */}
      <Card className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 p-4 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
            <List className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-tight text-text-primary font-display leading-tight select-none">
              Daftar Garapan
            </h2>
            <p className="text-xs text-text-secondary font-sans mt-0.5">
              {list.length} bulan tercatat
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="gap-2 font-semibold text-xs px-4 h-10 rounded-xl"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Tambah Garapan</span>
        </Button>
      </Card>

      {/* List Grid */}
      {list.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Belum ada garapan"
          description="Tambahkan bulan dan tahun garapan pertama Anda untuk mulai mencatat akun aplikasi."
          actionLabel="Tambah Garapan Pertama"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {list.map((item) => {
            const monthAccent = MONTH_ACCENTS[(item.bulan - 1) % 12];
            const monthName = MONTH_NAMES[item.bulan - 1];

            const isGarapanCompleted =
              Boolean(item.aplikasi && item.aplikasi.length > 0) &&
              item.aplikasi!.every((app) => checkAppTargetCompleted(app));

            return (
              <Card
                key={item.id}
                onClick={() => handleNavigate(`/garapan/${item.id}`)}
                className="card-stagger group relative flex items-center gap-3.5 p-4 sm:p-5 pr-12 cursor-pointer hover:border-accent/40 transition-all duration-200 min-h-[80px]"
              >
                {/* Month color icon */}
                <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${monthAccent} text-accent flex items-center justify-center shrink-0 border border-accent/10 relative`}>
                  <Calendar className="h-5 w-5 group-hover:scale-110 transition-transform duration-300 ease-out" />
                </div>
                {/* Title & Year */}
                <div className="flex-1 min-w-0 flex flex-row items-center gap-2 font-display">
                  <h3 className="text-[17px] font-bold text-text-primary truncate leading-none">
                    {monthName}
                  </h3>
                  <span className="inline-flex items-center rounded-md bg-bg-page px-2 py-0.5 text-[11px] font-semibold text-text-secondary border border-border-soft shrink-0">
                    {item.tahun}
                  </span>
                  {isGarapanCompleted && (
                    <span className="inline-flex items-center justify-center h-5.5 w-5.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-500 shrink-0 select-none" title="Garapan Selesai">
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>

              {/* Dropdown Action Menu */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
        title={editingItem ? "Edit Garapan" : "Tambah Garapan"}
        description={
          editingItem
            ? "Ubah bulan dan tahun garapan kerja ini."
            : "Tambahkan bulan dan tahun baru untuk mengelompokkan pekerjaan."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Bulan</label>
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
            <label className="text-xs font-semibold text-text-secondary tracking-wide">Tahun</label>
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
        title="Hapus Garapan?"
        description="Menghapus garapan ini akan menghapus semua aplikasi, akun, dan kolom di dalamnya secara permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Hapus Permanen"
      />
    </div>
  );
}
