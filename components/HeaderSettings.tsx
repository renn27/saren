"use client";

import * as React from "react";
import { Settings, Download, CheckCircle, Smartphone } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";

// Store the prompt globally so it's never lost even if captured before React mounts
let _cachedPrompt: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    _cachedPrompt = e;
    // Dispatch a custom event so any mounted components can react
    window.dispatchEvent(new CustomEvent("pwa-prompt-ready"));
  });
}

export function HeaderSettings() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isInstalling, setIsInstalling] = React.useState(false);

  React.useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("[SW] Registered:", reg.scope))
        .catch((err) => console.error("[SW] Failed:", err));
    }

    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Grab any already-captured prompt (before React mounted)
    if (_cachedPrompt) {
      setDeferredPrompt(_cachedPrompt);
    }

    // Listen for future captures
    const onPromptReady = () => {
      setDeferredPrompt(_cachedPrompt);
    };
    window.addEventListener("pwa-prompt-ready", onPromptReady);

    // Detect successful install
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      _cachedPrompt = null;
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", onPromptReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = deferredPrompt || _cachedPrompt;
    if (!prompt) return;
    setIsInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        _cachedPrompt = null;
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const promptAvailable = !!(deferredPrompt || _cachedPrompt);
  const canInstall = !isInstalled && promptAvailable;

  return (
    <DropdownMenu
      align="right"
      className="w-56"
      trigger={
        <button
          className="h-9 w-9 flex items-center justify-center rounded-xl border border-border-soft bg-bg-surface text-text-secondary hover:bg-accent-soft hover:text-accent hover:border-accent/30 transition-all duration-200 cursor-pointer"
          title="Pengaturan"
          aria-label="Pengaturan"
        >
          <Settings className="h-4 w-4" />
        </button>
      }
    >
      {isInstalled ? (
        <DropdownMenuItem disabled>
          <CheckCircle className="h-4 w-4 text-accent shrink-0" />
          <span>Sudah Terinstall</span>
        </DropdownMenuItem>
      ) : canInstall ? (
        <DropdownMenuItem onClick={handleInstall} disabled={isInstalling}>
          <Download className="h-4 w-4 shrink-0" />
          <span>{isInstalling ? "Menginstall..." : "Install Aplikasi"}</span>
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem disabled>
          <Smartphone className="h-4 w-4 shrink-0" />
          <span className="text-xs leading-snug">
            Buka di Chrome, klik ⋮ &gt; Install
          </span>
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}
