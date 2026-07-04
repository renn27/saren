"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pin,
  Archive,
  Trash2,
  Tag,
  Palette,
  Plus,
  Grid,
  List,
  Search,
  X,
  RotateCcw,
  Check,
  FolderOpen,
  Settings,
  MoreVertical,
  CornerDownLeft,
  FileText,
  CheckSquare,
  Table,
  Menu
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { twMerge } from "tailwind-merge";
import {
  createNote,
  updateNote,
  trashNote,
  restoreNote,
  deleteNotePermanently,
  emptyTrash,
  togglePinNote,
  toggleArchiveNote,
  updateNoteColor,
  createLabel,
  updateLabel,
  deleteLabel
} from "@/lib/actions/note";

// Palet warna Google Keep Premium
const colorMap: Record<string, { bgClass: string; textClass: string; borderClass: string; name: string; hex: string }> = {
  default: {
    bgClass: "bg-bg-surface border-border-soft/60 dark:bg-[#0F1623] dark:border-border-soft/20",
    textClass: "text-text-primary",
    borderClass: "border-border-soft/60 dark:border-border-soft/20",
    name: "Bawaan",
    hex: "transparent"
  },
  red: {
    bgClass: "bg-[#FFF1F2] dark:bg-[#2D161A]",
    textClass: "text-[#E11D48] dark:text-[#FDA4AF]",
    borderClass: "border-[#FFE4E6] dark:border-[#4E1C22]",
    name: "Merah",
    hex: "#E11D48"
  },
  orange: {
    bgClass: "bg-[#FFF7ED] dark:bg-[#331C0E]",
    textClass: "text-[#EA580C] dark:text-[#FDBA74]",
    borderClass: "border-[#FFEDD5] dark:border-[#522912]",
    name: "Jingga",
    hex: "#EA580C"
  },
  yellow: {
    bgClass: "bg-[#FEFCE8] dark:bg-[#2D280F]",
    textClass: "text-[#CA8A04] dark:text-[#FDE047]",
    borderClass: "border-[#FEF9C3] dark:border-[#4B3C14]",
    name: "Kuning",
    hex: "#CA8A04"
  },
  green: {
    bgClass: "bg-[#F0FDF4] dark:bg-[#112918]",
    textClass: "text-[#16A34A] dark:text-[#86EFAC]",
    borderClass: "border-[#DCFCE7] dark:border-[#1E432A]",
    name: "Hijau",
    hex: "#16A34A"
  },
  teal: {
    bgClass: "bg-[#F0FDFA] dark:bg-[#0E2725]",
    textClass: "text-[#0D9488] dark:text-[#5EEAD4]",
    borderClass: "border-[#CCFBF1] dark:border-[#18423E]",
    name: "Teal",
    hex: "#0D9488"
  },
  blue: {
    bgClass: "bg-[#F0F9FF] dark:bg-[#10253A]",
    textClass: "text-[#0284C7] dark:text-[#7DD3FC]",
    borderClass: "border-[#E0F2FE] dark:border-[#1A3D5D]",
    name: "Biru",
    hex: "#0284C7"
  },
  darkblue: {
    bgClass: "bg-[#EEF2FF] dark:bg-[#151D44]",
    textClass: "text-[#4F46E5] dark:text-[#A5B4FC]",
    borderClass: "border-[#E0E7FF] dark:border-[#222E6F]",
    name: "Biru Tua",
    hex: "#4F46E5"
  },
  purple: {
    bgClass: "bg-[#FAF5FF] dark:bg-[#22153D]",
    textClass: "text-[#9333EA] dark:text-[#D8B4FE]",
    borderClass: "border-[#F3E8FF] dark:border-[#382260]",
    name: "Ungu",
    hex: "#9333EA"
  },
  pink: {
    bgClass: "bg-[#FDF2F8] dark:bg-[#2F1424]",
    textClass: "text-[#DB2777] dark:text-[#FBCFE8]",
    borderClass: "border-[#FCE7F3] dark:border-[#4B1E3B]",
    name: "Pink",
    hex: "#DB2777"
  },
  brown: {
    bgClass: "bg-[#FAF7F2] dark:bg-[#251B15]",
    textClass: "text-[#854D0E] dark:text-[#D97706]",
    borderClass: "border-[#F4EFE6] dark:border-[#3C2D24]",
    name: "Cokelat",
    hex: "#854D0E"
  },
  gray: {
    bgClass: "bg-[#F8FAFC] dark:bg-[#1E293B]/60",
    textClass: "text-[#475569] dark:text-[#94A3B8]",
    borderClass: "border-[#E2E8F0] dark:border-[#334155]/60",
    name: "Abu-abu",
    hex: "#475569"
  }
};

type NoteListItem = {
  id: string;
  noteId: string;
  text: string;
  isCompleted: boolean;
  urutan: number;
};

type Label = {
  id: string;
  name: string;
};

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

interface NoteClientProps {
  initialNotes: Note[];
  initialLabels: Label[];
}

