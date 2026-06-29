"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ChevronLeft,
  Plus,
  Download,
  Trash2,
  Edit,
  X,
  Check,
  HelpCircle,
  Hash,
  Coins,
  FileText,
  ToggleLeft,
  Eye,
  ArrowUpDown,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createKolom, deleteKolom, swapKolomUrutan, updateKolom, clearKolomData } from "@/lib/actions/kolom";
import { createAkun, updateAkun, deleteAkun, getAllAccountsForAutofill, swapAkunUrutan } from "@/lib/actions/akun";
import { updateAplikasi } from "@/lib/actions/aplikasi";
import { TipeKolom } from "@prisma/client";

interface Garapan {
  id: string;
  bulan: number;
  tahun: number;
}

interface KolomItem {
  id: string;
  namaKolom: string;
  tipeKolom: TipeKolom;
  urutan: number;
  isTarget: boolean;
  nilaiTarget: string | null;
}

interface AkunItem {
  id: string;
  nama: string;
  device: string | null;
  nomorHp: string | null;
  customValues: any; // Json { [kolomId]: val }
}

interface AplikasiItem {
  id: string;
  namaAplikasi: string;
  logoUrl: string | null;
  deskripsi: string | null;
  kolom: KolomItem[];
  akun: AkunItem[];
}

interface AplikasiDetailClientProps {
  garapan: Garapan;
  aplikasi: AplikasiItem;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export function AplikasiDetailClient({ garapan, aplikasi }: AplikasiDetailClientProps) {
  const router = useRouter();

  const [isReorderMode, setIsReorderMode] = React.useState(false);

  // Modals state
  const [isAddColumnOpen, setIsAddColumnOpen] = React.useState(false);
  const [editingColumn, setEditingColumn] = React.useState<KolomItem | null>(null);
  const [deletingColumn, setDeletingColumn] = React.useState<KolomItem | null>(null);
  const [clearingColumn, setClearingColumn] = React.useState<KolomItem | null>(null);

  const [isAddAccountOpen, setIsAddAccountOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<AkunItem | null>(null);
  const [deletingAccount, setDeletingAccount] = React.useState<AkunItem | null>(null);
  const [selectedDetailAccount, setSelectedDetailAccount] = React.useState<AkunItem | null>(null);
  const [editingCell, setEditingCell] = React.useState<{ accountId: string; columnId: "nama" | string } | null>(null);

  // Column form states
  const [namaKolom, setNamaKolom] = React.useState("");
  const [tipeKolom, setTipeKolom] = React.useState<TipeKolom>("TEKS");
  const [isTarget, setIsTarget] = React.useState(false);
  const [nilaiTarget, setNilaiTarget] = React.useState("");
  const [columnError, setColumnError] = React.useState<string | null>(null);
  const [isColumnSubmitting, setIsColumnSubmitting] = React.useState(false);

  // Account form states
  const [namaAkun, setNamaAkun] = React.useState("");
  const [deviceAkun, setDeviceAkun] = React.useState("");
  const [noHpAkun, setNoHpAkun] = React.useState("");
  const [customValues, setCustomValues] = React.useState<Record<string, any>>({});
  const [accountError, setAccountError] = React.useState<string | null>(null);
  const [isAccountSubmitting, setIsAccountSubmitting] = React.useState(false);

  // Autofill states
  const [allExistingAccounts, setAllExistingAccounts] = React.useState<any[]>([]);
  const [selectedAutofillId, setSelectedAutofillId] = React.useState("");

  // Edit Application states
  const [isEditAppOpen, setIsEditAppOpen] = React.useState(false);
  const [namaAplikasiState, setNamaAplikasiState] = React.useState(aplikasi.namaAplikasi);
  const [deskripsiState, setDeskripsiState] = React.useState(aplikasi.deskripsi || "");
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(aplikasi.logoUrl);
  const [clearLogo, setClearLogo] = React.useState(false);
  const [appError, setAppError] = React.useState<string | null>(null);
  const [isAppSubmitting, setIsAppSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditAppOpen) {
      setNamaAplikasiState(aplikasi.namaAplikasi);
      setDeskripsiState(aplikasi.deskripsi || "");
      setLogoFile(null);
      setLogoPreview(aplikasi.logoUrl);
      setClearLogo(false);
      setAppError(null);
    }
  }, [isEditAppOpen, aplikasi]);

  const existingAccountsWithLabels = React.useMemo(() => {
    // Find duplicate names
    const nameCounts: Record<string, number> = {};
    allExistingAccounts.forEach((acc) => {
      const name = acc.nama.toLowerCase().trim();
      nameCounts[name] = (nameCounts[name] || 0) + 1;
    });

    return allExistingAccounts.map((acc) => {
      const nameLower = acc.nama.toLowerCase().trim();
      const hasDuplicate = nameCounts[nameLower] > 1;
      return {
        ...acc,
        displayName: hasDuplicate
          ? `${acc.nama} (${acc.aplikasi.namaAplikasi})`
          : acc.nama,
      };
    });
  }, [allExistingAccounts]);

