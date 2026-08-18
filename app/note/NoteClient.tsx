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
  Folder as FolderIcon,
  Bell,
  FolderOpen,
  Settings,
  MoreVertical,
  CornerDownLeft,
  FileText,
  CheckSquare,
  Calendar,
  Table,
  Menu,
  ArrowUpDown,
  Copy,
  Sigma,
  Image as ImageIcon,
} from "lucide-react";
import * as ReactDOM from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/dialog";
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
  deleteLabel,
  duplicateNote,
  createFolder,
  renameFolder,
  deleteFolder,
  assignNoteToFolder,
} from "@/lib/actions/note";
import { colorMap, calculateColumnTotal } from "./constants";
import type { Note, Label, FolderItem } from "./types";
import { NoteCard } from "./components/NoteCard";

interface NoteClientProps {
  initialNotes: Note[];
  initialLabels: Label[];
  initialFolders: FolderItem[];
}

export function NoteClient({ initialNotes, initialLabels, initialFolders }: NoteClientProps) {
  const router = useRouter();

  // State
  const [notes, setNotes] = React.useState<Note[]>(initialNotes);
  const [labels, setLabels] = React.useState<Label[]>(initialLabels);
  const [folders, setFolders] = React.useState<FolderItem[]>(initialFolders);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<"notes" | "archive" | "trash" | string>("notes");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isGridView, setIsGridView] = React.useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<"updated" | "created" | "title" | "reminder">("updated");

  // Modals / Overlays
  const [isLabelManagerOpen, setIsLabelManagerOpen] = React.useState(false);
  const [newLabelInput, setNewLabelInput] = React.useState("");
  const [renamingLabelId, setRenamingLabelId] = React.useState<string | null>(null);
  const [renamingLabelName, setRenamingLabelName] = React.useState("");

  // Folder Modals / Overlays
  const [isFolderManagerOpen, setIsFolderManagerOpen] = React.useState(false);
  const [newFolderInput, setNewFolderInput] = React.useState("");
  const [renamingFolderId, setRenamingFolderId] = React.useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = React.useState("");

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

  // Active Dropdowns state (Color / Labels / Sort / More / Folder)
  const [activeDropdownType, setActiveDropdownType] = React.useState<"color" | "label" | "sort" | "more" | "folder" | null>(null);
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

  // isMounted flag â€” prevents SSR/client hydration mismatch for dynamic sections
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => { setIsMounted(true); }, []);

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
      // Match bullet list: e.g., "- " or "* " or "â€¢ "
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
        setInputContent(newValue);
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
        setInputContent(newValue);
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
        setInputContent(newValue);
        return;
      }
    }
  };

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
      const accumulatedCols = new Array(inputTableHeaders.length).fill(false);
      const columnTypes = new Array(inputTableHeaders.length).fill("TEKS");
      const columnFormulas = new Array(inputTableHeaders.length).fill("");
      content = JSON.stringify({
        headers: inputTableHeaders,
        rows: inputTableRows,
        accumulatedCols,
        columnTypes,
        columnFormulas,
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
      folderId: selectedFolderId,
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

    const note = notes.find((n) => n.id === noteId);
    const isCurrentlyArchived = note?.isArchived || false;

    const performArchive = async () => {
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

    if (!isCurrentlyArchived) {
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

  // Move to Trash
  const handleTrashNote = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    setConfirmDialog({
      isOpen: true,
      title: "Buang ke Sampah",
      description: "Apakah Anda yakin ingin membuang catatan ini ke sampah?",
      confirmText: "Buang",
      isDanger: true,
      onConfirm: async () => {
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
      },
    });
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

    setConfirmDialog({
      isOpen: true,
      title: "Hapus Permanen",
      description: "Hapus catatan ini secara permanen? Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Hapus",
      isDanger: true,
      onConfirm: async () => {
        // Optimistic Update
        setNotes((prev) => prev.filter((n) => n.id !== noteId));

        const res = await deleteNotePermanently(noteId);
        if (res.success) {
          toast.success("Catatan dihapus permanen");
        } else {
          toast.error(res.error || "Gagal menghapus catatan");
          router.refresh();
        }
      },
    });
  };

  // Duplicate Note
  const handleDuplicateNote = async (noteId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();

    const toastId = toast.loading("Menduplikasi catatan...");
    const res = await duplicateNote(noteId);
    
    if (res.success && res.data) {
      // Add duplicated note locally
      setNotes((prev) => [res.data as Note, ...prev]);
      toast.success("Salinan berhasil dibuat", { id: toastId });
    } else {
      toast.error(res.error || "Gagal menduplikasi catatan", { id: toastId });
      router.refresh();
    }
  };

  // Empty Trash
  const handleEmptyTrash = async () => {
    setConfirmDialog({
      isOpen: true,
      title: "Kosongkan Sampah",
      description: "Kosongkan semua catatan di tempat sampah? Tindakan ini permanen dan tidak dapat dibatalkan.",
      confirmText: "Kosongkan",
      isDanger: true,
      onConfirm: async () => {
        setNotes((prev) => prev.filter((n) => !n.isTrashed));

        const res = await emptyTrash();
        if (res.success) {
          toast.success("Tempat sampah dikosongkan");
        } else {
          toast.error(res.error || "Gagal mengosongkan tempat sampah");
          router.refresh();
        }
      },
    });
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

  // Folder manager handlers
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderInput.trim()) return;

    const res = await createFolder(newFolderInput);
    if (res.success && res.data) {
      setFolders((prev) => [...prev, res.data as FolderItem]);
      setNewFolderInput("");
      toast.success("Folder dibuat");
    } else {
      toast.error(res.error || "Gagal membuat folder");
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (!renamingFolderName.trim()) return;

    const res = await renameFolder(id, renamingFolderName);
    if (res.success && res.data) {
      const updated = res.data as FolderItem;
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: updated.name } : f)));
      setNotes((prev) =>
        prev.map((n) => {
          if (n.folderId === id) {
            return {
              ...n,
              folder: { id, name: updated.name },
            };
          }
          return n;
        })
      );
      setRenamingFolderId(null);
      toast.success("Folder diubah");
    } else {
      toast.error(res.error || "Gagal mengubah folder");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Hapus folder ini? Catatan di dalamnya akan tetap disimpan (menjadi tanpa folder).")) return;

    const res = await deleteFolder(id);
    if (res.success) {
      setFolders((prev) => prev.filter((f) => f.id !== id));
      setNotes((prev) =>
        prev.map((n) => {
          if (n.folderId === id) {
            return { ...n, folderId: null, folder: null };
          }
          return n;
        })
      );
      toast.success("Folder dihapus");
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
      }
    } else {
      toast.error(res.error || "Gagal menghapus folder");
    }
  };

  const handleAssignNoteFolder = async (noteId: string, folderId: string | null) => {
    const folder = folders.find((f) => f.id === folderId);
    
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          return {
            ...n,
            folderId,
            folder: folder ? { id: folder.id, name: folder.name } : null,
          };
        }
        return n;
      })
    );

    const res = await assignNoteToFolder(noteId, folderId);
    if (!res.success) {
      toast.error(res.error || "Gagal memindahkan catatan");
      router.refresh();
    } else {
      toast.success(folder ? `Dipindahkan ke folder ${folder.name}` : "Dikeluarkan dari folder");
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
      const accumulatedCols = new Array(headers.length).fill(false);
      const columnTypes = new Array(headers.length).fill("TEKS");
      const columnFormulas = new Array(headers.length).fill("");
      nextContent = JSON.stringify({ headers, rows, accumulatedCols, columnTypes, columnFormulas });
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



  // Filter notes in memory with useMemo for 0ms render response
  const filteredNotes = React.useMemo(() => {
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

    // Filter by folder if selected
    if (selectedFolderId) {
      filtered = filtered.filter((n) => n.folderId === selectedFolderId);
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

    // Apply sorting
    if (sortBy === "updated") {
      filtered = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (sortBy === "created") {
      filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "title") {
      filtered = [...filtered].sort((a, b) => {
        const tA = a.title || "";
        const tB = b.title || "";
        return tA.localeCompare(tB, "id");
      });
    } else if (sortBy === "reminder") {
      filtered = [...filtered].sort((a, b) => {
        const timeA = a.reminderAt && !a.reminderSent ? new Date(a.reminderAt).getTime() : Infinity;
        const timeB = b.reminderAt && !b.reminderSent ? new Date(b.reminderAt).getTime() : Infinity;
        if (timeA === Infinity && timeB === Infinity) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        return timeA - timeB;
      });
    }

    return filtered;
  }, [notes, activeFilter, selectedFolderId, searchQuery, sortBy]);

  const { pinnedNotes, otherNotes } = React.useMemo(() => {
    return {
      pinnedNotes: filteredNotes.filter((n) => n.isPinned),
      otherNotes: filteredNotes.filter((n) => !n.isPinned),
    };
  }, [filteredNotes]);

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

        {/* Folders Section â€” rendered only on client to avoid SSR hydration mismatch */}
        {isMounted && (
          <>
            <div className="border-t border-border-soft/60 my-2 pt-2 shrink-0">
              <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3 flex items-center justify-between">
                <span>Folder</span>
                <button
                  onClick={() => {
                    setIsFolderManagerOpen(true);
                    setIsSidebarOpen(false);
                  }}
                  className="p-1 hover:bg-accent-soft hover:text-accent rounded-lg cursor-pointer"
                  title="Kelola Folder"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[30vh] md:max-h-none scrollbar-none pr-1">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFolderId(selectedFolderId === f.id ? null : f.id);
                    setIsSidebarOpen(false);
                  }}
                  className={twMerge(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 w-full text-left",
                    selectedFolderId === f.id
                      ? "bg-accent-soft text-accent border border-accent/20 font-semibold shadow-sm"
                      : "text-text-secondary hover:bg-bg-surface/80 hover:text-text-primary border border-transparent"
                  )}
                >
                  <FolderIcon className="h-4.5 w-4.5 shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  {f._count && f._count.notes > 0 && (
                    <span className="text-[10px] font-semibold text-text-secondary bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                      {f._count.notes}
                    </span>
                  )}
                </button>
              ))}
              {folders.length === 0 && (
                <div className="text-[11px] text-text-secondary text-center py-2 italic">
                  Belum ada folder.
                </div>
              )}
            </div>
          </>
        )}

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
      <main className="flex-1 flex flex-col min-h-0 overflow-visible md:overflow-y-auto px-4 md:px-8 py-4 pb-6">
        
        {/* TOP SEARCH & VIEW HEADER */}
        <div className="flex items-center gap-3 w-full mb-4 shrink-0">
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

          {/* Sort Option Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveDropdownType(activeDropdownType === "sort" ? null : "sort");
                setActiveDropdownNoteId("sort");
              }}
              className={twMerge(
                "h-10 w-10 shrink-0 flex items-center justify-center border rounded-xl cursor-pointer hover:bg-accent-soft/40 shadow-sm transition-all duration-150",
                activeDropdownType === "sort"
                  ? "border-accent bg-accent-soft/20 text-accent"
                  : "border-border-soft bg-bg-surface text-text-secondary hover:text-text-primary"
              )}
              title="Urutkan Catatan"
            >
              <ArrowUpDown className="h-4.5 w-4.5" />
            </button>
            {activeDropdownType === "sort" && activeDropdownNoteId === "sort" && (
              <div
                ref={dropdownRef}
                className="absolute right-0 top-11 z-50 bg-bg-surface border border-border-soft p-1.5 rounded-xl shadow-xl flex flex-col gap-1 w-36"
              >
                <button
                  onClick={() => {
                    setSortBy("updated");
                    setActiveDropdownType(null);
                    setActiveDropdownNoteId(null);
                  }}
                  className={twMerge(
                    "px-3 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer w-full font-sans",
                    sortBy === "updated"
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-text-secondary hover:bg-accent-soft/30 hover:text-text-primary"
                  )}
                >
                  Terakhir Diedit
                </button>
                <button
                  onClick={() => {
                    setSortBy("created");
                    setActiveDropdownType(null);
                    setActiveDropdownNoteId(null);
                  }}
                  className={twMerge(
                    "px-3 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer w-full font-sans",
                    sortBy === "created"
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-text-secondary hover:bg-accent-soft/30 hover:text-text-primary"
                  )}
                >
                  Terakhir Dibuat
                </button>
                <button
                  onClick={() => {
                    setSortBy("title");
                    setActiveDropdownType(null);
                    setActiveDropdownNoteId(null);
                  }}
                  className={twMerge(
                    "px-3 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer w-full font-sans",
                    sortBy === "title"
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-text-secondary hover:bg-accent-soft/30 hover:text-text-primary"
                  )}
                >
                  Judul (A-Z)
                </button>
                <button
                  onClick={() => {
                    setSortBy("reminder");
                    setActiveDropdownType(null);
                    setActiveDropdownNoteId(null);
                  }}
                  className={twMerge(
                    "px-3 py-1.5 text-left text-xs rounded-lg transition-colors cursor-pointer w-full font-sans",
                    sortBy === "reminder"
                      ? "bg-accent-soft text-accent font-semibold"
                      : "text-text-secondary hover:bg-accent-soft/30 hover:text-text-primary"
                  )}
                >
                  Jadwal Pengingat
                </button>
              </div>
            )}
          </div>

          {/* Grid/List Toggle Button */}
          <button
            onClick={toggleView}
            className="h-10 w-10 shrink-0 flex items-center justify-center border border-border-soft bg-bg-surface text-text-secondary hover:text-text-primary rounded-xl cursor-pointer hover:bg-accent-soft/40 shadow-sm transition-all"
            title={isGridView ? "Tampilan List" : "Tampilan Grid"}
          >
            {isGridView ? <List className="h-4.5 w-4.5" /> : <Grid className="h-4.5 w-4.5" />}
          </button>
        </div>

        {/* HORIZONTAL FOLDER FILTER BAR */}
        <div className="flex items-center gap-2 mb-4 shrink-0 overflow-x-auto pb-0.5 no-scrollbar select-none w-full">
          <div className="flex items-center gap-1 shrink-0 text-text-secondary pr-1 text-[11px] font-bold uppercase tracking-wider">
            <FolderIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Folder:</span>
          </div>
          
          <button
            onClick={() => setSelectedFolderId(null)}
            className={twMerge(
              "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border shrink-0",
              !selectedFolderId
                ? "bg-accent border-accent text-white shadow-sm"
                : "bg-bg-surface border-border-soft text-text-secondary hover:text-text-primary hover:border-text-secondary/25"
            )}
          >
            Semua
          </button>
          
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={twMerge(
                "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all border flex items-center gap-1.5 shrink-0",
                selectedFolderId === f.id
                  ? "bg-accent border-accent text-white shadow-sm"
                  : "bg-bg-surface border-border-soft text-text-secondary hover:text-text-primary hover:border-text-secondary/25"
              )}
            >
              <span>{f.name}</span>
              {f._count && f._count.notes > 0 && (
                <span className={twMerge(
                  "text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0",
                  selectedFolderId === f.id
                    ? "bg-white/20 text-white"
                    : "bg-black/5 dark:bg-white/10 text-text-secondary"
                )}>
                  {f._count.notes}
                </span>
              )}
            </button>
          ))}

          <button
            onClick={() => setIsFolderManagerOpen(true)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-surface border border-dashed border-border-soft text-text-secondary hover:text-accent hover:border-accent/40 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 shrink-0"
            title="Kelola Folder"
          >
            <Plus className="h-3 w-3" />
            <span>Kelola</span>
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
          <div ref={createContainerRef} className="w-full max-w-xl mx-auto mb-6 transition-all">
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
                        onKeyDown={handleTextareaKeyDown}
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
          <div className="flex flex-col gap-5">
            
            {/* PINNED NOTES SECTION */}
            {pinnedNotes.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="text-[10px] font-bold text-text-secondary tracking-widest uppercase mb-1 px-1">
                  DIPINDAI ({pinnedNotes.length})
                </div>
                <div
                  className={twMerge(
                    isGridView
                      ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3"
                      : "flex flex-col gap-2.5 max-w-2xl mx-auto w-full"
                  )}
                >
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isGridView={isGridView}
                      onSelect={() => note.isTrashed ? null : router.push(`/note/${note.id}`)}
                      onPin={(e) => handleTogglePin(note.id, e)}
                      onArchive={(e) => handleToggleArchive(note.id, e)}
                      onTrash={(e) => handleTrashNote(note.id, e)}
                      onRestore={(e) => handleRestoreNote(note.id, e)}
                      onDeletePermanently={(e) => handleDeletePermanently(note.id, e)}
                      onToggleListItem={(itemId, isCompleted) => handleToggleListItem(note.id, itemId, isCompleted)}
                      onToggleType={(e) => handleToggleNoteType(note.id, e)}
                      labels={labels}
                      folders={folders}
                      onUpdateColor={(colorId, e) => handleUpdateColor(note.id, colorId, e)}
                      onToggleLabel={(labelId) => handleToggleNoteLabel(note.id, labelId)}
                      onAssignNoteFolder={handleAssignNoteFolder}
                      onDuplicate={(e) => handleDuplicateNote(note.id, e)}
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
                      ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3"
                      : "flex flex-col gap-2.5 max-w-2xl mx-auto w-full"
                  )}
                >
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isGridView={isGridView}
                      onSelect={() => note.isTrashed ? null : router.push(`/note/${note.id}`)}
                      onPin={(e) => handleTogglePin(note.id, e)}
                      onArchive={(e) => handleToggleArchive(note.id, e)}
                      onTrash={(e) => handleTrashNote(note.id, e)}
                      onRestore={(e) => handleRestoreNote(note.id, e)}
                      onDeletePermanently={(e) => handleDeletePermanently(note.id, e)}
                      onToggleListItem={(itemId, isCompleted) => handleToggleListItem(note.id, itemId, isCompleted)}
                      onToggleType={(e) => handleToggleNoteType(note.id, e)}
                      labels={labels}
                      folders={folders}
                      onUpdateColor={(colorId, e) => handleUpdateColor(note.id, colorId, e)}
                      onToggleLabel={(labelId) => handleToggleNoteLabel(note.id, labelId)}
                      onAssignNoteFolder={handleAssignNoteFolder}
                      onDuplicate={(e) => handleDuplicateNote(note.id, e)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>



      {/* 4. LABEL MANAGER MODAL */}
      {isLabelManagerOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => setIsLabelManagerOpen(false)}
            className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-sm bg-bg-surface border border-border-soft rounded-3xl shadow-2xl p-6 flex flex-col max-h-[70vh] z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsLabelManagerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/50 cursor-pointer"
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
              <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 rounded-xl shrink-0 cursor-pointer">
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
                        className="p-1.5 text-success hover:bg-accent-soft rounded-md cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingLabelId(null)}
                        className="p-1.5 text-text-secondary hover:bg-accent-soft rounded-md cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[12.5px] text-text-primary font-medium pl-1 truncate">
                        {label.name}
                      </span>
                      <div className="flex items-center gap-1">
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
        </div>,
        document.body
      )}

      {/* 5. FOLDER MANAGER MODAL */}
      {isFolderManagerOpen && typeof document !== "undefined" && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => setIsFolderManagerOpen(false)}
            className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm transition-opacity"
          />

          <div className="relative w-full max-w-sm bg-bg-surface border border-border-soft rounded-3xl shadow-2xl p-6 flex flex-col max-h-[70vh] z-10 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsFolderManagerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-text-secondary hover:bg-accent-soft/50 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-semibold text-text-primary font-display mb-4">Kelola Folder</h3>

            {/* Create Folder Input */}
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2 mb-4 shrink-0">
              <input
                type="text"
                placeholder="Buat folder baru..."
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value)}
                className="flex-1 h-9 px-3 bg-bg-page border border-border-soft rounded-xl text-[12px] text-text-primary focus:outline-none focus:border-accent/40"
              />
              <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 rounded-xl shrink-0 cursor-pointer">
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0 pr-1">
              {folders.map((f) => (
                <div key={f.id} className="flex items-center gap-2 justify-between py-1 border-b border-border-soft/30 last:border-0">
                  {renamingFolderId === f.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renamingFolderName}
                        onChange={(e) => setRenamingFolderName(e.target.value)}
                        className="flex-1 h-8 px-2 bg-bg-page border border-accent/40 rounded-lg text-[12px] text-text-primary focus:outline-none"
                      />
                      <button
                        onClick={() => handleRenameFolder(f.id)}
                        className="p-1.5 text-success hover:bg-accent-soft rounded-md cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingFolderId(null)}
                        className="p-1.5 text-text-secondary hover:bg-accent-soft rounded-md cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col min-w-0 flex-1 pl-1">
                        <span className="text-[12.5px] text-text-primary font-medium truncate">
                          {f.name}
                        </span>
                        {f._count && f._count.notes > 0 && (
                          <span className="text-[10px] text-text-secondary">
                            {f._count.notes} catatan
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setRenamingFolderId(f.id);
                            setRenamingFolderName(f.name);
                          }}
                          className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent-soft/50 rounded-md cursor-pointer"
                          title="Ubah Nama Folder"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(f.id)}
                          className="p-1.5 text-text-secondary hover:text-danger hover:bg-accent-soft/50 rounded-md cursor-pointer"
                          title="Hapus Folder"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {folders.length === 0 && (
                <div className="text-[11px] text-text-secondary text-center py-6 italic">
                  Belum ada folder. Buat satu di atas.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. CONFIRMATION ALERTLOG */}
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

// NoteCard dan helper functions sudah dipindah ke:
// - app/note/components/NoteCard.tsx
// - app/note/constants.ts
// - app/note/types.ts
