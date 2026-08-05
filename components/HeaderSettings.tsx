"use client";

import * as React from "react";
import { Settings, Download, CheckCircle, Smartphone, LogOut, Play, Database, DownloadCloud, UploadCloud } from "lucide-react";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import { logout } from "@/lib/actions/auth";
import { saveSubscription, unsubscribe, sendTestPush } from "@/lib/actions/push";
import { exportFullBackup, restoreFullBackup } from "@/lib/actions/backup";
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

  // Backup & Restore States
  const [isBackupOpen, setIsBackupOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const [restoreFilePayload, setRestoreFilePayload] = React.useState<any>(null);
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Mengekspor data cadangan...");
    const res = await exportFullBackup();

    if (res.success && res.backupPayload) {
      const dateStr = new Date().toISOString().split("T")[0];
      const jsonStr = JSON.stringify(res.backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `saren_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File cadangan berhasil diunduh!", { id: toastId });
    } else {
      toast.error(res.error || "Gagal mengekspor data.", { id: toastId });
    }
    setIsExporting(false);
  };

  const handleFileSelectedForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (payload && payload.data && typeof payload.data === "object") {
          setRestoreFilePayload(payload);
          toast.success("File backup valid terdeteksi.");
        } else {
          toast.error("File bukan merupakan format backup SAREN yang valid.");
          setRestoreFilePayload(null);
        }
      } catch (err) {
        toast.error("Gagal membaca file JSON.");
        setRestoreFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async (mode: "merge" | "overwrite") => {
    if (!restoreFilePayload) return;
    setIsRestoring(true);
    const toastId = toast.loading(mode === "overwrite" ? "Mengganti total data..." : "Menggabungkan data...");

    const res = await restoreFullBackup(restoreFilePayload, mode);
    if (res.success) {
      toast.success("Data berhasil dipulihkan!", { id: toastId });
      setIsBackupOpen(false);
      setRestoreFilePayload(null);
      window.location.reload();
    } else {
      toast.error(res.error || "Gagal memulihkan data.", { id: toastId });
    }
    setIsRestoring(false);
  };

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
    <>
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

        {/* Backup & Restore Menu Item */}
        <DropdownMenuItem
          onClick={() => setIsBackupOpen(true)}
          className="cursor-pointer border-t border-border-soft/60"
        >
          <Database className="h-4 w-4 shrink-0 text-accent" />
          <span>Cadangan & Pulihkan</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => logout()}
          className="text-danger hover:bg-danger-soft/20 focus:text-danger focus:bg-danger-soft/10 cursor-pointer border-t border-border-soft/60 mt-1 pt-2 rounded-t-none"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenu>

      {/* Backup & Restore Modal */}
      <Dialog
        isOpen={isBackupOpen}
        onClose={() => {
          setIsBackupOpen(false);
          setRestoreFilePayload(null);
        }}
        title="Cadangan & Pemulihan Data"
        description="Ekspor data cadangan SAREN menjadi file .json atau pulihkan data dari file cadangan."
      >
        <div className="flex flex-col gap-4 mt-2">
          {/* Export Section */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-accent-soft/30 border border-accent/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <DownloadCloud className="h-4 w-4 text-accent" />
              <span>Ekspor Cadangan Data</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Unduh seluruh data (Garapan, Aplikasi, Akun, Nomor, Note) dalam bentuk 1 file `.json`.
            </p>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-accent text-white font-semibold text-xs rounded-xl shadow-xs hover:opacity-90 active:scale-97 transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? "Mengekspor..." : "Unduh Backup (.json)"}</span>
            </button>
          </div>

          {/* Restore Section */}
          <div className="flex flex-col gap-2 p-3.5 rounded-2xl bg-bg-surface border border-border-soft">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <UploadCloud className="h-4 w-4 text-accent" />
              <span>Pulihkan Data dari File</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pilih file `.json` cadangan yang sebelumnya pernah Anda unduh.
            </p>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelectedForRestore}
              className="hidden"
            />
            <button
              onClick={() => restoreFileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-bg-page border border-border-soft text-text-primary font-semibold text-xs rounded-xl hover:border-accent/40 active:scale-97 transition-all cursor-pointer mt-1"
            >
              <UploadCloud className="h-3.5 w-3.5 text-text-secondary" />
              <span>Pilih File Backup (.json)</span>
            </button>

            {restoreFilePayload && (
              <div className="flex flex-col gap-2 mt-2 p-3 rounded-xl bg-accent-soft/40 border border-accent/20">
                <span className="text-xs font-semibold text-accent">File Valid Terdeteksi:</span>
                <div className="text-[11px] text-text-secondary font-mono flex flex-wrap gap-x-3 gap-y-1">
                  <span>📁 Garapan: {restoreFilePayload.data?.garapan?.length || 0}</span>
                  <span>📱 Aplikasi: {restoreFilePayload.data?.aplikasi?.length || 0}</span>
                  <span>👤 Akun: {restoreFilePayload.data?.akun?.length || 0}</span>
                  <span>📞 Nomor: {restoreFilePayload.data?.nomor?.length || 0}</span>
                  <span>📝 Note: {restoreFilePayload.data?.note?.length || 0}</span>
                </div>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-accent/20">
                  <button
                    onClick={() => handleExecuteRestore("merge")}
                    disabled={isRestoring}
                    className="flex-1 py-1.5 px-2 bg-accent text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    Gabungkan (Merge)
                  </button>
                  <button
                    onClick={() => handleExecuteRestore("overwrite")}
                    disabled={isRestoring}
                    className="flex-1 py-1.5 px-2 bg-danger text-white text-[11px] font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                  >
                    Ganti Total (Overwrite)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                setIsBackupOpen(false);
                setRestoreFilePayload(null);
              }}
              className="px-4 py-1.5 bg-bg-page border border-border-soft rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
