"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { saveSubscription } from "@/lib/actions/push";

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

/**
 * Mendaftarkan Push Subscription ke server.
 * Hanya dipanggil secara eksplisit, bukan auto saat load.
 */
export async function subscribeToPush(reg: ServiceWorkerRegistration): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) {
    console.log("[Push] VAPID_PUBLIC_KEY tidak tersedia.");
    return false;
  }

  try {
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    };

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe(subscribeOptions);
    }

    if (subscription) {
      const subObj = subscription.toJSON();
      if (subObj.endpoint && subObj.keys?.p256dh && subObj.keys?.auth) {
        await saveSubscription({
          endpoint: subObj.endpoint,
          p256dh: subObj.keys.p256dh,
          auth: subObj.keys.auth,
        });
        console.log("[Push] Subscribed successfully to Web Push");
        return true;
      }
    }
  } catch (err) {
    console.warn("[Push] Subscription setup failed:", err);
  }
  return false;
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Online / Offline status notification listeners
    const handleOnline = () => {
      toast.success("Koneksi terhubung kembali!", {
        description: "Menyinkronkan data...",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      toast.warning("Anda sedang offline", {
        description: "Data disajikan dari cache lokal PWA.",
        duration: 4000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!("serviceWorker" in navigator)) {
      console.log("[SW] Service worker not supported in this browser");
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // Daftarkan Service Worker — tanpa otomatis meminta permission notifikasi.
    // Permission akan diminta secara eksplisit via tombol di UI (HeaderSettings atau halaman settings).
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] Registered with scope:", reg.scope);

        // Jika permission sudah diberikan sebelumnya (user pernah grant),
        // perbarui subscription secara silent tanpa popup baru.
        if ("PushManager" in window && Notification.permission === "granted" && VAPID_PUBLIC_KEY) {
          subscribeToPush(reg).catch((err) =>
            console.warn("[Push] Silent re-subscribe failed:", err)
          );
        }
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return null;
}