export function NoteClient({ initialNotes, initialLabels }: NoteClientProps) {
  const router = useRouter();

  // State
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [labels, setLabels] = React.useState<Label[]>(initialLabels);
  const [activeFilter, setActiveFilter] = React.useState<"notes" | "archive" | "trash" | string>("notes"); // string represents labelId
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isGridView, setIsGridView] = React.useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Modals / Overlays
  const [editingNote, setEditingNote] = React.useState<Note | null>(null);
  const [isLabelManagerOpen, setIsLabelManagerOpen] = React.useState(false);
  const [newLabelInput, setNewLabelInput] = React.useState("");
  const [renamingLabelId, setRenamingLabelId] = React.useState<string | null>(null);
  const [renamingLabelName, setRenamingLabelName] = React.useState("");

  // Create Note Input state
  const [isInputExpanded, setIsInputExpanded] = React.useState(false);
  const [inputTitle, setInputTitle] = React.useState("");
  const [inputContent, setInputContent] = React.useState("");
  const [inputColor, setInputColor] = React.useState("default");
  const [isInputList, setIsInputList] = React.useState(false);
  const [inputListItems, setInputListItems] = React.useState<{ text: string; isCompleted: boolean }[]>([]);
  const [newListItemText, setNewListItemText] = React.useState("");
  const [isInputTable, setIsInputTable] = React.useState(false);
  const [inputTableHeaders, setInputTableHeaders] = React.useState<string[]>(["Kolom 1", "Kolom 2"]);
  const [inputTableRows, setInputTableRows] = React.useState<string[][]>([["", ""]]);
  const [inputLabels, setInputLabels] = React.useState<string[]>([]); // label IDs
  const [inputPinned, setInputPinned] = React.useState(false);

  // Active Dropdowns state (Color / Labels)
  const [activeDropdownType, setActiveDropdownType] = React.useState<"color" | "label" | null>(null);
  const [activeDropdownNoteId, setActiveDropdownNoteId] = React.useState<string | null>(null); // "new" for create input

  const createContainerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Load View Settings
  React.useEffect(() => {
    const savedView = localStorage.getItem("note_view_grid");
    if (savedView !== null) {
      setIsGridView(savedView === "true");
    }
  }, []);

  // Sync state if initial props change
  React.useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  React.useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  const toggleView = () => {
    const nextView = !isGridView;
    setIsGridView(nextView);
    localStorage.setItem("note_view_grid", String(nextView));
  };

  // Close create input on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        createContainerRef.current &&
        !createContainerRef.current.contains(event.target as Node) &&
        isInputExpanded
      ) {
        handleSaveNewNote();
      }

      // Close dropdowns
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownType(null);
        setActiveDropdownNoteId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    isInputExpanded,
    inputTitle,
    inputContent,
    inputListItems,
    inputColor,
    inputLabels,
    inputPinned,
    isInputList,
    isInputTable,
    inputTableHeaders,
    inputTableRows
  ]);

  // Create Note handler
  const handleSaveNewNote = async () => {
    const hasText = inputContent.trim() !== "";
    const hasTitle = inputTitle.trim() !== "";
    const hasListItems = isInputList && inputListItems.length > 0;
    const hasTableData =
      isInputTable &&
      (inputTableRows.some((row) => row.some((cell) => cell.trim() !== "")) ||
        inputTableHeaders.some(
          (h) => h !== "Kolom 1" && h !== "Kolom 2" && h.trim() !== ""
        ));

    if (!hasText && !hasTitle && !hasListItems && !hasTableData) {
      // Just collapse
      resetInputForm();
      return;
    }

    // Prepare items
    const listItems = isInputList
      ? inputListItems.map((item, idx) => ({
          text: item.text,
          isCompleted: item.isCompleted,
          urutan: idx,
        }))
      : [];

    let content = inputContent;
    if (isInputList) {
      content = "";
    } else if (isInputTable) {
      content = JSON.stringify({
        headers: inputTableHeaders,
        rows: inputTableRows,
      });
    }

    const pendingData = {
      title: inputTitle,
      content,
      isPinned: inputPinned,
      isArchived: false,
      color: inputColor,
      isList: isInputList,
      isTable: isInputTable,
      listItems,
      labelIds: inputLabels,
    };

    resetInputForm();

    const response = await createNote(pendingData);
    if (response.success && response.data) {
      const newNote = response.data as Note;
      setNotes((prev) => [newNote, ...prev]);
      toast.success("Catatan berhasil dibuat");
    } else {
      toast.error(response.error || "Gagal membuat catatan");
    }
  };

  const resetInputForm = () => {
    setIsInputExpanded(false);
    setInputTitle("");
    setInputContent("");
    setInputColor("default");
    setIsInputList(false);
    setInputListItems([]);
    setNewListItemText("");
    setIsInputTable(false);
    setInputTableHeaders(["Kolom 1", "Kolom 2"]);
    setInputTableRows([["", ""]]);
    setInputLabels([]);
    setInputPinned(false);
    setActiveDropdownType(null);
    setActiveDropdownNoteId(null);
  };

  // Add Item to creation checklist
  const handleAddInputListItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newListItemText.trim()) return;
    setInputListItems((prev) => [...prev, { text: newListItemText.trim(), isCompleted: false }]);
    setNewListItemText("");
  };

  // Toggle Pinned
  const handleTogglePin = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, isPinned: !n.isPinned, isArchived: false };
        }
        return n;
      })
    );

    const res = await togglePinNote(noteId);
    if (!res.success) {
      toast.error(res.error || "Gagal memperbarui sematan");
      // rollback
      router.refresh();
    }
  };

  // Toggle Archived
  const handleToggleArchive = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, isArchived: !n.isArchived, isPinned: false };
        }
        return n;
      })
    );

    const res = await toggleArchiveNote(noteId);
    if (res.success) {
      toast.success(res.data?.isArchived ? "Catatan diarsipkan" : "Catatan dipulihkan dari arsip");
    } else {
      toast.error(res.error || "Gagal mengubah status arsip");
      router.refresh();
    }
  };

  // Move to Trash
  const handleTrashNote = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, isTrashed: true, isPinned: false };
        }
        return n;
      })
    );

    const res = await trashNote(noteId);
    if (res.success) {
      toast.success("Catatan dibuang ke sampah");
    } else {
      toast.error(res.error || "Gagal membuang catatan");
      router.refresh();
    }
  };

  // Restore Note
  const handleRestoreNote = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    // Optimistic Update
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, isTrashed: false };
        }
        return n;
      })
    );

    const res = await restoreNote(noteId);
    if (res.success) {
      toast.success("Catatan dipulihkan");
    } else {
      toast.error(res.error || "Gagal memulihkan catatan");
      router.refresh();
    }
  };

  // Delete Permanently
  const handleDeletePermanently = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    if (!confirm("Hapus catatan ini secara permanen? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }

    // Optimistic Update
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    const res = await deleteNotePermanently(noteId);
    if (res.success) {
      toast.success("Catatan dihapus permanen");
    } else {
      toast.error(res.error || "Gagal menghapus catatan");
      router.refresh();
    }
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    if (!confirm("Kosongkan semua catatan di tempat sampah? Tindakan ini permanen.")) {
      return;
    }

    setNotes((prev) => prev.filter((n) => !n.isTrashed));

    const res = await emptyTrash();
    if (res.success) {
      toast.success("Tempat sampah dikosongkan");
    } else {
      toast.error(res.error || "Gagal mengosongkan tempat sampah");
      router.refresh();
    }
  };

  // Update Color
  const handleUpdateColor = async (noteId: string, colorId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    if (noteId === "new") {
      setInputColor(colorId);
      setActiveDropdownType(null);
      setActiveDropdownNoteId(null);
      return;
    }

    // Optimistic
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, color: colorId };
        }
        return n;
      })
    );

    if (editingNote && editingNote.id === noteId) {
      setEditingNote((prev) => (prev ? { ...prev, color: colorId } : null));
    }

    const res = await updateNoteColor(noteId, colorId);
    if (!res.success) {
      toast.error(res.error || "Gagal memperbarui warna");
      router.refresh();
    }
    setActiveDropdownType(null);
    setActiveDropdownNoteId(null);
  };

  // Label manager handlers
  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelInput.trim()) return;

    const res = await createLabel(newLabelInput);
    if (res.success && res.data) {
      setLabels((prev) => [...prev, res.data as Label]);
      setNewLabelInput("");
      toast.success("Label dibuat");
    } else {
      toast.error(res.error || "Gagal membuat label");
    }
  };

  const handleRenameLabel = async (id: string) => {
    if (!renamingLabelName.trim()) return;

    const res = await updateLabel(id, renamingLabelName);
    if (res.success && res.data) {
      const updated = res.data as Label;
      setLabels((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setNotes((prev) =>
        prev.map((n) => ({
          ...n,
          labels: n.labels.map((l) => (l.id === id ? updated : l)),
        }))
      );
      setRenamingLabelId(null);
      toast.success("Label diubah");
    } else {
      toast.error(res.error || "Gagal mengubah label");
    }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!confirm("Hapus label ini? Label akan dilepas dari semua catatan.")) return;

    const res = await deleteLabel(id);
    if (res.success) {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setNotes((prev) =>
        prev.map((n) => ({
          ...n,
          labels: n.labels.filter((l) => l.id !== id),
        }))
      );
      toast.success("Label dihapus");
      if (activeFilter === id) {
        setActiveFilter("notes");
      }
    } else {
      toast.error(res.error || "Gagal menghapus label");
    }
  };

  // Toggle label on a note
  const handleToggleNoteLabel = async (noteId: string, labelId: string) => {
    if (noteId === "new") {
      setInputLabels((prev) =>
        prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId]
      );
      return;
    }

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const hasLabel = note.labels.some((l) => l.id === labelId);
    let updatedLabels: Label[] = [];

    if (hasLabel) {
      updatedLabels = note.labels.filter((l) => l.id !== labelId);
    } else {
      const targetLabel = labels.find((l) => l.id === labelId);
      if (targetLabel) {
        updatedLabels = [...note.labels, targetLabel];
      }
    }

    // Optimistic
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return { ...n, labels: updatedLabels };
        }
        return n;
      })
    );

    if (editingNote && editingNote.id === noteId) {
      setEditingNote((prev) => (prev ? { ...prev, labels: updatedLabels } : null));
    }

    const res = await updateNote(noteId, {
      labelIds: updatedLabels.map((l) => l.id),
    });

    if (!res.success) {
      toast.error(res.error || "Gagal memperbarui label");
      router.refresh();
    }
  };

  // Toggle Item Complete inside note card or modal
  const handleToggleListItem = async (noteId: string, itemId: string, isCompleted: boolean) => {
    // Local Update
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return {
            ...n,
            listItems: n.listItems.map((item) =>
              item.id === itemId ? { ...item, isCompleted } : item
            ),
          };
        }
        return n;
      })
    );

    if (editingNote && editingNote.id === noteId) {
      setEditingNote((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          listItems: prev.listItems.map((item) =>
            item.id === itemId ? { ...item, isCompleted } : item
          ),
        };
      });
    }

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    // Send updated list items to DB
    const updatedItems = note.listItems.map((item) => {
      if (item.id === itemId) {
        return { text: item.text, isCompleted, urutan: item.urutan };
      }
      return { text: item.text, isCompleted: item.isCompleted, urutan: item.urutan };
    });

    const res = await updateNote(noteId, {
      listItems: updatedItems,
    });

    if (!res.success) {
      toast.error("Gagal menyimpan perubahan checklist");
      router.refresh();
    }
  };

  // Convert Note Type (text note <-> checklist <-> table)
  const handleConvertToType = async (noteId: string, type: "text" | "list" | "table", event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    if (noteId === "new") {
      if (type === "text") {
        if (isInputList) {
          const text = inputListItems.map((item) => item.text).join("\n");
          setInputContent(text);
          setInputListItems([]);
          setIsInputList(false);
        } else if (isInputTable) {
          let text = "";
          try {
            text = inputTableHeaders.join(" | ") + "\n" + inputTableRows.map((r) => r.join(" | ")).join("\n");
          } catch (e) {}
          setInputContent(text);
          setIsInputTable(false);
        }
      } else if (type === "list") {
        let items: { text: string; isCompleted: boolean }[] = [];
        if (!isInputList && !isInputTable) {
          const lines = inputContent.split("\n").filter((l) => l.trim() !== "");
          items = lines.map((l) => ({ text: l, isCompleted: false }));
          setInputContent("");
        } else if (isInputTable) {
          items = inputTableRows.map((row) => ({
            text: row.join(" "),
            isCompleted: false
          }));
          setIsInputTable(false);
        }
        setInputListItems(items);
        setIsInputList(true);
      } else if (type === "table") {
        let headers = ["Kolom 1", "Kolom 2"];
        let rows = [["", ""]];
        if (!isInputList && !isInputTable) {
          const lines = inputContent.split("\n").filter((l) => l.trim() !== "");
          if (lines.length > 0) {
            rows = lines.map((l) => {
              if (l.includes("|")) {
                const cols = l.split("|").map(c => c.trim());
                if (cols.length > headers.length) {
                  headers = Array.from({ length: cols.length }, (_, i) => `Kolom ${i + 1}`);
                }
                return cols;
              }
              return [l, ""];
            });
          }
          setInputContent("");
        } else if (isInputList) {
          headers = ["Tugas", "Status"];
          rows = inputListItems.map((item) => [
            item.text,
            item.isCompleted ? "Selesai" : "Belum Selesai",
          ]);
          setInputListItems([]);
          setIsInputList(false);
        }
        setInputTableHeaders(headers);
        setInputTableRows(rows);
        setIsInputTable(true);
      }
      return;
    }

    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    let nextIsList = type === "list";
    let nextIsTable = type === "table";
    let nextContent = note.content || "";
    let nextListItems: { text: string; isCompleted: boolean; urutan: number }[] = [];

    if (type === "text") {
      if (note.isList) {
        nextContent = note.listItems.map((item) => (item.isCompleted ? `[x] ${item.text}` : item.text)).join("\n");
      } else if (note.isTable) {
        try {
          const parsed = JSON.parse(note.content || "{}") as { headers: string[]; rows: string[][] };
          if (parsed.headers && parsed.rows) {
            nextContent = parsed.headers.join(" | ") + "\n" + parsed.rows.map((r) => r.join(" | ")).join("\n");
          }
        } catch (e) {
          nextContent = note.content || "";
        }
      }
      nextListItems = [];
    } else if (type === "list") {
      let items: string[] = [];
      if (!note.isList && !note.isTable) {
        items = nextContent.split("\n").filter((l) => l.trim() !== "");
      } else if (note.isTable) {
        try {
          const parsed = JSON.parse(note.content || "{}") as { headers: string[]; rows: string[][] };
          if (parsed.rows) {
            items = parsed.rows.map((r) => r.join(" "));
          }
        } catch (e) {}
      }
      nextListItems = items.map((t, idx) => ({ text: t, isCompleted: false, urutan: idx }));
      nextContent = "";
    } else if (type === "table") {
      let headers = ["Kolom 1", "Kolom 2"];
      let rows = [["", ""]];
      if (!note.isList && !note.isTable) {
        const lines = nextContent.split("\n").filter((l) => l.trim() !== "");
        if (lines.length > 0) {
          rows = lines.map((l) => {
            if (l.includes("|")) {
              const cols = l.split("|").map(c => c.trim());
              if (cols.length > headers.length) {
                headers = Array.from({ length: cols.length }, (_, i) => `Kolom ${i + 1}`);
              }
              return cols;
            }
            return [l, ""];
          });
        }
      } else if (note.isList) {
        headers = ["Tugas", "Status"];
        rows = note.listItems.map((item) => [
          item.text,
          item.isCompleted ? "Selesai" : "Belum Selesai",
        ]);
      }
      nextContent = JSON.stringify({ headers, rows });
      nextListItems = [];
    }

    // Optimistic
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return {
            ...n,
            isList: nextIsList,
            isTable: nextIsTable,
            content: nextContent,
            listItems: nextListItems.map((item, idx) => ({
              id: `temp-${idx}`,
              noteId: note.id,
              text: item.text,
              isCompleted: item.isCompleted,
              urutan: item.urutan,
            })),
          };
        }
        return n;
      })
    );

    const res = await updateNote(noteId, {
      isList: nextIsList,
      isTable: nextIsTable,
      content: nextContent,
      listItems: nextListItems.map((item) => ({
        text: item.text,
        isCompleted: item.isCompleted,
        urutan: item.urutan,
      })),
    });

    if (res.success && res.data) {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? (res.data as Note) : n)));
      if (editingNote && editingNote.id === noteId) {
        setEditingNote(res.data as Note);
      }
      toast.success("Tipe catatan berhasil diubah");
    } else {
      toast.error(res.error || "Gagal mengubah tipe catatan");
      router.refresh();
    }
  };

  const handleToggleNoteType = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (noteId === "new") {
      if (!isInputList && !isInputTable) {
        await handleConvertToType("new", "list");
      } else if (isInputList) {
        await handleConvertToType("new", "table");
      } else {
        await handleConvertToType("new", "text");
      }
    } else {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      if (!note.isList && !note.isTable) {
        await handleConvertToType(noteId, "list");
      } else if (note.isList) {
        await handleConvertToType(noteId, "table");
      } else {
        await handleConvertToType(noteId, "text");
      }
    }
  };

  // Table editing helpers for modal
  const getEditingNoteTableData = () => {
    let headers = ["Kolom 1", "Kolom 2"];
    let rows = [["", ""]];
    if (editingNote && editingNote.isTable) {
      try {
        const parsed = JSON.parse(editingNote.content || "{}");
        if (parsed.headers && parsed.rows) {
          headers = parsed.headers;
          rows = parsed.rows;
        }
      } catch (e) {}
    }
    return { headers, rows };
  };

  const handleUpdateTableCell = (rowIdx: number, colIdx: number, value: string) => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    const nextRows = [...rows];
    nextRows[rowIdx] = [...nextRows[rowIdx]];
    nextRows[rowIdx][colIdx] = value;
    const nextContent = JSON.stringify({ headers, rows: nextRows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  const handleUpdateTableHeader = (colIdx: number, value: string) => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    const nextHeaders = [...headers];
    nextHeaders[colIdx] = value;
    const nextContent = JSON.stringify({ headers: nextHeaders, rows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  const handleAddTableNoteRow = () => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    const nextRows = [...rows, new Array(headers.length).fill("")];
    const nextContent = JSON.stringify({ headers, rows: nextRows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  const handleAddTableNoteCol = () => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    const nextHeaders = [...headers, `Kolom ${headers.length + 1}`];
    const nextRows = rows.map((r) => [...r, ""]);
    const nextContent = JSON.stringify({ headers: nextHeaders, rows: nextRows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  const handleDeleteTableNoteRow = (rowIdx: number) => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    if (rows.length <= 1) return;
    const nextRows = rows.filter((_, idx) => idx !== rowIdx);
    const nextContent = JSON.stringify({ headers, rows: nextRows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  const handleDeleteTableNoteCol = (colIdx: number) => {
    if (!editingNote) return;
    const { headers, rows } = getEditingNoteTableData();
    if (headers.length <= 1) return;
    const nextHeaders = headers.filter((_, idx) => idx !== colIdx);
    const nextRows = rows.map((r) => r.filter((_, idx) => idx !== colIdx));
    const nextContent = JSON.stringify({ headers: nextHeaders, rows: nextRows });
    setEditingNote((prev) => prev ? { ...prev, content: nextContent } : null);
  };

  // Edit Modal Auto Save Handler
  const handleCloseEditModal = async () => {
    if (!editingNote) return;

    const res = await updateNote(editingNote.id, {
      title: editingNote.title || "",
      content: editingNote.isList ? "" : editingNote.content || "",
      listItems: editingNote.isList
        ? editingNote.listItems.map((item, idx) => ({
            text: item.text,
            isCompleted: item.isCompleted,
            urutan: idx,
          }))
        : [],
      labelIds: editingNote.labels.map((l) => l.id),
      color: editingNote.color,
    });

    if (res.success && res.data) {
      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? (res.data as Note) : n)));
    } else {
      toast.error("Gagal menyimpan perubahan catatan");
    }
    setEditingNote(null);
  };

  // Filter notes in memory
  const getFilteredNotes = () => {
    let filtered = notes;

    // First filter by active tab / label
    if (activeFilter === "notes") {
      filtered = notes.filter((n) => !n.isTrashed && !n.isArchived);
    } else if (activeFilter === "archive") {
      filtered = notes.filter((n) => n.isArchived && !n.isTrashed);
    } else if (activeFilter === "trash") {
      filtered = notes.filter((n) => n.isTrashed);
    } else {
      // it is a labelId
      filtered = notes.filter((n) => !n.isTrashed && !n.isArchived && n.labels.some((l) => l.id === activeFilter));
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          n.listItems.some((item) => item.text.toLowerCase().includes(q)) ||
          n.labels.some((l) => l.name.toLowerCase().includes(q))
      );
    }

    return filtered;
  };

  const filteredNotes = getFilteredNotes();
  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-bg-page select-none">
      
      {/* Sidebar Backdrop for Mobile Drawer */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-text-primary/20 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}

      {/* 1. SIDEBAR FILTER */}
      <aside
        className={twMerge(
          "fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-soft/60 p-4 flex flex-col gap-1.5 transition-transform duration-300 md:static md:translate-x-0 md:bg-bg-surface/30 md:backdrop-blur-md md:flex md:w-60 md:shrink-0 md:h-full md:p-3 md:gap-1.5 md:z-10",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile Sidebar Header */}
        <div className="flex items-center justify-between md:hidden mb-4 px-3 shrink-0">
          <span className="font-display font-semibold text-text-primary">SAREN Note</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 text-text-secondary hover:bg-accent-soft rounded-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop Title */}
        <div className="hidden md:block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3">
          Filter Catatan
        </div>

        <button
          onClick={() => {
            setActiveFilter("notes");
            setIsSidebarOpen(false);
          }}
          className={twMerge(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
            activeFilter === "notes"
              ? "bg-accent-soft text-accent border border-accent/20 font-semibold shadow-sm"
              : "text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary border border-transparent"
          )}
        >
          <FileText className="h-4.5 w-4.5 shrink-0" />
          <span>Catatan</span>
        </button>

        <button
          onClick={() => {
            setActiveFilter("archive");
            setIsSidebarOpen(false);
          }}
          className={twMerge(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
            activeFilter === "archive"
              ? "bg-accent-soft text-accent border border-accent/20 font-semibold shadow-sm"
              : "text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary border border-transparent"
          )}
        >
          <FolderOpen className="h-4.5 w-4.5 shrink-0" />
          <span>Arsip</span>
        </button>

        <button
          onClick={() => {
            setActiveFilter("trash");
            setIsSidebarOpen(false);
          }}
          className={twMerge(
            "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0",
            activeFilter === "trash"
              ? "bg-accent-soft text-accent border border-accent/20 font-semibold shadow-sm"
              : "text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary border border-transparent"
          )}
        >
          <Trash2 className="h-4.5 w-4.5 shrink-0" />
          <span>Sampah</span>
        </button>

        {/* Labels Section */}
        <div className="border-t border-border-soft/60 my-2 pt-2 shrink-0">
          <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3 flex items-center justify-between">
            <span>Label</span>
            <button
              onClick={() => {
                setIsLabelManagerOpen(true);
                setIsSidebarOpen(false);
              }}
              className="p-1 hover:bg-accent-soft hover:text-accent rounded-lg cursor-pointer"
              title="Edit Label"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto max-h-[40vh] md:max-h-none scrollbar-none pr-1">
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() => {
                setActiveFilter(label.id);
                setIsSidebarOpen(false);
              }}
              className={twMerge(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 w-full text-left",
                activeFilter === label.id
                  ? "bg-accent-soft text-accent border border-accent/20 font-semibold shadow-sm"
                  : "text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary border border-transparent"
              )}
            >
              <Tag className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{label.name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setIsLabelManagerOpen(true);
            setIsSidebarOpen(false);
          }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-[13px] font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary border border-transparent whitespace-nowrap cursor-pointer shrink-0 mt-auto"
        >
          <Settings className="h-4.5 w-4.5 shrink-0" />
          <span>Edit Label</span>
        </button>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-0 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8">
        
        {/* TOP SEARCH & VIEW HEADER */}
        <div className="flex items-center gap-3 w-full mb-6 shrink-0">
          {/* Hamburger Menu Toggle (Mobile only) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden h-10 w-10 shrink-0 flex items-center justify-center border border-border-soft bg-bg-surface text-text-secondary hover:text-accent rounded-xl cursor-pointer hover:bg-accent-soft/40 shadow-sm transition-all"
            title="Menu Filter"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Cari catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 bg-bg-surface border border-border-soft rounded-xl text-[12.5px] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:bg-accent-soft rounded-lg cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Empty Trash Button for Trash Filter */}
          {activeFilter === "trash" && otherNotes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmptyTrash}
              className="text-danger border-danger-soft hover:bg-danger-soft/20 text-xs h-10 px-3 shrink-0 hidden sm:inline-flex"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kosongkan Sampah
            </Button>
          )}

          {/* Grid/List Toggle Button */}
          <button
            onClick={toggleView}
            className="h-10 w-10 shrink-0 flex items-center justify-center border border-border-soft bg-bg-surface text-text-secondary hover:text-text-primary rounded-xl cursor-pointer hover:bg-accent-soft/40 shadow-sm transition-all"
            title={isGridView ? "Tampilan List" : "Tampilan Grid"}
          >
            {isGridView ? <List className="h-4.5 w-4.5" /> : <Grid className="h-4.5 w-4.5" />}
          </button>
        </div>

        {/* Empty Trash Button for Trash Filter on Mobile (below row if small screen) */}
        {activeFilter === "trash" && otherNotes.length > 0 && (
          <div className="sm:hidden mb-4 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmptyTrash}
              className="text-danger border-danger-soft hover:bg-danger-soft/20 text-xs h-9 w-full justify-center"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kosongkan Tempat Sampah
            </Button>
          </div>
        )}

        {/* INPUT TAKE A NOTE (Only shown on non-trash/non-archive view or label view) */}
        {activeFilter !== "trash" && activeFilter !== "archive" && (
          <div ref={createContainerRef} className="w-full max-w-xl mx-auto mb-10 transition-all">
            <div
              className={twMerge(
                "w-full rounded-2xl border bg-bg-surface shadow-md transition-all duration-300 overflow-hidden",
                isInputExpanded ? "ring-1 ring-accent/30 border-accent/40" : "border-border-soft hover:border-text-secondary/30",
                inputColor !== "default" && colorMap[inputColor]?.bgClass,
                inputColor !== "default" && colorMap[inputColor]?.borderClass
              )}
            >
              
              {/* COLLAPSED INPUT BAR */}
              {!isInputExpanded ? (
                <div
                  onClick={() => setIsInputExpanded(true)}
                  className="flex items-center justify-between px-5 py-4 cursor-text"
                >
                  <span className="text-[13px] text-text-secondary font-medium">Buat catatan...</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInputList(true);
                        setIsInputExpanded(true);
                      }}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                      title="List Baru"
                    >
                      <CheckSquare className="h-4.5 w-4.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsInputTable(true);
                        setIsInputExpanded(true);
                      }}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                      title="Tabel Baru"
                    >
                      <Table className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                
                /* EXPANDED INPUT FORM */
                <div className="flex flex-col">
                  {/* Pinned toggle & Title */}
                  <div className="flex items-center justify-between px-5 pt-4">
                    <input
                      type="text"
                      placeholder="Judul"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                      className={twMerge(
                        "w-full bg-transparent border-none text-[15px] font-semibold text-text-primary focus:outline-none focus:ring-0 placeholder:text-text-secondary/70",
                        inputColor !== "default" && colorMap[inputColor]?.textClass
                      )}
                    />
                    <button
                      onClick={() => setInputPinned(!inputPinned)}
                      className={twMerge(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        inputPinned
                          ? "text-accent bg-accent-soft"
                          : "text-text-secondary hover:text-text-primary hover:bg-accent-soft/50"
                      )}
                      title="Sematkan Catatan"
                    >
                      <Pin className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="px-5 py-3">
                    {isInputTable ? (
                      /* Table Mode */
                      <div className="flex flex-col gap-2 overflow-x-auto pb-4 mb-2">
                        <table className="min-w-full border-collapse text-xs text-text-primary">
                          <thead>
                            <tr className="border-b border-border-soft">
                              {inputTableHeaders.map((header, colIdx) => (
                                <th key={colIdx} className="p-1.5 relative border border-border-soft/60 bg-bg-surface/30 min-w-[120px] sm:min-w-[150px]">
                                  <input
                                    type="text"
                                    value={header}
                                    onChange={(e) => {
                                      const nextHeaders = [...inputTableHeaders];
                                      nextHeaders[colIdx] = e.target.value;
                                      setInputTableHeaders(nextHeaders);
                                    }}
                                    className="w-full bg-transparent border-none p-0 text-center font-semibold focus:outline-none focus:ring-0"
                                  />
                                  {inputTableHeaders.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInputTableHeaders(prev => prev.filter((_, i) => i !== colIdx));
                                        setInputTableRows(prev => prev.map(row => row.filter((_, i) => i !== colIdx)));
                                      }}
                                      className="absolute top-0 right-0 p-0.5 text-text-secondary hover:text-danger hover:bg-danger-soft/20 rounded cursor-pointer"
                                      title="Hapus Kolom"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {inputTableRows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-accent-soft/10">
                                {row.map((cell, colIdx) => (
                                  <td key={colIdx} className="p-1 border border-border-soft min-w-[120px] sm:min-w-[150px]">
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) => {
                                        const nextRows = [...inputTableRows];
                                        nextRows[rowIdx][colIdx] = e.target.value;
                                        setInputTableRows(nextRows);
                                      }}
                                      className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                                    />
                                  </td>
                                ))}
                                {inputTableRows.length > 1 && (
                                  <td className="p-1 border-none flex items-center justify-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInputTableRows(prev => prev.filter((_, i) => i !== rowIdx));
                                      }}
                                      className="p-1 text-text-secondary hover:text-danger hover:bg-danger-soft/20 rounded cursor-pointer"
                                      title="Hapus Baris"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInputTableRows(prev => [...prev, new Array(inputTableHeaders.length).fill("")]);
                            }}
                            className="text-[11px] font-semibold text-accent hover:bg-accent-soft/30 px-2.5 py-1 rounded-lg border border-accent/20 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Baris
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInputTableHeaders(prev => [...prev, `Kolom ${prev.length + 1}`]);
                              setInputTableRows(prev => prev.map(row => [...row, ""]));
                            }}
                            className="text-[11px] font-semibold text-accent hover:bg-accent-soft/30 px-2.5 py-1 rounded-lg border border-accent/20 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Kolom
                          </button>
                        </div>
                      </div>
                    ) : !isInputList ? (
                      <textarea
                        placeholder="Buat catatan..."
                        value={inputContent}
                        onChange={(e) => setInputContent(e.target.value)}
                        rows={3}
                        className={twMerge(
                          "w-full bg-transparent border-none text-[13.5px] text-text-primary focus:outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-text-secondary/70",
                          inputColor !== "default" && colorMap[inputColor]?.textClass
                        )}
                      />
                    ) : (
                      /* Checklist Mode */
                      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                        {inputListItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() => {
                                setInputListItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, isCompleted: !it.isCompleted } : it))
                                );
                              }}
                              className="rounded border-border-soft text-accent focus:ring-accent"
                            />
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => {
                                setInputListItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, text: e.target.value } : it))
                                );
                              }}
                              className={twMerge(
                                "flex-1 bg-transparent border-none text-[13px] text-text-primary focus:outline-none p-0 focus:ring-0",
                                item.isCompleted && "line-through text-text-secondary/60",
                                inputColor !== "default" && colorMap[inputColor]?.textClass
                              )}
                            />
                            <button
                              onClick={() => setInputListItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-text-secondary hover:text-danger rounded-md cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* Add Item Row */}
                        <form onSubmit={handleAddInputListItem} className="flex items-center gap-2 border-t border-border-soft/30 pt-2 mt-1">
                          <Plus className="h-4 w-4 text-text-secondary" />
                          <input
                            type="text"
                            placeholder="Item daftar"
                            value={newListItemText}
                            onChange={(e) => setNewListItemText(e.target.value)}
                            onBlur={() => handleAddInputListItem()}
                            className="flex-1 bg-transparent border-none text-[13px] text-text-primary focus:outline-none p-0 focus:ring-0 placeholder:text-text-secondary/50"
                          />
                          <button
                            type="submit"
                            className="p-1 hover:bg-accent-soft text-text-secondary hover:text-accent rounded-md cursor-pointer"
                          >
                            <CornerDownLeft className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Render Selected Label Pills */}
                    {inputLabels.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {inputLabels.map((lid) => {
                          const label = labels.find((l) => l.id === lid);
                          if (!label) return null;
                          return (
                            <span
                              key={lid}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft/40 text-accent border border-accent/15"
                            >
                              {label.name}
                              <button
                                onClick={() => setInputLabels((prev) => prev.filter((id) => id !== lid))}
                                className="hover:bg-accent-soft rounded-full p-0.5"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* BOTTOM ACTION BAR */}
                  <div className="flex items-center justify-between px-4 py-2 bg-bg-surface/50 dark:bg-[#000000]/10 border-t border-border-soft/30 relative">
                    <div className="flex items-center gap-1.5">
                      
                      {/* Color Palette Trigger */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setActiveDropdownType(activeDropdownType === "color" ? null : "color");
                            setActiveDropdownNoteId("new");
                          }}
                          className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                          title="Ubah Warna"
                        >
                          <Palette className="h-4 w-4" />
                        </button>
                        {activeDropdownType === "color" && activeDropdownNoteId === "new" && (
                          <div
                            ref={dropdownRef}
                            className="absolute left-0 bottom-12 z-50 bg-bg-surface border border-border-soft p-2 rounded-2xl shadow-xl flex gap-1 flex-wrap w-44"
                          >
                            {Object.entries(colorMap).map(([colorId, colorOpt]) => (
                              <button
                                key={colorId}
                                onClick={(e) => handleUpdateColor("new", colorId, e)}
                                style={{
                                  backgroundColor: colorOpt.hex !== "transparent" ? colorOpt.hex : undefined
                                }}
                                className={twMerge(
                                  "h-6 w-6 rounded-full border border-border-soft cursor-pointer transition-transform hover:scale-110",
                                  inputColor === colorId ? "ring-2 ring-accent" : "",
                                  colorOpt.hex === "transparent" && "bg-white dark:bg-slate-800"
                                )}
                                title={colorOpt.name}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Label Manager Trigger */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setActiveDropdownType(activeDropdownType === "label" ? null : "label");
                            setActiveDropdownNoteId("new");
                          }}
                          className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                          title="Ubah Label"
                        >
                          <Tag className="h-4 w-4" />
                        </button>
                        {activeDropdownType === "label" && activeDropdownNoteId === "new" && (
                          <div
                            ref={dropdownRef}
                            className="absolute left-0 bottom-12 z-50 bg-bg-surface border border-border-soft p-3 rounded-2xl shadow-xl flex flex-col gap-2 w-48 max-h-48 overflow-y-auto"
                          >
                            <span className="text-[11px] font-semibold text-text-secondary mb-1">Pilih Label</span>
                            {labels.length === 0 ? (
                              <span className="text-[10px] text-text-secondary">Belum ada label.</span>
                            ) : (
                              labels.map((label) => (
                                <label key={label.id} className="flex items-center gap-2 text-[12px] font-medium text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={inputLabels.includes(label.id)}
                                    onChange={() => handleToggleNoteLabel("new", label.id)}
                                    className="rounded border-border-soft text-accent focus:ring-accent"
                                  />
                                  <span>{label.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Convert Type Options */}
                      {(isInputList || isInputTable) && (
                        <button
                          onClick={(e) => handleConvertToType("new", "text", e)}
                          className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                          title="Ubah ke Catatan Teks"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      {!isInputList && (
                        <button
                          onClick={(e) => handleConvertToType("new", "list", e)}
                          className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                          title="Ubah ke Checklist"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </button>
                      )}
                      {!isInputTable && (
                        <button
                          onClick={(e) => handleConvertToType("new", "table", e)}
                          className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                          title="Ubah ke Tabel"
                        >
                          <Table className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetInputForm}
                        className="text-text-secondary hover:text-text-primary text-xs"
                      >
                        Batal
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveNewNote}
                        className="text-xs font-semibold px-4.5"
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NOTES CONTAINER */}
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 bg-accent-soft text-accent rounded-full flex items-center justify-center mb-4 empty-float">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-text-primary">Tidak ada catatan</h3>
            <p className="text-[13px] text-text-secondary max-w-xs mt-1 leading-relaxed">
              Catatan yang Anda buat atau cari akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* PINNED NOTES SECTION */}
            {pinnedNotes.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-1 px-1">
                  DIPINDAI ({pinnedNotes.length})
                </div>
                <div
                  className={twMerge(
                    isGridView
                      ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                      : "flex flex-col gap-3 max-w-2xl mx-auto w-full"
                  )}
                >
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isGridView={isGridView}
                      onSelect={() => note.isTrashed ? null : setEditingNote(note)}
                      onPin={(e) => handleTogglePin(note.id, e)}
                      onArchive={(e) => handleToggleArchive(note.id, e)}
                      onTrash={(e) => handleTrashNote(note.id, e)}
                      onRestore={(e) => handleRestoreNote(note.id, e)}
                      onDeletePermanently={(e) => handleDeletePermanently(note.id, e)}
                      onToggleListItem={(itemId, isCompleted) => handleToggleListItem(note.id, itemId, isCompleted)}
                      onToggleType={(e) => handleToggleNoteType(note.id, e)}
                      labels={labels}
                      activeDropdownType={activeDropdownNoteId === note.id ? activeDropdownType : null}
                      onOpenDropdown={(type) => {
                        setActiveDropdownType(type);
                        setActiveDropdownNoteId(note.id);
                      }}
                      onUpdateColor={(colorId, e) => handleUpdateColor(note.id, colorId, e)}
                      onToggleLabel={(labelId) => handleToggleNoteLabel(note.id, labelId)}
                      dropdownRef={dropdownRef}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* OTHER NOTES SECTION */}
            {otherNotes.length > 0 && (
              <div className="flex flex-col gap-3">
                {pinnedNotes.length > 0 && (
                  <div className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-1 px-1">
                    LAINNYA
                  </div>
                )}
                <div
                  className={twMerge(
                    isGridView
                      ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                      : "flex flex-col gap-3 max-w-2xl mx-auto w-full"
                  )}
                >
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isGridView={isGridView}
                      onSelect={() => note.isTrashed ? null : setEditingNote(note)}
                      onPin={(e) => handleTogglePin(note.id, e)}
                      onArchive={(e) => handleToggleArchive(note.id, e)}
                      onTrash={(e) => handleTrashNote(note.id, e)}
                      onRestore={(e) => handleRestoreNote(note.id, e)}
                      onDeletePermanently={(e) => handleDeletePermanently(note.id, e)}
                      onToggleListItem={(itemId, isCompleted) => handleToggleListItem(note.id, itemId, isCompleted)}
                      onToggleType={(e) => handleToggleNoteType(note.id, e)}
                      labels={labels}
                      activeDropdownType={activeDropdownNoteId === note.id ? activeDropdownType : null}
                      onOpenDropdown={(type) => {
                        setActiveDropdownType(type);
                        setActiveDropdownNoteId(note.id);
                      }}
                      onUpdateColor={(colorId, e) => handleUpdateColor(note.id, colorId, e)}
                      onToggleLabel={(labelId) => handleToggleNoteLabel(note.id, labelId)}
                      dropdownRef={dropdownRef}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. EDIT NOTE MODAL */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div
            onClick={handleCloseEditModal}
            className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div
            className={twMerge(
              "relative w-full max-w-xl bg-bg-surface border border-border-soft rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all duration-300 z-10",
              editingNote.color !== "default" && colorMap[editingNote.color]?.bgClass,
              editingNote.color !== "default" && colorMap[editingNote.color]?.borderClass
            )}
          >
            {/* Header: Title & Pin */}
            <div className="flex items-center justify-between px-6 pt-5 shrink-0">
              <input
                type="text"
                value={editingNote.title || ""}
                placeholder="Judul"
                onChange={(e) => setEditingNote((prev) => prev ? { ...prev, title: e.target.value } : null)}
                className={twMerge(
                  "w-full bg-transparent border-none text-[16px] font-semibold text-text-primary focus:outline-none focus:ring-0 placeholder:text-text-secondary/70",
                  editingNote.color !== "default" && colorMap[editingNote.color]?.textClass
                )}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNote((prev) => {
                    if (!prev) return null;
                    return { ...prev, isPinned: !prev.isPinned, isArchived: false };
                  });
                  handleTogglePin(editingNote.id);
                }}
                className={twMerge(
                  "p-2 rounded-xl transition-colors cursor-pointer",
                  editingNote.isPinned
                    ? "text-accent bg-accent-soft"
                    : "text-text-secondary hover:text-text-primary hover:bg-accent-soft/50"
                )}
              >
                <Pin className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              {editingNote.isTable ? (
                /* Table Mode in Modal */
                (() => {
                  const { headers: tableHeaders, rows: tableRows } = getEditingNoteTableData();
                  return (
                    <div className="flex flex-col gap-3 overflow-x-auto pb-6">
                      <table className="min-w-full border-collapse text-xs text-text-primary">
                        <thead>
                          <tr className="border-b border-border-soft">
                            {tableHeaders.map((header, colIdx) => (
                              <th key={colIdx} className="p-1.5 relative border border-border-soft/60 bg-bg-surface/30 min-w-[120px] sm:min-w-[150px]">
                                <input
                                  type="text"
                                  value={header}
                                  onChange={(e) => handleUpdateTableHeader(colIdx, e.target.value)}
                                  className="w-full bg-transparent border-none p-0 text-center font-semibold focus:outline-none focus:ring-0"
                                />
                                {tableHeaders.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTableNoteCol(colIdx)}
                                    className="absolute top-0 right-0 p-0.5 text-text-secondary hover:text-danger hover:bg-danger-soft/20 rounded cursor-pointer"
                                    title="Hapus Kolom"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-accent-soft/10">
                              {row.map((cell, colIdx) => (
                                <td key={colIdx} className="p-1 border border-border-soft min-w-[120px] sm:min-w-[150px]">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => handleUpdateTableCell(rowIdx, colIdx, e.target.value)}
                                    className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                                  />
                                </td>
                              ))}
                              {tableRows.length > 1 && (
                                <td className="p-1 border-none flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTableNoteRow(rowIdx)}
                                    className="p-1 text-text-secondary hover:text-danger hover:bg-danger-soft/20 rounded cursor-pointer"
                                    title="Hapus Baris"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={handleAddTableNoteRow}
                          className="text-[11px] font-semibold text-accent hover:bg-accent-soft/30 px-2.5 py-1 rounded-lg border border-accent/20 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Baris
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTableNoteCol}
                          className="text-[11px] font-semibold text-accent hover:bg-accent-soft/30 px-2.5 py-1 rounded-lg border border-accent/20 cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> Kolom
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : !editingNote.isList ? (
                <textarea
                  value={editingNote.content || ""}
                  placeholder="Catatan..."
                  onChange={(e) => setEditingNote((prev) => prev ? { ...prev, content: e.target.value } : null)}
                  rows={6}
                  className={twMerge(
                    "w-full bg-transparent border-none text-[13.5px] text-text-primary focus:outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-text-secondary/70",
                    editingNote.color !== "default" && colorMap[editingNote.color]?.textClass
                  )}
                />
              ) : (
                /* Checklist mode in Modal */
                <div className="flex flex-col gap-2">
                  {editingNote.listItems.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => handleToggleListItem(editingNote.id, item.id, !item.isCompleted)}
                        className="rounded border-border-soft text-accent focus:ring-accent"
                      />
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          setEditingNote((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              listItems: prev.listItems.map((it) =>
                                it.id === item.id ? { ...it, text: e.target.value } : it
                              ),
                            };
                          });
                        }}
                        className={twMerge(
                          "flex-1 bg-transparent border-none text-[13px] text-text-primary focus:outline-none p-0 focus:ring-0",
                          item.isCompleted && "line-through text-text-secondary/50",
                          editingNote.color !== "default" && colorMap[editingNote.color]?.textClass
                        )}
                      />
                      <button
                        onClick={() => {
                          setEditingNote((prev) => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              listItems: prev.listItems.filter((it) => it.id !== item.id),
                            };
                          });
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger rounded-md transition-opacity cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add New checklist Item */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newListItemText.trim()) return;
                      const newItem = {
                        id: `temp-${Date.now()}`,
                        noteId: editingNote.id,
                        text: newListItemText.trim(),
                        isCompleted: false,
                        urutan: editingNote.listItems.length,
                      };
                      setEditingNote((prev) => prev ? { ...prev, listItems: [...prev.listItems, newItem] } : null);
                      setNewListItemText("");
                    }}
                    className="flex items-center gap-2 border-t border-border-soft/20 pt-2 mt-2"
                  >
                    <Plus className="h-4 w-4 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Item daftar"
                      value={newListItemText}
                      onChange={(e) => setNewListItemText(e.target.value)}
                      className="flex-1 bg-transparent border-none text-[13px] text-text-primary focus:outline-none p-0 focus:ring-0 placeholder:text-text-secondary/50"
                    />
                  </form>
                </div>
              )}

              {/* Labels pills inside modal */}
              {editingNote.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-6">
                  {editingNote.labels.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-accent-soft/40 text-accent border border-accent/15"
                    >
                      {label.name}
                      <button
                        onClick={() => handleToggleNoteLabel(editingNote.id, label.id)}
                        className="hover:bg-accent-soft rounded-full p-0.5"
                      >
                        <X className="h-2 w-2" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-6 bg-bg-surface/50 dark:bg-[#000000]/10 border-t border-border-soft/30 shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                
                {/* Color Trigger inside Modal */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setActiveDropdownType(activeDropdownType === "color" ? null : "color");
                      setActiveDropdownNoteId(editingNote.id);
                    }}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                  {activeDropdownType === "color" && activeDropdownNoteId === editingNote.id && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 bottom-12 z-50 bg-bg-surface border border-border-soft p-2 rounded-2xl shadow-xl flex gap-1 flex-wrap w-44"
                    >
                      {Object.entries(colorMap).map(([colorId, colorOpt]) => (
                        <button
                          key={colorId}
                          onClick={(e) => handleUpdateColor(editingNote.id, colorId, e)}
                          style={{
                            backgroundColor: colorOpt.hex !== "transparent" ? colorOpt.hex : undefined
                          }}
                          className={twMerge(
                            "h-6 w-6 rounded-full border border-border-soft cursor-pointer transition-transform hover:scale-110",
                            editingNote.color === colorId ? "ring-2 ring-accent" : "",
                            colorOpt.hex === "transparent" && "bg-white dark:bg-slate-800"
                          )}
                          title={colorOpt.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Labels trigger inside Modal */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setActiveDropdownType(activeDropdownType === "label" ? null : "label");
                      setActiveDropdownNoteId(editingNote.id);
                    }}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                  {activeDropdownType === "label" && activeDropdownNoteId === editingNote.id && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 bottom-12 z-50 bg-bg-surface border border-border-soft p-3 rounded-2xl shadow-xl flex flex-col gap-2 w-48 max-h-48 overflow-y-auto"
                    >
                      <span className="text-[11px] font-semibold text-text-secondary mb-1">Pilih Label</span>
                      {labels.map((label) => (
                        <label key={label.id} className="flex items-center gap-2 text-[12px] font-medium text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingNote.labels.some((l) => l.id === label.id)}
                            onChange={() => handleToggleNoteLabel(editingNote.id, label.id)}
                            className="rounded border-border-soft text-accent focus:ring-accent"
                          />
                          <span>{label.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Convert inside modal */}
                {(editingNote.isList || editingNote.isTable) && (
                  <button
                    onClick={(e) => handleConvertToType(editingNote.id, "text", e)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                    title="Ubah ke Catatan Teks"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}
                {!editingNote.isList && (
                  <button
                    onClick={(e) => handleConvertToType(editingNote.id, "list", e)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                    title="Ubah ke Checklist"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </button>
                )}
                {!editingNote.isTable && (
                  <button
                    onClick={(e) => handleConvertToType(editingNote.id, "table", e)}
                    className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                    title="Ubah ke Tabel"
                  >
                    <Table className="h-4 w-4" />
                  </button>
                )}

                {/* Archive inside modal */}
                <button
                  onClick={(e) => {
                    handleToggleArchive(editingNote.id, e);
                    setEditingNote(null);
                  }}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                  title={editingNote.isArchived ? "Kembalikan dari Arsip" : "Arsipkan"}
                >
                  <Archive className="h-4 w-4" />
                </button>

                {/* Delete/Trash inside modal */}
                <button
                  onClick={(e) => {
                    handleTrashNote(editingNote.id, e);
                    setEditingNote(null);
                  }}
                  className="p-2 text-text-secondary hover:text-text-primary hover:bg-accent-soft/50 rounded-xl cursor-pointer"
                  title="Buang ke Sampah"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleCloseEditModal}
                className="px-4 sm:px-6 font-semibold"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. LABEL MANAGER MODAL */}
      {isLabelManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsLabelManagerOpen(false)}
            className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-sm bg-bg-surface border border-border-soft rounded-3xl shadow-2xl p-6 flex flex-col max-h-[70vh] z-10">
            <button
              onClick={() => setIsLabelManagerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/50"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-semibold text-text-primary font-display mb-4">Edit Label</h3>

            {/* Create Label Input */}
            <form onSubmit={handleCreateLabel} className="flex items-center gap-2 mb-4 shrink-0">
              <input
                type="text"
                placeholder="Buat label baru..."
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                className="flex-1 h-9 px-3 bg-bg-page border border-border-soft rounded-xl text-[12px] text-text-primary focus:outline-none focus:border-accent/40"
              />
              <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 rounded-xl shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {/* Label List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1">
              {labels.map((label) => (
                <div key={label.id} className="flex items-center gap-2 justify-between py-1 group">
                  {renamingLabelId === label.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renamingLabelName}
                        onChange={(e) => setRenamingLabelName(e.target.value)}
                        className="flex-1 h-8 px-2 bg-bg-page border border-accent/40 rounded-lg text-[12px] text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameLabel(label.id)}
                        className="p-1.5 text-success hover:bg-accent-soft rounded-md"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingLabelId(null)}
                        className="p-1.5 text-text-secondary hover:bg-accent-soft rounded-md"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[12.5px] text-text-primary font-medium pl-1 truncate">
                        {label.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setRenamingLabelId(label.id);
                            setRenamingLabelName(label.name);
                          }}
                          className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent-soft/50 rounded-md cursor-pointer"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(label.id)}
                          className="p-1.5 text-text-secondary hover:text-danger hover:bg-accent-soft/50 rounded-md cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {labels.length === 0 && (
                <div className="text-[11px] text-text-secondary text-center py-6">
                  Belum ada label. Buat satu di atas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* NOTE CARD SUB-COMPONENT */
interface NoteCardProps {
  note: Note;
  isGridView: boolean;
  onSelect: () => void;
  onPin: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onTrash: (e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  onDeletePermanently: (e: React.MouseEvent) => void;
  onToggleListItem: (itemId: string, isCompleted: boolean) => void;
  onToggleType: (e: React.MouseEvent) => void;
  labels: Label[];
  activeDropdownType: "color" | "label" | null;
  onOpenDropdown: (type: "color" | "label" | null) => void;
  onUpdateColor: (colorId: string, e: React.MouseEvent) => void;
  onToggleLabel: (labelId: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

function NoteCard({
  note,
  isGridView,
  onSelect,
  onPin,
  onArchive,
  onTrash,
  onRestore,
  onDeletePermanently,
  onToggleListItem,
  onToggleType,
  labels,
  activeDropdownType,
  onOpenDropdown,
  onUpdateColor,
  onToggleLabel,
  dropdownRef
}: NoteCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Group checklist items
  const activeItems = note.listItems.filter((i) => !i.isCompleted);
  const completedItems = note.listItems.filter((i) => i.isCompleted);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onClick={onSelect}
      className={twMerge(
        "card-stagger group/card relative flex flex-col rounded-2xl border text-text-primary overflow-hidden transition-all duration-300 select-none",
        isGridView ? "w-full min-h-[120px]" : "w-full",
        note.isTrashed ? "opacity-75" : "hover:shadow-md hover:border-text-secondary/20",
        note.color === "default" ? "bg-bg-surface border-border-soft/60 dark:bg-[#0F1623] dark:border-border-soft/20" : colorMap[note.color]?.bgClass,
        note.color === "default" ? "border-border-soft/60" : colorMap[note.color]?.borderClass
      )}
    >
      
      {/* 1. Header (Title & Pin) */}
      <div className="flex items-start justify-between px-4 pt-3.5 pb-1 gap-2 shrink-0">
        <h4 className={twMerge(
          "text-[13.5px] font-semibold tracking-tight line-clamp-2 leading-tight flex-1",
          note.color !== "default" && colorMap[note.color]?.textClass
        )}>
          {note.title || (note.isList ? "Daftar Tanpa Judul" : "Catatan Tanpa Judul")}
        </h4>

        {!note.isTrashed && (
          <button
            onClick={onPin}
            className={twMerge(
              "p-1.5 rounded-lg transition-all cursor-pointer opacity-0 group-hover/card:opacity-100 active:scale-95 shrink-0",
              note.isPinned
                ? "text-accent bg-accent-soft opacity-100"
                : "text-text-secondary hover:text-text-primary hover:bg-accent-soft/30"
            )}
            title={note.isPinned ? "Lepas Sematan" : "Sematkan Catatan"}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 2. Content */}
      <div className="px-4 py-2 flex-1 text-[12.5px] leading-relaxed">
        {note.isTable ? (
          (() => {
            try {
              const data = JSON.parse(note.content || "{}") as { headers: string[]; rows: string[][] };
              if (!data.headers || !data.rows || data.headers.length === 0) {
                return <em className="opacity-40 text-[11px] font-sans">Kosong</em>;
              }
              const displayHeaders = data.headers.slice(0, 3);
              const displayRows = data.rows.slice(0, 3);
              const hasMoreCols = data.headers.length > 3;
              const hasMoreRows = data.rows.length > 3;

              return (
                <div className="overflow-x-auto w-full max-w-full pb-1 flex flex-col gap-1 select-none">
                  <table className="w-full text-[11px] border-collapse text-left border border-border-soft/60">
                    <thead>
                      <tr className="bg-bg-page/40 dark:bg-black/10 border-b border-border-soft/60">
                        {displayHeaders.map((header, idx) => (
                          <th key={idx} className="p-1 font-semibold truncate max-w-[80px] border-r border-border-soft/60">
                            {header}
                          </th>
                        ))}
                        {hasMoreCols && <th className="p-1 font-semibold text-text-secondary opacity-60">...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-border-soft/60 last:border-0 hover:bg-accent-soft/5">
                          {row.slice(0, 3).map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-1 truncate max-w-[80px] border-r border-border-soft/60">
                              {cell || <span className="opacity-20">-</span>}
                            </td>
                          ))}
                          {hasMoreCols && <td className="p-1 text-text-secondary opacity-60">...</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(hasMoreRows || hasMoreCols) && (
                    <div className="text-[10px] text-text-secondary/70 font-medium pl-0.5 pt-0.5">
                      {hasMoreRows && `+ ${data.rows.length - 3} baris lagi`}
                      {hasMoreRows && hasMoreCols && ` • `}
                      {hasMoreCols && `+ ${data.headers.length - 3} kolom lagi`}
                    </div>
                  )}
                </div>
              );
            } catch (e) {
              return <p className="text-text-secondary break-all">{note.content}</p>;
            }
          })()
        ) : !note.isList ? (
          <p className={twMerge(
            "whitespace-pre-wrap break-words line-clamp-6 text-text-secondary",
            note.color !== "default" && "text-text-primary/80 opacity-90"
          )}>
            {note.content || <em className="opacity-40 text-[11px] font-sans">Kosong</em>}
          </p>
        ) : (
          /* Checklist preview */
          <div className="flex flex-col gap-1.5">
            {/* Active Items */}
            {activeItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                onClick={(e) => e.stopPropagation()}
                className="flex items-start gap-2"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => onToggleListItem(item.id, true)}
                  disabled={note.isTrashed}
                  className="mt-0.5 rounded border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                />
                <span className={twMerge("break-all truncate", note.color !== "default" && colorMap[note.color]?.textClass)}>
                  {item.text}
                </span>
              </div>
            ))}

            {/* Overflow Count */}
            {activeItems.length > 5 && (
              <div className="text-[10px] text-text-secondary font-medium pl-5">
                + {activeItems.length - 5} item lainnya...
              </div>
            )}

            {/* Completed Preview (Collapsible indicator) */}
            {completedItems.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 border-t border-border-soft/10 pt-1.5">
                {completedItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2 opacity-50"
                  >
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => onToggleListItem(item.id, false)}
                      disabled={note.isTrashed}
                      className="mt-0.5 rounded border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                    />
                    <span className="line-through truncate break-all">
                      {item.text}
                    </span>
                  </div>
                ))}
                {completedItems.length > 3 && (
                  <div className="text-[10px] text-text-secondary font-medium pl-5 opacity-60">
                    + {completedItems.length - 3} item selesai...
                  </div>
                )}
              </div>
            )}
            {note.listItems.length === 0 && (
              <em className="opacity-40 text-[11px] font-sans">Kosong</em>
            )}
          </div>
        )}

        {/* Labels tag pills */}
        {note.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-accent-soft/30 text-accent border border-accent/10 whitespace-nowrap"
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Spacer to push actions to bottom */}
      <div className="h-10 shrink-0" />

      {/* 3. Hover Toolbar Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          "absolute bottom-0 left-0 right-0 h-9 flex items-center justify-between px-3 py-1 bg-bg-surface/90 dark:bg-bg-surface/95 border-t border-border-soft/40 backdrop-blur-sm transition-all duration-300",
          isHovered || activeDropdownType ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
          note.color !== "default" && colorMap[note.color]?.bgClass,
          note.color !== "default" && "bg-opacity-95 backdrop-blur-md"
        )}
      >
        {!note.isTrashed ? (
          /* REGULAR ACTIONS */
          <div className="flex items-center gap-1.5 w-full">
            
            {/* Color Palette Popover */}
            <div className="relative">
              <button
                onClick={() => onOpenDropdown(activeDropdownType === "color" ? null : "color")}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
                title="Ubah Warna"
              >
                <Palette className="h-3.5 w-3.5" />
              </button>
              {activeDropdownType === "color" && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 bottom-8 z-50 bg-bg-surface border border-border-soft p-1.5 rounded-xl shadow-xl flex gap-1 flex-wrap w-40"
                >
                  {Object.entries(colorMap).map(([colorId, colorOpt]) => (
                    <button
                      key={colorId}
                      onClick={(e) => onUpdateColor(colorId, e)}
                      style={{
                        backgroundColor: colorOpt.hex !== "transparent" ? colorOpt.hex : undefined
                      }}
                      className={twMerge(
                        "h-5.5 w-5.5 rounded-full border border-border-soft cursor-pointer transition-transform hover:scale-110",
                        note.color === colorId ? "ring-2 ring-accent" : "",
                        colorOpt.hex === "transparent" && "bg-white dark:bg-slate-800"
                      )}
                      title={colorOpt.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Label Manager Popover */}
            <div className="relative">
              <button
                onClick={() => onOpenDropdown(activeDropdownType === "label" ? null : "label")}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
                title="Ubah Label"
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
              {activeDropdownType === "label" && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 bottom-8 z-50 bg-bg-surface border border-border-soft p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 w-44 max-h-44 overflow-y-auto"
                >
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Label</span>
                  {labels.length === 0 ? (
                    <span className="text-[9px] text-text-secondary">Tidak ada label.</span>
                  ) : (
                    labels.map((label) => (
                      <label key={label.id} className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={note.labels.some((l) => l.id === label.id)}
                          onChange={() => onToggleLabel(label.id)}
                          className="rounded border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                        />
                        <span className="truncate">{label.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Convert Note Type */}
            <button
              onClick={onToggleType}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
              title={note.isList ? "Ubah ke Catatan Teks" : "Ubah ke Checklist"}
            >
              {note.isList ? <FileText className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
            </button>

            {/* Archive Button */}
            <button
              onClick={onArchive}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
              title={note.isArchived ? "Kembalikan dari Arsip" : "Arsipkan"}
            >
              <Archive className="h-3.5 w-3.5" />
            </button>

            {/* Trash Button */}
            <button
              onClick={onTrash}
              className="p-1 ml-auto text-text-secondary hover:text-danger hover:bg-danger-soft/30 rounded-lg cursor-pointer transition-colors"
              title="Buang ke Sampah"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* TRASHED ACTIONS */
          <div className="flex items-center justify-between w-full">
            <button
              onClick={onRestore}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent-soft rounded-lg cursor-pointer transition-colors"
              title="Pulihkan Catatan"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Pulihkan</span>
            </button>
            <button
              onClick={onDeletePermanently}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-danger hover:bg-danger-soft/20 rounded-lg cursor-pointer transition-colors"
              title="Hapus Permanen"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Hapus Permanen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