  // Reset forms
  React.useEffect(() => {
    if (isAddColumnOpen) {
      setNamaKolom("");
      setTipeKolom("TEKS");
      setIsTarget(false);
      setNilaiTarget("");
      setColumnError(null);
    }
  }, [isAddColumnOpen]);

  React.useEffect(() => {
    if (editingColumn) {
      setNamaKolom(editingColumn.namaKolom);
      setTipeKolom(editingColumn.tipeKolom);
      setIsTarget(editingColumn.isTarget);
      setNilaiTarget(editingColumn.nilaiTarget || "");
      setColumnError(null);
    }
  }, [editingColumn]);

  React.useEffect(() => {
    if (isAddAccountOpen) {
      setNamaAkun("");
      setDeviceAkun("");
      setNoHpAkun("");
      setSelectedAutofillId("");

      const fetchAccounts = async () => {
        const res = await getAllAccountsForAutofill();
        if (res.success && res.data) {
          setAllExistingAccounts(res.data);
        }
      };
      fetchAccounts();

      // Reset custom fields to default values (false for CENTANG, empty string for others)
      const defaultVals: Record<string, any> = {};
      aplikasi.kolom.forEach((col) => {
        defaultVals[col.id] = col.tipeKolom === "CENTANG" ? false : "";
      });
      setCustomValues(defaultVals);
      setAccountError(null);
    }
  }, [isAddAccountOpen, aplikasi.kolom]);

  React.useEffect(() => {
    if (editingAccount) {
      setNamaAkun(editingAccount.nama);
      setDeviceAkun(editingAccount.device || "");
      setNoHpAkun(editingAccount.nomorHp || "");

      const currentVals: Record<string, any> = {};
      aplikasi.kolom.forEach((col) => {
        const val = editingAccount.customValues[col.id];
        currentVals[col.id] = val !== undefined && val !== null ? val : (col.tipeKolom === "CENTANG" ? false : "");
      });
      setCustomValues(currentVals);
      setAccountError(null);
    }
  }, [editingAccount, aplikasi.kolom]);

  // Since search query is removed, filteredAkun is simply the list of accounts
  const filteredAkun = aplikasi.akun;

