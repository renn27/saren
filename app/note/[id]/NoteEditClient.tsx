"use client";

import * as React from "react";
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
  Image as ImageIcon,
  Share2,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
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

function calculateColumnTotal(rows: string[][], colIndex: number): string {
  let total = 0;
  let hasNumber = false;
  
  for (const row of rows) {
    const val = row[colIndex];
    if (!val) continue;
    
    const num = parseNumericValue(val);
    if (!isNaN(num)) {
      total += num;
      hasNumber = true;
    }
  }
  
  if (!hasNumber) return "";
  
  if (Number.isInteger(total)) {
    return new Intl.NumberFormat("id-ID").format(total);
  } else {
    // Format float with up to 3 decimal places
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 3
    }).format(total);
  }
}

function parseTable(content: string | null) {
  try {
    const p = JSON.parse(content || "{}") as {
      headers: string[];
      rows: string[][];
      accumulatedCols?: boolean[];
    };
    if (p.headers && p.rows) {
      const accumulatedCols = p.accumulatedCols || new Array(p.headers.length).fill(false);
      // Ensure length matches headers length
      while (accumulatedCols.length < p.headers.length) {
        accumulatedCols.push(false);
      }
      return {
        headers: p.headers,
        rows: p.rows,
        accumulatedCols: accumulatedCols.slice(0, p.headers.length)
      };
    }
  } catch {}
  return {
    headers: ["Kolom 1", "Kolom 2"],
    rows: [["", ""]],
    accumulatedCols: [false, false]
  };
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
    listItems: n.listItems.map((it) => ({ text: it.text, isCompleted: it.isCompleted })),
    labelIds: n.labels.map((l) => l.id),
  });
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxWidth = 1200;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

