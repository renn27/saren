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
import { 
  MoreVertical, Edit2, Trash2, Calendar, Plus, 
  ChevronRight, CalendarDays 
} from "lucide-react";
import { toast } from "sonner";
import { createGarapan, updateGarapan, deleteGarapan } from "@/lib/actions/garapan";
import { triggerHaptic } from "@/lib/utils/haptics";

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

const MONTH_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGS", "SEP", "OKT", "NOV", "DES"
];

// Curated month accent palettes (harmonious across dark & light themes)
const MONTH_ACCENTS = [
  { gradient: "from-sky-500/15 via-sky-500/10 to-cyan-500/5", border: "border-sky-500/25", text: "text-sky-500" },
  { gradient: "from-rose-500/15 via-rose-500/10 to-pink-500/5", border: "border-rose-500/25", text: "text-rose-500" },
  { gradient: "from-emerald-500/15 via-emerald-500/10 to-teal-500/5", border: "border-emerald-500/25", text: "text-emerald-500" },
  { gradient: "from-violet-500/15 via-violet-500/10 to-purple-500/5", border: "border-violet-500/25", text: "text-violet-500" },
  { gradient: "from-amber-500/15 via-amber-500/10 to-orange-500/5", border: "border-amber-500/25", text: "text-amber-500" },
  { gradient: "from-blue-500/15 via-blue-500/10 to-indigo-500/5", border: "border-blue-500/25", text: "text-blue-500" },
  { gradient: "from-red-500/15 via-red-500/10 to-rose-500/5", border: "border-red-500/25", text: "text-red-500" },
  { gradient: "from-indigo-500/15 via-indigo-500/10 to-violet-500/5", border: "border-indigo-500/25", text: "text-indigo-500" },
  { gradient: "from-teal-500/15 via-teal-500/10 to-emerald-500/5", border: "border-teal-500/25", text: "text-teal-500" },
  { gradient: "from-orange-500/15 via-orange-500/10 to-amber-500/5", border: "border-orange-500/25", text: "text-orange-500" },
  { gradient: "from-blue-500/15 via-blue-500/10 to-sky-500/5", border: "border-blue-500/25", text: "text-blue-500" },
  { gradient: "from-purple-500/15 via-purple-500/10 to-fuchsia-500/5", border: "border-purple-500/25", text: "text-purple-500" },
];

