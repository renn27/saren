"use client";

import { useEffect } from "react";
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

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("[SW] Service worker or push manager not supported in this browser");
      return;
    }

    // Register Service Worker
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        console.log("[SW] Registered with scope:", reg.scope);
        
        // Request notification permission and subscribe
        try {
          let permission = Notification.permission;
          if (permission === "default") {
            permission = await Notification.requestPermission();
          }

          if (permission === "granted" && VAPID_PUBLIC_KEY) {
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
              }
            }
          } else {
            console.log("[Push] Notification permission:", permission);
          }
        } catch (err) {
          console.warn("[Push] Subscription setup failed:", err);
        }
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
