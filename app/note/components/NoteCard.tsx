"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  Pin,
  Archive,
  Trash2,
  Tag,
  Palette,
  Bell,
  Folder as FolderIcon,
  RotateCcw,
  MoreVertical,
  FileText,
  CheckSquare,
  Square,
  Copy,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { fetchLinkMetadata } from "@/lib/actions/note";
import { colorMap, extractUrls, calculateColumnTotal, renderTextWithLinks, parseNumericValue } from "@/app/note/constants";
import { evaluateTableNoteFormula, formatTableFormulaResult } from "@/lib/utils/formulaEvaluator";
import type { Note, Label, FolderItem } from "@/app/note/types";

// ── NoteCard Props ────────────────────────────────────────────────────────────

export interface NoteCardProps {
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
  onDuplicate: (e: React.MouseEvent) => void;
  labels: Label[];
  folders: FolderItem[];
  onUpdateColor: (colorId: string, e: React.MouseEvent) => void;
  onToggleLabel: (labelId: string) => void;
  onAssignNoteFolder: (noteId: string, folderId: string | null) => void;
}

// ── NoteCard Component ────────────────────────────────────────────────────────

export const NoteCard = React.memo(function NoteCard({
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
  onDuplicate,
  labels,
  folders,
  onUpdateColor,
  onToggleLabel,
  onAssignNoteFolder,
}: NoteCardProps) {
  // Group checklist items
  const activeItems = note.listItems.filter((i) => !i.isCompleted);

  // Self-contained dropdown state — no parent state dependency
  const moreButtonRef = React.useRef<HTMLButtonElement>(null);
  const portalRef = React.useRef<HTMLDivElement>(null);
  const [activeDropdown, setActiveDropdown] = React.useState<"more" | "color" | "label" | "folder" | null>(null);
  const [dropdownPos, setDropdownPos] = React.useState<{
    top: number;
    right: number;
    left?: number;
    alignLeft: boolean;
  } | null>(null);

  // Close on outside click or scroll
  React.useEffect(() => {
    if (!activeDropdown) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (portalRef.current && portalRef.current.contains(target)) return;
      if (moreButtonRef.current && moreButtonRef.current.contains(target)) return;
      setActiveDropdown(null);
      setDropdownPos(null);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [activeDropdown]);

  const openDropdown = (type: "more" | "color" | "label" | "folder" | null) => {
    if (type && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const alignLeft = rect.left < 200;
      setDropdownPos({
        top: rect.top,
        right: window.innerWidth - rect.right,
        left: rect.left,
        alignLeft,
      });
    } else {
      setDropdownPos(null);
    }
    setActiveDropdown(type);
  };

  const [linkPreviews, setLinkPreviews] = React.useState<
    {
      url: string;
      title: string;
      description: string;
      image: string | null;
    }[]
  >([]);

  const loadedUrlsRef = React.useRef<Set<string>>(new Set());

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

    setLinkPreviews((prev) => prev.filter((p) => urls.includes(p.url)));

    const urlSet = new Set(urls);
    loadedUrlsRef.current.forEach((url) => {
      if (!urlSet.has(url)) {
        loadedUrlsRef.current.delete(url);
      }
    });

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
        console.error("Failed to fetch link preview on card:", url, err);
        loadedUrlsRef.current.delete(url);
      }
    });
  }, [note.content, note.isList, note.isTable]);

  return (
    <div
      onClick={onSelect}
      className={twMerge(
        "card-stagger group/card relative flex flex-col rounded-2xl border text-text-primary transition-all duration-300 select-none",
        isGridView ? "w-full min-h-[120px]" : "w-full",
        note.isTrashed ? "opacity-75" : "hover:shadow-md hover:border-text-secondary/20",
        note.color === "default"
          ? "bg-bg-surface border-border-soft/60 dark:bg-[#0F1623] dark:border-border-soft/20"
          : colorMap[note.color]?.bgClass,
        note.color === "default"
          ? "border-border-soft/60"
          : colorMap[note.color]?.borderClass
      )}
    >
      {/* Note Image Preview Header */}
      {note.imageUrl && (
        <div className="w-full aspect-[16/9] overflow-hidden rounded-t-2xl border-b border-border-soft/40 relative flex-shrink-0">
          <img
            src={note.imageUrl}
            alt="Pratinjau Catatan"
            className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* 1. Header (Title & Pin) */}
      <div className="flex items-start justify-between px-4 pt-3.5 pb-1 gap-2 shrink-0">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4
              className={twMerge(
                "text-[13.5px] font-semibold tracking-tight line-clamp-2 leading-tight truncate",
                note.color !== "default" && colorMap[note.color]?.textClass
              )}
            >
              {note.title || (note.isList ? "Daftar Tanpa Judul" : "Catatan Tanpa Judul")}
            </h4>
          </div>
        </div>

        {!note.isTrashed && note.isPinned && (
          <button
            onClick={onPin}
            className="p-1.5 rounded-lg transition-all cursor-pointer active:scale-95 shrink-0 text-accent bg-accent-soft"
            title="Lepas Sematan"
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
              const data = JSON.parse(note.content || "{}") as {
                headers: string[];
                rows: string[][];
                accumulatedCols?: boolean[];
                columnTypes?: ("TEKS" | "NOMINAL" | "TANGGAL" | "CENTANG" | "RUMUS")[];
                columnFormulas?: string[];
              };
              if (!data.headers || !data.rows || data.headers.length === 0) {
                return <em className="opacity-40 text-[11px] font-sans">Kosong</em>;
              }
              const displayHeaders = data.headers.slice(0, 3);
              const displayRows = data.rows.slice(0, 3);
              const hasMoreCols = data.headers.length > 3;
              const hasMoreRows = data.rows.length > 3;

              const accumulatedCols = data.accumulatedCols || [];
              const hasAccumulated = accumulatedCols.slice(0, 3).some(Boolean);

              const totals = data.headers.slice(0, 3).map((_, idx) => {
                if (accumulatedCols[idx]) {
                  return calculateColumnTotal(data.rows, idx, data.headers, data.columnTypes, data.columnFormulas);
                }
                return "";
              });

              let firstNonAcc = -1;
              for (let i = 0; i < Math.min(data.headers.length, 3); i++) {
                if (!accumulatedCols[i]) {
                  firstNonAcc = i;
                  break;
                }
              }

              return (
                <div className="overflow-x-auto w-full max-w-full pb-1 flex flex-col gap-1 select-none">
                  <table className="w-full text-[11px] border-collapse text-left border border-border-soft/60">
                    <thead>
                      <tr className="bg-bg-page/40 dark:bg-black/10 border-b border-border-soft/60">
                        {displayHeaders.map((header, idx) => (
                          <th
                            key={idx}
                            className="p-1 font-semibold truncate max-w-[80px] border-r border-border-soft/60"
                          >
                            <span className="flex items-center gap-1">
                              {data.columnTypes?.[idx] === "RUMUS" && (
                                <span className="text-[9px] font-mono font-bold text-purple-500">fx</span>
                              )}
                              <span>{header}</span>
                            </span>
                          </th>
                        ))}
                        {hasMoreCols && (
                          <th className="p-1 font-semibold text-text-secondary opacity-60">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-border-soft/60 last:border-0 hover:bg-accent-soft/5"
                        >
                          {row.slice(0, 3).map((cell, cellIdx) => {
                            const colType = data.columnTypes?.[cellIdx] || "TEKS";
                            return (
                              <td
                                key={cellIdx}
                                className="p-1 truncate max-w-[80px] border-r border-border-soft/60"
                              >
                                {colType === "CENTANG" ? (
                                  <span className="flex items-center justify-center">
                                    {cell === "true" || cell === "1" ? (
                                      <CheckSquare className="h-3.5 w-3.5 text-accent" />
                                    ) : (
                                      <Square className="h-3.5 w-3.5 text-text-secondary/30" />
                                    )}
                                  </span>
                                ) : colType === "TANGGAL" ? (
                                  cell ? (
                                    <span className="font-mono text-[10px] text-accent">{cell}</span>
                                  ) : (
                                    <span className="opacity-20">-</span>
                                  )
                                ) : colType === "NOMINAL" ? (
                                  cell ? (
                                    <span className="font-mono text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      {cell.startsWith("Rp") ? cell : `Rp ${new Intl.NumberFormat("id-ID").format(parseNumericValue(cell) || 0)}`}
                                    </span>
                                  ) : (
                                    <span className="opacity-20">-</span>
                                  )
                                ) : colType === "RUMUS" ? (
                                  (() => {
                                    const formula = data.columnFormulas?.[cellIdx];
                                    if (!formula) return <span className="opacity-20">-</span>;
                                    const calcVal = evaluateTableNoteFormula(formula, data.headers, data.rows, rowIdx, cellIdx);
                                    return (
                                      <span className="font-mono text-text-primary text-[10.5px] font-medium">
                                        {formatTableFormulaResult(calcVal, formula)}
                                      </span>
                                    );
                                  })()
                                ) : (
                                  cell || <span className="opacity-20">-</span>
                                )}
                              </td>
                            );
                          })}
                          {hasMoreCols && (
                            <td className="p-1 text-text-secondary opacity-60">...</td>
                          )}
                        </tr>
                      ))}
                      {hasAccumulated && (
                        <tr className="bg-black/[0.04] dark:bg-white/[0.04] font-semibold border-t border-border-soft text-accent">
                          {data.headers.slice(0, 3).map((_, idx) => {
                            let val = "";
                            if (accumulatedCols[idx]) {
                              val = `Σ ${totals[idx]}`;
                            } else if (idx === firstNonAcc) {
                              val = "Total";
                            }
                            return (
                              <td
                                key={idx}
                                className="p-1 truncate max-w-[80px] border-r border-border-soft/60 font-bold font-mono"
                              >
                                {val}
                              </td>
                            );
                          })}
                          {hasMoreCols && (
                            <td className="p-1 text-text-secondary opacity-60">...</td>
                          )}
                        </tr>
                      )}
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
          <p
            className={twMerge(
              "whitespace-pre-wrap break-words line-clamp-6 text-text-secondary",
              note.color !== "default" && "text-text-primary/80 opacity-90"
            )}
          >
            {note.content ? renderTextWithLinks(note.content) : <em className="opacity-40 text-[11px] font-sans">Kosong</em>}
          </p>
        ) : (
          /* Checklist preview */
          <div className="flex flex-col gap-1.5">
            {/* Active Items */}
            {activeItems.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => onToggleListItem(item.id, true)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={note.isTrashed}
                  className="mt-0.5 rounded border-border-soft text-accent focus:ring-accent h-3.5 w-3.5"
                />
                <span
                  className={twMerge(
                    "break-all truncate",
                    note.color !== "default" && colorMap[note.color]?.textClass
                  )}
                >
                  {renderTextWithLinks(item.text)}
                </span>
              </div>
            ))}

            {/* Overflow Count */}
            {activeItems.length > 5 && (
              <div className="text-[10px] text-text-secondary font-medium pl-5">
                + {activeItems.length - 5} item lainnya...
              </div>
            )}
            {note.listItems.length === 0 && (
              <em className="opacity-40 text-[11px] font-sans">Kosong</em>
            )}
          </div>
        )}

        {/* Link Previews */}
        {linkPreviews.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-3 border-t border-border-soft/40 pt-2 select-none">
            {linkPreviews.map((preview, idx) => (
              <a
                key={idx}
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-stretch rounded-lg border border-border-soft/60 hover:border-accent/40 bg-bg-surface/50 hover:bg-accent-soft/5 transition-all duration-200 overflow-hidden cursor-pointer h-12"
              >
                <div className="flex-1 p-2 flex flex-col justify-center min-w-0">
                  <span className="text-[11px] font-semibold text-text-primary truncate">
                    {preview.title}
                  </span>
                  <span className="text-[9px] text-text-secondary/60 truncate">
                    {new URL(preview.url).hostname}
                  </span>
                </div>
                {preview.image && (
                  <div className="w-12 bg-black/5 dark:bg-white/5 border-l border-border-soft/60 flex-shrink-0 relative">
                    <img
                      src={preview.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </a>
            ))}
          </div>
        )}

        {/* Labels tag pills & Reminder Badge */}
        {(note.labels.length > 0 || (note.reminderAt && !note.reminderSent)) && (
          <div className="flex flex-wrap gap-1 mt-3">
            {note.reminderAt && !note.reminderSent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 whitespace-nowrap">
                <Bell className="h-2.5 w-2.5 shrink-0" />{" "}
                {new Date(note.reminderAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
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

      {/* 3. Toolbar Action Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={twMerge(
          "mt-auto h-9 flex items-center justify-between px-3 py-1 bg-bg-surface/30 dark:bg-bg-surface/50 border-t border-border-soft/40 backdrop-blur-sm transition-all duration-300 rounded-b-2xl",
          note.color !== "default" && colorMap[note.color]?.bgClass,
          note.color !== "default" && "bg-opacity-95 backdrop-blur-md"
        )}
      >
        {!note.isTrashed ? (
          /* REGULAR ACTIONS */
          <div className="flex items-center gap-1.5 w-full">
            {/* Pin Button (Only when not pinned) */}
            {!note.isPinned && (
              <button
                onClick={onPin}
                className="p-1 text-text-secondary hover:text-accent hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
                title="Sematkan Catatan"
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Archive Button */}
            <button
              onClick={onArchive}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
              title={note.isArchived ? "Kembalikan dari Arsip" : "Arsipkan"}
            >
              <Archive className="h-3.5 w-3.5" />
            </button>

            {/* Copy Button (Duplicate) */}
            <button
              onClick={onDuplicate}
              className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
              title="Buat Salinan (Duplikat)"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            {/* Trash Button */}
            <button
              onClick={onTrash}
              className="p-1 text-text-secondary hover:text-danger hover:bg-danger-soft/30 rounded-lg cursor-pointer transition-colors"
              title="Buang ke Sampah"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* More Actions Popover */}
            <div className="relative ml-auto">
              <button
                ref={moreButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  openDropdown(activeDropdown === "more" ? null : "more");
                }}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-accent-soft/40 rounded-lg cursor-pointer transition-colors"
                title="Opsi Lainnya"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Portal Dropdowns — rendered outside card to avoid clipping */}
            {activeDropdown &&
              dropdownPos &&
              typeof document !== "undefined" &&
              ReactDOM.createPortal(
                <div
                  ref={portalRef}
                  style={
                    dropdownPos.alignLeft
                      ? { top: dropdownPos.top, left: dropdownPos.left }
                      : { top: dropdownPos.top, right: dropdownPos.right }
                  }
                  className="fixed z-[500] -translate-y-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* More Menu */}
                  {activeDropdown === "more" && (
                    <div className="bg-bg-surface border border-border-soft p-1.5 rounded-xl shadow-xl flex flex-col gap-1 w-44">
                      <button
                        onClick={() => openDropdown("color")}
                        className="flex items-center gap-2 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-accent-soft/30 rounded-lg cursor-pointer text-left w-full"
                      >
                        <Palette className="h-3.5 w-3.5 shrink-0" />
                        <span>Ubah Warna</span>
                      </button>
                      <button
                        onClick={() => openDropdown("label")}
                        className="flex items-center gap-2 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-accent-soft/30 rounded-lg cursor-pointer text-left w-full"
                      >
                        <Tag className="h-3.5 w-3.5 shrink-0" />
                        <span>Ubah Label</span>
                      </button>
                      <button
                        onClick={() => openDropdown("folder")}
                        className="flex items-center gap-2 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-accent-soft/30 rounded-lg cursor-pointer text-left w-full"
                      >
                        <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>Ubah Folder</span>
                      </button>
                      <button
                        onClick={(e) => {
                          onToggleType(e);
                          openDropdown(null);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-accent-soft/30 rounded-lg cursor-pointer text-left w-full"
                      >
                        {note.isList ? (
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{note.isList ? "Ubah ke Teks" : "Ubah ke Checklist"}</span>
                      </button>
                    </div>
                  )}

                  {/* Color Picker */}
                  {activeDropdown === "color" && (
                    <div className="bg-bg-surface border border-border-soft p-1.5 rounded-xl shadow-xl flex gap-1.5 flex-wrap w-40">
                      {Object.entries(colorMap).map(([colorId, colorOpt]) => (
                        <button
                          key={colorId}
                          onClick={(e) => {
                            onUpdateColor(colorId, e);
                            openDropdown(null);
                          }}
                          style={{
                            backgroundColor:
                              colorOpt.hex !== "transparent" ? colorOpt.hex : undefined,
                          }}
                          className={twMerge(
                            "h-6 w-6 rounded-full border border-border-soft cursor-pointer transition-transform active:scale-95",
                            note.color === colorId ? "ring-2 ring-accent ring-offset-1" : "",
                            colorOpt.hex === "transparent" && "bg-white dark:bg-slate-800"
                          )}
                          title={colorOpt.name}
                        />
                      ))}
                    </div>
                  )}

                  {/* Label Picker */}
                  {activeDropdown === "label" && (
                    <div className="bg-bg-surface border border-border-soft p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 w-44 max-h-52 overflow-y-auto">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Label
                      </span>
                      {labels.length === 0 ? (
                        <span className="text-[9px] text-text-secondary italic">
                          Tidak ada label.
                        </span>
                      ) : (
                        labels.map((label) => (
                          <label
                            key={label.id}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer"
                          >
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

                  {/* Folder Picker */}
                  {activeDropdown === "folder" && (
                    <div className="bg-bg-surface border border-border-soft p-2.5 rounded-xl shadow-xl flex flex-col gap-1.5 w-44 max-h-52 overflow-y-auto">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                        Pilih Folder
                      </span>
                      <button
                        onClick={() => {
                          onAssignNoteFolder(note.id, null);
                          openDropdown(null);
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer text-left w-full"
                      >
                        <span className="truncate italic">Tanpa Folder</span>
                        {!note.folderId && (
                          <span className="text-accent text-[10px] font-bold ml-auto">✔</span>
                        )}
                      </button>
                      {folders.length === 0 ? (
                        <span className="text-[9px] text-text-secondary italic">
                          Tidak ada folder.
                        </span>
                      ) : (
                        folders.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              onAssignNoteFolder(note.id, f.id);
                              openDropdown(null);
                            }}
                            className="flex items-center justify-between text-[11px] font-medium text-text-primary hover:bg-accent-soft/30 p-1.5 rounded-lg cursor-pointer text-left w-full"
                          >
                            <span className="truncate">{f.name}</span>
                            {note.folderId === f.id && (
                              <span className="text-accent text-[10px] font-bold">✔</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>,
                document.body
              )}
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
});
