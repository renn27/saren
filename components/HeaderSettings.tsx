"use client";

import * as React from "react";
import { Settings, Download, CheckCircle, Smartphone, LogOut, Play } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { logout } from "@/lib/actions/auth";
import { saveSubscription, unsubscribe, sendTestPush } from "@/lib/actions/push";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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

  // Notification States
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [subscription, setSubscription] = React.useState<any>(null);
  const [isTestingPush, setIsTestingPush] = React.useState(false);

  React.useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
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

    // Check push notification subscription status
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
          setIsSubscribed(!!sub);
        });
      });
    }

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

  const handleTogglePush = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Browser Anda tidak mendukung push notification.");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;

      if (isSubscribed && subscription) {
        // Unsubscribe
        await subscription.unsubscribe();
        await unsubscribe(subscription.endpoint);
        setSubscription(null);
        setIsSubscribed(false);
        toast.success("Push notification dinonaktifkan.");
      } else {
        // Subscribe
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (permission === "granted" && VAPID_PUBLIC_KEY) {
          const subscribeOptions = {
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          };

          let newSub = await reg.pushManager.getSubscription();
          if (!newSub) {
            newSub = await reg.pushManager.subscribe(subscribeOptions);
          }

          if (newSub) {
            const subObj = newSub.toJSON();
            if (subObj.endpoint && subObj.keys?.p256dh && subObj.keys?.auth) {
              await saveSubscription({
                endpoint: subObj.endpoint,
                p256dh: subObj.keys.p256dh,
                auth: subObj.keys.auth,
              });
              setSubscription(newSub);
              setIsSubscribed(true);
              toast.success("Push notification diaktifkan!");
            }
          }
        } else if (permission === "denied") {
          toast.error("Izin notifikasi ditolak browser. Aktifkan manual di info situs.");
        }
      }
    } catch (err: any) {
      console.error("Error toggling push:", err);
      toast.error("Gagal mengubah status notifikasi.");
    }
  };

  const handleTestPush = async () => {
    if (!subscription) {
      toast.error("Aktifkan notifikasi terlebih dahulu sebelum tes.");
      return;
    }

    setIsTestingPush(true);
    const subObj = subscription.toJSON();
    if (subObj.endpoint) {
      const res = await sendTestPush(subObj.endpoint);
      if (res.success) {
        toast.success("Notifikasi tes terkirim!");
      } else {
        toast.error(res.error || "Gagal mengirim notifikasi tes.");
      }
    }
    setIsTestingPush(false);
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

      {/* Push Notification Toggle and Test Button */}
      <div className="border-t border-border-soft/60 my-1 pt-2 px-3 flex flex-col gap-2">
        <div className="flex items-center justify-between py-0.5 text-xs">
          <span className="font-semibold text-text-secondary">Notifikasi Push</span>
          <button
            onClick={handleTogglePush}
            className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${
              isSubscribed ? "bg-accent" : "bg-border-soft/80"
            } cursor-pointer`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${
                isSubscribed ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {isSubscribed && (
          <button
            onClick={handleTestPush}
            disabled={isTestingPush}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 bg-accent-soft hover:bg-accent-soft/80 text-[11px] font-bold text-accent rounded-lg border border-accent/20 cursor-pointer active:scale-95 transition-all mb-1 disabled:opacity-50 animate-in fade-in zoom-in-95 duration-200"
          >
            <Play className="h-3 w-3 fill-accent text-accent" />
            {isTestingPush ? "Mengirim..." : "Kirim Notifikasi Tes"}
          </button>
        )}
      </div>

      <DropdownMenuItem
        onClick={() => logout()}
        className="text-danger hover:bg-danger-soft/20 focus:text-danger focus:bg-danger-soft/10 cursor-pointer border-t border-border-soft/60 mt-1 pt-2 rounded-t-none"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Keluar</span>
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
