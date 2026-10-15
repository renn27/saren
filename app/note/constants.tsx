import * as React from "react";

// Konstanta dan helper functions yang dipakai bersama oleh NoteClient dan NoteCard

// ── Palet warna Google Keep Premium ──────────────────────────────────────────

export const colorMap: Record<
  string,
  { bgClass: string; textClass: string; borderClass: string; name: string; hex: string }
> = {
  default: {
    bgClass: "bg-bg-surface border-border-soft/60 dark:bg-[#0F1623] dark:border-white/[0.08]",
    textClass: "text-text-primary",
    borderClass: "border-border-soft/60 dark:border-white/[0.08]",
    name: "Bawaan",
    hex: "transparent",
  },
  red: {
    bgClass: "bg-[#FFF1F2] dark:bg-[#1E1114]",
    textClass: "text-[#E11D48] dark:text-[#FDA4AF]",
    borderClass: "border-[#FFE4E6] dark:border-rose-500/30",
    name: "Merah",
    hex: "#E11D48",
  },
  orange: {
    bgClass: "bg-[#FFF7ED] dark:bg-[#20140D]",
    textClass: "text-[#EA580C] dark:text-[#FDBA74]",
    borderClass: "border-[#FFEDD5] dark:border-amber-500/30",
    name: "Jingga",
    hex: "#EA580C",
  },
  yellow: {
    bgClass: "bg-[#FEFCE8] dark:bg-[#1F1B0D]",
    textClass: "text-[#CA8A04] dark:text-[#FDE047]",
    borderClass: "border-[#FEF9C3] dark:border-yellow-500/30",
    name: "Kuning",
    hex: "#CA8A04",
  },
  green: {
    bgClass: "bg-[#F0FDF4] dark:bg-[#0E1F14]",
    textClass: "text-[#16A34A] dark:text-[#86EFAC]",
    borderClass: "border-[#DCFCE7] dark:border-emerald-500/30",
    name: "Hijau",
    hex: "#16A34A",
  },
  teal: {
    bgClass: "bg-[#F0FDFA] dark:bg-[#0C1E1D]",
    textClass: "text-[#0D9488] dark:text-[#5EEAD4]",
    borderClass: "border-[#CCFBF1] dark:border-teal-500/30",
    name: "Teal",
    hex: "#0D9488",
  },
  blue: {
    bgClass: "bg-[#F0F9FF] dark:bg-[#0D1D2E]",
    textClass: "text-[#0284C7] dark:text-[#7DD3FC]",
    borderClass: "border-[#E0F2FE] dark:border-sky-500/30",
    name: "Biru",
    hex: "#0284C7",
  },
  darkblue: {
    bgClass: "bg-[#EEF2FF] dark:bg-[#111736]",
    textClass: "text-[#4F46E5] dark:text-[#A5B4FC]",
    borderClass: "border-[#E0E7FF] dark:border-indigo-500/30",
    name: "Biru Tua",
    hex: "#4F46E5",
  },
  purple: {
    bgClass: "bg-[#FAF5FF] dark:bg-[#1B122F]",
    textClass: "text-[#9333EA] dark:text-[#D8B4FE]",
    borderClass: "border-[#F3E8FF] dark:border-purple-500/30",
    name: "Ungu",
    hex: "#9333EA",
  },
  pink: {
    bgClass: "bg-[#FDF2F8] dark:bg-[#22111D]",
    textClass: "text-[#DB2777] dark:text-[#FBCFE8]",
    borderClass: "border-[#FCE7F3] dark:border-pink-500/30",
    name: "Pink",
    hex: "#DB2777",
  },
  brown: {
    bgClass: "bg-[#FAF7F2] dark:bg-[#1C1613]",
    textClass: "text-[#854D0E] dark:text-[#D97706]",
    borderClass: "border-[#F4EFE6] dark:border-amber-700/30",
    name: "Cokelat",
    hex: "#854D0E",
  },
  gray: {
    bgClass: "bg-[#F8FAFC] dark:bg-[#1E293B]/60",
    textClass: "text-[#475569] dark:text-[#94A3B8]",
    borderClass: "border-[#E2E8F0] dark:border-white/[0.08]",
    name: "Abu-abu",
    hex: "#475569",
  },
};

// ── Helper: extract URLs dari teks ───────────────────────────────────────────

export function extractUrls(text: string | null): string[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches
    .map((url) => url.replace(/[.,\)\(\]\[!\?]+$/, ""))
    .filter((value, index, self) => self.indexOf(value) === index);
}

// ── Helper: render text with clickable URLs ───────────────────────────────────

export function renderTextWithLinks(text: string | null) {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//i) || part.match(/^www\./i)) {
      const matchClean = part.match(/^([^\s]+?)([\.,\)\(\]\[!\?]*)$/);
      const cleanUrl = matchClean ? matchClean[1] : part;
      const trailingPunct = matchClean ? matchClean[2] : "";

      const href = cleanUrl.startsWith("www.") ? `https://${cleanUrl}` : cleanUrl;

      return (
        <React.Fragment key={index}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent underline font-medium hover:opacity-80 break-all cursor-pointer transition-opacity"
          >
            {cleanUrl}
          </a>
          {trailingPunct}
        </React.Fragment>
      );
    }
    return part;
  });
}

// ── Helper: parse nilai numerik dari string ───────────────────────────────────

export function parseNumericValue(val: string): number {
  if (!val) return NaN;

  const cleanVal = val.replace(/[^\d\-\,\.]/g, "");
  if (!cleanVal) return NaN;

  if (cleanVal.includes(".") && cleanVal.includes(",")) {
    const cleaned = cleanVal.replace(/\./g, "").replace(/,/g, ".");
    return parseFloat(cleaned);
  }

  if ((cleanVal.match(/\./g) || []).length > 1) {
    return parseFloat(cleanVal.replace(/\./g, ""));
  }

  if ((cleanVal.match(/,/g) || []).length > 1) {
    return parseFloat(cleanVal.replace(/,/g, ""));
  }

  if (cleanVal.includes(".")) {
    const parts = cleanVal.split(".");
    if (parts[1].length === 3 && parts[0] !== "0") {
      return parseFloat(cleanVal.replace(/\./g, ""));
    }
    return parseFloat(cleanVal);
  }

  if (cleanVal.includes(",")) {
    const parts = cleanVal.split(",");
    if (parts[1].length === 3 && parts[0] !== "0") {
      return parseFloat(cleanVal.replace(/,/g, ""));
    }
    return parseFloat(cleanVal.replace(/,/g, "."));
  }

  return parseFloat(cleanVal);
}

import { evaluateTableNoteFormula } from "@/lib/utils/formulaEvaluator";

export function calculateColumnTotal(
  rows: string[][],
  colIndex: number,
  headers?: string[],
  columnTypes?: string[],
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
    return `${prefix}${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 4,
    }).format(total)}`;
  }
}

