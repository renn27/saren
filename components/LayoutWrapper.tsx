"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderSettings } from "@/components/HeaderSettings";
import { AppNavigation } from "@/components/AppNavigation";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="min-h-screen flex flex-col">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Global Navigation Header with Glassmorphism */}
      <header className="sticky top-0 z-40 w-full border-b border-border-soft/50 bg-bg-surface/80 backdrop-blur-xl transition-all duration-200">
        <div className="max-w-7xl mx-auto w-full px-4 h-16 flex items-center justify-between md:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/saren_logo_dark.png"
              alt="SAREN Logo"
              className="h-9 w-9 rounded-xl object-cover shadow-sm border border-border-soft/50 bg-bg-surface transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
            />
            <span className="font-display font-semibold text-base text-text-primary tracking-tight">
              SAREN
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-accent bg-accent-soft px-3 py-1 rounded-full font-sans select-none tracking-wide hidden sm:inline">
              Super App Rendi
            </span>
            <ThemeToggle />
            <HeaderSettings />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-row overflow-hidden">
        <AppNavigation />
        <main className="flex-1 flex flex-col h-full overflow-y-auto pb-20 md:pb-0 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