export function GarapanListClient({ initialList }: GarapanListClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local optimistic state
  const [list, setList] = React.useState<GarapanItem[]>(initialList);

  React.useEffect(() => {
    setList(initialList);
  }, [initialList]);

  const handleNavigate = (url: string) => {
    router.push(url);
  };

  // Search / Filter Year state
  const [selectedYear, setSelectedYear] = React.useState<string>("Semua");

  const currentMonth = React.useMemo(() => new Date().getMonth() + 1, []);
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  // Extract unique year list from list sorted descending
  const uniqueYears = React.useMemo(() => {
    const set = new Set<number>();
    list.forEach((item) => set.add(item.tahun));
    return Array.from(set).sort((a, b) => b - a);
  }, [list]);

  // Count garapan items per year
  const yearCounts = React.useMemo(() => {
    const counts: Record<number, number> = {};
    list.forEach((item) => {
      counts[item.tahun] = (counts[item.tahun] || 0) + 1;
    });
    return counts;
  }, [list]);

  // Filtered list based on selected year
  const filteredList = React.useMemo(() => {
    if (selectedYear === "Semua") return list;
    return list.filter((item) => item.tahun === Number(selectedYear));
  }, [list, selectedYear]);



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
    <div className="w-full">
      {/* Header Card */}
      <Card className="relative flex flex-row items-center justify-between gap-3 mb-3.5 p-4 sm:p-5 overflow-hidden rounded-2xl border border-border-soft shadow-xs">
        {/* Subtle decorative accent glow */}
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/8 blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-br from-accent-soft via-accent-soft/40 to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/15 shadow-2xs">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight text-text-primary font-display leading-tight truncate select-none">
              Daftar Garapan
            </h2>
            <p className="text-[12px] text-text-secondary font-sans mt-0.5 truncate">
              {filteredList.length !== list.length
                ? `${filteredList.length} dari ${list.length} bulan tercatat`
                : `${list.length} bulan tercatat`}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="gap-1.5 font-semibold text-xs px-3.5 sm:px-4 h-9.5 rounded-xl shrink-0 shadow-xs active:scale-[0.97] transition-all whitespace-nowrap"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Tambah</span>
        </Button>
      </Card>

      {/* Filter Pills Tahun */}
      {uniqueYears.length > 0 && list.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3.5 no-scrollbar w-full select-none">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setSelectedYear("Semua");
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
              selectedYear === "Semua"
                ? "bg-accent text-white border-accent shadow-xs scale-[1.02]"
                : "bg-bg-surface text-text-secondary border-border-soft hover:border-accent/40"
            }`}
          >
            <span>Semua</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                selectedYear === "Semua"
                  ? "bg-white/20 text-white animate-badge-bump"
                  : "bg-bg-page text-text-secondary border border-border-soft/40"
              }`}
            >
              {list.length}
            </span>
          </button>

          {uniqueYears.map((yr) => (
            <button
              type="button"
              key={yr}
              onClick={() => {
                triggerHaptic("selection");
                setSelectedYear(String(yr));
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                selectedYear === String(yr)
                  ? "bg-accent text-white border-accent shadow-xs scale-[1.02]"
                  : "bg-bg-surface text-text-secondary border-border-soft hover:border-accent/40"
              }`}
            >
              <span>{yr}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                  selectedYear === String(yr)
                    ? "bg-white/20 text-white animate-badge-bump"
                    : "bg-bg-page text-text-secondary border border-border-soft/40"
                }`}
              >
                {yearCounts[yr]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* List Grid */}
      {list.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Belum ada garapan"
          description="Tambahkan bulan dan tahun garapan pertama Anda untuk mulai mencatat akun aplikasi."
          actionLabel="Tambah Garapan Pertama"
          onAction={() => setIsAddOpen(true)}
        />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={`Tidak ada garapan tahun ${selectedYear}`}
          description={`Belum ada garapan yang tercatat di tahun ${selectedYear}. Silakan ubah filter atau tambah garapan baru.`}
          actionLabel="Tampilkan Semua Garapan"
          onAction={() => setSelectedYear("Semua")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredList.map((item) => {
            const monthAccent = MONTH_ACCENTS[(item.bulan - 1) % 12];
            const monthName = MONTH_NAMES[item.bulan - 1];
            const monthShort = MONTH_SHORT[(item.bulan - 1) % 12];

            const isCurrentMonth = item.bulan === currentMonth && item.tahun === currentYear;
            const appCount = item.aplikasi?.length || 0;

            return (
              <Card
                key={`${item.id}-${selectedYear}`}
                onClick={() => handleNavigate(`/garapan/${item.id}`)}
                className={`card-stagger group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 min-h-[76px] active:scale-[0.985] hover:z-10 focus-within:z-20 border ${
                  isCurrentMonth
                    ? "bg-bg-surface border-accent/45 shadow-xs hover:border-accent/60 ring-1 ring-accent/15"
                    : "bg-bg-surface border-border-soft hover:border-accent/35 hover:shadow-2xs"
                }`}
              >
                {/* Main Content */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Month Calendar Tile */}
                  <div
                    className={`h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br ${monthAccent.gradient} border ${monthAccent.border} flex flex-col items-center justify-center shrink-0 shadow-2xs select-none transition-transform duration-300 group-hover:scale-105`}
                  >
                    <span className={`text-[9px] sm:text-[9.5px] font-extrabold tracking-wider uppercase leading-none ${monthAccent.text}`}>
                      {monthShort}
                    </span>
                    <span className="text-[15px] sm:text-[16px] font-extrabold font-display text-text-primary leading-tight mt-0.5">
                      {String(item.bulan).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Title & App count */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 font-display">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <h3 className="text-[16px] sm:text-[17px] font-bold text-text-primary truncate leading-snug">
                        {monthName}
                      </h3>
                      {isCurrentMonth && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-bold shrink-0 select-none animate-glowing-ring">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                          Bulan Ini
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] text-text-secondary font-sans font-medium">
                      {appCount > 0 ? `${appCount} aplikasi tercatat` : "Belum ada aplikasi"}
                    </p>
                  </div>
                </div>

                {/* Actions & Chevron */}
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  {/* Dropdown Action Menu */}
                  <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      trigger={
                        <button
                          type="button"
                          aria-label="Opsi garapan"
                          className="h-8.5 w-8.5 rounded-xl text-text-secondary hover:bg-accent-soft/80 hover:text-text-primary transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95"
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

                  {/* Chevron Indicator */}
                  <div className="h-8.5 w-5 flex items-center justify-center text-text-secondary/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200">
                    <ChevronRight className="h-4.5 w-4.5" />
                  </div>
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
