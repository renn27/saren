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
} from "lucide-react";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import {
  updateNote,
  trashNote,
  togglePinNote,
  toggleArchiveNote,
  duplicateNote,
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
  listItems: NoteListItem[];
  labels: Label[];
  createdAt: Date;
  updatedAt: Date;
};

interface Props {
  initialNote: Note;
  initialLabels: Label[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseTable(content: string | null) {
  try {
    const p = JSON.parse(content || "{}") as {
      headers: string[];
      rows: string[][];
    };
    if (p.headers && p.rows) return p;
  } catch {}
  return { headers: ["Kolom 1", "Kolom 2"], rows: [["", ""]] };
}

function serializeNote(n: Note) {
  return JSON.stringify({
    title: n.title || "",
    content: n.isList ? "" : n.content || "",
    color: n.color,
    isList: n.isList,
    isTable: n.isTable,
    listItems: n.listItems.map((it) => ({ text: it.text, isCompleted: it.isCompleted })),
    labelIds: n.labels.map((l) => l.id),
  });
}

// ─── Main component ──────────────────────────────────────────────────────────
export function NoteEditClient({ initialNote, initialLabels }: Props) {
  const router = useRouter();
  const [note, setNote] = React.useState<Note>(initialNote);
  const [newItem, setNewItem] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<"color" | "label" | "type" | null>(null);

  const isFirstRender = React.useRef(true);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const lastSavedRef = React.useRef<string>(serializeNote(initialNote));
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
  }, [note.title, note.content, note.color, note.isList, note.isTable, note.listItems, note.labels, save]);

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
        });
      }
    };
  }, []);

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
        content = JSON.stringify({ headers, rows });
        listItems = [];
      }

      return { ...p, isList, isTable, content, listItems };
    });
    setOpenMenu(null);
  };

  // ── Table helpers ─────────────────────────────────────────────────────────
  const updateTableContent = (
    fn: (t: { headers: string[]; rows: string[][] }) => {
      headers: string[];
      rows: string[][];
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
      className="flex-1 w-full transition-colors duration-300"
      style={pageStyle}
    >
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-3 md:px-5 py-2 border-b border-black/6 dark:border-white/6 backdrop-blur-md bg-white/80 dark:bg-[#0F1623]/80 transition-colors duration-300"
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
        {statusText && (
          <span className="text-[11.5px] font-semibold text-text-secondary/70 select-none absolute left-1/2 -translate-x-1/2">
            {statusText}
          </span>
        )}

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
      <div>
        <div className="w-full max-w-3xl mx-auto px-5 md:px-8 pt-6 pb-20">

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
              className="w-full bg-transparent border-none text-[15px] text-text-primary focus:outline-none focus:ring-0 resize-none leading-7 placeholder:text-text-secondary/40 p-0 min-h-[200px]"
            />
          ) : (
            <ChecklistEditor note={note} setNote={setNote} newItem={newItem} setNewItem={setNewItem} />
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
        className="fixed bottom-0 left-0 right-0 z-30 h-12 flex items-center justify-between px-4 border-t border-black/5 dark:border-white/5 backdrop-blur-md bg-white/85 dark:bg-[#0F1623]/85 transition-colors duration-300"
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

          {/* Archive / Restore Button */}
          <ToolbarBtn
            icon={note.isArchived ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
            label={note.isArchived ? "Pulihkan dari arsip" : "Arsipkan"}
            onClick={handleArchive}
          />
        </div>

        <div className="flex items-center gap-1">
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
  const [showCompleted, setShowCompleted] = React.useState(true);

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

  const renderItem = (item: { id: string; text: string; isCompleted: boolean }) => (
    <div key={item.id} className="flex items-start gap-3 group py-1.5">
      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={() => toggle(item.id)}
        className="mt-0.5 h-4.5 w-4.5 rounded-md border-border-soft text-accent focus:ring-accent cursor-pointer flex-shrink-0"
      />
      <input
        type="text"
        value={item.text}
        onChange={(e) => editText(item.id, e.target.value)}
        className={twMerge(
          "flex-1 bg-transparent border-none text-[15px] focus:outline-none p-0 leading-6",
          item.isCompleted
            ? "line-through text-text-secondary/50"
            : "text-text-primary"
        )}
      />
      <button
        onClick={() => remove(item.id)}
        className="p-0.5 text-text-secondary hover:text-danger cursor-pointer mt-0.5"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {active.map(renderItem)}

      {/* New item input */}
      <div className="relative">
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
              {done.map(renderItem)}
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
    fn: (t: { headers: string[]; rows: string[][] }) => {
      headers: string[];
      rows: string[][];
    }
  ) => void;
}) {
  const { headers, rows } = parseTable(note.content);
  const [isEditMode, setIsEditMode] = React.useState(false);

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
                    updateTableContent(({ headers: hs, rows: rs }) => {
                      const next = [...hs];
                      next[ci] = e.target.value;
                      return { headers: next, rows: rs };
                    })
                  }
                  className={`w-full bg-transparent border-none font-semibold focus:outline-none p-0 ${isEditMode ? "pr-6" : ""}`}
                />
                {isEditMode && headers.length > 1 && (
                  <button
                    onClick={() =>
                      updateTableContent(({ headers: hs, rows: rs }) => ({
                        headers: hs.filter((_, i) => i !== ci),
                        rows: rs.map((r) => r.filter((_, i) => i !== ci)),
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
                    updateTableContent(({ headers: hs, rows: rs }) => ({
                      headers: [...hs, `Kolom ${hs.length + 1}`],
                      rows: rs.map((r) => [...r, ""]),
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
                      updateTableContent(({ headers: hs, rows: rs }) => {
                        const next = rs.map((r) => [...r]);
                        next[ri][ci] = e.target.value;
                        return { headers: hs, rows: next };
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
                      updateTableContent(({ headers: hs, rows: rs }) => ({
                        headers: hs,
                        rows: rs.filter((_, i) => i !== ri),
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
        </tbody>
      </table>

      <div className="flex items-center justify-between gap-2 mt-3">
        <button
          onClick={() =>
            updateTableContent(({ headers: hs, rows: rs }) => ({
              headers: hs,
              rows: [...rs, new Array(hs.length).fill("")],
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
