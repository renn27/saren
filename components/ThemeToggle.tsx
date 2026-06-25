"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    // Read current theme state from HTML element class set by head script
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
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
      className="p-2.5 rounded-xl border border-border-soft bg-bg-surface text-text-primary hover:bg-accent-soft/40 transition-all cursor-pointer flex items-center justify-center h-10 w-10 shrink-0 shadow-sm group"
      title={theme === "dark" ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-accent transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-accent transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
