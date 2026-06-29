"use client";

import { useState } from "react";
import { Nomor } from "@prisma/client";
import { Plus, Trash2, Edit, Save, Hash, MoreVertical, Smartphone, Phone, Calendar, Copy } from "lucide-react";
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

  // Edit State
  const [editingItem, setEditingItem] = useState<Nomor | null>(null);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<Nomor | null>(null);

  // View State
  const [viewingItem, setViewingItem] = useState<Nomor | null>(null);

  const resetForm = () => {
    setProvider("");
    setNomorKartu("");
    setMasaAktif("");
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: Nomor) => {
    setProvider(item.provider);
    setNomorKartu(item.nomorKartu);
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

    if (editingItem) {
      const res = await updateNomor(editingItem.id, {
        provider,
        nomorKartu,
        masaAktif: dateObj,
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

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 flex flex-col gap-6 relative">
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
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-bg-page/95 backdrop-blur z-20 border-r border-border-soft w-0 whitespace-nowrap px-4">
                  Kartu
                </TableHead>
                <TableHead className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4">Nomor</TableHead>
                <TableHead className="border-r border-border-soft/50 w-0 whitespace-nowrap px-4">Masa Aktif</TableHead>
                <TableHead className="w-14 px-1 text-center whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow 
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => setViewingItem(item)}
                >
                  <TableCell className="font-medium text-text-primary sticky left-0 bg-bg-surface z-10 border-r border-border-soft whitespace-nowrap px-4">
                    {item.provider}
                  </TableCell>
                  <TableCell className="text-text-primary border-r border-border-soft/50 whitespace-nowrap px-4">
                    {item.nomorKartu}
                  </TableCell>
                  <TableCell className="text-text-primary border-r border-border-soft/50 whitespace-nowrap px-4">
                    {formatDateDisplay(item.masaAktif)}
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
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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

              {/* Masa Aktif */}
              <div className="flex items-center gap-3.5 py-3.5">
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
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={() => setViewingItem(null)}>Tutup</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