const extractUrls = (text: string | null): string[] => {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
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
  const [openMenu, setOpenMenu] = React.useState<"color" | "label" | "type" | "share" | "folder" | null>(null);

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
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Diedit ${date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}`;
    }
    
    return `Diedit ${date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })}`;
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
  }, [note.title, note.content, note.color, note.isList, note.isTable, note.listItems, note.labels, note.imageUrl, note.folderId, save]);

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
      const compressedFile = await compressImage(file);

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
        const widths = data.headers.map((h, i) =>
          Math.max(h.length, ...data.rows.map((r) => (r[i] || "").length))
        );

        const border = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
        const formatRow = (row: string[]) =>
          "| " + row.map((cell, i) => (cell || "").padEnd(widths[i])).join(" | ") + " |";

        text += border + "\n" + formatRow(data.headers) + "\n" + border + "\n";
        data.rows.forEach((r) => {
          text += formatRow(r) + "\n";
        });
        text += border;

        const hasAccumulated = data.accumulatedCols.some(Boolean);
        if (hasAccumulated) {
          text += "\n\nTotal Akumulasi:\n";
          data.headers.forEach((h, idx) => {
            if (data.accumulatedCols[idx]) {
              const total = calculateColumnTotal(data.rows, idx);
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
        tableRowHeights = tableData.rows.map((row: string[]) => {
          ctx.font = "13px Inter, sans-serif";
          let maxCellHeight = 30;
          row.forEach((cell) => {
            const cellLines = wrapText(cell || "", colWidth - 10);
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

    let currentY = padding + 20;
    ctx.fillStyle = textPrimary;
    ctx.font = "bold 24px Inter, sans-serif";
    wrappedTitle.forEach((line) => {
      ctx.fillText(line, padding, currentY);
      currentY += 30;
    });

    currentY += 15;

    if (note.isList) {
      note.listItems.forEach((item) => {
        ctx.strokeStyle = item.isCompleted ? accentColor : textSecondary;
        ctx.lineWidth = 2;
        const boxX = padding;
        const boxY = currentY - 14;
        const boxSize = 16;
        ctx.strokeRect(boxX, boxY, boxSize, boxSize);

        if (item.isCompleted) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(boxX + 3, boxY + 3, boxSize - 6, boxSize - 6);
        }

        ctx.fillStyle = item.isCompleted ? textSecondary : textPrimary;
        ctx.font = "14px Inter, sans-serif";
        ctx.fillText(item.text, padding + 26, currentY - 1);

        if (item.isCompleted) {
          const textWidth = ctx.measureText(item.text).width;
          ctx.strokeStyle = textSecondary;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding + 26, currentY - 6);
          ctx.lineTo(padding + 26 + textWidth, currentY - 6);
          ctx.stroke();
        }

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
          const cellLines = wrapText(cell || "-", colW - 10);

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
            const sum = calculateColumnTotal(tableData.rows, ci);
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
    setNote((p) => ({ ...p, isArchived: next, isPinned: false }));
    await toggleArchiveNote(note.id);
    toast.success(next ? "Diarsipkan" : "Dipulihkan dari arsip");
    router.push("/note");
  };

  const handleTrash = async () => {
    if (!confirm("Buang catatan ini ke sampah?")) return;
    await trashNote(note.id);
    toast.success("Dihapus ke sampah");
    router.push("/note");
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
        content = JSON.stringify({ headers, rows, accumulatedCols });
        listItems = [];
      }

      return { ...p, isList, isTable, content, listItems };
    });
    setOpenMenu(null);
  };

  // ── Table helpers ─────────────────────────────────────────────────────────
  const updateTableContent = (
    fn: (t: { headers: string[]; rows: string[][]; accumulatedCols: boolean[] }) => {
      headers: string[];
      rows: string[][];
      accumulatedCols: boolean[];
    }
  ) => {
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

        {/* Centered Status Edit Text & Folder Badge */}
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
          {statusText && (
            <span className="text-[11px] font-semibold text-text-secondary/70">
              {statusText}
            </span>
          )}
          {note.folder && (
            <span className="text-[9.5px] font-bold text-accent uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <Folder className="h-2.5 w-2.5" /> {note.folder.name}
            </span>
          )}
        </div>

        {/* Pin button on the right */}
        <button
          onClick={handlePin}
          className={twMerge(
            "p-2 rounded-full cursor-pointer transition-colors flex-shrink-0",
            note.isPinned
              ? "text-accent hover:bg-accent/10"
              : "text-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
          )}
          title={note.isPinned ? "Lepas sematan" : "Sematkan"}
        >
          {note.isPinned ? <PinOff className="h-[18px] w-[18px]" /> : <Pin className="h-[18px] w-[18px]" />}
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
                className="w-full max-h-[350px] object-cover"
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
            <TableEditor note={note} setNote={setNote} updateTableContent={updateTableContent} />
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

          {/* Link Previews */}
          {linkPreviews.length > 0 && (
            <div className="flex flex-col gap-3 mt-6 border-t border-black/5 dark:border-white/5 pt-4">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider select-none">Tautan Terdeteksi</span>
              <div className="flex flex-col gap-2">
                {linkPreviews.map((preview, idx) => (
                  <a
                    key={idx}
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-stretch rounded-xl border border-border-soft hover:border-accent/40 bg-bg-surface hover:bg-accent-soft/5 transition-all duration-200 overflow-hidden group/link cursor-pointer max-w-xl"
                  >
                    <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
                      <span className="text-[12.5px] font-semibold text-text-primary group-hover/link:text-accent transition-colors truncate">
                        {preview.title}
                      </span>
                      {preview.description && (
                        <p className="text-[11.5px] text-text-secondary line-clamp-2 leading-relaxed">
                          {preview.description}
                        </p>
                      )}
                      <span className="text-[10px] text-text-secondary/60 truncate mt-auto">
                        {new URL(preview.url).hostname}
                      </span>
                    </div>
                    {preview.image && (
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
                ))}
              </div>
            </div>
          )}

          {/* Label pills */}
          {note.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6">
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
        <div className="flex items-center gap-1">
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

          {/* Label manager Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={<Tag className="h-[18px] w-[18px]" />}
              label="Label Catatan"
              active={openMenu === "label"}
              onClick={() => setOpenMenu(openMenu === "label" ? null : "label")}
            />
            {openMenu === "label" && (
              <Popover className="bottom-14 left-0 w-48 p-2.5 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-1">Kelola Label</span>
                <div className="flex flex-col gap-0.5">
                  {(initialLabels as Label[]).length === 0 ? (
                    <p className="text-[12px] text-text-secondary px-2 py-1">Belum ada label.</p>
                  ) : (
                    (initialLabels as Label[]).map((label) => (
                      <label key={label.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none">
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
              </Popover>
            )}
          </div>

          {/* Folder Selector Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={<Folder className="h-[18px] w-[18px]" />}
              label="Pilih Folder"
              active={openMenu === "folder"}
              onClick={() => setOpenMenu(openMenu === "folder" ? null : "folder")}
            />
            {openMenu === "folder" && (
              <Popover className="bottom-14 left-0 w-48 p-2.5 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-1">Pilih Folder</span>
                <div className="flex flex-col gap-0.5">
                  <label
                    onClick={() => {
                      handleAssignFolder(null);
                      setOpenMenu(null);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none"
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
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/8 select-none"
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
              </Popover>
            )}
          </div>

          {/* Type Toggle Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={
                note.isList ? <FileText className="h-[18px] w-[18px]" />
                : note.isTable ? <CheckSquare className="h-[18px] w-[18px]" />
                : <CheckSquare className="h-[18px] w-[18px]" />
              }
              label="Ubah tipe"
              active={openMenu === "type"}
              onClick={() => setOpenMenu(openMenu === "type" ? null : "type")}
            />
            {openMenu === "type" && (
              <Popover className="bottom-14 left-0 w-48 p-1.5 flex flex-col gap-0.5">
                {!note.isList && !note.isTable && (<>
                  <MenuOption icon={<CheckSquare className="h-4 w-4" />} label="Ubah ke Checklist" onClick={() => convertTo("list")} />
                  <MenuOption icon={<Table className="h-4 w-4" />} label="Ubah ke Tabel" onClick={() => convertTo("table")} />
                </>)}
                {note.isList && (<>
                  <MenuOption icon={<FileText className="h-4 w-4" />} label="Ubah ke Teks" onClick={() => convertTo("text")} />
                  <MenuOption icon={<Table className="h-4 w-4" />} label="Ubah ke Tabel" onClick={() => convertTo("table")} />
                </>)}
                {note.isTable && (<>
                  <MenuOption icon={<FileText className="h-4 w-4" />} label="Ubah ke Teks" onClick={() => convertTo("text")} />
                  <MenuOption icon={<CheckSquare className="h-4 w-4" />} label="Ubah ke Checklist" onClick={() => convertTo("list")} />
                </>)}
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
              label="Tambah Gambar"
              active={isUploadingImage}
              onClick={() => {
                if (!isUploadingImage) fileInputRef.current?.click();
              }}
            />
          </div>

          {/* Archive / Restore Button */}
          <ToolbarBtn
            icon={note.isArchived ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
            label={note.isArchived ? "Pulihkan dari arsip" : "Arsipkan"}
            onClick={handleArchive}
          />
        </div>

        <div className="flex items-center gap-1">
          {/* Share & Export Popover Trigger */}
          <div className="relative">
            <ToolbarBtn
              icon={<Share2 className="h-[18px] w-[18px]" />}
              label="Ekspor & Bagikan"
              active={openMenu === "share"}
              onClick={() => setOpenMenu(openMenu === "share" ? null : "share")}
            />
            {openMenu === "share" && (
              <Popover className="bottom-14 right-0 w-52 p-1.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 px-2.5 pt-1">Ekspor & Bagikan</span>
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
              </Popover>
            )}
          </div>

          {/* Copy (Duplicate) Button */}
          <ToolbarBtn
            icon={<Copy className="h-[18px] w-[18px]" />}
            label="Buat salinan"
            onClick={handleDuplicate}
          />

          {/* Trash (Delete) Button */}
          <ToolbarBtn
            icon={<Trash2 className="h-[18px] w-[18px]" />}
            label="Hapus ke sampah"
            onClick={handleTrash}
            danger
          />
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting Image */}
      {showDeleteImageConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        </div>
      )}
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
        "absolute z-50 bg-bg-surface border border-border-soft rounded-2xl shadow-2xl",
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] text-text-primary hover:bg-black/5 dark:hover:bg-white/8 cursor-pointer transition-colors"
    >
      <span className="text-text-secondary">{icon}</span>
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

  const toggle = (id: string) =>
    setNote((p) => ({
      ...p,
      listItems: p.listItems.map((it) =>
        it.id === id ? { ...it, isCompleted: !it.isCompleted } : it
      ),
    }));

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
    setDraggedIndex(null);
    setIsDraggable(false);
  };

  const renderActiveItem = (item: { id: string; text: string; isCompleted: boolean }, index: number) => (
    <div
      key={item.id}
      data-active-index={index}
      draggable={isDraggable}
      onDragStart={() => setDraggedIndex(index)}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => {
        if (draggedIndex !== null && draggedIndex !== index) {
          moveItem(draggedIndex, index);
          setDraggedIndex(index);
        }
      }}
      onDragEnd={() => {
        setDraggedIndex(null);
        setIsDraggable(false);
      }}
      onTouchEnd={handleTouchEnd}
      className={twMerge(
        "flex items-center gap-2 group py-1.5 px-2 rounded-xl transition-all duration-150",
        draggedIndex === index ? "opacity-40 bg-accent-soft/10" : "hover:bg-bg-page/30"
      )}
    >
      <button
        onMouseEnter={() => setIsDraggable(true)}
        onMouseLeave={() => setIsDraggable(false)}
        onTouchStart={(e) => handleTouchStart(e, index)}
        onTouchMove={(e) => handleTouchMove(e, index)}
        onTouchEnd={handleTouchEnd}
        className="p-1 text-text-secondary/30 hover:text-text-secondary cursor-grab active:cursor-grabbing shrink-0 transition-colors touch-none select-none"
        title="Geser untuk mengurutkan"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={() => toggle(item.id)}
        className="h-4.5 w-4.5 rounded-md border-border-soft text-accent focus:ring-accent cursor-pointer flex-shrink-0"
      />
      <input
        type="text"
        value={item.text}
        onFocus={() => setFocusedItemId(item.id)}
        onBlur={() => {
          setTimeout(() => {
            setFocusedItemId((curr) => (curr === item.id ? null : curr));
          }, 150);
        }}
        onChange={(e) => editText(item.id, e.target.value)}
        className="flex-1 bg-transparent border-none text-[15px] focus:outline-none p-0 leading-6 text-text-primary"
      />
      {focusedItemId === item.id && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => remove(item.id)}
          className="p-0.5 text-text-secondary hover:text-danger cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const renderDoneItem = (item: { id: string; text: string; isCompleted: boolean }) => (
    <div key={item.id} className="flex items-center gap-3 py-1.5 px-2 opacity-60">
      <div className="w-6 shrink-0" />
      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={() => toggle(item.id)}
        className="h-4.5 w-4.5 rounded-md border-border-soft text-accent focus:ring-accent cursor-pointer flex-shrink-0"
      />
      <input
        type="text"
        value={item.text}
        onFocus={() => setFocusedItemId(item.id)}
        onBlur={() => {
          setTimeout(() => {
            setFocusedItemId((curr) => (curr === item.id ? null : curr));
          }, 150);
        }}
        onChange={(e) => editText(item.id, e.target.value)}
        className="flex-1 bg-transparent border-none text-[15px] focus:outline-none p-0 leading-6 text-text-secondary/50 line-through"
      />
      {focusedItemId === item.id && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => remove(item.id)}
          className="p-0.5 text-text-secondary hover:text-danger cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

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
              <div className="absolute left-7 right-0 top-7 z-50 bg-bg-surface border border-border-soft rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                {matches.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      toggle(item.id);
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
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary/60 hover:text-text-primary transition-colors cursor-pointer select-none mb-2"
          >
            {showCompleted ? (
              <ChevronDown className="h-3.5 w-3.5 stroke-[3]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
            )}
            <span>Selesai ({done.length})</span>
          </button>
          {showCompleted && (
            <div className="flex flex-col gap-0.5">
              {done.map(renderDoneItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Table editor ─────────────────────────────────────────────────────────────
function TableEditor({
  note,
  setNote,
  updateTableContent,
}: {
  note: Note;
  setNote: React.Dispatch<React.SetStateAction<Note>>;
  updateTableContent: (
    fn: (t: { headers: string[]; rows: string[][]; accumulatedCols: boolean[] }) => {
      headers: string[];
      rows: string[][];
      accumulatedCols: boolean[];
    }
  ) => void;
}) {
  const { headers, rows, accumulatedCols } = parseTable(note.content);
  const [isEditMode, setIsEditMode] = React.useState(false);

  const hasAccumulated = accumulatedCols.some(Boolean);
  const totals = headers.map((_, ci) => {
    if (accumulatedCols[ci]) {
      return calculateColumnTotal(rows, ci);
    }
    return "";
  });
  const firstNonAcc = accumulatedCols.indexOf(false);

  return (
    <div className="overflow-x-auto pb-4">
      <table className="min-w-full border-collapse border border-black/15 dark:border-white/15 text-[14px] text-text-primary bg-black/[0.01] dark:bg-white/[0.01]">
        <thead>
          <tr className="border-b border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.03]">
            {headers.map((h, ci) => (
              <th
                key={ci}
                className="relative p-2 text-left font-semibold border-r border-black/15 dark:border-white/15 min-w-[140px]"
              >
                <input
                  type="text"
                  value={h}
                  onChange={(e) =>
                    updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => {
                      const next = [...hs];
                      next[ci] = e.target.value;
                      return { headers: next, rows: rs, accumulatedCols: ac };
                    })
                  }
                  className={`w-full bg-transparent border-none font-semibold focus:outline-none p-0 ${isEditMode ? "pr-6" : ""}`}
                />
                {isEditMode && (
                  <div className="flex items-center gap-1.5 mt-1 border-t border-black/5 dark:border-white/5 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => {
                          const next = [...ac];
                          next[ci] = !next[ci];
                          return { headers: hs, rows: rs, accumulatedCols: next };
                        })
                      }
                      className={twMerge(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors border",
                        accumulatedCols[ci]
                          ? "bg-accent-soft text-accent border-accent/20"
                          : "text-text-secondary hover:text-text-primary border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                      )}
                      title="Toggle Jumlahkan Kolom (Total)"
                    >
                      <Sigma className="h-3 w-3" />
                      <span>Total</span>
                    </button>
                  </div>
                )}
                {isEditMode && headers.length > 1 && (
                  <button
                    onClick={() =>
                      updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => ({
                        headers: hs.filter((_, i) => i !== ci),
                        rows: rs.map((r) => r.filter((_, i) => i !== ci)),
                        accumulatedCols: ac.filter((_, i) => i !== ci),
                      }))
                    }
                    className="absolute top-1 right-1 p-0.5 text-text-secondary hover:text-danger rounded cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </th>
            ))}
            {isEditMode && (
              <th className="p-2 w-8 border-l border-black/15 dark:border-white/15">
                <button
                  onClick={() =>
                    updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => ({
                      headers: [...hs, `Kolom ${hs.length + 1}`],
                      rows: rs.map((r) => [...r, ""]),
                      accumulatedCols: [...ac, false],
                    }))
                  }
                  className="text-text-secondary hover:text-accent cursor-pointer flex items-center justify-center"
                  title="Tambah kolom"
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
              {row.map((cell, ci) => (
                <td key={ci} className="p-2 border-r border-black/10 dark:border-white/10">
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) =>
                      updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => {
                        const next = rs.map((r) => [...r]);
                        next[ri][ci] = e.target.value;
                        return { headers: hs, rows: next, accumulatedCols: ac };
                      })
                    }
                    className="w-full bg-transparent border-none p-0 focus:outline-none text-[14px]"
                  />
                </td>
              ))}
              {isEditMode && rows.length > 1 && (
                <td className="p-1 text-center border-l border-black/10 dark:border-white/10">
                  <button
                    onClick={() =>
                      updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => ({
                        headers: hs,
                        rows: rs.filter((_, i) => i !== ri),
                        accumulatedCols: ac,
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
                    className="p-2 border-r border-black/10 dark:border-white/10 text-accent font-bold"
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
            updateTableContent(({ headers: hs, rows: rs, accumulatedCols: ac }) => ({
              headers: hs,
              rows: [...rs, new Array(hs.length).fill("")],
              accumulatedCols: ac,
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
    </div>
  );
}
