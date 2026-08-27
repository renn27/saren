"use client";

import * as React from "react";
import { Search, X, UserCheck, Smartphone, Phone, ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

export interface AccountAutofillItem {
  id: string;
  nama: string;
  device?: string | null;
  nomorHp?: string | null;
  aplikasi?: {
    namaAplikasi?: string;
  } | null;
}

interface AccountAutofillPickerProps {
  accounts: AccountAutofillItem[];
  onSelectAccount: (acc: { nama: string; device: string; nomorHp: string }) => void;
  className?: string;
}

export function AccountAutofillPicker({
  accounts,
  onSelectAccount,
  className,
}: AccountAutofillPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedAcc, setSelectedAcc] = React.useState<AccountAutofillItem | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close when clicked outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered & limited accounts list for 0ms latency & compact rendering
  const filteredAccounts = React.useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Return top 6 recent/unique accounts when not searching
      return accounts.slice(0, 6);
    }

    // Match query against nama, device, nomorHp, or namaAplikasi
    const matches = accounts.filter((acc) => {
      const matchName = acc.nama.toLowerCase().includes(query);
      const matchDevice = acc.device ? acc.device.toLowerCase().includes(query) : false;
      const matchPhone = acc.nomorHp ? acc.nomorHp.replace(/\s+/g, "").includes(query) : false;
      const matchApp = acc.aplikasi?.namaAplikasi
        ? acc.aplikasi.namaAplikasi.toLowerCase().includes(query)
        : false;
      return matchName || matchDevice || matchPhone || matchApp;
    });

    // Limit to top 8 items max to avoid huge dropdown and lag
    return matches.slice(0, 8);
  }, [accounts, searchQuery]);

  const handleSelect = (acc: AccountAutofillItem) => {
    setSelectedAcc(acc);
    setSearchQuery("");
    setIsOpen(false);
    onSelectAccount({
      nama: acc.nama,
      device: acc.device || "",
      nomorHp: acc.nomorHp || "",
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAcc(null);
    setSearchQuery("");
  };

  if (!accounts || accounts.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={twMerge(
        "relative flex flex-col gap-1.5 bg-accent-soft/30 border border-accent/15 p-3 rounded-2xl mb-1 text-left",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" />
          <span>Salin Data dari Akun Lain (Opsional)</span>
        </label>
        {selectedAcc && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-text-secondary hover:text-danger flex items-center gap-0.5 cursor-pointer font-medium"
          >
            <X className="h-3 w-3" />
            <span>Batalkan</span>
          </button>
        )}
      </div>

      {selectedAcc ? (
        /* Selected Pill Banner */
        <div
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-accent/30 shadow-2xs cursor-pointer hover:border-accent transition-all"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-xs shrink-0">
              {selectedAcc.nama.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-text-primary truncate font-display leading-tight">
                {selectedAcc.nama}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-text-secondary truncate mt-0.5">
                {selectedAcc.device && (
                  <span className="flex items-center gap-0.5">
                    <Smartphone className="h-2.5 w-2.5" /> {selectedAcc.device}
                  </span>
                )}
                {selectedAcc.device && selectedAcc.nomorHp && <span>•</span>}
                {selectedAcc.nomorHp && (
                  <span className="flex items-center gap-0.5 font-mono">
                    <Phone className="h-2.5 w-2.5" /> {selectedAcc.nomorHp}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-accent shrink-0 px-2 py-0.5 rounded-md bg-accent-soft">
            Ganti
          </span>
        </div>
      ) : (
        /* Search / Input Trigger */
        <div className="relative">
          <div
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-border-soft focus-within:border-accent focus-within:ring-1 focus-within:ring-accent shadow-2xs transition-all"
          >
            <Search className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            <input
              type="text"
              placeholder="Ketik untuk cari nama akun / no hp..."
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              className="w-full bg-transparent border-none text-xs text-text-primary focus:outline-none placeholder:text-text-secondary/50 font-medium"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery("");
                }}
                className="p-0.5 text-text-secondary hover:text-text-primary rounded-md animate-micro-pop"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <ChevronDown
                className={twMerge(
                  "h-3.5 w-3.5 text-text-secondary transition-transform shrink-0",
                  isOpen ? "rotate-180" : ""
                )}
              />
            )}
          </div>

          {/* Compact Dropdown Popover */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-bg-surface border border-border-soft rounded-2xl shadow-xl z-50 overflow-hidden animate-popover-down max-h-52 flex flex-col">
              <div className="px-3 py-1.5 bg-bg-page/50 border-b border-border-soft/60 flex items-center justify-between text-[10px] text-text-secondary font-medium select-none">
                <span>{searchQuery ? "Hasil Pencarian" : "Saran Akun Sering Dipakai"}</span>
                <span>Maks {filteredAccounts.length} item</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-border-soft/40 p-1">
                {filteredAccounts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-secondary/60">
                    Tidak ada akun yang cocok dengan &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  filteredAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelect(acc)}
                      className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left hover:bg-accent-soft/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-accent-soft/60 text-accent flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                          {acc.nama.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors truncate font-display">
                            {acc.nama}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-secondary truncate mt-0.5">
                            {acc.device && (
                              <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                                <Smartphone className="h-2.5 w-2.5 shrink-0" /> {acc.device}
                              </span>
                            )}
                            {acc.device && acc.nomorHp && <span>•</span>}
                            {acc.nomorHp && (
                              <span className="flex items-center gap-0.5 font-mono truncate">
                                <Phone className="h-2.5 w-2.5 shrink-0" /> {acc.nomorHp}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {acc.aplikasi?.namaAplikasi && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-text-secondary shrink-0 font-medium truncate max-w-[80px]">
                          {acc.aplikasi.namaAplikasi}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
