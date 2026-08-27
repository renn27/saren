"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { triggerHaptic } from "@/lib/utils/haptics";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    // Read current theme state from HTML element class set by head script
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    triggerHaptic("light");
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 flex items-center justify-center rounded-xl border border-border-soft bg-bg-surface text-text-secondary hover:bg-accent-soft hover:text-accent hover:border-accent/30 transition-all duration-200 cursor-pointer group active:scale-90"
      title={theme === "dark" ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
    >
      {theme === "dark" ? (
        <Sun key="sun" className="h-4 w-4 text-warning animate-theme-spin" />
      ) : (
        <Moon key="moon" className="h-4 w-4 text-accent animate-theme-spin" />
      )}
    </button>
  );
}
