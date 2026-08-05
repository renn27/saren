"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Hash, StickyNote, AppWindow, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { twMerge } from "tailwind-merge";

function getNavItems(pathname: string) {
  return [
    {
      name: "Garapan",
      href: "/",
      icon: Briefcase,
      isActive: pathname === "/" || pathname.startsWith("/garapan"),
    },
    {
      name: "Aplikasi",
      href: "/aplikasi",
      icon: AppWindow,
      isActive: pathname.startsWith("/aplikasi"),
    },
    {
      name: "Nomor",
      href: "/nomor",
      icon: Hash,
      isActive: pathname.startsWith("/nomor"),
    },
    {
      name: "Note",
      href: "/note",
      icon: StickyNote,
      isActive: pathname.startsWith("/note"),
    },
  ];
}

export function AppNavigationSidebar() {
  const pathname = usePathname();
  const navItems = getNavItems(pathname);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("saren_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("saren_sidebar_collapsed", String(nextState));
  };

  if (!isMounted) {
    return (
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border-soft bg-bg-surface/50 backdrop-blur-md h-full transition-all duration-300">
        <nav className="flex flex-col gap-2 p-4 h-full overflow-y-auto">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-3">
            Menu Utama
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside
      className={twMerge(
        "hidden md:flex flex-col shrink-0 border-r border-border-soft bg-bg-surface/50 backdrop-blur-md h-full transition-all duration-300 ease-in-out relative select-none",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between pt-4 pb-2 px-3.5">
        {!isCollapsed && (
          <span className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider px-1">
            Menu Utama
          </span>
        )}
        <button
          onClick={toggleCollapse}
          className={twMerge(
            "p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent-soft/50 transition-colors cursor-pointer",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? "Buka Sidebar (Expand)" : "Ciutkan Sidebar (Collapse)"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-1.5 p-2.5 h-full overflow-y-auto overflow-x-hidden no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              title={isCollapsed ? item.name : undefined}
              className={twMerge(
                "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isCollapsed ? "justify-center px-0" : "px-3",
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
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AppNavigationBottom() {
  const pathname = usePathname();
  const navItems = getNavItems(pathname);

  return (
    <div className="md:hidden w-full border-t border-border-soft bg-bg-surface shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] shrink-0 z-50 pb-safe">
      <nav className="flex items-center justify-around h-14 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={twMerge(
                "flex flex-col items-center justify-center w-20 h-full gap-1 transition-colors select-none cursor-pointer active:scale-95",
                active ? "text-accent" : "text-text-secondary"
              )}
            >
              <Icon
                className={twMerge(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  active ? "scale-105 stroke-[2.25]" : "scale-100 stroke-[2]"
                )}
              />
              <span
                className={twMerge(
                  "text-[10px] tracking-wide transition-all font-sans",
                  active ? "font-semibold text-accent" : "font-medium text-text-secondary/80"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

