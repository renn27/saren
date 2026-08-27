"use client";

import { useState, useMemo } from "react";
import { Nomor } from "@prisma/client";
import { Plus, Trash2, Edit, Save, Hash, MoreVertical, Smartphone, Phone, Calendar, Copy, Check, ArrowUpDown, ArrowDown, ArrowUp, Coins, Clock, Calculator } from "lucide-react";
import { CalculatorPopover } from "@/components/ui/calculator-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { createNomor, updateNomor, deleteNomor } from "@/lib/actions/nomor";
import { triggerHaptic } from "@/lib/utils/haptics";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

interface NomorClientProps {
  initialData: Nomor[];
}

export function NomorClient({ initialData }: NomorClientProps) {
  const [data, setData] = useState<Nomor[]>(initialData);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [provider, setProvider] = useState("");
  const [nomorKartu, setNomorKartu] = useState("");
  const [masaAktif, setMasaAktif] = useState("");
  const [pulsa, setPulsa] = useState<number | string>("");

  // Edit State
  const [editingItem, setEditingItem] = useState<Nomor | null>(null);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<Nomor | null>(null);

  // View State
  const [viewingItem, setViewingItem] = useState<Nomor | null>(null);

  // Inline Date Edit State
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // Inline Pulsa Edit State
  const [editingPulsaId, setEditingPulsaId] = useState<string | null>(null);

  // Selected Cell State for 2-step Edit
  const [selectedNomorCell, setSelectedNomorCell] = useState<{ id: string; field: "pulsa" | "masaAktif" } | null>(null);

  // Micro-interaction states for Copy & Flash Save
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flashSavedId, setFlashSavedId] = useState<string | null>(null);

  // Floating Calculator Popover State
  const [calcState, setCalcState] = useState<{ isOpen: boolean; initialVal: number; item: Nomor | null }>({
    isOpen: false,
    initialVal: 0,
    item: null,
  });

  // Sort State
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Active Filter state
  const [activeFilter, setActiveFilter] = useState<"all" | "warning" | "expired">("all");

  // Helper for timezone-safe date-only comparison
  const normalizeDateOnly = (d: Date | string): number => {
    const date = new Date(d);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const { expiredCount, warningCount, filteredData, totalPulsa } = useMemo(() => {
    const nowUTC = normalizeDateOnly(new Date());

    let expired = 0;
    let warning = 0;

    data.forEach((item) => {
      const masaUTC = normalizeDateOnly(item.masaAktif);
      const diffDays = Math.round((masaUTC - nowUTC) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;
      } else if (diffDays <= 30) {
        warning++;
      }
    });

    const sorted = [...data].sort((a, b) => {
      const dateA = normalizeDateOnly(a.masaAktif);
      const dateB = normalizeDateOnly(b.masaAktif);
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    const filtered = sorted.filter((item) => {
      const masaUTC = normalizeDateOnly(item.masaAktif);
      const diffDays = Math.round((masaUTC - nowUTC) / (1000 * 60 * 60 * 24));

      if (activeFilter === "expired") return diffDays < 0;
      if (activeFilter === "warning") return diffDays >= 0 && diffDays <= 30;
      return true;
    });

    const pulsaSum = filtered.reduce((sum, item) => sum + (item.pulsa || 0), 0);

    return {
      expiredCount: expired,
      warningCount: warning,
      filteredData: filtered,
      totalPulsa: pulsaSum,
    };
  }, [data, sortOrder, activeFilter]);

  const getRowHighlight = (masaAktifDate: Date | string) => {
    const nowUTC = normalizeDateOnly(new Date());
    const masaUTC = normalizeDateOnly(masaAktifDate);
    const diffDays = Math.round((masaUTC - nowUTC) / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      // Lebih dari setahun -> Hijau Lembut
      return {
        row: "bg-target-bg hover:bg-target-hover",
        sticky: "bg-target-bg group-hover:bg-target-hover text-target-text"
      };
    } else if (diffDays < -30) {
      // Hangus lewat 30 hari -> Merah Lembut
      return {
        row: "bg-danger-bg hover:bg-danger-hover",
        sticky: "bg-danger-bg group-hover:bg-danger-hover text-danger-text"
      };
    } else if (diffDays < 0 && diffDays >= -30) {
      // Masa tenggang (lewat masa aktif tapi <= 30 hari) -> Kuning Lembut
      return {
        row: "bg-warning-bg hover:bg-warning-hover",
        sticky: "bg-warning-bg group-hover:bg-warning-hover text-warning-text"
      };
    }
    
    // Default
    return {
      row: "hover:bg-accent-soft/30",
      sticky: "bg-bg-surface group-hover:bg-accent-soft/30 text-text-primary"
    };
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const resetForm = () => {
    setProvider("");
    setNomorKartu("");
    setMasaAktif("");
    setPulsa("");
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: Nomor) => {
    setProvider(item.provider);
    setNomorKartu(item.nomorKartu);
    setPulsa(item.pulsa ?? 0);
    // Format date to YYYY-MM-DD for input type="date"
    const dateObj = new Date(item.masaAktif);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    setMasaAktif(`${yyyy}-${mm}-${dd}`);
    setEditingItem(item);
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !nomorKartu || !masaAktif) return;

    setIsSubmitting(true);
    const dateObj = new Date(masaAktif);
    const parsedPulsa = pulsa ? parseInt(String(pulsa).replace(/\D/g, "")) || 0 : 0;

    if (editingItem) {
      const res = await updateNomor(editingItem.id, {
        provider,
        nomorKartu,
        masaAktif: dateObj,
        pulsa: parsedPulsa,
      });

      if (res.success && res.data) {
        toast.success("Nomor berhasil diperbarui");
        setData((prev) =>
          prev.map((item) => (item.id === editingItem.id ? res.data! : item))
        );
        setIsAddOpen(false);
        resetForm();
      } else {
        toast.error(res.error || "Terjadi kesalahan");
      }
    } else {
      const res = await createNomor({
        provider,
        nomorKartu,
        masaAktif: dateObj,
        pulsa: parsedPulsa,
      });

      if (res.success && res.data) {
        toast.success("Nomor berhasil ditambahkan");
        setData((prev) => [res.data!, ...prev]);
        setIsAddOpen(false);
        resetForm();
      } else {
        toast.error(res.error || "Terjadi kesalahan");
      }
    }
    setIsSubmitting(false);
  };

  const handleSaveInlineDate = async (item: Nomor, newDateVal: string) => {
    setEditingDateId(null);
    if (!newDateVal) return;
    
    const dateObj = new Date(newDateVal);
    if (isNaN(dateObj.getTime())) return;

    const currentFormatted = formatDateInput(item.masaAktif);
    if (newDateVal === currentFormatted) return;

    const toastId = toast.loading("Memperbarui tanggal...");

    const res = await updateNomor(item.id, {
      provider: item.provider,
      nomorKartu: item.nomorKartu,
      masaAktif: dateObj,
      pulsa: item.pulsa,
    });

    if (res.success && res.data) {
      toast.success("Masa aktif berhasil diperbarui", { id: toastId });
      setFlashSavedId(item.id);
      setTimeout(() => setFlashSavedId(null), 800);
      setData((prev) =>
        prev.map((n) => (n.id === item.id ? res.data! : n))
      );
    } else {
      toast.error(res.error || "Gagal memperbarui masa aktif", { id: toastId });
    }
  };

  const handleSaveInlinePulsa = async (item: Nomor, newPulsaVal: string) => {
    setEditingPulsaId(null);
    const numericVal = newPulsaVal ? parseInt(newPulsaVal.replace(/\D/g, "")) || 0 : 0;
    
    if (numericVal === item.pulsa) return;

    const toastId = toast.loading("Memperbarui pulsa...");

    const res = await updateNomor(item.id, {
      provider: item.provider,
      nomorKartu: item.nomorKartu,
      masaAktif: new Date(item.masaAktif),
      pulsa: numericVal,
    });

    if (res.success && res.data) {
      toast.success("Pulsa berhasil diperbarui", { id: toastId });
      setFlashSavedId(item.id);
      setTimeout(() => setFlashSavedId(null), 800);
      setData((prev) =>
        prev.map((n) => (n.id === item.id ? res.data! : n))
      );
    } else {
      toast.error(res.error || "Gagal memperbarui pulsa", { id: toastId });
    }
  };

  const formatDateInput = (dateString: Date) => {
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);

    const res = await deleteNomor(deletingItem.id);
    if (res.success) {
      toast.success("Nomor berhasil dihapus");
      setData((prev) => prev.filter((item) => item.id !== deletingItem.id));
    } else {
      toast.error(res.error || "Gagal menghapus nomor");
    }

    setDeletingItem(null);
    setIsSubmitting(false);
  };

  const formatDateDisplay = (dateString: Date) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTimeDisplay = (dateString: Date) => {
    const d = new Date(dateString);
    const dateFormatted = d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  const formatTimeAgo = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffInSeconds < 0 || diffInSeconds < 5) return "Baru saja";
    if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari lalu`;

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInDays < 30) return `${diffInWeeks} minggu lalu`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${Math.max(1, diffInMonths)} bulan lalu`;

    const diffInYears = Math.floor(diffInDays / 365);
    return `${Math.max(1, diffInYears)} tahun lalu`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-4 relative">
      {/* Header section matching Garapan page */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
            <Hash className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-bold text-text-primary mb-0.5 sm:mb-1 tracking-tight">
              Daftar Nomor
            </h1>
            <p className="text-[12px] sm:text-sm text-text-secondary leading-snug">
              Kelola dan pantau masa aktif kartu provider Anda
            </p>
          </div>
        </div>

        {data.length > 0 && (
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 w-full sm:w-auto justify-center shrink-0">
            <Plus className="h-4 w-4" />
            <span>Tambah Nomor</span>
          </Button>
        )}
      </Card>

      {data.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Belum ada data nomor"
          description="Tambahkan nomor pertama Anda untuk mulai memantau masa aktif kartu."
          actionLabel="Tambah Nomor"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none w-full">
            <button
              onClick={() => setActiveFilter("all")}
              className={twMerge(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0",
                activeFilter === "all"
                  ? "bg-accent border-accent text-white shadow-sm"
                  : "bg-bg-surface border-border-soft text-text-secondary hover:text-text-primary"
              )}
            >
              Semua ({data.length})
            </button>
            
            <button
              onClick={() => setActiveFilter("warning")}
              className={twMerge(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0 flex items-center gap-1.5",
                activeFilter === "warning"
                  ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                  : "bg-bg-surface border-border-soft text-text-secondary hover:text-text-primary"
              )}
            >
              <span>Akan Habis</span>
              <span className={twMerge(
                "text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
                activeFilter === "warning" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
              )}>
                {warningCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter("expired")}
              className={twMerge(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0 flex items-center gap-1.5",
                activeFilter === "expired"
                  ? "bg-danger border-danger text-white shadow-sm"
                  : "bg-bg-surface border-border-soft text-text-secondary hover:text-text-primary"
              )}
            >
              <span>Lewat Aktif (Tenggang)</span>
              <span className={twMerge(
                "text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
                activeFilter === "expired" ? "bg-white/20 text-white" : "bg-danger-soft text-danger"
              )}>
                {expiredCount}
              </span>
            </button>
          </div>

          {filteredData.length === 0 ? (
            <Card className="py-12 bg-bg-surface border border-border-soft rounded-3xl text-center p-8 shadow-sm">
              <p className="text-text-secondary text-sm font-sans">
                Tidak ada data nomor dengan status ini.
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden border border-border-soft/60">
              <TableContainer className="border-none shadow-none rounded-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-bg-surface z-20 border-r border-border-soft w-0 whitespace-nowrap px-4">
                        Kartu
                      </TableHead>
                      <TableHead className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4">Nomor</TableHead>
                      <TableHead className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4">Pulsa</TableHead>
                      <TableHead 
                        className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4 cursor-pointer hover:bg-accent-soft/30 transition-colors select-none group"
                        onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                        title="Urutkan berdasarkan Masa Aktif"
                      >
                        <div className="flex items-center gap-2">
                          Masa Aktif
                          {sortOrder === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-accent" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-accent" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4">
                        Terakhir Diedit
                      </TableHead>
                      <TableHead className="w-14 px-1 text-center whitespace-nowrap">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => {
                      const highlight = getRowHighlight(item.masaAktif);
                      return (
                        <TableRow 
                          key={item.id}
                          className={`cursor-pointer group transition-colors ${highlight.row}`}
                          onClick={() => setViewingItem(item)}
                        >
                          <TableCell className={`font-medium sticky left-0 z-10 border-r border-border-soft whitespace-nowrap px-4 transition-colors ${highlight.sticky}`}>
                            {item.provider}
                          </TableCell>
                          <TableCell 
                            className="text-text-primary border-r border-border-soft/50 whitespace-nowrap px-4 cursor-copy hover:bg-accent-soft/30 hover:text-accent transition-colors font-mono select-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("success");
                              navigator.clipboard.writeText(item.nomorKartu);
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 1500);
                              toast.success(`${item.provider} berhasil disalin!`, {
                                icon: "📋",
                                duration: 2000,
                              });
                            }}
                            title="Klik untuk menyalin nomor"
                          >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span>{item.nomorKartu}</span>
                              {copiedId === item.id && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md animate-check-pop shrink-0 select-none">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                  <span>Tersalin</span>
                                </span>
                              )}
                            </div>
                          </TableCell>
                          {/* Pulsa Cell */}
                          {(() => {
                            const isPulsaSelected = selectedNomorCell?.id === item.id && selectedNomorCell?.field === "pulsa";
                            const isFlashSaved = flashSavedId === item.id;
                            return (
                              <TableCell 
                                className={`p-1 border-r border-border-soft/50 whitespace-nowrap cursor-pointer select-none font-mono font-medium min-w-[110px] transition-colors duration-300 ${isFlashSaved ? "bg-emerald-500/20" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPulsaSelected) {
                                    setEditingPulsaId(item.id);
                                  } else {
                                    setSelectedNomorCell({ id: item.id, field: "pulsa" });
                                  }
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNomorCell({ id: item.id, field: "pulsa" });
                                  setEditingPulsaId(item.id);
                                }}
                                title={isPulsaSelected ? "Klik lagi atau Double-click untuk mengedit" : "Klik 1x untuk memilih sel"}
                              >
                                {editingPulsaId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      defaultValue={item.pulsa || ""}
                                      autoFocus
                                      className="h-8 px-2 text-xs bg-bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono w-full max-w-[120px]"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveInlinePulsa(item, (e.target as HTMLInputElement).value);
                                        } else if (e.key === "Escape") {
                                          setEditingPulsaId(null);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        handleSaveInlinePulsa(item, e.target.value);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-full h-8 px-2 text-xs font-mono flex items-center justify-between transition-all rounded-lg ${
                                      isPulsaSelected
                                        ? "bg-bg-surface border border-accent text-accent font-semibold shadow-2xs"
                                        : "hover:bg-accent-soft/30 text-text-primary"
                                    }`}
                                  >
                                    <span>{item.pulsa && item.pulsa > 0 ? formatRupiah(item.pulsa) : "-"}</span>
                                    {isPulsaSelected && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCalcState({
                                            isOpen: true,
                                            initialVal: item.pulsa || 0,
                                            item,
                                          });
                                        }}
                                        className="p-1 rounded-md bg-accent-soft text-accent hover:bg-accent hover:text-white transition-all cursor-pointer shrink-0 ml-1"
                                        title="Buka Kalkulator Melayang"
                                      >
                                        <Calculator className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                            );
                          })()}

                          {/* Masa Aktif Cell */}
                          {(() => {
                            const isDateSelected = selectedNomorCell?.id === item.id && selectedNomorCell?.field === "masaAktif";
                            return (
                              <TableCell 
                                className="p-1 border-r border-border-soft/50 whitespace-nowrap cursor-pointer select-none font-sans min-w-[140px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isDateSelected) {
                                    setEditingDateId(item.id);
                                  } else {
                                    setSelectedNomorCell({ id: item.id, field: "masaAktif" });
                                  }
                                }}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNomorCell({ id: item.id, field: "masaAktif" });
                                  setEditingDateId(item.id);
                                }}
                                title={isDateSelected ? "Klik lagi atau Double-click untuk mengedit" : "Klik 1x untuk memilih sel"}
                              >
                                {editingDateId === item.id ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="date"
                                      defaultValue={formatDateInput(item.masaAktif)}
                                      autoFocus
                                      className="h-8 px-2 text-xs bg-bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-sans w-full max-w-[140px]"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveInlineDate(item, (e.target as HTMLInputElement).value);
                                        } else if (e.key === "Escape") {
                                          setEditingDateId(null);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        handleSaveInlineDate(item, e.target.value);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className={`w-full h-8 px-2 text-xs font-sans flex items-center gap-2 transition-all rounded-lg ${
                                      isDateSelected
                                        ? "bg-bg-surface border border-accent text-accent font-semibold shadow-2xs"
                                        : "hover:bg-accent-soft/30 text-text-primary"
                                    }`}
                                  >
                                    <span>{formatDateDisplay(item.masaAktif)}</span>
                                    {(() => {
                                      const now = new Date();
                                      now.setHours(0, 0, 0, 0);
                                      const masa = new Date(item.masaAktif);
                                      masa.setHours(0, 0, 0, 0);
                                      const diffTime = now.getTime() - masa.getTime();
                                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      if (masa < now && diffDays <= 30 && diffDays >= 0) {
                                        const daysLeft = 30 - diffDays;
                                        const isCritical = daysLeft <= 5;
                                        return (
                                          <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded-full select-none ${
                                            isCritical
                                              ? "bg-danger-soft text-danger border border-danger/30 animate-breathing-glow font-black"
                                              : "bg-warning-hover text-warning-text"
                                          }`}>
                                            -{daysLeft}
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                )}
                              </TableCell>
                            );
                          })()}
                          <TableCell 
                            className="border-r border-border-soft/50 whitespace-nowrap px-4 text-xs text-text-secondary font-sans py-3"
                            title={`Diedit pada: ${formatDateTimeDisplay(item.updatedAt)}`}
                          >
                            {formatTimeAgo(item.updatedAt)}
                          </TableCell>
                          <TableCell className="text-center py-1 px-1 w-14" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center">
                              <DropdownMenu
                                className="w-32"
                                align="right"
                                trigger={
                                  <button
                                    className="h-8 w-8 rounded-lg text-text-secondary hover:bg-accent-soft hover:text-accent flex items-center justify-center transition-colors cursor-pointer"
                                    title="Opsi"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                }
                              >
                                <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                  <Edit className="h-4 w-4 text-text-secondary" />
                                  <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeletingItem(item)}
                                  className="text-danger hover:bg-danger-soft"
                                >
                                  <Trash2 className="h-4 w-4 text-danger" />
                                  <span>Hapus</span>
                                </DropdownMenuItem>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Total Accumulated Pulsa Row */}
                    <TableRow className="bg-bg-surface/90 hover:bg-bg-surface/90 font-bold border-t border-border-soft select-none pointer-events-none">
                      <TableCell className="sticky left-0 bg-bg-surface z-10 border-r border-border-soft text-accent font-bold uppercase tracking-[0.07em] whitespace-nowrap px-4">
                        TOTAL
                      </TableCell>
                      <TableCell className="border-r border-border-soft/50 whitespace-nowrap px-4 text-text-secondary font-medium font-sans">
                        {filteredData.length} Kartu
                      </TableCell>
                      <TableCell className="text-accent border-r border-border-soft/50 whitespace-nowrap px-4 font-mono font-bold">
                        {totalPulsa > 0 ? formatRupiah(totalPulsa) : "-"}
                      </TableCell>
                      <TableCell className="border-r border-border-soft/50 whitespace-nowrap px-4" />
                      <TableCell className="border-r border-border-soft/50 whitespace-nowrap px-4" />
                      <TableCell className="w-14 px-1" />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </div>
      )}

      {/* Dialog Form */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        title={editingItem ? "Edit Nomor" : "Tambah Nomor"}
        description={
          editingItem
            ? "Ubah detail nomor dan masa aktif kartu."
            : "Masukkan detail nomor kartu baru untuk dicatat."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Kartu / Provider</label>
            <Input
              type="text"
              placeholder="Contoh: Telkomsel, By.U, Tri, dll"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Nomor Telepon</label>
            <Input
              type="text"
              inputMode="tel"
              placeholder="Contoh: 081234567890"
              value={nomorKartu}
              onChange={(e) => setNomorKartu(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Masa Aktif</label>
            <Input
              type="date"
              value={masaAktif}
              onChange={(e) => setMasaAktif(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Pulsa</label>
            <Input
              type="text"
              placeholder="Contoh: 50000"
              value={pulsa}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setPulsa(val);
              }}
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                "Menyimpan..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* AlertDialog Delete */}
      <AlertDialog
        isOpen={deletingItem !== null}
        onClose={() => setDeletingItem(null)}
        title="Hapus Nomor"
        description={`Apakah Anda yakin ingin menghapus nomor ${deletingItem?.nomorKartu} (${deletingItem?.provider})? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Nomor"
        cancelText="Batal"
        onConfirm={handleDelete}
        isDanger={true}
      />

      {/* Dialog View */}
      <Dialog
        isOpen={viewingItem !== null}
        onClose={() => setViewingItem(null)}
        title="Detail Nomor"
        description="Informasi lengkap mengenai kartu dan masa aktifnya."
      >
        {viewingItem && (
          <div className="flex flex-col mt-1">
            <div className="flex flex-col">
              {/* Kartu / Provider */}
              <div className="flex items-center gap-3.5 py-3.5 border-b border-border-soft">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Kartu / Provider</span>
                  <span className="text-[15px] font-bold text-text-primary">{viewingItem.provider}</span>
                </div>
              </div>

              {/* Nomor Telepon */}
              <div className="flex items-center justify-between py-3.5 border-b border-border-soft">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Nomor Telepon</span>
                    <span className="text-[16px] font-bold font-mono text-text-primary">{viewingItem.nomorKartu}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewingItem.nomorKartu);
                    toast.success("Nomor disalin!");
                  }}
                  className="p-2.5 rounded-2xl border border-border-soft text-text-secondary hover:text-accent hover:bg-accent-soft hover:border-accent/30 transition-all shadow-sm shrink-0"
                  title="Salin Nomor"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              {/* Pulsa */}
              <div className="flex items-center justify-between py-3.5 border-b border-border-soft">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Pulsa</span>
                    <span className="text-[16px] font-bold font-mono text-text-primary">{formatRupiah(viewingItem.pulsa)}</span>
                  </div>
                </div>
              </div>

              {/* Masa Aktif */}
              <div className="flex items-center gap-3.5 py-3.5 border-b border-border-soft">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Masa Aktif</span>
                  <span className="text-[15px] font-bold text-text-primary">
                    {formatDateDisplay(viewingItem.masaAktif)}
                  </span>
                </div>
              </div>

              {/* Update Terakhir */}
              <div className="flex items-center gap-3.5 py-3.5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center border border-accent/10 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Update Terakhir</span>
                  <span className="text-[14px] font-semibold text-text-primary">
                    {formatDateTimeDisplay(viewingItem.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setViewingItem(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Floating Calculator Popover for SIM Pulsa */}
      <CalculatorPopover
        isOpen={Boolean(calcState.isOpen && calcState.item)}
        title={calcState.item ? `Kalkulator Pulsa (${calcState.item.provider})` : "Kalkulator Pulsa"}
        initialValue={calcState.initialVal}
        onClose={() => setCalcState((prev) => ({ ...prev, isOpen: false }))}
        onApply={(val) => {
          if (calcState.item) {
            handleSaveInlinePulsa(calcState.item, String(val));
          }
        }}
      />
    </div>
  );
}
