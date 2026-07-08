"use server";

import { db } from "@/lib/db";
import webpush from "web-push";

// Configure Web Push VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:mrendi@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function saveSubscription(data: { endpoint: string; p256dh: string; auth: string }) {
  try {
    const sub = await db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
      },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
    });
    return { success: true, data: sub };
  } catch (error: any) {
    console.error("Failed to save push subscription:", error);
    return { success: false, error: error?.message || "Failed to save subscription" };
  }
}

export async function unsubscribe(endpoint: string) {
  try {
    await db.pushSubscription.deleteMany({
      where: { endpoint },
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to unsubscribe:", error);
    return { success: false, error: error?.message || "Failed to unsubscribe" };
  }
}

export async function sendTestPush(endpoint: string) {
  try {
    const sub = await db.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (!sub) {
      return { success: false, error: "Subskripsi tidak ditemukan di server" };
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    const payload = JSON.stringify({
      title: "⚡ Tes Notifikasi SAREN",
      body: "Push notification berhasil dikirim dan diterima secara realtime!",
      url: "/",
    });

    await webpush.sendNotification(pushSubscription, payload);
    return { success: true };
  } catch (error: any) {
    console.error("Test push error:", error);
    return { success: false, error: error?.message || "Failed to send test push" };
  }
}
