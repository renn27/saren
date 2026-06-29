"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Hash } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function AppNavigation() {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Garapan",
      href: "/",
      icon: Briefcase,
      // Active if exactly "/" or starts with "/garapan"
      isActive: pathname === "/" || pathname.startsWith("/garapan"),
    },
    {
      name: "Nomor",
      href: "/nomor",
      icon: Hash,
      isActive: pathname.startsWith("/nomor"),
    },
  ];

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border-soft bg-bg-surface/50 backdrop-blur-md h-full">
        <nav className="flex flex-col gap-2 p-4 h-full overflow-y-auto">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={twMerge(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                  active
                    ? "bg-accent-soft text-accent border border-accent/20 [box-shadow:var(--shadow-card)]"
                    : "text-text-secondary hover:bg-bg-page hover:text-text-primary border border-transparent"
                )}
              >
                <Icon
                  className={twMerge(
                    "h-5 w-5 shrink-0 transition-colors",
                    active ? "text-accent" : "text-text-secondary group-hover:text-text-primary"
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border-soft bg-bg-surface/90 backdrop-blur-xl pb-safe">
        <nav className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={twMerge(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  active ? "text-accent" : "text-text-secondary hover:text-text-primary"
                )}
              >
                <div
                  className={twMerge(
                    "flex items-center justify-center h-8 w-14 rounded-full transition-all duration-300",
                    active ? "bg-accent-soft" : "bg-transparent"
                  )}
                >
                  <Icon
                    className={twMerge(
                      "h-5 w-5 shrink-0",
                      active ? "text-accent" : "text-text-secondary"
                    )}
                  />
                </div>
                <span
                  className={twMerge(
                    "text-[10px] font-medium leading-none",
                    active ? "text-accent font-semibold" : "text-text-secondary"
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
