"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to console for debugging
    console.error("[SAREN Error Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 w-full select-none">
      <div className="max-w-md w-full bg-bg-surface border border-border-soft rounded-3xl p-6 sm:p-8 text-center [box-shadow:var(--shadow-card)] flex flex-col items-center">
        {/* Error Icon */}
        <div className="h-14 w-14 rounded-2xl bg-danger-soft text-danger border border-danger/20 flex items-center justify-center mb-5 shrink-0 shadow-2xs">
          <AlertCircle className="h-7 w-7 stroke-[2.25]" />
        </div>

        {/* Title & Message */}
        <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary mb-2 tracking-tight">
          Terjadi Kendala Teknis
        </h2>
        <p className="text-sm text-text-secondary font-sans leading-relaxed mb-6">
          Sistem mengalami kendala saat memproses permintaan Anda. Data Anda tetap aman. Silakan muat ulang halaman.
        </p>

        {/* Error Digest (if available) */}
        {error.digest && (
          <div className="w-full mb-6 py-2 px-3 rounded-xl bg-bg-page border border-border-soft/60 text-[11px] font-mono text-text-secondary/80 truncate">
            Kode: {error.digest}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="w-full justify-center gap-2 h-11"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full justify-center gap-2 h-11"
          >
            <Home className="h-4 w-4" />
            <span>Ke Beranda</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
