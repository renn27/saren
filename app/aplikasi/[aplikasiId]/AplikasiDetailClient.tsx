"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { Switch } from "@/components/ui/switch";
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
  ArrowUpDown,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Upload,
  User,
  Smartphone,
  Phone,
  Copy,
  MoreVertical,
  Calendar,
  Search,
  Table as TableIcon,
  LayoutGrid,
  CheckSquare,
  Square,
  Calculator,
  GripVertical,
} from "lucide-react";
import { CalculatorPopover } from "@/components/ui/calculator-popover";
import { toast } from "sonner";
import { createKolom, deleteKolom, swapKolomUrutan, updateKolom, clearKolomData } from "@/lib/actions/kolom";
import { createAkun, updateAkun, deleteAkun, getAllAccountsForAutofill, swapAkunUrutan, bulkUpdateCentang } from "@/lib/actions/akun";
import { updateAplikasi } from "@/lib/actions/aplikasi";
import { TipeKolom } from "@prisma/client";
import { evaluateFormula } from "@/lib/utils/formulaEvaluator";
import { twMerge } from "tailwind-merge";
import { AccountAutofillPicker } from "@/components/ui/account-autofill-picker";
import { compressImageFile } from "@/lib/utils/imageCompressor";

interface KolomItem {
  id: string;
  namaKolom: string;
  tipeKolom: TipeKolom;
  rumus?: string | null;
  urutan: number;
  isTarget: boolean;
  nilaiTarget: string | null;
  isAccumulated: boolean;
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

interface Nomor {
  id: string;
  provider: string;
  nomorKartu: string;
  pulsa: number;
  masaAktif: Date;
}

interface AplikasiDetailClientProps {
  aplikasi: AplikasiItem;
  nomorList: Nomor[];
}

const formatNumberInput = (value: string | number) => {
  if (value === undefined || value === null || value === "") return "";
  const strVal = value.toString();
  const isNegative = strVal.startsWith("-");
  const digits = strVal.replace(/\D/g, "");
  if (!digits) return isNegative ? "-" : "";
  return (isNegative ? "-" : "") + Number(digits).toLocaleString("id-ID");
};

const parseNumberInput = (value: string) => {
  const isNegative = value.startsWith("-");
  const digits = value.replace(/\D/g, "");
  if (!digits) return isNegative ? "-" : "";
  return isNegative ? `-${digits}` : digits;
};

export function AplikasiDetailClient({ aplikasi, nomorList }: AplikasiDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Route transition state
  const [isExiting, setIsExiting] = React.useState(false);
  const handleNavigate = (url: string) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(url);
    }, 250);
  };

  const [isReorderMode, setIsReorderMode] = React.useState(false);

  // Search & View Mode states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"table" | "card">("table");

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
  const [selectedCell, setSelectedCell] = React.useState<{ accountId: string; columnId: string } | null>(null);

  // Table column visibility toggle states
  const [showDeviceColumn, setShowDeviceColumn] = React.useState(false);
  const [showNomorHpColumn, setShowNomorHpColumn] = React.useState(false);

  React.useEffect(() => {
    const savedDevice = localStorage.getItem("saren_show_device_col");
    const savedPhone = localStorage.getItem("saren_show_phone_col");
    if (savedDevice !== null) setShowDeviceColumn(savedDevice === "true");
    if (savedPhone !== null) setShowNomorHpColumn(savedPhone === "true");
  }, []);

  const handleToggleDeviceColumn = (checked: boolean) => {
    setShowDeviceColumn(checked);
    localStorage.setItem("saren_show_device_col", String(checked));
    toast.success(checked ? "Kolom Perangkat ditampilkan di tabel" : "Kolom Perangkat disembunyikan");
  };

  const handleToggleNomorHpColumn = (checked: boolean) => {
    setShowNomorHpColumn(checked);
    localStorage.setItem("saren_show_phone_col", String(checked));
    toast.success(checked ? "Kolom Nomor HP ditampilkan di tabel" : "Kolom Nomor HP disembunyikan");
  };

  // Floating Calculator Popover State
  const [calcCellState, setCalcCellState] = React.useState<{
    isOpen: boolean;
    initialVal: number;
    accountId: string;
    columnId: string;
    colName: string;
  }>({
    isOpen: false,
    initialVal: 0,
    accountId: "",
    columnId: "",
    colName: "",
  });

  // Column form states
  const [namaKolom, setNamaKolom] = React.useState("");
  const [tipeKolom, setTipeKolom] = React.useState<TipeKolom>("TEKS");
  const [rumus, setRumus] = React.useState("");
  const [isTarget, setIsTarget] = React.useState(false);
  const [nilaiTarget, setNilaiTarget] = React.useState("");
  const [isAccumulated, setIsAccumulated] = React.useState(false);
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

  // Check phone number mapping in the database list
  const getConnectedNomor = React.useCallback((nomorHp: string | null) => {
    if (!nomorHp) return null;
    const cleanHp = nomorHp.trim().replace(/\D/g, "");
    return nomorList.find((n) => n.nomorKartu.trim().replace(/\D/g, "") === cleanHp) || null;
  }, [nomorList]);

  // Color logic for linked numbers
  const getHighlightDot = React.useCallback((connected: Nomor | null) => {
    if (!connected) return "";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const masa = new Date(connected.masaAktif);
    masa.setHours(0, 0, 0, 0);
    const oneYearFromNow = new Date(now);
    oneYearFromNow.setFullYear(now.getFullYear() + 1);
    const diffTime = now.getTime() - masa.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (masa > oneYearFromNow) {
      return "bg-emerald-500"; // Safe (Green)
    } else if (masa < now && diffDays > 30) {
      return "bg-rose-500"; // Expired >30 days (Red)
    } else if (masa < now && diffDays <= 30) {
      return "bg-amber-500"; // Expired <=30 days (Yellow)
    }
    return "bg-sky-500"; // Default
  }, []);

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
    const seenNames = new Set<string>();
    const uniqueAccounts: any[] = [];
    
    allExistingAccounts.forEach((acc) => {
      const nameLower = acc.nama.toLowerCase().trim();
      if (!seenNames.has(nameLower)) {
        seenNames.add(nameLower);
        uniqueAccounts.push({
          ...acc,
          displayName: acc.nama,
        });
      }
    });

    return uniqueAccounts;
  }, [allExistingAccounts]);

  // Reset forms
  React.useEffect(() => {
    if (isAddColumnOpen) {
      setNamaKolom("");
      setTipeKolom("TEKS");
      setRumus("");
      setIsTarget(false);
      setNilaiTarget("");
      setIsAccumulated(false);
      setColumnError(null);
    }
  }, [isAddColumnOpen]);

  React.useEffect(() => {
    if (editingColumn) {
      setNamaKolom(editingColumn.namaKolom);
      setTipeKolom(editingColumn.tipeKolom);
      setRumus(editingColumn.rumus || "");
      setIsTarget(editingColumn.isTarget);
      setNilaiTarget(editingColumn.nilaiTarget || "");
      setIsAccumulated(editingColumn.isAccumulated || false);
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

  // Local State for Optimistic UI Updates
  const [akunList, setAkunList] = React.useState<AkunItem[]>(aplikasi.akun);
  const [kolomList, setKolomList] = React.useState<KolomItem[]>(aplikasi.kolom);

  React.useEffect(() => {
    setAkunList(aplikasi.akun);
  }, [aplikasi.akun]);

  React.useEffect(() => {
    setKolomList(aplikasi.kolom);
  }, [aplikasi.kolom]);

  // Device Filter State
  const [selectedDevice, setSelectedDevice] = React.useState("Semua");

  const devices = React.useMemo(() => {
    const set = new Set<string>();
    akunList.forEach((acc) => {
      if (acc.device && acc.device.trim()) {
        set.add(acc.device.trim());
      }
    });
    return Array.from(set).sort();
  }, [akunList]);

  const uncategorizedDeviceCount = React.useMemo(() => {
    return akunList.filter((acc) => !acc.device || !acc.device.trim()).length;
  }, [akunList]);

  const filteredAkun = React.useMemo(() => {
    let list = akunList;
    if (selectedDevice !== "Semua") {
      if (selectedDevice === "__NONE__") {
        list = list.filter((acc) => !acc.device || !acc.device.trim());
      } else {
        list = list.filter((acc) => acc.device?.trim().toLowerCase() === selectedDevice.toLowerCase());
      }
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((acc) => {
      const matchName = acc.nama.toLowerCase().includes(q);
      const matchDevice = (acc.device || "").toLowerCase().includes(q);
      const matchHp = (acc.nomorHp || "").toLowerCase().includes(q);
      const matchCustom = kolomList.some((col) => {
        if (col.tipeKolom === "RUMUS") {
          const calcVal = evaluateFormula(col.rumus, acc.customValues, kolomList);
          return calcVal !== null && String(calcVal).toLowerCase().includes(q);
        }
        const val = acc.customValues[col.id];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(q);
      });
      return matchName || matchDevice || matchHp || matchCustom;
    });
  }, [akunList, kolomList, searchQuery, selectedDevice]);

  // 🚀 Memoized formula evaluation map (O(1) lookup per account & column, 0ms formula recalculation lag)
  const evaluatedFormulasMap = React.useMemo(() => {
    const map: Record<string, Record<string, number | null>> = {};
    const rumusCols = kolomList.filter((c) => c.tipeKolom === "RUMUS");
    if (rumusCols.length === 0) return map;

    akunList.forEach((acc) => {
      map[acc.id] = {};
      rumusCols.forEach((col) => {
        map[acc.id][col.id] = evaluateFormula(col.rumus, acc.customValues, kolomList);
      });
    });
    return map;
  }, [akunList, kolomList]);

  const checkAkunMeetsTarget = React.useCallback((acc: AkunItem) => {
    const targetCols = kolomList.filter((c) => c.isTarget && c.nilaiTarget !== null && c.nilaiTarget !== "");
    if (targetCols.length === 0) return false;

    return targetCols.some((col) => {
      if (col.tipeKolom === "RUMUS") {
        const calcVal = evaluatedFormulasMap[acc.id]?.[col.id] ?? evaluateFormula(col.rumus, acc.customValues, kolomList);
        if (calcVal === null) return false;
        return calcVal >= Number(col.nilaiTarget);
      }

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
  }, [kolomList, evaluatedFormulasMap]);

  // Column CRUD
  const handleColumnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKolom.trim()) {
      setColumnError("Nama kolom wajib diisi.");
      return;
    }

    if (tipeKolom === "RUMUS" && !rumus.trim()) {
      setColumnError("Rumus wajib diisi.");
      return;
    }

    setIsColumnSubmitting(true);
    setColumnError(null);

    const data = {
      aplikasiId: aplikasi.id,
      namaKolom: namaKolom.trim(),
      tipeKolom,
      rumus: tipeKolom === "RUMUS" ? rumus.trim() : null,
      isTarget,
      nilaiTarget: isTarget ? nilaiTarget.trim() : null,
      isAccumulated: (tipeKolom === "NOMOR" || tipeKolom === "NOMINAL" || tipeKolom === "RUMUS") ? isAccumulated : false,
    };

    if (editingColumn) {
      const res = await updateKolom(editingColumn.id, null, data);
      setIsColumnSubmitting(false);
      if (res.success) {
        toast.success("Kolom diperbarui");
        setEditingColumn(null);
        router.refresh();
      } else {
        setColumnError(res.error || "Gagal memperbarui kolom.");
      }
    } else {
      const res = await createKolom(null, data);
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
    const res = await deleteKolom(deletingColumn.id, null, aplikasi.id);
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
    const res = await clearKolomData(clearingColumn.id, null, aplikasi.id);
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
    kolomList.forEach((col) => {
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
      const res = await updateAkun(editingAccount.id, null, data);
      setIsAccountSubmitting(false);
      if (res.success) {
        toast.success("Akun diperbarui");
        setEditingAccount(null);
        router.refresh();
      } else {
        setAccountError(res.error || "Gagal memperbarui akun.");
      }
    } else {
      const res = await createAkun(null, data);
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
    const res = await deleteAkun(deletingAccount.id, null, aplikasi.id);
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

    // 🚀 Optimistic update: swap items in local state instantly (0ms)
    const previousAkunList = [...akunList];
    setAkunList((prev) => {
      const next = [...prev];
      const i1 = next.findIndex((a) => a.id === acc1.id);
      const i2 = next.findIndex((a) => a.id === acc2.id);
      if (i1 !== -1 && i2 !== -1) {
        const temp = next[i1];
        next[i1] = next[i2];
        next[i2] = temp;
      }
      return next;
    });

    const res = await swapAkunUrutan(null, aplikasi.id, acc1.id, acc2.id);
    if (res.success) {
      toast.success("Urutan akun diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      setAkunList(previousAkunList);
      toast.error(res.error || "Gagal memindahkan akun.");
    }
  };

  const handleSwapKolom = async (idx1: number, idx2: number) => {
    const col1 = kolomList[idx1];
    const col2 = kolomList[idx2];
    if (!col1 || !col2) return;

    // 🚀 Optimistic update: swap columns in local state instantly (0ms)
    const previousKolomList = [...kolomList];
    setKolomList((prev) => {
      const next = [...prev];
      const temp = next[idx1];
      next[idx1] = next[idx2];
      next[idx2] = temp;
      return next;
    });

    const res = await swapKolomUrutan(null, aplikasi.id, col1.id, col2.id);
    if (res.success) {
      toast.success("Urutan kolom diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      setKolomList(previousKolomList);
      toast.error(res.error || "Gagal memindahkan kolom.");
    }
  };

  // Drag and Drop Column Reordering Handlers
  const [draggedColIndex, setDraggedColIndex] = React.useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = React.useState<number | null>(null);

  const handleDragColumnStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
    setDraggedColIndex(index);
  };

  const handleDragColumnOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedColIndex !== null && draggedColIndex !== index) {
      setDragOverColIndex(index);
    }
  };

  const handleDropColumn = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex !== null && draggedColIndex !== targetIndex) {
      handleSwapKolom(draggedColIndex, targetIndex);
    }
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  const handleDragColumnEnd = () => {
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  const handleBulkCentang = async (columnId: string, newValue: boolean) => {
    // 🚀 Optimistic update: instantly toggle all checkboxes locally (0ms)
    const previousAkunList = [...akunList];
    setAkunList((prev) =>
      prev.map((acc) => ({
        ...acc,
        customValues: {
          ...acc.customValues,
          [columnId]: newValue,
        },
      }))
    );

    const toastId = toast.loading("Memperbarui data akun...");
    const res = await bulkUpdateCentang(null, aplikasi.id, columnId, newValue);
    if (res.success) {
      toast.success("Semua data berhasil diperbarui", { id: toastId });
      router.refresh();
    } else {
      setAkunList(previousAkunList);
      toast.error(res.error || "Gagal memperbarui data secara massal.", { id: toastId });
    }
  };

  const handleInlineSave = async (
    accountId: string,
    columnId: "nama" | "device" | "nomorHp" | string,
    newValue: any
  ) => {
    const acc = akunList.find((a) => a.id === accountId);
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
    } else if (columnId === "device") {
      data = {
        aplikasiId: aplikasi.id,
        nama: acc.nama,
        device: newValue !== "" && newValue !== null ? String(newValue).trim() : null,
        nomorHp: acc.nomorHp,
        customValues: acc.customValues,
      };
    } else if (columnId === "nomorHp") {
      data = {
        aplikasiId: aplikasi.id,
        nama: acc.nama,
        device: acc.device,
        nomorHp: newValue !== "" && newValue !== null ? String(newValue).trim() : null,
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

    // 🚀 Optimistic update: update local state instantly (0ms response)
    const previousAkunList = [...akunList];
    setAkunList((prev) =>
      prev.map((a) => {
        if (a.id !== accountId) return a;
        if (columnId === "nama") return { ...a, nama: String(newValue).trim() || a.nama };
        if (columnId === "device") return { ...a, device: newValue !== "" && newValue !== null ? String(newValue).trim() : null };
        if (columnId === "nomorHp") return { ...a, nomorHp: newValue !== "" && newValue !== null ? String(newValue).trim() : null };
        return {
          ...a,
          customValues: {
            ...a.customValues,
            [columnId]: newValue,
          },
        };
      })
    );

    const res = await updateAkun(accountId, null, data);
    if (res.success) {
      toast.success("Data diperbarui", { duration: 1000 });
      router.refresh();
    } else {
      setAkunList(previousAkunList);
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

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      const compressedLogo = await compressImageFile(logoFile, 256, 256, 0.85);
      formData.append("logo", compressedLogo);
    }
    if (clearLogo) {
      formData.append("clearLogo", "true");
    }

    const res = await updateAplikasi(aplikasi.id, null, formData);
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
      case "RUMUS":
        return (
          <span className="font-mono text-right block w-full text-accent font-medium">
            {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(val))}
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
      case "TANGGAL":
        try {
          return (
            <span>
              {new Date(val).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        } catch {
          return <span>{String(val)}</span>;
        }
      default:
        return <span>{String(val)}</span>;
    }
  };

  // Export handling
  const handleExport = async (format: "xlsx" | "csv") => {
    if (filteredAkun.length === 0) {
      toast.error("Tidak ada data untuk diekspor.");
      return;
    }

    // Build Headers
    const headers = ["Nama", "Device", "No HP"];
    kolomList.forEach((col) => {
      headers.push(col.namaKolom);
    });

    // Build Rows
    const dataRows = filteredAkun.map((acc) => {
      const row: any[] = [
        acc.nama,
        acc.device || "",
        acc.nomorHp || "",
      ];

      kolomList.forEach((col) => {
        if (col.tipeKolom === "RUMUS") {
          const calcVal = evaluateFormula(col.rumus, acc.customValues, kolomList);
          row.push(calcVal !== null ? calcVal : "");
        } else {
          const val = acc.customValues[col.id];
          if (val === undefined || val === null) {
            row.push("");
          } else if (col.tipeKolom === "CENTANG") {
            row.push(val ? "Ya" : "Tidak");
          } else if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
            row.push(Number(val));
          } else if (col.tipeKolom === "TANGGAL") {
            row.push(val); // Raw YYYY-MM-DD
          } else {
            row.push(String(val));
          }
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
    const fileName = `${appSlug}-data`;

    if (format === "xlsx") {
      const XLSX = await import("xlsx");
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

  return (
    <div key={pathname} className={`w-full transition-all duration-300 ${isExiting ? 'opacity-0 scale-[0.98] blur-[2px]' : 'animate-in fade-in slide-in-from-bottom-4 ease-[cubic-bezier(0.16,1,0.3,1)]'}`}>
      {/* Breadcrumbs */}
      <div className="flex flex-col gap-2 mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleNavigate(`/aplikasi`)}
          className="h-9 px-3.5 gap-1.5 text-text-secondary w-fit"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          <span>Kembali ke Daftar Aplikasi</span>
        </Button>
      </div>

      <div className="relative flex flex-col gap-3 mb-4 bg-bg-surface border border-border-soft p-4 sm:p-5 rounded-3xl [box-shadow:var(--shadow-card)]">
        {/* Edit Button in Top-Right Corner */}
        <button
          onClick={() => setIsEditAppOpen(true)}
          className="absolute top-5 right-5 h-9 w-9 flex items-center justify-center rounded-xl border border-border-soft bg-bg-surface text-text-secondary hover:bg-accent-soft hover:text-accent hover:border-accent/30 transition-all duration-200 cursor-pointer"
          title="Edit Aplikasi"
        >
          <Edit className="h-4 w-4 shrink-0" />
        </button>

        {/* Logo, Name, Description, Targets */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            {aplikasi.logoUrl ? (
              <div className="h-14 w-14 rounded-2xl border border-border-soft overflow-hidden bg-accent-soft shrink-0 [box-shadow:var(--shadow-card)]">
                <img
                  src={aplikasi.logoUrl}
                  alt={aplikasi.namaAplikasi}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-2xl border border-border-soft bg-gradient-to-br from-accent-soft to-accent/20 text-accent text-base font-bold font-display flex items-center justify-center shrink-0 [box-shadow:var(--shadow-card)]">
                {aplikasi.namaAplikasi.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-[22px] sm:text-[26px] font-bold text-text-primary font-display tracking-tight leading-tight">
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

            {/* Targets Summary Box */}
            {kolomList.some((c) => c.isTarget) && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary bg-bg-page/40 border border-border-soft/60 px-3 py-1.5 rounded-xl w-fit font-sans">
                <span className="font-semibold text-text-secondary select-none">Target:</span>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-text-primary">
                  {kolomList
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
                      } else if (col.tipeKolom === "TANGGAL" && col.nilaiTarget) {
                        try {
                          formattedTarget = new Date(col.nilaiTarget).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          });
                        } catch {}
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

      {/* Unified Controls Panel */}
      <div className="bg-bg-surface border border-border-soft p-4 rounded-3xl [box-shadow:var(--shadow-card)] mb-4 flex flex-col gap-3.5">
        {/* Row 1: Search & View Toggle */}
        {akunList.length > 0 && (
          <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-border-soft/60 w-full">
            {/* Search Input */}
            <div className="relative flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari data..."
                className="w-full h-10 pl-10 pr-10 text-sm bg-bg-page border border-border-soft rounded-xl text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-transparent transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary">
                <Search className="h-4 w-4" />
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary cursor-pointer p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-border-soft rounded-xl bg-bg-page p-1 shrink-0 h-10 select-none">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4.5 h-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-accent-soft text-accent border border-accent/15"
                    : "text-text-secondary hover:text-text-primary border border-transparent"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Tabel</span>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`flex items-center gap-1.5 px-3.5 sm:px-4.5 h-full rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-accent-soft text-accent border border-accent/15"
                    : "text-text-secondary hover:text-text-primary border border-transparent"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Action Buttons & Utilities */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Main Action CTAs (Left) */}
          <div className="flex items-center gap-2 grow">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddAccountOpen(true)}
              className="h-10 px-3.5 sm:px-4.5 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-semibold text-xs rounded-xl text-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>
                <span className="sm:hidden">Akun</span>
                <span className="hidden sm:inline">Tambah Akun</span>
              </span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddColumnOpen(true)}
              className="h-10 px-3.5 sm:px-4.5 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 font-semibold text-xs rounded-xl text-nowrap shrink-0"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>
                <span className="sm:hidden">Kolom</span>
                <span className="hidden sm:inline">Tambah Kolom</span>
              </span>
            </Button>
          </div>

          {/* Utility Icons (Right) */}
          {akunList.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={isReorderMode ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsReorderMode(!isReorderMode)}
                className={`h-10 w-10 p-0 flex items-center justify-center transition-all duration-200 rounded-xl ${
                  isReorderMode
                    ? "bg-accent/15 text-accent border-accent/30 hover:bg-accent/25"
                    : ""
                }`}
                title="Atur Urutan Kolom & Baris"
              >
                <ArrowUpDown className="h-4 w-4 shrink-0" />
              </Button>

              <div className="shrink-0">
                <DropdownMenu
                  className="w-48"
                  align="right"
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 flex items-center justify-center rounded-xl"
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
            </div>
          )}
        </div>

        {/* Device Filter Pills Bar */}
        {(devices.length > 0 || uncategorizedDeviceCount > 0) && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 no-scrollbar w-full select-none border-t border-border-soft/60">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5 text-accent" />
              <span>Device:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedDevice("Semua")}
              className={twMerge(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5",
                selectedDevice === "Semua"
                  ? "bg-accent text-white border-accent shadow-2xs"
                  : "bg-bg-surface text-text-secondary border-border-soft hover:border-accent/40"
              )}
            >
              <span>Semua</span>
              <span className={twMerge("px-1.5 py-0.2 rounded-full text-[10px] font-bold", selectedDevice === "Semua" ? "bg-white/20 text-white" : "bg-bg-page text-text-secondary border border-border-soft/40")}>
                {akunList.length}
              </span>
            </button>

            {uncategorizedDeviceCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedDevice("__NONE__")}
                className={twMerge(
                  "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5",
                  selectedDevice === "__NONE__"
                    ? "bg-accent text-white border-accent shadow-2xs"
                    : "bg-bg-surface text-text-secondary border-border-soft hover:border-accent/40"
                )}
              >
                <span>Tanpa Device</span>
                <span className={twMerge("px-1.5 py-0.2 rounded-full text-[10px] font-bold", selectedDevice === "__NONE__" ? "bg-white/20 text-white" : "bg-bg-page text-text-secondary border border-border-soft/40")}>
                  {uncategorizedDeviceCount}
                </span>
              </button>
            )}

            {devices.map((dev) => {
              const count = akunList.filter((a) => a.device?.trim().toLowerCase() === dev.toLowerCase()).length;
              const isSelected = selectedDevice.toLowerCase() === dev.toLowerCase();
              return (
                <button
                  key={dev}
                  type="button"
                  onClick={() => setSelectedDevice(dev)}
                  className={twMerge(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border flex items-center gap-1.5",
                    isSelected
                      ? "bg-accent text-white border-accent shadow-2xs"
                      : "bg-bg-surface text-text-secondary border-border-soft hover:border-accent/40"
                  )}
                >
                  <span>{dev}</span>
                  <span className={twMerge("px-1.5 py-0.2 rounded-full text-[10px] font-bold", isSelected ? "bg-white/20 text-white" : "bg-bg-page text-text-secondary border border-border-soft/40")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
            {/* Main Content: Search, Views, and Empty States */}
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
      ) : (
        <div className="flex flex-col gap-4">

          {/* Search Result Condition */}
          {filteredAkun.length === 0 ? (
            <div className="py-12 bg-bg-surface border border-border-soft rounded-3xl text-center p-8 shadow-sm">
              <p className="text-text-secondary text-sm font-sans">
                Tidak ada akun yang cocok dengan kata kunci pencarian.
              </p>
            </div>
          ) : viewMode === "table" ? (
            <TableContainer className="max-h-[600px] overflow-y-auto">
              <Table className="min-w-max md:min-w-full">
                <TableHeader>
                  <TableRow>
                    {isReorderMode && (
                      <TableHead className="w-20 text-center select-none bg-bg-surface font-semibold text-text-secondary">Urutan</TableHead>
                    )}
                    <TableHead className="sticky left-0 bg-bg-surface z-20 border-r border-border-soft min-w-[90px] sm:min-w-[150px] text-center font-bold">Akun</TableHead>
     
                    {showDeviceColumn && (
                      <TableHead className="text-center border-r border-border-soft/50 min-w-[100px] sm:min-w-[130px] font-bold select-none">
                        Perangkat
                      </TableHead>
                    )}

                    {showNomorHpColumn && (
                      <TableHead className="text-center border-r border-border-soft/50 min-w-[120px] sm:min-w-[150px] font-bold select-none">
                        Nomor HP
                      </TableHead>
                    )}
     
                    {/* Render Dynamic Custom Column Headers */}
                    {aplikasi.kolom.map((col, colIndex) => {
                      const isDragging = draggedColIndex === colIndex;
                      const isDragOver = dragOverColIndex === colIndex;

                      return (
                        <TableHead
                          key={col.id}
                          draggable={isReorderMode}
                          onDragStart={(e) => handleDragColumnStart(e, colIndex)}
                          onDragOver={(e) => handleDragColumnOver(e, colIndex)}
                          onDrop={(e) => handleDropColumn(e, colIndex)}
                          onDragEnd={handleDragColumnEnd}
                          className={`text-center border-r border-border-soft/50 transition-all ${
                            isDragging ? "opacity-40 bg-accent-soft/30 scale-95" : ""
                          } ${
                            isDragOver ? "border-2 border-accent border-dashed bg-accent-soft/40" : ""
                          } ${
                            isReorderMode
                              ? `group relative pr-12 sm:pr-14 cursor-grab active:cursor-grabbing select-none ${
                                  col.tipeKolom === "CENTANG"
                                    ? "min-w-[90px] sm:min-w-[120px]"
                                    : "min-w-[130px] sm:min-w-[180px]"
                                }`
                              : `p-0 select-none ${
                                  col.tipeKolom === "CENTANG"
                                    ? "min-w-[70px] sm:min-w-[90px]"
                                    : "min-w-[90px] sm:min-w-[130px]"
                                }`
                          }`}
                        >
                          {isReorderMode ? (
                            <div className="flex items-center gap-1.5 justify-center text-nowrap py-3 px-3.5 sm:px-6 sm:py-4">
                              <GripVertical className="h-4 w-4 text-text-secondary/60 shrink-0 mr-0.5" />
                              <span>{col.namaKolom}</span>
                              <Badge variant="circle" className="shrink-0">
                                {col.tipeKolom === "TEKS" && "Aa"}
                                {col.tipeKolom === "NOMOR" && "#"}
                                {col.tipeKolom === "NOMINAL" && "Rp"}
                                {col.tipeKolom === "TANGGAL" && "Tgl"}
                                {col.tipeKolom === "RUMUS" && "fx"}
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
                              className="w-44"
                              align="left"
                              trigger={
                                <div className="flex items-center gap-1.5 justify-center text-nowrap cursor-pointer hover:text-accent transition-colors w-full h-full py-3 px-3.5 sm:px-6 sm:py-4 select-none">
                                  <span>{col.namaKolom}</span>
                                  <Badge variant="circle" className="shrink-0">
                                    {col.tipeKolom === "TEKS" && "Aa"}
                                    {col.tipeKolom === "NOMOR" && "#"}
                                    {col.tipeKolom === "NOMINAL" && "Rp"}
                                    {col.tipeKolom === "TANGGAL" && "Tgl"}
                                    {col.tipeKolom === "RUMUS" && "fx"}
                                    {col.tipeKolom === "CENTANG" && (
                                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                                    )}
                                  </Badge>
                                </div>
                              }
                            >
                              {col.tipeKolom === "CENTANG" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleBulkCentang(col.id, true)}>
                                    <CheckSquare className="h-4 w-4 text-text-secondary" />
                                    <span>Centang Semua</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleBulkCentang(col.id, false)}>
                                    <Square className="h-4 w-4 text-text-secondary" />
                                    <span>Hapus Centang</span>
                                  </DropdownMenuItem>
                                  <div className="h-px bg-border-soft/60 my-1" />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => setEditingColumn(col)}>
                                <Edit className="h-4 w-4 text-text-secondary" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setClearingColumn(col)}
                              >
                                <X className="h-4 w-4 text-text-secondary" />
                                <span>Kosongkan</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingColumn(col)} className="text-danger hover:bg-danger-soft">
                                <Trash2 className="h-4 w-4 text-danger" />
                                <span>Hapus</span>
                              </DropdownMenuItem>
                            </DropdownMenu>
                          )}
                        </TableHead>
                      );
                    })}
     
                    <TableHead className="w-14 px-1 text-center font-bold">Aksi</TableHead>
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
                              ? "bg-target-bg group-hover:bg-target-hover"
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
                          className={`sticky left-0 z-10 border-r border-border-soft font-semibold text-nowrap cursor-pointer hover:underline transition-all min-w-[90px] sm:min-w-[150px] ${
                            meetsTarget
                              ? "bg-target-bg group-hover:bg-target-hover text-target-text"
                              : "bg-bg-surface group-hover:bg-accent/5 hover:text-accent text-text-primary"
                          }`}
                          onClick={() => setSelectedDetailAccount(acc)}
                          title="Klik untuk melihat detail"
                        >
                          <span>{acc.nama}</span>
                        </TableCell>

                        {showDeviceColumn && (
                          <TableCell className="text-center text-nowrap px-3 py-2 border-r border-border-soft/50 text-[13px] text-text-secondary">
                            {acc.device || <span className="text-text-secondary/40 select-none">-</span>}
                          </TableCell>
                        )}

                        {showNomorHpColumn && (
                          <TableCell className="text-center text-nowrap px-3 py-2 border-r border-border-soft/50 font-mono text-[13px] text-text-primary">
                            {acc.nomorHp || <span className="text-text-secondary/40 select-none">-</span>}
                          </TableCell>
                        )}
    
                      {/* Render Dynamic custom values */}
                      {aplikasi.kolom.map((col) => {
                        if (col.tipeKolom === "RUMUS") {
                          const formulaVal = evaluatedFormulasMap[acc.id]?.[col.id] ?? evaluateFormula(col.rumus, acc.customValues, aplikasi.kolom);
                          return (
                            <TableCell
                              key={col.id}
                              className="select-none text-nowrap px-3 py-2 border-r border-border-soft/50 font-mono text-right"
                              title={`Rumus: ${col.rumus || ""}`}
                            >
                              {formatValue(formulaVal, col.tipeKolom)}
                            </TableCell>
                          );
                        }

                        const val = acc.customValues[col.id];
    
                        if (col.tipeKolom === "CENTANG") {
                          return (
                            <TableCell
                              key={col.id}
                              className="align-middle py-2 border-r border-border-soft/50"
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
                          if (col.tipeKolom === "TANGGAL") {
                            return (
                              <TableCell
                                key={col.id}
                                className="p-1 border-r border-border-soft/50"
                              >
                                <input
                                  type="date"
                                  defaultValue={val || ""}
                                  autoFocus
                                  className="w-full box-border h-9 px-2 text-sm bg-bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-sans"
                                  onBlur={(e) => {
                                    const finalVal = e.target.value || null;
                                    if (finalVal !== val) {
                                      handleInlineSave(acc.id, col.id, finalVal);
                                    }
                                    setEditingCell(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const finalVal = (e.target as HTMLInputElement).value || null;
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
                              className="p-1 w-[130px] min-w-[130px] border-r border-border-soft/50"
                            >
                              <input
                                type="text"
                                inputMode={col.tipeKolom === "TEKS" ? "text" : "numeric"}
                                defaultValue={
                                  val !== undefined && val !== null
                                    ? (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL"
                                        ? formatNumberInput(val)
                                        : val)
                                    : ""
                                }
                                autoFocus
                                className={`w-full min-w-0 box-border h-9 px-2 text-sm bg-bg-surface border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-sans ${
                                  col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL" ? "text-right font-mono" : "text-left"
                                }`}
                                onChange={(e) => {
                                  if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
                                    const parsed = parseNumberInput(e.target.value);
                                    e.target.value = formatNumberInput(parsed);
                                  }
                                }}
                                onBlur={(e) => {
                                  const rawVal = e.target.value;
                                  let finalVal: any = rawVal;
                                  if (col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL") {
                                    const parsed = parseNumberInput(rawVal);
                                    finalVal = parsed === "" || parsed === "-" ? null : Number(parsed);
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
                                      const parsed = parseNumberInput(rawVal);
                                      finalVal = parsed === "" || parsed === "-" ? null : Number(parsed);
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
    
                        const isCellSelected = selectedCell?.accountId === acc.id && selectedCell?.columnId === col.id;

                        return (
                          <TableCell
                            key={col.id}
                            className="p-1 w-[130px] min-w-[130px] border-r border-border-soft/50 cursor-pointer select-none"
                            onClick={() => {
                              if (isCellSelected) {
                                // 2nd click on same cell -> edit mode
                                setEditingCell({ accountId: acc.id, columnId: col.id });
                              } else {
                                // 1st click -> select & highlight cell
                                setSelectedCell({ accountId: acc.id, columnId: col.id });
                              }
                            }}
                            onDoubleClick={() => {
                              // Double click -> edit mode immediately
                              setSelectedCell({ accountId: acc.id, columnId: col.id });
                              setEditingCell({ accountId: acc.id, columnId: col.id });
                            }}
                            title={isCellSelected ? "Klik lagi atau Double-click untuk mengedit" : "Klik 1x untuk memilih sel"}
                          >
                            <div
                              className={`w-full min-w-0 box-border h-9 px-2 text-sm font-sans flex items-center justify-between transition-all rounded-lg ${
                                col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL" ? "font-mono" : ""
                              } ${
                                isCellSelected
                                  ? "bg-bg-surface border border-accent text-accent font-semibold shadow-2xs"
                                  : "hover:bg-accent-soft/30 text-text-primary"
                              }`}
                            >
                              <div className={col.tipeKolom === "NOMOR" || col.tipeKolom === "NOMINAL" ? "text-right w-full" : ""}>
                                {formatValue(val, col.tipeKolom)}
                              </div>
                              {isCellSelected && (col.tipeKolom === "NOMINAL" || col.tipeKolom === "NOMOR") && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCalcCellState({
                                      isOpen: true,
                                      initialVal: Number(val) || 0,
                                      accountId: acc.id,
                                      columnId: col.id,
                                      colName: col.namaKolom,
                                    });
                                  }}
                                  className="p-1 rounded-md bg-accent-soft text-accent hover:bg-accent hover:text-white transition-all cursor-pointer shrink-0 ml-1"
                                  title="Buka Kalkulator Melayang"
                                >
                                  <Calculator className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
    
                      <TableCell className="text-center py-1 px-1 w-14">
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
                            <DropdownMenuItem onClick={() => setEditingAccount(acc)}>
                              <Edit className="h-4 w-4 text-text-secondary" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingAccount(acc)}
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
                
                {/* Accumulation / Footer Row */}
                {aplikasi.kolom.some((c) => c.isAccumulated) && (
                  <TableRow className="bg-bg-surface font-bold text-text-primary hover:bg-bg-surface cursor-default">
                    {isReorderMode && <TableCell className="border-r border-border-soft"></TableCell>}
                    <TableCell className="sticky left-0 bg-bg-surface z-10 border-r border-border-soft text-right font-bold">
                      Total Akumulasi:
                    </TableCell>
                    {showDeviceColumn && <TableCell className="border-r border-border-soft/50"></TableCell>}
                    {showNomorHpColumn && <TableCell className="border-r border-border-soft/50"></TableCell>}
                    {aplikasi.kolom.map((col) => {
                      if (!col.isAccumulated) return <TableCell key={col.id}></TableCell>;
                      
                      const sum = filteredAkun.reduce((acc, curr) => {
                        if (col.tipeKolom === "RUMUS") {
                          const calcVal = evaluatedFormulasMap[curr.id]?.[col.id] ?? evaluateFormula(col.rumus, curr.customValues, aplikasi.kolom);
                          return acc + (calcVal || 0);
                        }
                        const val = curr.customValues[col.id];
                        return acc + (Number(val) || 0);
                      }, 0);
    
                      return (
                        <TableCell key={col.id} className="text-right font-bold">
                          {formatValue(sum, col.tipeKolom)}
                        </TableCell>
                      );
                    })}
                    <TableCell></TableCell>
                  </TableRow>
                )}
              </TableBody>
              </Table>
            </TableContainer>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAkun.map((acc) => {
                const meetsTarget = checkAkunMeetsTarget(acc);
                const connectedNomor = getConnectedNomor(acc.nomorHp);
                const highlightDotColor = getHighlightDot(connectedNomor);
 
                return (
                  <Card
                    key={acc.id}
                    onClick={() => setSelectedDetailAccount(acc)}
                    className={`relative flex flex-col p-4 sm:p-5 gap-3 cursor-pointer transition-all hover:z-10 focus-within:z-10 min-h-[140px] border border-border-soft/60 [box-shadow:var(--shadow-card)] hover:border-accent/40 ${
                      meetsTarget ? "bg-target-bg border-accent/25 shadow-[0_2px_8px_rgba(8,145,178,0.05)]" : "bg-bg-surface"
                    }`}
                  >
                    {/* Header Row: Name & Action menu */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="text-[14px] font-bold text-text-primary font-display truncate">
                          {acc.nama}
                        </h4>
                        {connectedNomor && (
                          <span 
                            className={`inline-block w-2.5 h-2.5 rounded-full border border-bg-surface shadow-sm shrink-0 ${highlightDotColor}`}
                            title={`Terhubung ke data nomor ${connectedNomor.provider} (${connectedNomor.nomorKartu})`}
                          />
                        )}
                      </div>
 
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-1 -mr-1">
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
                          <DropdownMenuItem onClick={() => setEditingAccount(acc)}>
                            <Edit className="h-4 w-4 text-text-secondary" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingAccount(acc)}
                            className="text-danger hover:bg-danger-soft"
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                            <span>Hapus</span>
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                    </div>
 
                    {/* Details Section */}
                    <div className="flex flex-col gap-2 text-[12.5px] font-sans text-text-secondary mt-1">
                      {/* Device field */}
                      <div className="flex items-center justify-between gap-2">
                        <span>Device</span>
                        <span className="font-semibold text-text-primary">{acc.device || "–"}</span>
                      </div>
 
                      {/* No HP field */}
                      <div className="flex items-center justify-between gap-2">
                        <span>No HP</span>
                        <span className="font-semibold text-text-primary font-mono">{acc.nomorHp || "–"}</span>
                      </div>
 
                      {/* Custom columns fields */}
                      {aplikasi.kolom.map((col) => {
                        const val = acc.customValues[col.id];
                        return (
                          <div key={col.id} className="flex items-center justify-between gap-2 pt-2 border-t border-border-soft/40">
                            <span>{col.namaKolom}</span>
                            <span className="font-semibold text-text-primary">
                              {formatValue(val, col.tipeKolom)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
              <option value="TANGGAL">Tanggal (Hari / Bulan / Tahun)</option>
              <option value="RUMUS">Rumus (Kalkulasi Otomatis)</option>
            </Select>
          </div>

          {tipeKolom === "RUMUS" && (
            <div className="flex flex-col gap-2.5 p-3.5 bg-bg-page/60 border border-border-soft rounded-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Ekspresi Rumus
                </label>
                <Input
                  type="text"
                  value={rumus}
                  onChange={(e) => setRumus(e.target.value)}
                  placeholder="Contoh: 8 - limit atau (harga * jumlah) - diskon"
                  required
                />
                <span className="text-[11px] text-text-secondary">
                  Dapat menggunakan nama kolom (misal: <code className="text-accent bg-accent-soft/30 px-1 py-0.5 rounded font-mono">limit</code>), nilai target (misal: <code className="text-accent bg-accent-soft/30 px-1 py-0.5 rounded font-mono">target limit</code>), atau angka. Contoh: <code className="text-accent bg-accent-soft/30 px-1 py-0.5 rounded font-mono">target limit - limit</code>
                </span>
              </div>

              {/* Column Chips */}
              {aplikasi.kolom.filter((c) => !editingColumn || c.id !== editingColumn.id).length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[11px] font-semibold text-text-secondary">
                    Klik Kolom untuk Menyisipkan Ke Rumus:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {aplikasi.kolom
                      .filter((c) => !editingColumn || c.id !== editingColumn.id)
                      .map((c) => (
                        <div key={c.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRumus((prev) => (prev ? `${prev} [${c.namaKolom}]` : `[${c.namaKolom}]`))}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-bg-surface border border-border-soft hover:border-accent hover:text-accent transition-colors cursor-pointer select-none"
                          >
                            +{c.namaKolom}
                          </button>
                          {c.isTarget && (
                            <button
                              type="button"
                              onClick={() => setRumus((prev) => (prev ? `${prev} target [${c.namaKolom}]` : `target [${c.namaKolom}]`))}
                              className="text-xs font-medium px-2 py-1 rounded-lg bg-target-bg border border-target-text/20 text-target-text hover:bg-target-hover transition-colors cursor-pointer select-none"
                              title={`Menyisipkan nilai target dari ${c.namaKolom}`}
                            >
                              🎯 Target {c.namaKolom}
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Operator Buttons */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-text-secondary">
                  Operator Matematika:
                </span>
                <div className="flex flex-wrap gap-1">
                  {["+", "-", "*", "/", "(", ")"].map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setRumus((prev) => (prev ? `${prev} ${op} ` : `${op} `))}
                      className="text-xs font-mono font-bold w-8 h-8 rounded-lg bg-bg-surface border border-border-soft hover:bg-accent-soft hover:text-accent flex items-center justify-center transition-colors cursor-pointer select-none"
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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

          {(tipeKolom === "NOMOR" || tipeKolom === "NOMINAL" || tipeKolom === "RUMUS") && (
            <div className="flex items-center gap-2 py-1">
              <Checkbox
                id="isAccumulated"
                checked={isAccumulated}
                onCheckedChange={(checked) => setIsAccumulated(Boolean(checked))}
              />
              <label htmlFor="isAccumulated" className="text-xs font-semibold text-text-primary cursor-pointer select-none">
                Tampilkan Akumulasi (Total baris terakhir)
              </label>
            </div>
          )}

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
                  type="text"
                  inputMode="numeric"
                  value={formatNumberInput(nilaiTarget)}
                  onChange={(e) => setNilaiTarget(parseNumberInput(e.target.value))}
                  placeholder="Contoh: 1.000.000"
                  required
                />
              ) : tipeKolom === "TANGGAL" ? (
                <Input
                  type="date"
                  value={nilaiTarget}
                  onChange={(e) => setNilaiTarget(e.target.value)}
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
            <AccountAutofillPicker
              accounts={allExistingAccounts}
              onSelectAccount={({ nama, device, nomorHp }) => {
                setNamaAkun(nama);
                setDeviceAkun(device);
                setNoHpAkun(nomorHp);
              }}
            />
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

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary">No HP (Opsional)</label>
            {nomorList.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Pilih dari Data Nomor</span>
                <Select
                  value={nomorList.find(n => n.nomorKartu === noHpAkun)?.id || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const match = nomorList.find((n) => n.id === selectedId);
                    if (match) {
                      setNoHpAkun(match.nomorKartu);
                    } else {
                      setNoHpAkun("");
                    }
                  }}
                >
                  <option value="">-- Ketik Manual / Pilih Kartu --</option>
                  {nomorList.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.provider} - {n.nomorKartu}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {nomorList.length > 0 && (
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Nomor Terpilih / Input Manual</span>
              )}
              <Input
                type="text"
                value={noHpAkun}
                onChange={(e) => setNoHpAkun(e.target.value)}
                placeholder="Contoh: 081234567890"
              />
            </div>
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

                    {col.tipeKolom === "RUMUS" && (
                      <div className="p-3 bg-bg-page/50 border border-border-soft/60 rounded-xl text-xs text-text-secondary flex items-center justify-between font-mono">
                        <span>Kalkulasi Otomatis: <code className="text-accent">{col.rumus || "–"}</code></span>
                        <span className="font-semibold text-text-primary">
                          {evaluateFormula(col.rumus, customValues, aplikasi.kolom) ?? "–"}
                        </span>
                      </div>
                    )}

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
                        type="text"
                        inputMode="numeric"
                        value={formatNumberInput(val !== undefined && val !== null ? val : "")}
                        onChange={(e) => {
                          const parsed = parseNumberInput(e.target.value);
                          setCustomValues({
                            ...customValues,
                            [col.id]: parsed === "" || parsed === "-" ? "" : Number(parsed),
                          });
                        }}
                        placeholder="Masukkan angka"
                      />
                    )}

                    {col.tipeKolom === "NOMINAL" && (
                      <Input
                        type="text"
                        inputMode="numeric"
                        prefixText="Rp"
                        value={formatNumberInput(val !== undefined && val !== null ? val : "")}
                        onChange={(e) => {
                          const parsed = parseNumberInput(e.target.value);
                          setCustomValues({
                            ...customValues,
                            [col.id]: parsed === "" || parsed === "-" ? "" : Number(parsed),
                          });
                        }}
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

                    {col.tipeKolom === "TANGGAL" && (
                      <Input
                        type="date"
                        value={val || ""}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [col.id]: e.target.value,
                          })
                        }
                      />
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
        <div className="flex flex-col font-sans pt-1">
          <div className="flex flex-col">
            
            {/* Row 1: Nama Akun */}
            <div className="flex items-center gap-3.5 py-3.5 border-b border-border-soft">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-col grow min-w-0">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Nama Akun</span>
                <span className="text-[15px] font-bold text-text-primary mt-0.5 truncate">
                  {selectedDetailAccount?.nama}
                </span>
              </div>
            </div>

            {/* Row 2: Perangkat */}
            <div className="flex items-center justify-between gap-3.5 py-3.5 border-b border-border-soft">
              <div className="flex items-center gap-3.5 min-w-0 grow">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex flex-col grow min-w-0">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Perangkat</span>
                  <span className="text-[15px] font-bold text-text-primary mt-0.5 truncate">
                    {selectedDetailAccount?.device || <span className="text-text-secondary/50 font-normal italic select-none">Tidak ada</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                <span className="text-[11px] font-medium text-text-secondary hidden sm:inline">Kolom</span>
                <Switch
                  checked={showDeviceColumn}
                  onCheckedChange={handleToggleDeviceColumn}
                  title={showDeviceColumn ? "Sembunyikan kolom Perangkat di tabel" : "Tampilkan kolom Perangkat di tabel"}
                />
              </div>
            </div>

            {/* Row 3: Nomor HP & Copy Button */}
            <div className="flex items-center justify-between py-3.5">
              <div className="flex items-center gap-3.5 min-w-0 grow">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/10">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex flex-col min-w-0 grow">
                  <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Nomor HP</span>
                  <span className="text-[16px] font-mono font-bold text-text-primary mt-0.5 truncate">
                    {selectedDetailAccount?.nomorHp || <span className="text-text-secondary/50 font-normal italic select-none">Tidak ada</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                <span className="text-[11px] font-medium text-text-secondary hidden sm:inline">Kolom</span>
                <Switch
                  checked={showNomorHpColumn}
                  onCheckedChange={handleToggleNomorHpColumn}
                  title={showNomorHpColumn ? "Sembunyikan kolom Nomor HP di tabel" : "Tampilkan kolom Nomor HP di tabel"}
                />
                {selectedDetailAccount?.nomorHp && (
                  <button
                    type="button"
                    className="p-2.5 rounded-2xl border border-border-soft text-text-secondary hover:text-accent hover:bg-accent-soft hover:border-accent/30 transition-all shadow-sm shrink-0 ml-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(selectedDetailAccount.nomorHp || "");
                      toast.success("Nomor HP disalin!");
                    }}
                    title="Salin Nomor HP"
                  >
                    <Copy className="h-4 w-4 shrink-0" />
                  </button>
                )}
              </div>
            </div>

            {/* Connected Card Info */}
            {selectedDetailAccount && (() => {
              const connected = getConnectedNomor(selectedDetailAccount.nomorHp);
              const highlightColor = getHighlightDot(connected);
              if (!connected) return null;

              return (
                <div className="mt-3 bg-bg-page/50 border border-border-soft p-4 rounded-2xl flex flex-col gap-2.5 shadow-sm">
                  <div className="flex items-center justify-between pb-1 border-b border-border-soft/50">
                    <h5 className="text-[11px] font-bold text-accent uppercase tracking-wider">Kartu Terhubung (Data Nomor)</h5>
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${highlightColor}`} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Provider</span>
                    <span className="text-xs font-bold text-text-primary">{connected.provider}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Masa Aktif</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                      highlightColor === "bg-rose-500" ? "text-danger bg-danger-soft font-semibold" :
                      highlightColor === "bg-amber-500" ? "text-amber-600 bg-amber-500/10 font-semibold" :
                      "text-accent bg-accent-soft font-semibold"
                    }`}>
                      {new Date(connected.masaAktif).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-secondary">Pulsa</span>
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {connected.pulsa ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(connected.pulsa) : "-"}
                    </span>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Action button: Tutup */}
          <div className="flex items-center justify-end mt-4 pt-3 border-t border-border-soft">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDetailAccount(null)}
              className="h-10 px-5 font-semibold rounded-2xl shadow-sm bg-bg-surface"
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
            <span className="text-xs font-semibold text-text-secondary select-none">Logo Aplikasi (Opsional)</span>
            <label
              htmlFor="app-logo-upload"
              className="flex items-center justify-center border border-dashed border-border-soft p-5 rounded-3xl bg-bg-page/50 cursor-pointer hover:bg-accent-soft/10 hover:border-accent/40 transition-all duration-200 min-h-[96px] w-full"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="app-logo-upload"
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
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 grow min-w-0">
                    <span className="text-xs font-semibold text-text-primary truncate">
                      Logo Terpilih
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="h-8 text-xs text-danger hover:bg-danger-soft/50 font-semibold px-2.5"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Hapus Logo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </label>
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

      {/* Floating Calculator Popover for Nominal/Nomor Cells */}
      {calcCellState.isOpen && (
        <CalculatorPopover
          isOpen={calcCellState.isOpen}
          title={`Kalkulator ${calcCellState.colName}`}
          initialValue={calcCellState.initialVal}
          onClose={() => setCalcCellState((prev) => ({ ...prev, isOpen: false }))}
          onApply={(val) => {
            handleInlineSave(calcCellState.accountId, calcCellState.columnId, val);
          }}
        />
      )}
    </div>
  );
}
