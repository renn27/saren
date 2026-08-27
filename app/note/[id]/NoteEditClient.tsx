"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Tag,
  Palette,
  Plus,
  X,
  FileText,
  CheckSquare,
  Table,
  MoreHorizontal,
  Settings,
  Copy,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sigma,
  Calendar,
  Type,
  Calculator,
  Banknote,
  SlidersHorizontal,
  Image as ImageIcon,
  Share2,
  Folder,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, AlertDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  evaluateTableNoteFormula,
  formatTableFormulaResult,
} from "@/lib/utils/formulaEvaluator";
import { compressImageFile } from "@/lib/utils/imageCompressor";
import {
  updateNote,
  trashNote,
  togglePinNote,
  toggleArchiveNote,
  duplicateNote,
  uploadNoteImage,
  deleteNoteImage,
  fetchLinkMetadata,
  assignNoteToFolder,
} from "@/lib/actions/note";
import { triggerHaptic } from "@/lib/utils/haptics";

// ─── Color palette ──────────────────────────────────────────────────────────
const colorMap: Record<
  string,
  { bg: string; bgDark: string; name: string; hex: string }
> = {
  default: { bg: "",          bgDark: "",              name: "Bawaan",    hex: "" },
  red:     { bg: "#FFF1F2",   bgDark: "#2D161A",       name: "Merah",     hex: "#E11D48" },
  orange:  { bg: "#FFF7ED",   bgDark: "#331C0E",       name: "Jingga",    hex: "#EA580C" },
  yellow:  { bg: "#FEFCE8",   bgDark: "#2D280F",       name: "Kuning",    hex: "#CA8A04" },
  green:   { bg: "#F0FDF4",   bgDark: "#112918",       name: "Hijau",     hex: "#16A34A" },
  teal:    { bg: "#F0FDFA",   bgDark: "#0E2725",       name: "Teal",      hex: "#0D9488" },
  blue:    { bg: "#F0F9FF",   bgDark: "#10253A",       name: "Biru",      hex: "#0284C7" },
  darkblue:{ bg: "#EEF2FF",   bgDark: "#151D44",       name: "Biru Tua",  hex: "#4F46E5" },
  purple:  { bg: "#FAF5FF",   bgDark: "#22153D",       name: "Ungu",      hex: "#9333EA" },
  pink:    { bg: "#FDF2F8",   bgDark: "#2F1424",       name: "Pink",      hex: "#DB2777" },
  brown:   { bg: "#FAF7F2",   bgDark: "#251B15",       name: "Cokelat",   hex: "#854D0E" },
  gray:    { bg: "#F8FAFC",   bgDark: "#1E293B",       name: "Abu-abu",   hex: "#475569" },
};

// ─── Types ───────────────────────────────────────────────────────────────────
type NoteListItem = {
  id: string;
  noteId: string;
  text: string;
  isCompleted: boolean;
  urutan: number;
};

type Label = { id: string; name: string };

type Note = {
  id: string;
  title: string | null;
  content: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  color: string;
  isList: boolean;
  isTable: boolean;
  imageUrl: string | null;
  folderId: string | null;
  folder?: { id: string; name: string } | null;
  listItems: NoteListItem[];
  labels: Label[];
  reminderAt: Date | string | null;
  reminderMinutesBefore: number;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
};

interface Props {
  initialNote: Note;
  initialLabels: Label[];
  initialFolders: { id: string; name: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseNumericValue(val: string): number {
  if (!val) return NaN;
  
  // Remove spaces, currency notation like Rp, $, and other non-numeric characters except negative sign, period, and comma
  const cleanVal = val.replace(/[^\d\-\,\.]/g, "");
  if (!cleanVal) return NaN;
  
  // If both dot and comma exist, e.g. "1.250,5" -> "1250.5"
  if (cleanVal.includes(".") && cleanVal.includes(",")) {
    const cleaned = cleanVal.replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(cleaned);
  }
  
  // If multiple dots exist (thousands separator)
  if ((cleanVal.match(/\./g) || []).length > 1) {
    return parseFloat(cleanVal.replace(/\./g, ""));
  }
  
  // If multiple commas exist (thousands separator)
  if ((cleanVal.match(/,/g) || []).length > 1) {
    return parseFloat(cleanVal.replace(/,/g, ""));
  }
  
  // If single dot exists
  if (cleanVal.includes(".")) {
    const parts = cleanVal.split(".");
    // If it has exactly 3 digits after the dot, e.g. "1.500", treat as thousands unless it's like "0.123"
    if (parts[1].length === 3 && parts[0] !== "0") {
      return parseFloat(cleanVal.replace(/\./g, ""));
    }
    return parseFloat(cleanVal);
  }
  
  // If single comma exists
  if (cleanVal.includes(",")) {
    const parts = cleanVal.split(",");
    if (parts[1].length === 3 && parts[0] !== "0") {
      return parseFloat(cleanVal.replace(/,/g, ""));
    }
    return parseFloat(cleanVal.replace(/,/g, "."));
  }
  
  return parseFloat(cleanVal);
}

export type TableColumnType = "TEKS" | "NOMINAL" | "TANGGAL" | "CENTANG" | "RUMUS";

export interface NoteTableData {
  headers: string[];
  rows: string[][];
  accumulatedCols: boolean[];
  columnTypes: TableColumnType[];
  columnFormulas: string[];
}

function calculateColumnTotal(
  rows: string[][],
  colIndex: number,
  headers?: string[],
  columnTypes?: TableColumnType[],
  columnFormulas?: string[]
): string {
  let total = 0;
  let hasNumber = false;
  const isRumus = columnTypes?.[colIndex] === "RUMUS";
  const formula = columnFormulas?.[colIndex];

  for (let ri = 0; ri < rows.length; ri++) {
    if (isRumus && headers && formula) {
      const calculated = evaluateTableNoteFormula(formula, headers, rows, ri, colIndex);
      if (calculated !== null && !isNaN(calculated)) {
        total += calculated;
        hasNumber = true;
      }
    } else {
      const val = rows[ri]?.[colIndex];
      if (!val) continue;

      const num = parseNumericValue(val);
      if (!isNaN(num)) {
        total += num;
        hasNumber = true;
      }
    }
  }

  if (!hasNumber) return "";

  const isNominal = columnTypes?.[colIndex] === "NOMINAL";
  const prefix = isNominal ? "Rp " : "";

  if (Number.isInteger(total)) {
    return `${prefix}${new Intl.NumberFormat("id-ID").format(total)}`;
  } else {
    // Format float with up to 4 decimal places
    return `${prefix}${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 4,
    }).format(total)}`;
  }
}

function parseTable(content: string | null): NoteTableData {
  try {
    const p = JSON.parse(content || "{}") as {
      headers: string[];
      rows: string[][];
      accumulatedCols?: boolean[];
      columnTypes?: TableColumnType[];
      columnFormulas?: string[];
    };
    if (p.headers && p.rows) {
      const accumulatedCols = p.accumulatedCols || new Array(p.headers.length).fill(false);
      while (accumulatedCols.length < p.headers.length) {
        accumulatedCols.push(false);
      }

      const columnTypes = (p.columnTypes || new Array(p.headers.length).fill("TEKS")).map(
        (t) => (t === "NOMINAL" || t === "TANGGAL" || t === "CENTANG" || t === "RUMUS" ? t : "TEKS")
      );
      while (columnTypes.length < p.headers.length) {
        columnTypes.push("TEKS");
      }

      const columnFormulas = p.columnFormulas || new Array(p.headers.length).fill("");
      while (columnFormulas.length < p.headers.length) {
        columnFormulas.push("");
      }

      return {
        headers: p.headers,
        rows: p.rows,
        accumulatedCols: accumulatedCols.slice(0, p.headers.length),
        columnTypes: columnTypes.slice(0, p.headers.length) as TableColumnType[],
        columnFormulas: columnFormulas.slice(0, p.headers.length),
      };
    }
  } catch {}
  return {
    headers: ["Kolom 1", "Kolom 2"],
    rows: [["", ""]],
    accumulatedCols: [false, false],
    columnTypes: ["TEKS", "TEKS"],
    columnFormulas: ["", ""],
  };
}

function formatToDateTimeLocal(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function serializeNote(n: Note) {
  return JSON.stringify({
    title: n.title || "",
    content: n.isList ? "" : n.content || "",
    color: n.color,
    isList: n.isList,
    isTable: n.isTable,
    imageUrl: n.imageUrl,
    folderId: n.folderId,
    reminderAt: n.reminderAt ? new Date(n.reminderAt).toISOString() : null,
    reminderMinutesBefore: n.reminderMinutesBefore,
    listItems: n.listItems.map((it) => ({ text: it.text, isCompleted: it.isCompleted })),
    labelIds: n.labels.map((l) => l.id),
  });
}

const extractUrls = (text: string | null): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const matches = text.match(urlRegex) || [];
  return matches
    .map((url) => url.replace(/[\.,\)\(\]\[!\?]+$/, ""))
    .filter((value, index, self) => self.indexOf(value) === index);
};

// ─── Main component ──────────────────────────────────────────────────────────
export function NoteEditClient({ initialNote, initialLabels, initialFolders }: Props) {
  const router = useRouter();
  const [note, setNote] = React.useState<Note>(initialNote);
  const [newItem, setNewItem] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = React.useState(false);

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    isDanger: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    isDanger: false,
    onConfirm: () => {},
  });
  const [openMenu, setOpenMenu] = React.useState<"color" | "label" | "type" | "share" | "folder" | "reminder" | "more" | null>(null);
  const [activeSubMenu, setActiveSubMenu] = React.useState<"label" | "folder" | "type" | "share" | null>(null);
  const [tempReminderAt, setTempReminderAt] = React.useState(
    initialNote.reminderAt ? formatToDateTimeLocal(initialNote.reminderAt) : ""
  );
  const [tempReminderBefore, setTempReminderBefore] = React.useState(
    initialNote.reminderMinutesBefore || 0
  );

  React.useEffect(() => {
    if (openMenu !== "more") {
      setActiveSubMenu(null);
    }
  }, [openMenu]);

  const isFirstRender = React.useRef(true);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const lastSavedRef = React.useRef<string>(serializeNote(initialNote));
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Link Previews State
  const [linkPreviews, setLinkPreviews] = React.useState<{
    url: string;
    title: string;
    description: string;
    image: string | null;
  }[]>([]);

  // Keep track of loaded preview URLs to prevent double fetches
  const loadedUrlsRef = React.useRef<Set<string>>(new Set());