  const checkAkunMeetsTarget = React.useCallback((acc: AkunItem) => {
    const targetCols = aplikasi.kolom.filter((c) => c.isTarget && c.nilaiTarget !== null && c.nilaiTarget !== "");
    if (targetCols.length === 0) return false;

    return targetCols.some((col) => {
      const val = acc.customValues[col.id];
      if (val === undefined || val === null || val === "") return false;

      if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
        return Number(val) >= Number(col.nilaiTarget);
      } else if (col.tipeKolom === "CENTANG") {
        const expected = col.nilaiTarget === "true";
        return Boolean(val) === expected;
      } else {
        return String(val).trim().toLowerCase() === String(col.nilaiTarget).trim().toLowerCase();
      }
    });
  }, [aplikasi.kolom]);

  // Column CRUD
  const handleColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKolom.trim()) {
      setColumnError("Nama kolom wajib diisi.");
      return;
    }

    setIsColumnSubmitting(true);
    setColumnError(null);

    const data = {
      aplikasiId: aplikasi.id,
      namaKolom: namaKolom.trim(),
      tipeKolom,
      isTarget,
      nilaiTarget: isTarget ? nilaiTarget.trim() : null,
    };

    if (editingColumn) {
      const res = await updateKolom(editingColumn.id, garapan.id, data);
      setIsColumnSubmitting(false);
      if (res.success) {
        toast.success("Kolom diperbarui");
        setEditingColumn(null);
        router.refresh();
      } else {
        setColumnError(res.error || "Gagal memperbarui kolom.");
      }
    } else {
      const res = await createKolom(garapan.id, data);
      setIsColumnSubmitting(false);
      if (res.success) {
        toast.success("Kolom ditambahkan");
        setIsAddColumnOpen(false);
        router.refresh();
      } else {
        setColumnError(res.error || "Gagal menambahkan kolom.");
      }
    }
  };

  const handleDeleteColumn = async () => {
    if (!deletingColumn) return;
    const res = await deleteKolom(deletingColumn.id, garapan.id, aplikasi.id);
    if (res.success) {
      toast.success("Kolom dihapus");
      setDeletingColumn(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal menghapus kolom.");
    }
  };

  const handleClearColumn = async () => {
    if (!clearingColumn) return;
    const res = await clearKolomData(clearingColumn.id, garapan.id, aplikasi.id);
    if (res.success) {
      toast.success(`Data kolom "${clearingColumn.namaKolom}" berhasil dikosongkan`);
      setClearingColumn(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal mengosongkan kolom.");
    }
  };

  // Account CRUD
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaAkun.trim()) {
      setAccountError("Nama akun wajib diisi.");
      return;
    }

    setIsAccountSubmitting(true);
    setAccountError(null);

    // Clean custom values before sending
    const cleanedCustomValues: Record<string, any> = {};
    aplikasi.kolom.forEach((col) => {
      const val = customValues[col.id];
      if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
        if (val !== "" && val !== undefined && val !== null) {
          cleanedCustomValues[col.id] = Number(val);
        } else {
          cleanedCustomValues[col.id] = null;
        }
      } else if (col.tipeKolom === "CENTANG") {
        cleanedCustomValues[col.id] = Boolean(val);
      } else {
        cleanedCustomValues[col.id] = val !== "" && val !== undefined && val !== null ? String(val) : null;
      }
    });

    const data = {
      aplikasiId: aplikasi.id,
      nama: namaAkun.trim(),
      device: deviceAkun.trim() || null,
      nomorHp: noHpAkun.trim() || null,
      customValues: cleanedCustomValues,
    };

    if (editingAccount) {
      const res = await updateAkun(editingAccount.id, garapan.id, data);
      setIsAccountSubmitting(false);
      if (res.success) {
        toast.success("Akun diperbarui");
        setEditingAccount(null);
        router.refresh();
      } else {
        setAccountError(res.error || "Gagal memperbarui akun.");
      }
    } else {
      const res = await createAkun(garapan.id, data);
      setIsAccountSubmitting(false);
      if (res.success) {
        toast.success("Akun ditambahkan");
        setIsAddAccountOpen(false);
        router.refresh();
      } else {
        setAccountError(res.error || "Gagal menambahkan akun.");
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    const res = await deleteAkun(deletingAccount.id, garapan.id, aplikasi.id);
    if (res.success) {
      toast.success("Akun dihapus");
      setDeletingAccount(null);
      router.refresh();
    } else {
      toast.error(res.error || "Gagal menghapus akun.");
    }
  };

  const handleSwapAkun = async (idx1: number, idx2: number) => {
    const acc1 = filteredAkun[idx1];
    const acc2 = filteredAkun[idx2];
    if (!acc1 || !acc2) return;

    const res = await swapAkunUrutan(garapan.id, aplikasi.id, acc1.id, acc2.id);
    if (res.success) {
      toast.success("Urutan akun diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      toast.error(res.error || "Gagal memindahkan akun.");
    }
  };

  const handleSwapKolom = async (idx1: number, idx2: number) => {
    const col1 = aplikasi.kolom[idx1];
    const col2 = aplikasi.kolom[idx2];
    if (!col1 || !col2) return;

    const res = await swapKolomUrutan(garapan.id, aplikasi.id, col1.id, col2.id);
    if (res.success) {
      toast.success("Urutan kolom diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      toast.error(res.error || "Gagal memindahkan kolom.");
    }
  };

  const handleInlineSave = async (
    accountId: string,
    columnId: "nama" | string,
    newValue: any
  ) => {
    const acc = aplikasi.akun.find((a) => a.id === accountId);
    if (!acc) return;

    let data;
    if (columnId === "nama") {
      data = {
        aplikasiId: aplikasi.id,
        nama: String(newValue).trim() || acc.nama,
        device: acc.device,
        nomorHp: acc.nomorHp,
        customValues: acc.customValues,
      };
    } else {
      const updatedCustomValues = {
        ...acc.customValues,
        [columnId]: newValue,
      };
      data = {
        aplikasiId: aplikasi.id,
        nama: acc.nama,
        device: acc.device,
        nomorHp: acc.nomorHp,
        customValues: updatedCustomValues,
      };
    }

    const res = await updateAkun(accountId, garapan.id, data);
    if (res.success) {
      toast.success("Data diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      toast.error(res.error || "Gagal memperbarui data.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAppError("Ukuran logo maksimal 2MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setAppError("Format logo harus JPG, PNG, atau WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAppError(null);
    setLogoFile(file);
    setClearLogo(false);

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

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaAplikasiState.trim()) {
      setAppError("Nama aplikasi wajib diisi.");
      return;
    }

    setIsAppSubmitting(true);
    setAppError(null);

    const formData = new FormData();
    formData.append("namaAplikasi", namaAplikasiState.trim());
    formData.append("deskripsi", deskripsiState.trim());
    if (logoFile) {
      formData.append("logo", logoFile);
    }
    if (clearLogo) {
      formData.append("clearLogo", "true");
    }

    const res = await updateAplikasi(aplikasi.id, garapan.id, formData);
    setIsAppSubmitting(false);
    if (res.success) {
      toast.success("Aplikasi diperbarui");
      setIsEditAppOpen(false);
      router.refresh();
    } else {
      setAppError(res.error || "Gagal memperbarui aplikasi.");
    }
  };

  // Cell formatters
  const formatValue = (val: any, tipe: TipeKolom) => {
    if (val === undefined || val === null || val === "") {
      return <span className="text-text-secondary select-none">–</span>;
    }

    switch (tipe) {
      case "NOMOR":
        return (
          <span className="font-mono text-right block w-full">
            {new Intl.NumberFormat("id-ID").format(Number(val))}
          </span>
        );
      case "NOMINAL":
        return (
          <span className="font-mono text-right block w-full text-nowrap">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(Number(val))}
          </span>
        );
      case "CENTANG":
        return val ? (
          <div className="flex justify-center w-full">
            <Check className="h-4 w-4 text-accent stroke-[3]" />
          </div>
        ) : (
          <span className="text-text-secondary select-none flex justify-center w-full">–</span>
        );
      default:
        return <span>{String(val)}</span>;
    }
  };

  // Export handling
  const handleExport = (format: "xlsx" | "csv") => {
    if (filteredAkun.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    // Build Headers
    const headers = ["Nama", "Device", "No HP"];
    aplikasi.kolom.forEach((col) => {
      headers.push(col.namaKolom);
    });

    // Build Rows
    const dataRows = filteredAkun.map((acc) => {
      const row: any[] = [
        acc.nama,
        acc.device || "",
        acc.nomorHp || "",
      ];

      aplikasi.kolom.forEach((col) => {
        const val = acc.customValues[col.id];
        if (val === undefined || val === null) {
          row.push("");
        } else if (col.tipeKolom === "CENTANG") {
          row.push(val ? "Ya" : "Tidak");
        } else if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
          row.push(Number(val));
        } else {
          row.push(String(val));
        }
      });

      return row;
    });

    const aoa = [headers, ...dataRows];

    // Generate filename slug
    const appSlug = aplikasi.namaAplikasi
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const monthSlug = MONTH_NAMES[garapan.bulan - 1].toLowerCase();
    const fileName = `${appSlug}-${monthSlug}-${garapan.tahun}`;

    if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Akun");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success("Excel diekspor");
    } else {
      const escapeCSV = (val: any) => {
        const str = String(val === null || val === undefined ? "" : val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = aoa
        .map((row) => row.map(escapeCSV).join(","))
        .join("\n");

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV diekspor");
    }
  };

  const formattedMonthYear = `${MONTH_NAMES[garapan.bulan - 1]} ${garapan.tahun}`;

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="relative flex flex-col gap-4 mb-4 bg-bg-surface border border-border-soft p-5 rounded-2xl shadow-sm">
        {/* Edit Button in Top-Right Corner */}
        <button
          onClick={() => setIsEditAppOpen(true)}
          className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-xl border border-border-soft bg-bg-surface text-text-secondary hover:bg-accent-soft hover:text-accent hover:border-accent/30 shadow-sm transition-all duration-200 cursor-pointer"
          title="Edit Aplikasi"
        >
          <Edit className="h-4 w-4 shrink-0" />
        </button>

        {/* Breadcrumbs */}
        <Link
          href={`/garapan/${garapan.id}`}
          className="inline-flex items-center text-xs font-semibold text-accent hover:text-accent/80 transition-colors gap-1 group font-sans w-fit"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>{formattedMonthYear}</span>
        </Link>

        {/* Logo, Name, Description, Targets */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            {aplikasi.logoUrl ? (
              <div className="h-10 w-10 rounded-xl border border-border-soft overflow-hidden bg-accent-soft shrink-0 shadow-sm">
                <img
                  src={aplikasi.logoUrl}
                  alt={aplikasi.namaAplikasi}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl border border-border-soft bg-gradient-to-tr from-accent-soft to-accent/15 text-accent text-sm font-semibold font-display flex items-center justify-center shrink-0 shadow-sm">
                {aplikasi.namaAplikasi.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-[22px] font-bold text-text-primary font-display tracking-tight leading-tight">
              {aplikasi.namaAplikasi}
            </h2>
          </div>

          {/* Description & Targets Vertical Hierarchy */}
          <div className="flex flex-col gap-2">
            {/* Description Paragraph */}
            {aplikasi.deskripsi && (
              <p className="text-sm text-text-secondary leading-relaxed max-w-2xl font-sans mt-0.5">
                {aplikasi.deskripsi}
              </p>
            )}

            {/* Targets Summary Box (Neutral styling, no high contrast emerald green text) */}
            {aplikasi.kolom.some((c) => c.isTarget) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary bg-bg-page/40 border border-border-soft/60 px-3 py-1.5 rounded-xl w-fit font-sans">
                <span className="font-semibold text-text-secondary select-none">Target:</span>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-text-primary">
                  {aplikasi.kolom
                    .filter((c) => c.isTarget)
                    .map((col, idx) => {
                      let formattedTarget = col.nilaiTarget || "–";
                      if (col.tipeKolom === "NOMINAL" && col.nilaiTarget) {
                        formattedTarget = new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(Number(col.nilaiTarget));
                      } else if (col.tipeKolom === "NOMOR" && col.nilaiTarget) {
                        formattedTarget = new Intl.NumberFormat("id-ID").format(Number(col.nilaiTarget));
                      } else if (col.tipeKolom === "CENTANG") {
                        formattedTarget = col.nilaiTarget === "true" ? "Aktif" : "Mati";
                      }
                      return (
                        <React.Fragment key={col.id}>
                          {idx > 0 && <span className="text-text-secondary/40 select-none">•</span>}
                          <span className="inline-flex items-center gap-1">
                            <span className="text-text-secondary font-normal">{col.namaKolom}:</span>
                            <span className="font-semibold text-text-primary">{formattedTarget}</span>
                          </span>
                        </React.Fragment>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar / Actions Card */}
      <div className="bg-bg-surface border border-border-soft p-4 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddColumnOpen(true)}
            className="h-10 px-3 sm:px-4 flex-1 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>
              <span className="sm:hidden">Kolom</span>
              <span className="hidden sm:inline">Tambah Kolom</span>
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddAccountOpen(true)}
            className="h-10 px-3 sm:px-4 flex-1 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>
              <span className="sm:hidden">Akun</span>
              <span className="hidden sm:inline">Tambah Akun</span>
            </span>
          </Button>

          {aplikasi.akun.length > 0 && (
            <Button
              variant={isReorderMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsReorderMode(!isReorderMode)}
              className={`h-10 w-10 p-0 shrink-0 flex items-center justify-center transition-all duration-200 ${
                isReorderMode
                  ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25"
                  : ""
              }`}
              title="Atur Urutan Kolom & Baris"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" />
            </Button>
          )}

          {aplikasi.akun.length > 0 && (
            <div className="shrink-0">
              <DropdownMenu
                className="w-48"
                align="right"
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 flex items-center justify-center shrink-0"
                    title="Ekspor Data"
                  >
                    <Download className="h-4 w-4 shrink-0" />
                  </Button>
                }
              >
                <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                  <span>Export sebagai Excel (.xlsx)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <span>Export sebagai CSV (.csv)</span>
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>



      {/* Main Table / Empty State */}
      {aplikasi.akun.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Plus}
            title="Belum ada akun"
            description="Tambahkan akun pertama Anda untuk mencatat data di aplikasi ini."
            actionLabel="Tambah Akun Pertama"
            onAction={() => setIsAddAccountOpen(true)}
          />
        </div>
      ) : filteredAkun.length === 0 ? (
        <div className="py-12 bg-bg-surface border border-border-soft rounded-2xl text-center p-8">
          <p className="text-text-secondary text-sm font-sans">
            Tidak ada akun yang cocok dengan kata kunci pencarian.
          </p>
        </div>
      ) : (
        <TableContainer className="max-h-[600px] overflow-y-auto">
          <Table className="min-w-max md:min-w-full">
            <TableHeader>
              <TableRow>
                {isReorderMode && (
                  <TableHead className="w-20 text-center select-none bg-bg-page font-semibold text-text-secondary">Urutan</TableHead>
                )}
                <TableHead className="sticky left-0 bg-bg-page z-20 border-r border-border-soft min-w-[90px] sm:min-w-[150px]">Akun</TableHead>

                {/* Render Dynamic Custom Column Headers */}
                {aplikasi.kolom.map((col, colIndex) => {
                  return (
                    <TableHead
                      key={col.id}
                      className={`${
                        isReorderMode
                          ? `group relative pr-12 sm:pr-14 ${
                              col.tipeKolom === "CENTANG"
                                ? "min-w-[90px] sm:min-w-[120px]"
                                : "min-w-[130px] sm:min-w-[180px]"
                            }`
                          : "p-0 select-none min-w-[100px] sm:min-w-[150px]"
                      }`}
                    >
                      {isReorderMode ? (
                        <div className="flex items-center gap-1.5 justify-start text-nowrap py-3 px-3.5 sm:px-6 sm:py-4">
                          <span>{col.namaKolom}</span>
                          {/* Type Icon Badge */}
                          <Badge variant="circle" className="shrink-0">
                            {col.tipeKolom === "TEKS" && "Aa"}
                            {col.tipeKolom === "NOMOR" && "#"}
                            {col.tipeKolom === "NOMINAL" && "Rp"}
                            {col.tipeKolom === "CENTANG" && (
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            )}
                          </Badge>

                          <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-bg-surface border border-border-soft rounded-lg shadow-sm p-0.5 z-30">
                            <button
                              disabled={colIndex === 0}
                              onClick={() => handleSwapKolom(colIndex, colIndex - 1)}
                              className="p-1 rounded hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent text-text-primary transition-colors cursor-pointer"
                              title="Geser Kiri"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                            <button
                              disabled={colIndex === aplikasi.kolom.length - 1}
                              onClick={() => handleSwapKolom(colIndex, colIndex + 1)}
                              className="p-1 rounded hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent text-text-primary transition-colors cursor-pointer"
                              title="Geser Kanan"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <DropdownMenu
                          className="w-28"
                          align="left"
                          trigger={
                            <div className="flex items-center gap-1.5 justify-start text-nowrap cursor-pointer hover:text-accent transition-colors w-full h-full py-3 px-3.5 sm:px-6 sm:py-4 select-none">
                              <span>{col.namaKolom}</span>
                              {/* Type Icon Badge */}
                              <Badge variant="circle" className="shrink-0">
                                {col.tipeKolom === "TEKS" && "Aa"}
                                {col.tipeKolom === "NOMOR" && "#"}
                                {col.tipeKolom === "NOMINAL" && "Rp"}
                                {col.tipeKolom === "CENTANG" && (
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                )}
                              </Badge>
                            </div>
                          }
                        >
                          <DropdownMenuItem onClick={() => setEditingColumn(col)}>
                            <Edit className="h-4 w-4 mr-2 text-text-secondary" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setClearingColumn(col)}
                            className="text-amber-600 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/20 hover:text-amber-600"
                          >
                            <X className="h-4 w-4 mr-2" />
                            <span>Kosongkan</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeletingColumn(col)} className="text-danger hover:bg-danger-soft">
                            <Trash2 className="h-4 w-4 mr-2 text-danger" />
                            <span>Hapus</span>
                          </DropdownMenuItem>
                        </DropdownMenu>
                      )}
                    </TableHead>
                  );
                })}

                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAkun.map((acc, index) => {
                const meetsTarget = checkAkunMeetsTarget(acc);
                return (
                  <TableRow
                    key={acc.id}
                    className={`group transition-all ${
                      meetsTarget
                        ? "bg-target-bg hover:bg-target-hover"
                        : ""
                    }`}
                  >
                    {isReorderMode && (
                      <TableCell className={`align-middle py-2 px-1 text-center w-20 z-10 border-r border-border-soft transition-colors ${
                        meetsTarget
                          ? "bg-bg-surface dark:bg-target-bg group-hover:bg-target-hover/20 dark:group-hover:bg-target-hover"
                          : "bg-bg-surface"
                      }`}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            disabled={index === 0}
                            onClick={() => handleSwapAkun(index, index - 1)}
                            className="p-1 rounded hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent text-text-primary transition-colors cursor-pointer"
                            title="Pindahkan ke Atas"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            disabled={index === filteredAkun.length - 1}
                            onClick={() => handleSwapAkun(index, index + 1)}
                            className="p-1 rounded hover:bg-accent-soft disabled:opacity-30 disabled:hover:bg-transparent text-text-primary transition-colors cursor-pointer"
                            title="Pindahkan ke Bawah"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                    <TableCell
                      className={`sticky left-0 z-10 border-r border-border-soft font-medium text-nowrap cursor-pointer hover:underline transition-all min-w-[90px] sm:min-w-[150px] ${
                        meetsTarget
                          ? "bg-bg-surface dark:bg-target-bg group-hover:bg-target-hover/20 dark:group-hover:bg-target-hover text-target-text"
                          : "bg-bg-surface group-hover:bg-accent/5 hover:text-accent text-text-primary"
                      }`}
                      onClick={() => setSelectedDetailAccount(acc)}
                      title="Klik untuk melihat detail"
                    >
                      {acc.nama}
                    </TableCell>

                  {/* Render Dynamic custom values: Inline Inputs or Checkbox or formatted Text */}
                  {aplikasi.kolom.map((col) => {
                    const val = acc.customValues[col.id];

                    if (col.tipeKolom === "CENTANG") {
                      return (
                        <TableCell
                          key={col.id}
                          className={`align-middle py-2 ${col.tipeKolom === "CENTANG"
                              ? "min-w-[70px] sm:min-w-[100px]"
                              : "min-w-[110px] sm:min-w-[160px]"
                            }`}
                        >
                          <div className="flex justify-center w-full">
                            <Checkbox
                              checked={Boolean(val)}
                              onCheckedChange={(checked) => {
                                handleInlineSave(acc.id, col.id, checked);
                              }}
                            />
                          </div>
                        </TableCell>
                      );
                    }

                    if (editingCell?.accountId === acc.id && editingCell?.columnId === col.id) {
                      return (
                        <TableCell
                          key={col.id}
                          className="p-1 min-w-[110px] sm:min-w-[160px]"
                        >
                          <input
                            type={col.tipeKolom === "TEKS" ? "text" : "number"}
                            defaultValue={val !== undefined && val !== null ? val : ""}
                            autoFocus
                            className="w-full h-9 px-2 text-sm bg-bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-sans"
                            onBlur={(e) => {
                              const rawVal = e.target.value;
                              let finalVal: any = rawVal;
                              if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
                                finalVal = rawVal === "" ? null : Number(rawVal);
                              } else {
                                finalVal = rawVal === "" ? null : rawVal;
                              }
                              if (finalVal !== val) {
                                handleInlineSave(acc.id, col.id, finalVal);
                              }
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const rawVal = (e.target as HTMLInputElement).value;
                                let finalVal: any = rawVal;
                                if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
                                  finalVal = rawVal === "" ? null : Number(rawVal);
                                } else {
                                  finalVal = rawVal === "" ? null : rawVal;
                                }
                                if (finalVal !== val) {
                                  handleInlineSave(acc.id, col.id, finalVal);
                                }
                                setEditingCell(null);
                              } else if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                          />
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell
                        key={col.id}
                        className="cursor-pointer hover:bg-accent-soft/30 transition-colors select-none text-nowrap min-w-[110px] sm:min-w-[160px]"
                        onClick={() => setEditingCell({ accountId: acc.id, columnId: col.id })}
                        title="Klik untuk mengedit"
                      >
                        {formatValue(val, col.tipeKolom)}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-right py-1">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingAccount(acc)}
                        className="h-8 w-8 rounded-lg text-text-secondary hover:bg-accent-soft hover:text-accent flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Akun"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingAccount(acc)}
                        className="h-8 w-8 rounded-lg text-text-secondary hover:bg-danger-soft hover:text-danger flex items-center justify-center transition-colors cursor-pointer"
                        title="Hapus Akun"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Column Dialog */}
      <Dialog
        isOpen={isAddColumnOpen || !!editingColumn}
        onClose={() => {
          setIsAddColumnOpen(false);
          setEditingColumn(null);
        }}
        title={editingColumn ? "Ubah Kolom Kustom" : "Tambah Kolom Kustom"}
        description={
          editingColumn
            ? "Ubah data konfigurasi kolom kustom."
            : "Tambahkan kolom baru untuk menyimpan data kustom pada setiap akun."
        }
      >
        <form onSubmit={handleColumnSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Nama Kolom
            </label>
            <Input
              type="text"
              value={namaKolom}
              onChange={(e) => setNamaKolom(e.target.value)}
              placeholder="Contoh: Email, Region, Jumlah, Status Pembayaran"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Tipe Kolom
            </label>
            <Select
              value={tipeKolom}
              onChange={(e) => {
                const newType = e.target.value as TipeKolom;
                setTipeKolom(newType);
                if (isTarget) {
                  setNilaiTarget(newType === "CENTANG" ? "true" : "");
                }
              }}
            >
              <option value="TEKS">Teks (Huruf / Karakter)</option>
              <option value="NOMOR">Nomor (Angka Biasa)</option>
              <option value="NOMINAL">Nominal (Rupiah Rp)</option>
              <option value="CENTANG">Centang (Benar / Salah)</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 py-1">
            <Checkbox
              id="isTarget"
              checked={isTarget}
              onCheckedChange={(checked) => {
                setIsTarget(Boolean(checked));
                if (checked) {
                  setNilaiTarget(tipeKolom === "CENTANG" ? "true" : "");
                } else {
                  setNilaiTarget("");
                }
              }}
            />
            <label htmlFor="isTarget" className="text-xs font-semibold text-text-primary cursor-pointer select-none">
              Jadikan Target (Sorot hijau jika tercapai)
            </label>
          </div>

          {isTarget && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Nilai Target
              </label>
              {tipeKolom === "CENTANG" ? (
                <Select
                  value={nilaiTarget}
                  onChange={(e) => setNilaiTarget(e.target.value)}
                >
                  <option value="true">Centang (Aktif)</option>
                  <option value="false">Kosong (Tidak Aktif)</option>
                </Select>
              ) : tipeKolom === "NOMOR" || tipeKolom === "NOMINAL" ? (
                <Input
                  type="number"
                  value={nilaiTarget}
                  onChange={(e) => setNilaiTarget(e.target.value)}
                  placeholder="Contoh: 1000000"
                  required
                />
              ) : (
                <Input
                  type="text"
                  value={nilaiTarget}
                  onChange={(e) => setNilaiTarget(e.target.value)}
                  placeholder="Contoh: Selesai"
                  required
                />
              )}
            </div>
          )}

          {columnError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-lg border border-danger/10">
              {columnError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddColumnOpen(false);
                setEditingColumn(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isColumnSubmitting}
            >
              {isColumnSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Delete Column Alert */}
      <AlertDialog
        isOpen={!!deletingColumn}
        onClose={() => setDeletingColumn(null)}
        onConfirm={handleDeleteColumn}
        title="Hapus Kolom Kustom?"
        description={`Menghapus kolom "${deletingColumn?.namaKolom}" akan menghilangkan datanya dari tampilan tabel seluruh akun. Tindakan ini tidak bisa dibatalkan.`}
        confirmText="Hapus Kolom"
      />

      {/* Confirm Clear Column Data Alert */}
      <AlertDialog
        isOpen={!!clearingColumn}
        onClose={() => setClearingColumn(null)}
        onConfirm={handleClearColumn}
        title="Kosongkan Data Kolom?"
        description={`Apakah Anda yakin ingin mengosongkan semua data baris pada kolom "${clearingColumn?.namaKolom}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmText="Kosongkan Data"
      />

      {/* Add / Edit Account Dialog */}
      <Dialog
        isOpen={isAddAccountOpen || !!editingAccount}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? "Edit Akun" : "Tambah Akun"}
        description={
          editingAccount
            ? "Perbarui rincian informasi dan kolom kustom milik akun ini."
            : "Tambahkan akun baru beserta nilai data kolom kustomnya."
        }
      >
        <form onSubmit={handleAccountSubmit} className="flex flex-col gap-4">
          {/* Autofill Select (Only when adding a new account, not when editing) */}
          {!editingAccount && allExistingAccounts.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-accent-soft/30 border border-accent/10 p-3.5 rounded-xl mb-1">
              <label className="text-xs font-semibold text-accent">
                Salin Data dari Akun Lain (Opsional)
              </label>
              <Select
                value={selectedAutofillId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAutofillId(val);
                  if (val) {
                    const acc = allExistingAccounts.find((a) => a.id === val);
                    if (acc) {
                      setNamaAkun(acc.nama);
                      setDeviceAkun(acc.device || "");
                      setNoHpAkun(acc.nomorHp || "");
                    }
                  }
                }}
              >
                <option value="">-- Pilih Akun yang Sudah Ada --</option>
                {existingAccountsWithLabels.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.displayName}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {/* Static Fields */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Nama Akun</label>
            <Input
              type="text"
              value={namaAkun}
              onChange={(e) => setNamaAkun(e.target.value)}
              placeholder="Masukkan nama akun"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Device (Opsional)</label>
            <Input
              type="text"
              value={deviceAkun}
              onChange={(e) => setDeviceAkun(e.target.value)}
              placeholder="Contoh: HP 1, iPhone 13, PC"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">No HP (Opsional)</label>
            <Input
              type="text"
              value={noHpAkun}
              onChange={(e) => setNoHpAkun(e.target.value)}
              placeholder="Contoh: 081234567890"
            />
          </div>

          {/* Render Dynamic Custom Fields */}
          {aplikasi.kolom.length > 0 && (
            <div className="border-t border-border-soft mt-3 pt-3 flex flex-col gap-4">
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Kolom Kustom
              </h4>

              {aplikasi.kolom.map((col) => {
                const val = customValues[col.id];

                return (
                  <div key={col.id} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                      <span>{col.namaKolom}</span>
                      <span className="text-[10px] text-text-secondary/70 capitalize">
                        ({col.tipeKolom.toLowerCase()})
                      </span>
                    </label>

                    {col.tipeKolom === "TEKS" && (
                      <Input
                        type="text"
                        value={val || ""}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [col.id]: e.target.value,
                          })
                        }
                        placeholder={`Masukkan ${col.namaKolom.toLowerCase()}`}
                      />
                    )}

                    {col.tipeKolom === "NOMOR" && (
                      <Input
                        type="number"
                        value={val !== undefined && val !== null ? val : ""}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [col.id]: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        placeholder="Masukkan angka"
                      />
                    )}

                    {col.tipeKolom === "NOMINAL" && (
                      <Input
                        type="number"
                        prefixText="Rp"
                        value={val !== undefined && val !== null ? val : ""}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [col.id]: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        placeholder="Masukkan nominal rupiah"
                      />
                    )}

                    {col.tipeKolom === "CENTANG" && (
                      <div className="flex items-center gap-2 h-11 border border-border-soft px-4 rounded-xl bg-bg-page/20">
                        <Checkbox
                          checked={Boolean(val)}
                          onCheckedChange={(checked) =>
                            setCustomValues({
                              ...customValues,
                              [col.id]: checked,
                            })
                          }
                        />
                        <span className="text-sm font-medium text-text-primary select-none cursor-pointer" onClick={() => {
                          setCustomValues({
                            ...customValues,
                            [col.id]: !Boolean(val)
                          });
                        }}>
                          Aktif / Selesai
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {accountError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-lg border border-danger/10 mt-2">
              {accountError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-border-soft">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddAccountOpen(false);
                setEditingAccount(null);
              }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAccountSubmitting}
            >
              {isAccountSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirm Delete Account Alert */}
      <AlertDialog
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        onConfirm={handleDeleteAccount}
        title="Hapus Akun?"
        description="Akun ini beserta semua data kustomnya akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan."
        confirmText="Hapus Permanen"
      />

      {/* Account Detail Modal */}
      <Dialog
        isOpen={!!selectedDetailAccount}
        onClose={() => setSelectedDetailAccount(null)}
        title="Detail Akun"
        description="Rincian informasi perangkat dan nomor kontak untuk akun ini."
      >
        <div className="flex flex-col gap-4 font-sans">
          <div className="grid grid-cols-3 gap-2 border-b border-border-soft pb-3">
            <span className="text-xs font-semibold text-text-secondary">Nama Akun</span>
            <span className="col-span-2 text-sm font-medium text-text-primary">{selectedDetailAccount?.nama}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-border-soft pb-3">
            <span className="text-xs font-semibold text-text-secondary">Device</span>
            <span className="col-span-2 text-sm font-medium text-text-primary">
              {selectedDetailAccount?.device || <span className="text-text-secondary select-none">–</span>}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-border-soft pb-3">
            <span className="text-xs font-semibold text-text-secondary">No HP</span>
            <span className="col-span-2 text-sm font-mono text-text-primary">
              {selectedDetailAccount?.nomorHp || <span className="text-text-secondary select-none">–</span>}
            </span>
          </div>

          <div className="flex items-center justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDetailAccount(null)}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Application Dialog */}
      <Dialog
        isOpen={isEditAppOpen}
        onClose={() => setIsEditAppOpen(false)}
        title="Edit Aplikasi"
        description="Ubah nama, deskripsi, atau logo aplikasi ini."
      >
        <form onSubmit={handleAppSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Nama Aplikasi</label>
            <Input
              type="text"
              value={namaAplikasiState}
              onChange={(e) => setNamaAplikasiState(e.target.value)}
              placeholder="Contoh: Shopee, Tokopedia, TikTok"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Deskripsi (Opsional)</label>
            <textarea
              value={deskripsiState}
              onChange={(e) => setDeskripsiState(e.target.value)}
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
                  id="app-logo-upload"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="app-logo-upload"
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

          {appError && (
            <p className="text-xs font-medium text-danger bg-danger-soft p-3 rounded-lg border border-danger/10">
              {appError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditAppOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isAppSubmitting}
            >
              {isAppSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
