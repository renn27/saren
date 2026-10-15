import Link from "next/link";
import { Compass, Home } from "lucide-react";

export const metadata = {
  title: "404 - Halaman Tidak Ditemukan - SAREN",
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 w-full select-none">
      <div className="max-w-md w-full bg-bg-surface border border-border-soft rounded-3xl p-6 sm:p-8 text-center [box-shadow:var(--shadow-card)] flex flex-col items-center">
        {/* Floating 404 Icon */}
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-soft to-accent/20 text-accent border border-accent/20 flex items-center justify-center mb-5 shrink-0 empty-float shadow-2xs">
          <Compass className="h-8 w-8 stroke-[2]" />
        </div>

        {/* Status Badge */}
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-wider bg-accent-soft text-accent border border-accent/20 mb-3">
          404 ERROR
        </span>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-bold font-display text-text-primary mb-2 tracking-tight">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-text-secondary font-sans leading-relaxed mb-6">
          Halaman yang Anda tuju mungkin telah dipindahkan, dihapus, atau tautan yang dimasukkan belum tepat.
        </p>

        {/* Return Button */}
        <Link
          href="/"
          className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-accent text-white font-medium hover:bg-accent/90 shadow-sm transition-all duration-200 active:scale-[0.97] text-sm cursor-pointer"
        >
          <Home className="h-4 w-4" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