  // Detect and fetch web link previews
  React.useEffect(() => {
    if (note.isList || note.isTable) {
      setLinkPreviews([]);
      loadedUrlsRef.current.clear();
      return;
    }

    const urls = extractUrls(note.content);
    if (urls.length === 0) {
      setLinkPreviews([]);
      loadedUrlsRef.current.clear();
      return;
    }

    // Remove previews for URLs that are no longer in note.content
    setLinkPreviews((prev) => prev.filter((p) => urls.includes(p.url)));
    
    // Sync the loaded URLs set
    const urlSet = new Set(urls);
    loadedUrlsRef.current.forEach((url) => {
      if (!urlSet.has(url)) {
        loadedUrlsRef.current.delete(url);
      }
    });

    // Fetch previews for new URLs
    urls.forEach(async (url) => {
      if (loadedUrlsRef.current.has(url)) return;
      loadedUrlsRef.current.add(url);

      try {
        const metadata = await fetchLinkMetadata(url);
        if (metadata) {
          setLinkPreviews((prev) => {
            if (prev.some((p) => p.url === url)) return prev;
            return [...prev, metadata];
          });
        }
      } catch (err) {
        console.error("Failed to fetch link metadata for:", url, err);
        loadedUrlsRef.current.delete(url);
      }
    });
  }, [note.content, note.isList, note.isTable]);

  // Dynamic status text
  const statusText = React.useMemo(() => {
    if (isSaving) return "Menyimpan...";
    if (!note.updatedAt) return "";

    const date = new Date(note.updatedAt);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let relativeStr = "";
    if (diffInSeconds < 0 || diffInSeconds < 5) {
      relativeStr = "baru saja";
    } else if (diffInSeconds < 60) {
      relativeStr = `${diffInSeconds} detik lalu`;
    } else {
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) {
        relativeStr = `${diffInMinutes} menit lalu`;
      } else {
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
          relativeStr = `${diffInHours} jam lalu`;
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          if (diffInDays < 7) {
            relativeStr = `${diffInDays} hari lalu`;
          } else {
            const diffInWeeks = Math.floor(diffInDays / 7);
            if (diffInDays < 30) {
              relativeStr = `${diffInWeeks} minggu lalu`;
            } else {
              const diffInMonths = Math.floor(diffInDays / 30);
              if (diffInMonths < 12) {
                relativeStr = `${Math.max(1, diffInMonths)} bulan lalu`;
              } else {
                const diffInYears = Math.floor(diffInDays / 365);
                relativeStr = `${Math.max(1, diffInYears)} tahun lalu`;
              }
            }
          }
        }
      }
    }

    const timeFormatted = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(":", ".");

    return `Diedit ${timeFormatted} (${relativeStr})`;
  }, [isSaving, note.updatedAt]);

  // Close popover on outside click
  React.useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Auto-grow textarea with scroll jump lock
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    
    const scrollContainer = el.closest("main") || document.documentElement;
    const scrollTop = scrollContainer.scrollTop;
    const winScrollY = window.scrollY;
    
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    
    scrollContainer.scrollTop = scrollTop;
    if (window.scrollY !== winScrollY) {
      window.scrollTo(window.scrollX, winScrollY);
    }
  }, [note.content]);

  const save = React.useCallback(
    async (n: Note) => {
      const currentData = serializeNote(n);
      if (currentData === lastSavedRef.current) return; // Skip DB hit if data hasn't changed

      lastSavedRef.current = currentData;
      setIsSaving(true);
      const res = await updateNote(n.id, {
        title: n.title || "",
        content: n.isList ? "" : n.content || "",
        listItems: n.isList
          ? n.listItems.map((it, idx) => ({
              text: it.text,
              isCompleted: it.isCompleted,
              urutan: idx,
            }))
          : [],
        labelIds: n.labels.map((l) => l.id),
        color: n.color,
        imageUrl: n.imageUrl,
        folderId: n.folderId,
        reminderAt: n.reminderAt,
        reminderMinutesBefore: n.reminderMinutesBefore,
      });

      if (res.success && res.data) {
        setNote((p) => ({ ...p, updatedAt: new Date(res.data.updatedAt) }));
      }
      setIsSaving(false);
    },
    []
  );

  // Debounced auto-save
  React.useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => save(note), 1200);
    return () => clearTimeout(t);
  }, [note.title, note.content, note.color, note.isList, note.isTable, note.listItems, note.labels, note.imageUrl, note.folderId, note.reminderAt, note.reminderMinutesBefore, save]);

  // Save on unmount (e.g. if user navigates away via sidebar)
  const noteRef = React.useRef(note);
  React.useEffect(() => {
    noteRef.current = note;
  }, [note]);

  React.useEffect(() => {
    return () => {
      const currentData = serializeNote(noteRef.current);
      if (currentData !== lastSavedRef.current) {
        updateNote(noteRef.current.id, {
          title: noteRef.current.title || "",
          content: noteRef.current.isList ? "" : noteRef.current.content || "",
          listItems: noteRef.current.isList
            ? noteRef.current.listItems.map((it, idx) => ({
                text: it.text,
                isCompleted: it.isCompleted,
                urutan: idx,
              }))
            : [],
          labelIds: noteRef.current.labels.map((l) => l.id),
          color: noteRef.current.color,
          imageUrl: noteRef.current.imageUrl,
          folderId: noteRef.current.folderId,
          reminderAt: noteRef.current.reminderAt,
          reminderMinutesBefore: noteRef.current.reminderMinutesBefore,
        });
      }
    };
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const textarea = e.currentTarget;
      const val = textarea.value;
      const selStart = textarea.selectionStart;
      const selEnd = textarea.selectionEnd;

      if (selStart !== selEnd) return;

      const lastNewline = val.lastIndexOf("\n", selStart - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
      const currentLine = val.substring(lineStart, selStart);

      // Match numbered list: e.g., "1. " or "  12. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
      // Match bullet list: e.g., "- " or "* " or "• "
      const bulletMatch = currentLine.match(/^(\s*)([\-\*\u2022])\s+(.+)$/);

      // Match empty list items: e.g., just "1. " or "- " to end the list
      const emptyNumMatch = currentLine.match(/^(\s*)(\d+)\.\s*$/);
      const emptyBulletMatch = currentLine.match(/^(\s*)([\-\*\u2022])\s*$/);

      if (emptyNumMatch || emptyBulletMatch) {
        e.preventDefault();
        const before = val.substring(0, lineStart);
        const after = val.substring(selStart);
        const newValue = before + after;

        textarea.value = newValue;
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        setNote((p) => ({ ...p, content: newValue }));
        return;
      }

      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const nextNum = num + 1;
        const prefix = `\n${indent}${nextNum}. `;

        const before = val.substring(0, selStart);
        const after = val.substring(selStart);
        const newValue = before + prefix + after;

        textarea.value = newValue;
        const newCursorPos = selStart + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        setNote((p) => ({ ...p, content: newValue }));
        return;
      }

      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletSymbol = bulletMatch[2];
        const prefix = `\n${indent}${bulletSymbol} `;

        const before = val.substring(0, selStart);
        const after = val.substring(selStart);
        const newValue = before + prefix + after;

        textarea.value = newValue;
        const newCursorPos = selStart + prefix.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        setNote((p) => ({ ...p, content: newValue }));
        return;
      }
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    setIsUploadingImage(true);
    const toastId = toast.loading("Mengompresi & mengunggah gambar...");

    try {
      const compressedFile = await compressImageFile(file, 1200, 1200, 0.8);

      const formData = new FormData();
      formData.append("image", compressedFile);

      const res = await uploadNoteImage(note.id, formData);
      if (res.success && res.data) {
        setNote((p) => ({ ...p, imageUrl: res.data.imageUrl }));
        lastSavedRef.current = serializeNote({ ...note, imageUrl: res.data.imageUrl });
        toast.success("Gambar berhasil diunggah", { id: toastId });
      } else {
        toast.error(res.error || "Gagal mengunggah gambar", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal mengolah gambar", { id: toastId });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getCleanText = () => {
    let text = "";
    if (note.title) text += `=== ${note.title} ===\n\n`;

    if (note.isList) {
      text += note.listItems
        .map((it) => `${it.isCompleted ? "[x]" : "[ ]"} ${it.text}`)
        .join("\n");
    } else if (note.isTable) {
      const data = parseTable(note.content);
      if (data.headers && data.rows) {
        const resolvedRows = data.rows.map((row, ri) =>
          row.map((cell, ci) => {
            if (data.columnTypes[ci] === "RUMUS") {
              const formula = data.columnFormulas[ci];
              const calcVal = evaluateTableNoteFormula(formula, data.headers, data.rows, ri, ci);
              return formatTableFormulaResult(calcVal, formula);
            }
            return cell;
          })
        );

        const widths = data.headers.map((h, i) =>
          Math.max(h.length, ...resolvedRows.map((r) => (r[i] || "").length))
        );

        const border = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
        const formatRow = (row: string[]) =>
          "| " + row.map((cell, i) => (cell || "").padEnd(widths[i])).join(" | ") + " |";

        text += border + "\n" + formatRow(data.headers) + "\n" + border + "\n";
        resolvedRows.forEach((r) => {
          text += formatRow(r) + "\n";
        });
        text += border;

        const hasAccumulated = data.accumulatedCols.some(Boolean);
        if (hasAccumulated) {
          text += "\n\nTotal Akumulasi:\n";
          data.headers.forEach((h, idx) => {
            if (data.accumulatedCols[idx]) {
              const total = calculateColumnTotal(data.rows, idx, data.headers, data.columnTypes, data.columnFormulas);
              text += `- ${h}: Σ ${total}\n`;
            }
          });
        }
      }
    } else {
      text += note.content || "";
    }
    return text.trim();
  };

  const handleCopyCleanText = () => {
    const text = getCleanText();
    navigator.clipboard.writeText(text);
    toast.success("Teks bersih berhasil disalin!");
  };

  const handleNativeShare = async () => {
    const text = getCleanText();
    if (!navigator.share) {
      handleCopyCleanText();
      return;
    }

    try {
      await navigator.share({
        title: note.title || "Catatan SAREN",
        text: text,
      });
      toast.success("Berhasil dibagikan!");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        toast.error("Gagal membagikan catatan");
      }
    }
  };

  const handleExportAsPNG = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Gagal membuat canvas ekspor");
      return;
    }

    const width = 600;
    const padding = 40;
    const contentWidth = width - padding * 2;

    ctx.font = "16px Inter, sans-serif";

    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.includes("\n")) {
          const parts = word.split("\n");
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            const testLine = currentLine ? currentLine + " " + part : part;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = part;
            } else {
              currentLine = testLine;
            }
            if (j < parts.length - 1) {
              lines.push(currentLine);
              currentLine = "";
            }
          }
        } else {
          const testLine = currentLine ? currentLine + " " + word : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    let height = padding * 2 + 50;

    const titleText = note.title || (note.isList ? "Daftar Tanpa Judul" : "Catatan Tanpa Judul");
    ctx.font = "bold 24px Inter, sans-serif";
    const wrappedTitle = wrapText(titleText, contentWidth);
    height += (wrappedTitle.length - 1) * 30;

    let wrappedContentLines: string[] = [];
    let tableData: any = null;
    let tableRowHeights: number[] = [];
    let tableColWidths: number[] = [];

    if (note.isList) {
      height += note.listItems.length * 28 + 10;
    } else if (note.isTable) {
      tableData = parseTable(note.content);
      if (tableData.headers && tableData.rows) {
        const colsCount = tableData.headers.length;
        const colWidth = Math.floor(contentWidth / colsCount);
        tableColWidths = new Array(colsCount).fill(colWidth);

        const maxHeaderHeight = 35;
        ctx.font = "bold 13px Inter, sans-serif";
        tableRowHeights = tableData.rows.map((row: string[], ri: number) => {
          ctx.font = "13px Inter, sans-serif";
          let maxCellHeight = 30;
          row.forEach((cell, ci) => {
            let displayVal = cell;
            if (tableData.columnTypes[ci] === "RUMUS") {
              const formula = tableData.columnFormulas[ci];
              const calc = evaluateTableNoteFormula(formula, tableData.headers, tableData.rows, ri, ci);
              displayVal = formatTableFormulaResult(calc, formula);
            }
            const cellLines = wrapText(displayVal || "", colWidth - 10);
            maxCellHeight = Math.max(maxCellHeight, cellLines.length * 18 + 10);
          });
          return maxCellHeight;
        });

        height += maxHeaderHeight + tableRowHeights.reduce((a: number, b: number) => a + b, 0) + 15;

        const hasAccumulated = tableData.accumulatedCols.some(Boolean);
        if (hasAccumulated) {
          height += 35;
        }
      }
    } else {
      ctx.font = "16px Inter, sans-serif";
      const paragraphs = (note.content || "").split("\n");
      paragraphs.forEach((p) => {
        const lines = wrapText(p || " ", contentWidth);
        wrappedContentLines.push(...lines);
      });
      height += wrappedContentLines.length * 24 + 10;
    }

    height += 40;

    canvas.width = width;
    canvas.height = height;

    const noteColor = colorMap[note.color] || colorMap.default;
    const bgFill = note.color !== "default" ? noteColor.bg || "#FFFFFF" : "#FFFFFF";

    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    const textPrimary = "#0F172A";
    const textSecondary = "#64748B";
    const accentColor = "#0891B2";

    let currentY = padding + 30;

    ctx.fillStyle = textPrimary;
    ctx.font = "bold 24px Inter, sans-serif";
    wrappedTitle.forEach((line) => {
      ctx.fillText(line, padding, currentY);
      currentY += 30;
    });

    currentY += 15;

    if (note.isList) {
      ctx.font = "15px Inter, sans-serif";
      note.listItems.forEach((item) => {
        if (item.isCompleted) {
          ctx.fillStyle = accentColor;
          ctx.fillText("✓", padding, currentY);
          ctx.fillStyle = textSecondary;
        } else {
          ctx.strokeStyle = textSecondary;
          ctx.strokeRect(padding, currentY - 12, 12, 12);
          ctx.fillStyle = textPrimary;
        }
        ctx.fillText(item.text, padding + 22, currentY);
        currentY += 28;
      });
    } else if (note.isTable && tableData) {
      const startX = padding;
      const startY = currentY;

      ctx.fillStyle = "rgba(8, 145, 178, 0.08)";
      ctx.fillRect(startX, startY - 18, contentWidth, 30);

      ctx.fillStyle = accentColor;
      ctx.font = "bold 12px Inter, sans-serif";
      let colX = startX;
      tableData.headers.forEach((h: string, ci: number) => {
        ctx.fillText(h, colX + 8, startY + 2);
        colX += tableColWidths[ci];
      });

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, startY + 12);
      ctx.lineTo(startX + contentWidth, startY + 12);
      ctx.stroke();

      currentY = startY + 12;

      tableData.rows.forEach((row: string[], ri: number) => {
        const rowHeight = tableRowHeights[ri];
        ctx.fillStyle = textPrimary;
        ctx.font = "13px Inter, sans-serif";

        let cellX = startX;
        row.forEach((cell, ci) => {
          const colW = tableColWidths[ci];
          let displayVal = cell || "-";
          if (tableData.columnTypes[ci] === "RUMUS") {
            const formula = tableData.columnFormulas[ci];
            const calc = evaluateTableNoteFormula(formula, tableData.headers, tableData.rows, ri, ci);
            displayVal = formatTableFormulaResult(calc, formula);
          }
          const cellLines = wrapText(displayVal, colW - 10);

          let lineY = currentY + 18;
          cellLines.forEach((line) => {
            ctx.fillText(line, cellX + 8, lineY);
            lineY += 18;
          });
          cellX += colW;
        });

        ctx.strokeStyle = "#F1F5F9";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, currentY + rowHeight);
        ctx.lineTo(startX + contentWidth, currentY + rowHeight);
        ctx.stroke();

        currentY += rowHeight;
      });

      const hasAccumulated = tableData.accumulatedCols.some(Boolean);
      if (hasAccumulated) {
        ctx.fillStyle = "rgba(8, 145, 178, 0.04)";
        ctx.fillRect(startX, currentY, contentWidth, 30);

        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillStyle = accentColor;

        let cellX = startX;
        let firstNonAcc = -1;
        for (let i = 0; i < tableData.headers.length; i++) {
          if (!tableData.accumulatedCols[i]) {
            firstNonAcc = i;
            break;
          }
        }

        tableData.headers.forEach((_: any, ci: number) => {
          let cellVal = "";
          if (tableData.accumulatedCols[ci]) {
            const sum = calculateColumnTotal(tableData.rows, ci, tableData.headers, tableData.columnTypes, tableData.columnFormulas);
            cellVal = `Σ ${sum}`;
          } else if (ci === firstNonAcc) {
            cellVal = "Total";
          }
          if (cellVal) {
            ctx.fillText(cellVal, cellX + 8, currentY + 20);
          }
          cellX += tableColWidths[ci];
        });

        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(startX, currentY + 30);
        ctx.lineTo(startX + contentWidth, currentY + 30);
        ctx.stroke();

        currentY += 30;
      }
    } else {
      ctx.fillStyle = textPrimary;
      ctx.font = "15px Inter, sans-serif";
      wrappedContentLines.forEach((line) => {
        ctx.fillText(line, padding, currentY);
        currentY += 24;
      });
    }

    currentY = height - padding;
    ctx.strokeStyle = "#F1F5F9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY - 15);
    ctx.lineTo(width - padding, currentY - 15);
    ctx.stroke();

    ctx.fillStyle = textSecondary;
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillText("SAREN Notes", padding, currentY + 5);

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${note.title || "catatan"}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Gambar PNG berhasil diunduh!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengekspor gambar");
    }
  };

  const handleDeleteImage = () => {
    setShowDeleteImageConfirm(true);
  };

  const executeDeleteImage = async () => {
    const toastId = toast.loading("Menghapus gambar...");
    try {
      const res = await deleteNoteImage(note.id);
      if (res.success) {
        setNote((p) => ({ ...p, imageUrl: null }));
        lastSavedRef.current = serializeNote({ ...note, imageUrl: null });
        toast.success("Gambar berhasil dihapus", { id: toastId });
      } else {
        toast.error(res.error || "Gagal menghapus gambar", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal menghapus gambar", { id: toastId });
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleDone = async () => {
    await save(note);
    router.push("/note");
  };

  const handlePin = async () => {
    setNote((p) => ({ ...p, isPinned: !p.isPinned, isArchived: false }));
    await togglePinNote(note.id);
  };

  const handleArchive = async () => {
    const next = !note.isArchived;
    const performArchive = async () => {
      setNote((p) => ({ ...p, isArchived: next, isPinned: false }));
      await toggleArchiveNote(note.id);
      toast.success(next ? "Diarsipkan" : "Dipulihkan dari arsip");
      router.push("/note");
    };

    if (next) {
      setConfirmDialog({
        isOpen: true,
        title: "Arsipkan Catatan",
        description: "Arsipkan catatan ini? Catatan akan dipindahkan ke daftar arsip.",
        confirmText: "Arsip",
        isDanger: false,
        onConfirm: performArchive,
      });
    } else {
      await performArchive();
    }
  };

  const handleTrash = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Buang ke Sampah",
      description: "Apakah Anda yakin ingin membuang catatan ini ke sampah?",
      confirmText: "Buang",
      isDanger: true,
      onConfirm: async () => {
        await trashNote(note.id);
        toast.success("Dihapus ke sampah");
        router.push("/note");
      },
    });
  };

  const handleDuplicate = async () => {
    setOpenMenu(null);
    const toastId = toast.loading("Menduplikasi catatan...");
    
    // Save current changes first
    await save(note);
    
    const res = await duplicateNote(note.id);
    if (res.success && res.data) {
      toast.success("Salinan berhasil dibuat", { id: toastId });
      router.push("/note");
    } else {
      toast.error(res.error || "Gagal menduplikasi catatan", { id: toastId });
    }
  };

  const handleToggleLabel = (labelId: string) => {
    const has = note.labels.some((l) => l.id === labelId);
    const label = (initialLabels as Label[]).find((l) => l.id === labelId);
    setNote((p) => ({
      ...p,
      labels: has
        ? p.labels.filter((l) => l.id !== labelId)
        : label ? [...p.labels, label] : p.labels,
    }));
  };

  const handleAssignFolder = (folderId: string | null) => {
    const selected = (initialFolders as { id: string; name: string }[]).find((f) => f.id === folderId);
    setNote((p) => ({
      ...p,
      folderId,
      folder: selected ? { id: selected.id, name: selected.name } : null,
    }));
  };

  const handleSaveReminder = () => {
    if (!tempReminderAt) {
      toast.error("Pilih tanggal dan waktu terlebih dahulu");
      return;
    }
    const dateVal = new Date(tempReminderAt);
    if (isNaN(dateVal.getTime())) {
      toast.error("Format tanggal tidak valid");
      return;
    }
    setNote((prev) => ({
      ...prev,
      reminderAt: dateVal,
      reminderMinutesBefore: tempReminderBefore,
      reminderSent: false,
    }));
    setOpenMenu(null);
    toast.success("Pengingat berhasil disimpan!");
  };

  const handleDeleteReminder = () => {
    setNote((prev) => ({
      ...prev,
      reminderAt: null,
      reminderMinutesBefore: 0,
      reminderSent: false,
    }));
    setTempReminderAt("");
    setTempReminderBefore(0);
    setOpenMenu(null);
    toast.success("Pengingat dihapus");
  };

  // ── Type conversion ───────────────────────────────────────────────────────
  const convertTo = (type: "text" | "list" | "table") => {
    setNote((p) => {
      let content = p.content || "";
      let listItems: NoteListItem[] = p.listItems;
      let isList = false;
      let isTable = false;

      if (type === "text") {
        if (p.isList) content = p.listItems.map((i) => i.text).join("\n");
        else if (p.isTable) {
          const t = parseTable(p.content);
          content = [t.headers.join(" | "), ...t.rows.map((r) => r.join(" | "))].join("\n");
        }
        listItems = [];
      } else if (type === "list") {
        isList = true;
        if (!p.isList && !p.isTable) {
          listItems = content.split("\n").filter(Boolean).map((t, idx) => ({
            id: `tmp-${idx}`, noteId: p.id, text: t, isCompleted: false, urutan: idx,
          }));
        } else if (p.isTable) {
          const t = parseTable(p.content);
          listItems = t.rows.map((r, idx) => ({
            id: `tmp-${idx}`, noteId: p.id, text: r.join(" "), isCompleted: false, urutan: idx,
          }));
        }
        content = "";
      } else if (type === "table") {
        isTable = true;
        let headers = ["Kolom 1", "Kolom 2"];
        let rows = [["", ""]];
        if (p.isList) {
          headers = ["Tugas", "Status"];
          rows = p.listItems.map((i) => [i.text, i.isCompleted ? "✓" : ""]);
        } else if (!p.isTable) {
          const lines = content.split("\n").filter(Boolean);
          if (lines.length) rows = lines.map((l) => [l, ""]);
        }
        const accumulatedCols = new Array(headers.length).fill(false);
        const columnTypes = new Array(headers.length).fill("TEKS");
        const columnFormulas = new Array(headers.length).fill("");
        content = JSON.stringify({ headers, rows, accumulatedCols, columnTypes, columnFormulas });
        listItems = [];
      }

      return { ...p, isList, isTable, content, listItems };
    });
    setOpenMenu(null);
  };

  // ── Table helpers ─────────────────────────────────────────────────────────
  const updateTableContent = (fn: (t: NoteTableData) => NoteTableData) => {
    const t = parseTable(note.content);
    setNote((p) => ({ ...p, content: JSON.stringify(fn(t)) }));
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const color = colorMap[note.color] || colorMap.default;
  const pageBg =
    note.color === "default"
      ? "bg-bg-page dark:bg-bg-page"
      : `bg-[${color.bg}] dark:bg-[${color.bgDark}]`;

  // For inline style (Tailwind can't handle dynamic values)
  const pageStyle: React.CSSProperties =
    note.color !== "default"
      ? { backgroundColor: color.bg }
      : {};
  return (
    <div
      className="flex flex-col h-[100dvh] w-full overflow-hidden transition-colors duration-300"
      style={pageStyle}
    >
      <div
        className="z-10 shrink-0 flex items-center justify-between px-3 md:px-5 py-2 border-b border-black/6 dark:border-white/6 backdrop-blur-md bg-white/80 dark:bg-[#0F1623]/80 transition-colors duration-300"
        style={note.color !== "default" ? { backgroundColor: `${color.bg}cc` } : undefined}
      >
        {/* Back button */}
        <button
          onClick={handleDone}
          className="p-2 -ml-1 rounded-full text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0"
          title="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Centered Status Edit Text */}
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
          {statusText && (
            <span className="text-[11px] font-semibold text-text-secondary/70">
              {statusText}
            </span>
          )}
        </div>

        {/* Pin button on the right */}
        <button
          onClick={() => {
            triggerHaptic("medium");
            handlePin();
          }}
          className={twMerge(
            "p-2 rounded-full cursor-pointer transition-colors flex-shrink-0 active:scale-90",
            note.isPinned
              ? "text-accent hover:bg-accent/10"
              : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
          )}
          title={note.isPinned ? "Lepas sematan" : "Sematkan"}
        >
          {note.isPinned ? (
            <PinOff key="pinoff" className="h-[18px] w-[18px] animate-pin-snap" />
          ) : (
            <Pin key="pin" className="h-[18px] w-[18px] animate-pin-snap" />
          )}
        </button>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-6">

          {/* Image Preview */}
          {note.imageUrl && (
            <div className="relative mb-5 group rounded-2xl overflow-hidden border border-border-soft/60">
              <img
                src={note.imageUrl}
                alt="Catatan"
                className="w-full max-h-[350px] object-cover animate-image-reveal"
              />
              <button
                type="button"
                onClick={handleDeleteImage}
                className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/85 text-white hover:text-danger cursor-pointer transition-colors duration-200"
                title="Hapus Gambar"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>
          )}

          {/* Upload Progress */}
          {isUploadingImage && (
            <div className="mb-5 p-4 rounded-2xl bg-accent-soft flex items-center justify-center gap-3 border border-accent/20 animate-pulse">
              <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-accent animate-pulse">Mengompresi & mengunggah gambar...</span>
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            value={note.title || ""}
            placeholder="Judul"
            onChange={(e) => setNote((p) => ({ ...p, title: e.target.value }))}
            className="w-full bg-transparent border-none text-[22px] font-semibold text-text-primary focus:outline-none focus:ring-0 placeholder:text-text-secondary/40 p-0 mb-4 leading-snug"
          />

          {/* ── Body ──────────────────────────────────────────────────── */}
          {note.isTable ? (
            <TableEditor note={note} updateTableContent={updateTableContent} />
          ) : !note.isList ? (
            <textarea
              ref={textareaRef}
              value={note.content || ""}
              placeholder="Buat catatan..."
              onChange={(e) => setNote((p) => ({ ...p, content: e.target.value }))}
              onKeyDown={handleTextareaKeyDown}
              className="w-full bg-transparent border-none text-[15px] text-text-primary focus:outline-none focus:ring-0 resize-none leading-7 placeholder:text-text-secondary/40 p-0 min-h-[200px]"
            />
          ) : (
            <ChecklistEditor note={note} setNote={setNote} newItem={newItem} setNewItem={setNewItem} />
          )}

          {/* Link Previews & Clickable Links */}
          {(() => {
            const detectedUrls = extractUrls(note.content);
            if (detectedUrls.length === 0) return null;
            return (
              <div className="flex flex-col gap-3 mt-6 border-t border-black/5 dark:border-white/5 pt-4 select-none">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <span>🔗</span>
                  <span>Tautan Terdeteksi ({detectedUrls.length})</span>
                </span>
                <div className="flex flex-col gap-2">
                  {detectedUrls.map((url, idx) => {
                    const preview = linkPreviews.find((p) => p.url === url);
                    const href = url.startsWith("http") ? url : `https://${url}`;
                    let hostname = url;
                    try {
                      hostname = new URL(href).hostname;
                    } catch (e) {}

                    return (
                      <a
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-stretch rounded-xl border border-accent/25 hover:border-accent bg-bg-surface hover:bg-accent-soft/10 transition-all duration-200 overflow-hidden group/link cursor-pointer max-w-xl shadow-2xs"
                      >
                        <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
                          <span className="text-[13px] font-semibold text-accent group-hover:underline transition-colors truncate">
                            {preview?.title || url}
                          </span>
                          {preview?.description && (
                            <p className="text-[11.5px] text-text-secondary line-clamp-2 leading-relaxed">
                              {preview.description}
                            </p>
                          )}
                          <span className="text-[10px] text-text-secondary/70 font-mono truncate mt-auto">
                            {hostname}
                          </span>
                        </div>
                        {preview?.image && (
                          <div className="w-20 sm:w-24 bg-black/5 dark:bg-white/5 border-l border-border-soft flex-shrink-0 relative">
                            <img
                              src={preview.image}
                              alt="Pratinjau tautan"
                              className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Metadata pills (Folder, Reminder, Labels) */}
          {(note.folder || note.reminderAt || note.labels.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-6 items-center border-t border-black/5 dark:border-white/5 pt-4">
              {note.folder && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent-soft text-accent border border-accent/15">
                  <Folder className="h-3 w-3 shrink-0" />
                  <span>{note.folder.name}</span>
                  <button onClick={() => handleAssignFolder(null)} className="hover:text-danger cursor-pointer ml-0.5" title="Hapus Folder">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {note.reminderAt && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                  <Bell className="h-3 w-3 shrink-0" />
                  <span>
                    {new Date(note.reminderAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button onClick={handleDeleteReminder} className="hover:text-danger cursor-pointer ml-0.5" title="Hapus Pengingat">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {note.labels.map((label) => (
                <span key={label.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/8 dark:bg-white/10 text-text-secondary">
                  {label.name}
                  <button onClick={() => handleToggleLabel(label.id)} className="hover:text-danger cursor-pointer ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Bottom Action Toolbar ── */}
      <div
        ref={menuRef}
        className="h-12 shrink-0 border-t border-black/5 dark:border-white/5 backdrop-blur-md bg-white/85 dark:bg-[#0F1623]/85 transition-colors duration-300 flex items-center justify-between px-4 z-30"
        style={note.color !== "default" ? { backgroundColor: `${color.bg}cc` } : undefined}
      >
        {/* Left Side: Quick/Primary Actions */}
        <div className="flex items-center gap-1.5">
          {/* Color Palette Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={<Palette className="h-[18px] w-[18px]" />}
              label="Warna Catatan"
              active={openMenu === "color"}
              onClick={() => setOpenMenu(openMenu === "color" ? null : "color")}
            />
            {openMenu === "color" && (
              <Popover className="bottom-14 left-0 w-44 p-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-text-secondary px-1 uppercase tracking-wider">Pilih Warna</span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {Object.entries(colorMap).map(([id, c]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setNote((p) => ({ ...p, color: id }));
                        setOpenMenu(null);
                      }}
                      title={c.name}
                      className={twMerge(
                        "h-6 w-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110",
                        id === "default" ? "bg-bg-surface border-border-soft" : "border-transparent",
                        note.color === id && "ring-2 ring-offset-1 ring-accent"
                      )}
                      style={{ backgroundColor: id === "default" ? undefined : c.bg }}
                    />
                  ))}
                </div>
              </Popover>
            )}
          </div>

          {/* Reminder Selector Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={<Bell className="h-[18px] w-[18px]" />}
              label="Pengingat Catatan"
              active={openMenu === "reminder"}
              onClick={() => setOpenMenu(openMenu === "reminder" ? null : "reminder")}
            />
            {openMenu === "reminder" && (
              <Popover className="bottom-14 left-0 w-64 p-3 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-1">Setel Pengingat</span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-text-secondary">Pilih Tanggal & Waktu:</span>
                    <input
                      type="datetime-local"
                      value={tempReminderAt}
                      onChange={(e) => setTempReminderAt(e.target.value)}
                      className="w-full text-xs p-1.5 border border-border-soft rounded-lg bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-text-secondary">Ingatkan Sebelum:</span>
                    <select
                      value={tempReminderBefore}
                      onChange={(e) => setTempReminderBefore(Number(e.target.value))}
                      className="w-full text-xs p-1.5 border border-border-soft rounded-lg bg-bg-surface text-text-primary focus:outline-none focus:border-accent"
                    >
                      <option value={0}>Tepat Waktu</option>
                      <option value={5}>5 Menit Sebelum</option>
                      <option value={15}>15 Menit Sebelum</option>
                      <option value={30}>30 Menit Sebelum</option>
                      <option value={60}>1 Jam Sebelum</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleSaveReminder}
                      className="flex-1 py-1.5 px-2.5 bg-accent text-[11px] font-bold text-white rounded-lg hover:bg-accent/90 active:scale-95 transition-all cursor-pointer"
                    >
                      Simpan
                    </button>
                    {note.reminderAt && (
                      <button
                        onClick={handleDeleteReminder}
                        className="py-1.5 px-2.5 bg-danger-soft/20 text-danger hover:bg-danger-soft/30 rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </Popover>
            )}
          </div>

          {/* Upload Image Button */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
              disabled={isUploadingImage}
            />
            <ToolbarBtn
              icon={<ImageIcon className="h-[18px] w-[18px]" />}
              label={isUploadingImage ? "Mengunggah..." : "Tambah Gambar"}
              active={isUploadingImage}
              onClick={() => {
                if (!isUploadingImage) fileInputRef.current?.click();
              }}
            />
          </div>
        </div>

        {/* Right Side: Secondary Actions Dropdown */}
        <div className="relative">
          <ToolbarBtn
            icon={<MoreHorizontal className="h-[18px] w-[18px]" />}
            label="Opsi Lainnya"
            active={openMenu === "more"}
            onClick={() => {
              setOpenMenu(openMenu === "more" ? null : "more");
              setActiveSubMenu(null);
            }}
          />

          {openMenu === "more" && (
            <Popover className="bottom-14 right-0 w-52 p-1.5 flex flex-col gap-0.5 max-h-[75vh] overflow-y-auto z-40">
              {/* SUBMENU: Labels Manager */}
              {activeSubMenu === "label" && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveSubMenu(null)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8 rounded-lg cursor-pointer text-left w-full border-b border-border-soft/40 pb-1.5 mb-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Kembali
                  </button>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-2">Kelola Label</span>
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    {initialLabels.length === 0 ? (
                      <p className="text-[12px] text-text-secondary px-2 py-1">Belum ada label.</p>
                    ) : (
                      initialLabels.map((label) => (
                        <label key={label.id} className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none">
                          <input
                            type="checkbox"
                            checked={note.labels.some((l) => l.id === label.id)}
                            onChange={() => handleToggleLabel(label.id)}
                            className="rounded border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                          />
                          <span className="text-[13px] text-text-primary truncate">{label.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SUBMENU: Folder Selector */}
              {activeSubMenu === "folder" && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveSubMenu(null)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8 rounded-lg cursor-pointer text-left w-full border-b border-border-soft/40 pb-1.5 mb-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Kembali
                  </button>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-2">Pilih Folder</span>
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    <label
                      onClick={() => {
                        handleAssignFolder(null);
                        setOpenMenu(null);
                      }}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none"
                    >
                      <input
                        type="radio"
                        name="note-folder"
                        checked={!note.folderId}
                        readOnly
                        className="rounded-full border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                      />
                      <span className="text-[13px] text-text-primary italic truncate">Tanpa Folder</span>
                    </label>
                    {initialFolders.length === 0 ? (
                      <p className="text-[11px] text-text-secondary px-2 py-1 italic">Belum ada folder.</p>
                    ) : (
                      initialFolders.map((f) => (
                        <label
                          key={f.id}
                          onClick={() => {
                            handleAssignFolder(f.id);
                            setOpenMenu(null);
                          }}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none"
                        >
                          <input
                            type="radio"
                            name="note-folder"
                            checked={note.folderId === f.id}
                            readOnly
                            className="rounded-full border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                          />
                          <span className="text-[13px] text-text-primary truncate">{f.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* SUBMENU: Type Conversion */}
              {activeSubMenu === "type" && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveSubMenu(null)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8 rounded-lg cursor-pointer text-left w-full border-b border-border-soft/40 pb-1.5 mb-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Kembali
                  </button>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-2">Ubah Tipe Catatan</span>
                  <div className="flex flex-col gap-0.5">
                    {!note.isList && !note.isTable && (
                      <>
                        <MenuOption icon={<CheckSquare className="h-4 w-4" />} label="Ubah ke Checklist" onClick={() => { convertTo("list"); setOpenMenu(null); }} />
                        <MenuOption icon={<Table className="h-4 w-4" />} label="Ubah ke Tabel" onClick={() => { convertTo("table"); setOpenMenu(null); }} />
                      </>
                    )}
                    {note.isList && (
                      <>
                        <MenuOption icon={<FileText className="h-4 w-4" />} label="Ubah ke Teks" onClick={() => { convertTo("text"); setOpenMenu(null); }} />
                        <MenuOption icon={<Table className="h-4 w-4" />} label="Ubah ke Tabel" onClick={() => { convertTo("table"); setOpenMenu(null); }} />
                      </>
                    )}
                    {note.isTable && (
                      <>
                        <MenuOption icon={<FileText className="h-4 w-4" />} label="Ubah ke Teks" onClick={() => { convertTo("text"); setOpenMenu(null); }} />
                        <MenuOption icon={<CheckSquare className="h-4 w-4" />} label="Ubah ke Checklist" onClick={() => { convertTo("list"); setOpenMenu(null); }} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SUBMENU: Export & Share */}
              {activeSubMenu === "share" && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setActiveSubMenu(null)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8 rounded-lg cursor-pointer text-left w-full border-b border-border-soft/40 pb-1.5 mb-1"
                  >
                    <ArrowLeft className="h-3 w-3" /> Kembali
                  </button>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-2">Ekspor & Bagikan</span>
                  <div className="flex flex-col gap-0.5">
                    <MenuOption
                      icon={<Copy className="h-4 w-4" />}
                      label="Salin Teks Bersih"
                      onClick={() => {
                        handleCopyCleanText();
                        setOpenMenu(null);
                      }}
                    />
                    {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                      <MenuOption
                        icon={<Share2 className="h-4 w-4" />}
                        label="Bagikan Teks (Sistem)"
                        onClick={() => {
                          handleNativeShare();
                          setOpenMenu(null);
                        }}
                      />
                    )}
                    <MenuOption
                      icon={<ImageIcon className="h-4 w-4" />}
                      label="Unduh Gambar PNG"
                      onClick={() => {
                        handleExportAsPNG();
                        setOpenMenu(null);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* MAIN MENU */}
              {!activeSubMenu && (
                <>
                  <MenuOption
                    icon={<Tag className="h-4 w-4" />}
                    label="Ubah Label"
                    onClick={() => setActiveSubMenu("label")}
                  />
                  <MenuOption
                    icon={<Folder className="h-4 w-4" />}
                    label="Ubah Folder"
                    onClick={() => setActiveSubMenu("folder")}
                  />
                  <MenuOption
                    icon={
                      note.isList ? <FileText className="h-4 w-4" />
                      : note.isTable ? <CheckSquare className="h-4 w-4" />
                      : <CheckSquare className="h-4 w-4" />
                    }
                    label="Ubah Tipe Catatan"
                    onClick={() => setActiveSubMenu("type")}
                  />
                  <MenuOption
                    icon={<Copy className="h-4 w-4" />}
                    label="Buat Salinan"
                    onClick={() => {
                      handleDuplicate();
                      setOpenMenu(null);
                    }}
                  />
                  <MenuOption
                    icon={note.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    label={note.isArchived ? "Pulihkan dari Arsip" : "Arsipkan Catatan"}
                    onClick={() => {
                      handleArchive();
                      setOpenMenu(null);
                    }}
                  />
                  <MenuOption
                    icon={<Share2 className="h-4 w-4" />}
                    label="Ekspor & Bagikan"
                    onClick={() => setActiveSubMenu("share")}
                  />
                  <MenuOption
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Hapus ke Sampah"
                    onClick={() => {
                      handleTrash();
                      setOpenMenu(null);
                    }}
                    danger
                  />
                </>
              )}
            </Popover>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting Image */}
      {showDeleteImageConfirm && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowDeleteImageConfirm(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          />
          
          {/* Modal Card */}
          <div className="relative bg-bg-surface border border-border-soft rounded-3xl shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-danger/10 text-danger">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Hapus Gambar</h3>
            </div>
            
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Apakah Anda yakin ingin menghapus gambar dari catatan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setShowDeleteImageConfirm(false)}
                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteImageConfirm(false);
                  await executeDeleteImage();
                }}
                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold bg-danger hover:bg-danger/90 text-white transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      <AlertDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        isDanger={confirmDialog.isDanger}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolbarBtn({
  icon,
  label,
  onClick,
  active = false,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={twMerge(
        "p-2 rounded-full cursor-pointer transition-colors",
        danger
          ? "text-danger hover:bg-danger/10"
          : active
          ? "text-accent bg-accent/10"
          : "text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10"
      )}
    >
      {icon}
    </button>
  );
}

function Popover({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={twMerge(
        "absolute z-50 bg-bg-surface border border-border-soft rounded-2xl shadow-2xl animate-popover-up",
        className
      )}
    >
      {children}
    </div>
  );
}

function MenuOption({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] text-text-primary hover:bg-black/5 dark:hover:bg-white/8 cursor-pointer transition-colors",
        danger && "text-danger hover:bg-danger-soft/20 focus:text-danger focus:bg-danger-soft/10 border-t border-border-soft/40 mt-1 pt-1.5 rounded-t-none"
      )}
    >
      <span className={danger ? "text-danger" : "text-text-secondary"}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Checklist editor ────────────────────────────────────────────────────────
function ChecklistEditor({
  note,
  setNote,
  newItem,
  setNewItem,
}: {
  note: Note;
  setNote: React.Dispatch<React.SetStateAction<Note>>;
  newItem: string;
  setNewItem: (v: string) => void;
}) {
  const active = note.listItems.filter((i) => !i.isCompleted);
  const done = note.listItems.filter((i) => i.isCompleted);
  const [showCompleted, setShowCompleted] = React.useState(false);
  const [focusedItemId, setFocusedItemId] = React.useState<string | null>(null);
  const [isDraggable, setIsDraggable] = React.useState(false);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [settledItemId, setSettledItemId] = React.useState<string | null>(null);
  
  // Animation states for smooth transition
  const [completingIds, setCompletingIds] = React.useState<Set<string>>(new Set());
  const [uncompletingIds, setUncompletingIds] = React.useState<Set<string>>(new Set());
  const [recentlyEnteredIds, setRecentlyEnteredIds] = React.useState<Set<string>>(new Set());
  const animationTimeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
      animationTimeoutsRef.current.clear();
    };
  }, []);

  const addItem = () => {
    if (!newItem.trim()) return;
    setNote((p) => ({
      ...p,
      listItems: [
        ...p.listItems,
        {
          id: `tmp-${Date.now()}`,
          noteId: p.id,
          text: newItem.trim(),
          isCompleted: false,
          urutan: p.listItems.length,
        },
      ],
    }));
    setNewItem("");
  };

  const handleToggle = (id: string, isCurrentlyCompleted: boolean) => {
    if (!isCurrentlyCompleted) {
      // User is checking an active item -> animate slide down & fade
      if (completingIds.has(id)) {
        const existingTimer = animationTimeoutsRef.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);
        animationTimeoutsRef.current.delete(id);
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      setCompletingIds((prev) => new Set(prev).add(id));
      const timer = setTimeout(() => {
        setNote((p) => ({
          ...p,
          listItems: p.listItems.map((it) =>
            it.id === id ? { ...it, isCompleted: true } : it
          ),
        }));
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setRecentlyEnteredIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setRecentlyEnteredIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 400);
        animationTimeoutsRef.current.delete(id);
      }, 320);

      animationTimeoutsRef.current.set(id, timer);
    } else {
      // User is unchecking a completed item -> animate slide up & restore
      if (uncompletingIds.has(id)) {
        const existingTimer = animationTimeoutsRef.current.get(id);
        if (existingTimer) clearTimeout(existingTimer);
        animationTimeoutsRef.current.delete(id);
        setUncompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      setUncompletingIds((prev) => new Set(prev).add(id));
      const timer = setTimeout(() => {
        setNote((p) => ({
          ...p,
          listItems: p.listItems.map((it) =>
            it.id === id ? { ...it, isCompleted: false } : it
          ),
        }));
        setUncompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setRecentlyEnteredIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
          setRecentlyEnteredIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 400);
        animationTimeoutsRef.current.delete(id);
      }, 320);

      animationTimeoutsRef.current.set(id, timer);
    }
  };

  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  const handleRemove = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      remove(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 220);
  };

  const remove = (id: string) =>
    setNote((p) => ({
      ...p,
      listItems: p.listItems.filter((it) => it.id !== id),
    }));

  const editText = (id: string, text: string) =>
    setNote((p) => ({
      ...p,
      listItems: p.listItems.map((it) =>
        it.id === id ? { ...it, text } : it
      ),
    }));

  const moveItem = (fromIndex: number, toIndex: number) => {
    setNote((p) => {
      const activeItems = p.listItems.filter((i) => !i.isCompleted);
      const completedItems = p.listItems.filter((i) => i.isCompleted);

      const updatedActive = [...activeItems];
      const [movedItem] = updatedActive.splice(fromIndex, 1);
      updatedActive.splice(toIndex, 0, movedItem);

      const allItems = [...updatedActive, ...completedItems].map((item, idx) => ({
        ...item,
        urutan: idx,
      }));

      return {
        ...p,
        listItems: allItems,
      };
    });
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(20); } catch (_) {}
    }
    setDraggedIndex(index);
    setIsDraggable(true);
  };

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    if (draggedIndex === null) return;
    
    // Prevent default scroll behavior while dragging
    if (e.cancelable) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const rowEl = element.closest("[data-active-index]");
    if (rowEl) {
      const targetIndexAttr = rowEl.getAttribute("data-active-index");
      if (targetIndexAttr !== null) {
        const targetIndex = parseInt(targetIndexAttr, 10);
        if (targetIndex !== draggedIndex) {
          moveItem(draggedIndex, targetIndex);
          setDraggedIndex(targetIndex);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedIndex !== null && active[draggedIndex]) {
      const itemId = active[draggedIndex].id;
      setSettledItemId(itemId);
      setTimeout(() => setSettledItemId(null), 300);
    }
    setDraggedIndex(null);
    setIsDraggable(false);
  };

  const renderActiveItem = (item: { id: string; text: string; isCompleted: boolean }, index: number) => {
    const isCompleting = completingIds.has(item.id);
    const isRecentlyEntered = recentlyEnteredIds.has(item.id);
    const isBeingDragged = draggedIndex === index;
    const isRemoving = removingIds.has(item.id);

    return (
      <div
        key={item.id}
        data-active-index={index}
        draggable={isDraggable && !isCompleting && !isRemoving}
        onDragStart={(e) => {
          setDraggedIndex(index);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDragEnter={() => {
          if (draggedIndex !== null && draggedIndex !== index) {
            moveItem(draggedIndex, index);
            setDraggedIndex(index);
          }
        }}
        onDragEnd={() => {
          if (draggedIndex !== null && active[draggedIndex]) {
            const itemId = active[draggedIndex].id;
            setSettledItemId(itemId);
            setTimeout(() => setSettledItemId(null), 300);
          }
          setDraggedIndex(null);
          setIsDraggable(false);
        }}
        onTouchEnd={handleTouchEnd}
        className={twMerge(
          "relative flex items-center gap-2 group py-1.5 px-2 rounded-xl transition-all duration-200",
          isBeingDragged
            ? "z-30 shadow-lg scale-[1.02] bg-bg-surface ring-2 ring-accent/60 border border-accent/40 opacity-95"
            : "hover:bg-bg-page/40 active:bg-bg-page/30",
          settledItemId === item.id && "animate-reorder-settle",
          isCompleting && "animate-checklist-down",
          isRemoving && "animate-checklist-remove",
          isRecentlyEntered && "animate-checklist-enter"
        )}
      >
        <button
          onMouseEnter={() => setIsDraggable(true)}
          onMouseLeave={() => {
            if (draggedIndex === null) setIsDraggable(false);
          }}
          onTouchStart={(e) => handleTouchStart(e, index)}
          onTouchMove={(e) => handleTouchMove(e, index)}
          onTouchEnd={handleTouchEnd}
          disabled={isCompleting || isRemoving}
          className={twMerge(
            "p-1.5 rounded-lg cursor-grab active:cursor-grabbing shrink-0 transition-all touch-none select-none disabled:opacity-0",
            isBeingDragged
              ? "text-accent bg-accent-soft scale-110"
              : "text-text-secondary/40 hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 active:scale-110 active:text-accent"
          )}
          title="Geser untuk mengurutkan"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <input
          type="checkbox"
          checked={item.isCompleted || isCompleting}
          onChange={() => handleToggle(item.id, false)}
          className={twMerge(
            "h-4.5 w-4.5 rounded-md border-border-soft text-accent focus:ring-accent cursor-pointer flex-shrink-0 transition-transform duration-200",
            isCompleting && "animate-check-pop"
          )}
        />
        <input
          type="text"
          value={item.text}
          disabled={isCompleting || isRemoving}
          onFocus={() => setFocusedItemId(item.id)}
          onBlur={() => {
            setTimeout(() => {
              setFocusedItemId((curr) => (curr === item.id ? null : curr));
            }, 150);
          }}
          onChange={(e) => editText(item.id, e.target.value)}
          className={twMerge(
            "flex-1 bg-transparent border-none text-[15px] focus:outline-none p-0 leading-6 text-text-primary transition-all duration-200",
            isCompleting && "line-through text-text-secondary/50"
          )}
        />
        {focusedItemId === item.id && !isCompleting && !isRemoving && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleRemove(item.id)}
            className="p-0.5 text-text-secondary hover:text-danger cursor-pointer shrink-0 animate-micro-pop"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  const renderDoneItem = (item: { id: string; text: string; isCompleted: boolean }) => {
    const isUncompleting = uncompletingIds.has(item.id);
    const isRecentlyEntered = recentlyEnteredIds.has(item.id);
    const isRemoving = removingIds.has(item.id);

    return (
      <div
        key={item.id}
        className={twMerge(
          "flex items-center gap-3 py-1.5 px-2 transition-all duration-200",
          isUncompleting ? "opacity-90 animate-checklist-up" : "opacity-60",
          isRemoving && "animate-checklist-remove",
          isRecentlyEntered && "animate-checklist-enter"
        )}
      >
        <div className="w-6 shrink-0" />
        <input
          type="checkbox"
          checked={!isUncompleting && item.isCompleted}
          onChange={() => handleToggle(item.id, true)}
          className={twMerge(
            "h-4.5 w-4.5 rounded-md border-border-soft text-accent focus:ring-accent cursor-pointer flex-shrink-0 transition-transform duration-200",
            isUncompleting && "animate-check-pop"
          )}
        />
        <input
          type="text"
          value={item.text}
          disabled={isUncompleting || isRemoving}
          onFocus={() => setFocusedItemId(item.id)}
          onBlur={() => {
            setTimeout(() => {
              setFocusedItemId((curr) => (curr === item.id ? null : curr));
            }, 150);
          }}
          onChange={(e) => editText(item.id, e.target.value)}
          className={twMerge(
            "flex-1 bg-transparent border-none text-[15px] focus:outline-none p-0 leading-6 transition-all duration-200",
            isUncompleting
              ? "text-text-primary no-underline font-medium"
              : "text-text-secondary/50 line-through"
          )}
        />
        {focusedItemId === item.id && !isUncompleting && !isRemoving && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleRemove(item.id)}
            className="p-0.5 text-text-secondary hover:text-danger cursor-pointer shrink-0 animate-micro-pop"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      {active.map(renderActiveItem)}

      {/* New item input */}
      <div className="relative pl-8">
        <div className="flex items-center gap-3 py-1.5 mt-1">
          <Plus className="h-4.5 w-4.5 text-text-secondary flex-shrink-0" />
          <input
            type="text"
            placeholder="Item baru"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="flex-1 bg-transparent border-none text-[15px] text-text-primary focus:outline-none p-0 leading-6 placeholder:text-text-secondary/40"
          />
        </div>

        {/* Auto suggestions list */}
        {newItem.trim().length > 0 && (
          (() => {
            const matches = done.filter(i => i.text.toLowerCase().includes(newItem.toLowerCase()));
            if (matches.length === 0) return null;
            return (
              <div className="absolute left-7 right-0 top-7 z-50 bg-bg-surface border border-border-soft rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 max-h-40 overflow-y-auto animate-popover-down">
                {matches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleToggle(item.id, true);
                      setNewItem("");
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-primary hover:bg-accent-soft/30 hover:text-accent rounded-lg text-left cursor-pointer transition-colors w-full font-sans truncate"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-accent opacity-70 shrink-0" />
                    <span className="truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Completed items */}
      {done.length > 0 && (
        <div className="mt-4 border-t border-border-soft/30 pt-4">
          <button
            onClick={() => {
              triggerHaptic("light");
              setShowCompleted(!showCompleted);
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary/60 hover:text-text-primary transition-colors cursor-pointer select-none mb-2 group"
          >
            <ChevronRight className={twMerge("h-3.5 w-3.5 stroke-[3] transition-transform duration-200", showCompleted && "rotate-90")} />
            <span>Selesai</span>
            <span key={done.length} className="inline-block px-1.5 py-0.2 rounded-full bg-accent-soft text-accent text-[10px] animate-badge-bump">
              {done.length}
            </span>
          </button>
          <div className={twMerge(
            "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            showCompleted ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden flex flex-col gap-0.5">
              {done.map(renderDoneItem)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component Table Editor ──────────────────────────────────────────────────
function TableEditor({
  note,
  updateTableContent,
}: {
  note: Note;
  updateTableContent: (fn: (t: NoteTableData) => NoteTableData) => void;
}) {
  const { headers, rows, accumulatedCols, columnTypes, columnFormulas } = parseTable(note.content);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [configColIndex, setConfigColIndex] = React.useState<number | null>(null);

  const hasAccumulated = accumulatedCols.some(Boolean);
  const totals = React.useMemo(() => {
    return headers.map((_, ci) => {
      if (accumulatedCols[ci]) {
        return calculateColumnTotal(rows, ci, headers, columnTypes, columnFormulas);
      }
      return "";
    });
  }, [headers, rows, accumulatedCols, columnTypes, columnFormulas]);
  const firstNonAcc = accumulatedCols.indexOf(false);

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rIdx < rows.length - 1) {
        const nextInput = document.querySelector<HTMLInputElement>(`input[data-cell="${rIdx + 1}-${cIdx}"]`);
        nextInput?.focus();
        nextInput?.select();
      } else {
        updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => ({
          headers: hs,
          rows: [...rs, new Array(hs.length).fill("")],
          accumulatedCols: ac,
          columnTypes: ct,
          columnFormulas: cf,
        }));
        setTimeout(() => {
          const nextInput = document.querySelector<HTMLInputElement>(`input[data-cell="${rIdx + 1}-${cIdx}"]`);
          nextInput?.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="overflow-x-auto pb-4">
      <table className="min-w-full border-collapse border border-black/15 dark:border-white/15 text-[14px] text-text-primary bg-black/[0.01] dark:bg-white/[0.01]">
        <thead>
          <tr className="border-b border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03]">
            {headers.map((h, ci) => (
              <th
                key={ci}
                className="relative p-2.5 text-left font-semibold border-r border-black/15 dark:border-white/15 min-w-[140px]"
              >
                {!isEditMode ? (
                  <div className="flex items-center justify-between gap-1.5">
                    <input
                      type="text"
                      value={h}
                      onChange={(e) =>
                        updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                          const next = [...hs];
                          next[ci] = e.target.value;
                          return { headers: next, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                        })
                      }
                      className="w-full bg-transparent border-none font-semibold focus:outline-none p-0 text-[13.5px]"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {columnTypes[ci] === "RUMUS" && (
                        <button
                          type="button"
                          onClick={() => setConfigColIndex(ci)}
                          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors select-none cursor-pointer"
                          title="Lihat / Ubah Rumus Kolom"
                        >
                          fx
                        </button>
                      )}
                      {columnTypes[ci] === "NOMINAL" && (
                        <span className="px-1 py-0.5 rounded text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 select-none">
                          Rp
                        </span>
                      )}
                      {columnTypes[ci] === "CENTANG" && (
                        <span className="p-0.5 rounded text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 select-none">
                          <CheckSquare className="h-3 w-3" />
                        </span>
                      )}
                      {columnTypes[ci] === "TANGGAL" && (
                        <span className="p-0.5 rounded text-blue-500 bg-blue-500/10 border border-blue-500/20 select-none">
                          <Calendar className="h-3 w-3" />
                        </span>
                      )}
                      {accumulatedCols[ci] && (
                        <span className="text-[10px] font-bold text-accent px-1 rounded bg-accent-soft border border-accent/20 select-none" title="Total Penjumlahan Aktif">
                          Σ
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-1">
                      <input
                        type="text"
                        value={h}
                        onChange={(e) =>
                          updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                            const next = [...hs];
                            next[ci] = e.target.value;
                            return { headers: next, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                          })
                        }
                        className="w-full bg-transparent border-none font-semibold focus:outline-none p-0 text-[13.5px]"
                      />
                      {headers.length > 1 && (
                        <button
                          onClick={() =>
                            updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => ({
                              headers: hs.filter((_, i) => i !== ci),
                              rows: rs.map((r) => r.filter((_, i) => i !== ci)),
                              accumulatedCols: ac.filter((_, i) => i !== ci),
                              columnTypes: ct.filter((_, i) => i !== ci),
                              columnFormulas: cf.filter((_, i) => i !== ci),
                            }))
                          }
                          className="p-1 text-text-secondary hover:text-danger rounded-lg hover:bg-danger/10 transition-colors cursor-pointer shrink-0"
                          title="Hapus kolom"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Clean Column Configuration Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setConfigColIndex(ci)}
                      className={twMerge(
                        "flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-all border select-none w-full shadow-2xs",
                        columnTypes[ci] === "RUMUS"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20"
                          : columnTypes[ci] === "NOMINAL"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : columnTypes[ci] === "CENTANG"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          : columnTypes[ci] === "TANGGAL"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                          : "bg-bg-surface text-text-secondary hover:text-text-primary border-border-soft hover:border-accent/40"
                      )}
                      title="Buka Pengaturan Kolom & Rumus"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {columnTypes[ci] === "RUMUS" ? (
                          <>
                            <Calculator className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Rumus (fx)</span>
                          </>
                        ) : columnTypes[ci] === "NOMINAL" ? (
                          <>
                            <Banknote className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Nominal (Rp)</span>
                          </>
                        ) : columnTypes[ci] === "CENTANG" ? (
                          <>
                            <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Centang</span>
                          </>
                        ) : columnTypes[ci] === "TANGGAL" ? (
                          <>
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Tanggal</span>
                          </>
                        ) : (
                          <>
                            <Type className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Teks</span>
                          </>
                        )}
                        {accumulatedCols[ci] && (
                          <span className="text-[10px] font-bold text-accent bg-accent-soft px-1 rounded border border-accent/20">
                            Σ
                          </span>
                        )}
                      </div>
                      <SlidersHorizontal className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                  </div>
                )}
              </th>
            ))}
            {isEditMode && (
              <th className="p-2 w-10 border-l border-black/15 dark:border-white/15 text-center">
                <button
                  onClick={() =>
                    updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => ({
                      headers: [...hs, `Kolom ${hs.length + 1}`],
                      rows: rs.map((r) => [...r, ""]),
                      accumulatedCols: [...ac, false],
                      columnTypes: [...ct, "TEKS"],
                      columnFormulas: [...cf, ""],
                    }))
                  }
                  className="p-1.5 text-text-secondary hover:text-accent rounded-xl hover:bg-accent-soft/50 cursor-pointer transition-colors inline-flex items-center justify-center"
                  title="Tambah kolom baru"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-black/10 dark:border-white/10 hover:bg-black/3 dark:hover:bg-white/3 group"
            >
              {row.map((cell, ci) => {
                const colType = columnTypes[ci] || "TEKS";
                return (
                  <td key={ci} className="p-2 border-r border-black/10 dark:border-white/10 align-middle">
                    {colType === "CENTANG" ? (
                      <div className="flex items-center justify-center py-0.5">
                        <Checkbox
                          checked={cell === "true" || cell === "1"}
                          onCheckedChange={(checked) =>
                            updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                              const next = rs.map((r) => [...r]);
                              next[ri][ci] = checked ? "true" : "false";
                              return { headers: hs, rows: next, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                            })
                          }
                        />
                      </div>
                    ) : colType === "TANGGAL" ? (
                      <input
                        type="date"
                        data-cell={`${ri}-${ci}`}
                        value={cell || ""}
                        onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                        onChange={(e) =>
                          updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                            const next = rs.map((r) => [...r]);
                            next[ri][ci] = e.target.value;
                            return { headers: hs, rows: next, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                          })
                        }
                        className="w-full bg-transparent border-none p-0 focus:outline-none text-[13.5px] font-mono text-text-primary cursor-pointer"
                      />
                    ) : colType === "NOMINAL" ? (
                      <input
                        type="text"
                        data-cell={`${ri}-${ci}`}
                        inputMode="decimal"
                        value={cell}
                        placeholder="Rp 0"
                        onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                            const next = rs.map((r) => [...r]);
                            next[ri][ci] = raw;
                            return { headers: hs, rows: next, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                          });
                        }}
                        onBlur={(e) => {
                          const num = parseNumericValue(e.target.value);
                          if (!isNaN(num) && e.target.value.trim() !== "") {
                            const formatted = `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
                            updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                              const next = rs.map((r) => [...r]);
                              next[ri][ci] = formatted;
                              return { headers: hs, rows: next, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                            });
                          }
                        }}
                        className="w-full bg-transparent border-none p-0 focus:outline-none text-[13.5px] font-mono text-right text-text-primary"
                      />
                    ) : colType === "RUMUS" ? (
                      <div className="w-full text-right font-mono font-medium text-text-primary text-[13.5px] px-2 py-0.5 select-none flex items-center justify-end">
                        {(() => {
                          const formula = columnFormulas[ci];
                          if (!formula) {
                            return <span className="text-text-secondary/40 italic text-xs">Rumus belum diisi</span>;
                          }
                          const calcVal = evaluateTableNoteFormula(formula, headers, rows, ri, ci);
                          return formatTableFormulaResult(calcVal, formula);
                        })()}
                      </div>
                    ) : (
                      <input
                        type="text"
                        data-cell={`${ri}-${ci}`}
                        value={cell}
                        onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                        onChange={(e) =>
                          updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                            const next = rs.map((r) => [...r]);
                            next[ri][ci] = e.target.value;
                            return { headers: hs, rows: next, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                          })
                        }
                        className="w-full bg-transparent border-none p-0 focus:outline-none text-[14px]"
                      />
                    )}
                  </td>
                );
              })}
              {isEditMode && rows.length > 1 && (
                <td className="p-1 text-center border-l border-black/10 dark:border-white/10">
                  <button
                    onClick={() =>
                      updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => ({
                        headers: hs,
                        rows: rs.filter((_, i) => i !== ri),
                        accumulatedCols: ac,
                        columnTypes: ct,
                        columnFormulas: cf,
                      }))
                    }
                    className="p-0.5 text-text-secondary hover:text-danger cursor-pointer flex items-center justify-center mx-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {hasAccumulated && (
            <tr className="bg-black/[0.04] dark:bg-white/[0.04] font-semibold border-t-2 border-black/15 dark:border-white/15">
              {headers.map((_, ci) => {
                let cellVal = "";
                if (accumulatedCols[ci]) {
                  cellVal = `Σ ${totals[ci]}`;
                } else if (ci === firstNonAcc) {
                  cellVal = "Total";
                }
                return (
                  <td
                    key={ci}
                    className="p-2 border-r border-black/10 dark:border-white/10 text-accent font-bold font-mono text-right"
                  >
                    {cellVal}
                  </td>
                );
              })}
              {isEditMode && rows.length > 1 && (
                <td className="border-l border-black/10 dark:border-white/10"></td>
              )}
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-2 mt-3">
        <button
          onClick={() =>
            updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => ({
              headers: hs,
              rows: [...rs, new Array(hs.length).fill("")],
              accumulatedCols: ac,
              columnTypes: ct,
              columnFormulas: cf,
            }))
          }
          className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/8 cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Baris baru
        </button>

        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={twMerge(
            "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors",
            isEditMode
              ? "bg-accent-soft text-accent border border-accent/20"
              : "text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8 border border-transparent"
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          {isEditMode ? "Selesai Mengatur" : "Atur Kolom & Baris"}
        </button>
      </div>

      {/* ── Modal Pengaturan Kolom & Rumus ── */}
      {configColIndex !== null && (
        <Dialog
          isOpen={configColIndex !== null}
          onClose={() => setConfigColIndex(null)}
          title={`Atur: ${headers[configColIndex] || `Kolom ${configColIndex + 1}`}`}
          description="Sesuaikan nama, jenis data, rumus matematika dinamis, dan akumulasi total kolom."
          maxWidthClassName="max-w-lg"
        >
          <div className="flex flex-col gap-4 pt-1">
            {/* 1. Nama Kolom */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Nama Kolom
              </label>
              <input
                type="text"
                value={headers[configColIndex] || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                    const next = [...hs];
                    next[configColIndex] = val;
                    return { headers: next, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf };
                  });
                }}
                placeholder="Misal: Bulan, Gram, Saldo, Selisih..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-border-soft bg-bg-surface text-text-primary text-sm font-semibold focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-2xs"
              />
            </div>

            {/* 2. Pilihan Jenis Tipe Kolom (Grid Cards) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Jenis Tipe Data
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    type: "TEKS" as TableColumnType,
                    title: "Teks / Angka",
                    icon: Type,
                    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                  },
                  {
                    type: "NOMINAL" as TableColumnType,
                    title: "Nominal (Rp)",
                    icon: Banknote,
                    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                  },
                  {
                    type: "TANGGAL" as TableColumnType,
                    title: "Tanggal",
                    icon: Calendar,
                    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                  },
                  {
                    type: "CENTANG" as TableColumnType,
                    title: "Centang",
                    icon: CheckSquare,
                    color: "text-teal-500 bg-teal-500/10 border-teal-500/20",
                  },
                  {
                    type: "RUMUS" as TableColumnType,
                    title: "Rumus (fx)",
                    icon: Calculator,
                    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
                  },
                ].map((item) => {
                  const isSelected = (columnTypes[configColIndex] || "TEKS") === item.type;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                          const nextTypes = [...ct];
                          nextTypes[configColIndex] = item.type;
                          return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: nextTypes, columnFormulas: cf };
                        });
                      }}
                      className={twMerge(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-accent bg-accent-soft text-accent ring-1 ring-accent font-semibold shadow-2xs"
                          : "border-border-soft bg-bg-surface hover:bg-black/3 dark:hover:bg-white/3 text-text-primary"
                      )}
                    >
                      <div className={twMerge("p-1.5 rounded-lg border shrink-0 flex items-center justify-center", item.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-semibold truncate flex-1 font-display">
                        {item.title}
                      </span>
                      {isSelected && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-accent text-white shadow-xs text-[9px] font-bold shrink-0">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Toggle Hitung Total Kolom (Sigma) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-bg-page/60 border border-border-soft">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent-soft text-accent border border-accent/15">
                  <Sigma className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-text-primary">
                    Hitung Total Akumulasi (Σ)
                  </span>
                  <span className="text-[11px] text-text-secondary">
                    Tampilkan baris total penjumlahan di bawah tabel
                  </span>
                </div>
              </div>
              <Switch
                checked={accumulatedCols[configColIndex] || false}
                onCheckedChange={(checked) => {
                  updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                    const nextAc = [...ac];
                    nextAc[configColIndex] = checked;
                    return { headers: hs, rows: rs, accumulatedCols: nextAc, columnTypes: ct, columnFormulas: cf };
                  });
                }}
              />
            </div>

            {/* 4. Konfigurasi Rumus (Khusus Tipe RUMUS) */}
            {columnTypes[configColIndex] === "RUMUS" && (
              <div className="flex flex-col gap-3 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/25 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Ekspresi Rumus
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-mono font-bold border border-purple-500/20">
                      fx
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-bg-surface border border-purple-500/30 shadow-2xs focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 shrink-0 select-none">
                    fx =
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: selisih([Gram]) atau [Gram] - prev([Gram])"
                    value={columnFormulas[configColIndex] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                        const nextF = [...cf];
                        nextF[configColIndex] = val;
                        return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                      });
                    }}
                    className="w-full bg-transparent border-none text-xs font-mono font-semibold text-text-primary focus:outline-none placeholder:text-text-secondary/40"
                  />
                </div>

                {/* Quick Helper Shortcut Chips */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1">
                      <span>💡 Rumus Cepat (Klik untuk menyisipkan):</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {headers.map((otherH, oIdx) => {
                        if (oIdx === configColIndex) return null;
                        return (
                          <React.Fragment key={oIdx}>
                            <button
                              type="button"
                              onClick={() => {
                                updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                                  const nextF = [...cf];
                                  nextF[configColIndex] = `[${otherH}] - prev([${otherH}])`;
                                  return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                                });
                              }}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-medium cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                              title={`Selisih [${otherH}] - prev([${otherH}])`}
                            >
                              <span>Selisih ({otherH})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                                  const nextF = [...cf];
                                  nextF[configColIndex] = `(([${otherH}] - prev([${otherH}])) / prev([${otherH}])) * 100`;
                                  return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                                });
                              }}
                              className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/25 text-xs font-medium cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                              title={`Persentase Kenaikan % (([${otherH}] - prev([${otherH}])) / prev([${otherH}])) * 100`}
                            >
                              <span>% Kenaikan ({otherH})</span>
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sisipkan Variabel Kolom Saat Ini & Bulan Lalu (prev) */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-text-secondary">Sisipkan Variabel Kolom:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {headers.map((otherH, oIdx) => {
                        if (oIdx === configColIndex) return null;
                        return (
                          <React.Fragment key={oIdx}>
                            {/* Current row */}
                            <button
                              type="button"
                              onClick={() => {
                                updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                                  const nextF = [...cf];
                                  const cur = nextF[configColIndex] || "";
                                  nextF[configColIndex] = cur ? `${cur} [${otherH}]` : `[${otherH}]`;
                                  return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                                });
                              }}
                              className="px-2 py-1 rounded-lg bg-bg-surface hover:bg-accent-soft hover:text-accent border border-border-soft text-xs font-mono cursor-pointer transition-all active:scale-95 shadow-2xs"
                              title={`Nilai [${otherH}] baris ini`}
                            >
                              [{otherH}]
                            </button>
                            {/* Previous row */}
                            <button
                              type="button"
                              onClick={() => {
                                updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                                  const nextF = [...cf];
                                  const cur = nextF[configColIndex] || "";
                                  nextF[configColIndex] = cur ? `${cur} prev([${otherH}])` : `prev([${otherH}])`;
                                  return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                                });
                              }}
                              className="px-2 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/25 text-xs font-mono cursor-pointer transition-all active:scale-95 shadow-2xs"
                              title={`Nilai prev([${otherH}]) baris sebelumnya`}
                            >
                              prev([{otherH}])
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operator Keypad */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-semibold text-text-secondary">Operator:</span>
                    {["+", "-", "*", "/", "%", "(", ")", "^"].map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => {
                          updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: cf }) => {
                            const nextF = [...cf];
                            const cur = nextF[configColIndex] || "";
                            nextF[configColIndex] = `${cur} ${op} `;
                            return { headers: hs, rows: rs, accumulatedCols: ac, columnTypes: ct, columnFormulas: nextF };
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-bg-surface hover:bg-accent-soft hover:text-accent border border-border-soft text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                      >
                        {op}
                      </button>
                    ))}
                  </div>

                  {/* Penjelasan Detail Rumus */}
                  <div className="mt-1 p-3 rounded-2xl bg-bg-surface/90 border border-border-soft text-[11.5px] text-text-secondary leading-relaxed flex flex-col gap-1.5">
                    <p className="font-semibold text-text-primary flex items-center gap-1.5">
                      <span>📌 Cara Kerja Perhitungan Baris Sebelumnya:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>
                        <code className="text-accent font-mono font-semibold">[Kolom]</code>: Mengambil nilai kolom pada baris saat ini (bulan ini).
                      </li>
                      <li>
                        <code className="text-purple-600 dark:text-purple-400 font-mono font-semibold">prev([Kolom])</code>: Mengambil nilai kolom pada baris sebelumnya (bulan lalu).
                      </li>
                      <li>
                        <b>Rumus Selisih:</b> <code className="text-emerald-600 dark:text-emerald-400 font-mono">[Gram] - prev([Gram])</code>
                      </li>
                      <li>
                        <b>Rumus % Kenaikan:</b> <code className="text-blue-600 dark:text-blue-400 font-mono">(([Gram] - prev([Gram])) / prev([Gram])) * 100</code>
                      </li>
                      <li className="text-text-secondary/80">
                        <i>Catatan: Pada baris pertama (karena belum ada baris sebelumnya), nilai <code>prev(...)</code> otomatis dianggap sama dengan baris awal sehingga menghasilkan 0 / aman dari error.</i>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Tombol Selesai */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-soft">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfigColIndex(null)}
                className="w-full sm:w-auto px-6 h-10 font-semibold"
              >
                Selesai & Terapkan
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
