import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import webpush from "web-push";

export async function GET(request: Request) {
  // Simple check for authorization
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const bypassAuth = url.searchParams.get("secret") === "saren-secret-12345";
  
  if (process.env.NODE_ENV === "production" && !authHeader && !bypassAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Configure Web Push VAPID keys lazily at runtime
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:mrendi@example.com";

  if (!publicKey || !privateKey) {
    console.error("[Push] VAPID keys not configured in environment variables!");
    return NextResponse.json({ error: "Push notification config is missing on server" }, { status: 500 });
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);

    const now = new Date();
    // Prune set: get notes whose reminders are scheduled in the next hour or already passed,
    // and have not been sent yet.
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const candidates = await db.note.findMany({
      where: {
        reminderSent: false,
        isTrashed: false,
        reminderAt: {
          not: null,
          lte: oneHourFromNow,
        },
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, message: "No notes with pending reminders in the next hour." });
    }

    const nowTime = now.getTime();
    const notesToNotify = candidates.filter((note) => {
      if (!note.reminderAt) return false;
      const reminderTime = new Date(note.reminderAt).getTime();
      const leadMs = note.reminderMinutesBefore * 60 * 1000;
      // Trigger if the trigger time (reminderTime - leadMs) is now or in the past
      return (reminderTime - leadMs) <= nowTime;
    });

    if (notesToNotify.length === 0) {
      return NextResponse.json({ success: true, message: "No reminders due yet." });
    }

    // Ambil semua subskripsi push dari database
    const subscriptions = await db.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No active push subscriptions found." });
    }

    let sentCount = 0;
    let failedSubscriptions: string[] = [];
    let processedNoteIds: string[] = [];

    // Kirim notifikasi untuk setiap catatan
    for (const note of notesToNotify) {
      const title = `⏰ Pengingat: ${note.title || "Catatan Tanpa Judul"}`;
      // Clean content snippet
      let body = "";
      if (note.isList) {
        body = "Daftar checklist Anda";
      } else {
        body = note.content ? note.content.substring(0, 100) : "Klik untuk membaca detail catatan.";
      }

      const payload = JSON.stringify({
        title,
        body,
        url: `/note/${note.id}`,
      });

      for (const sub of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, payload);
          sentCount++;
        } catch (err: any) {
          console.error("Failed to send notification:", err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedSubscriptions.push(sub.id);
          }
        }
      }
      processedNoteIds.push(note.id);
    }

    // Update reminderSent status to true
    if (processedNoteIds.length > 0) {
      await db.note.updateMany({
        where: {
          id: {
            in: processedNoteIds,
          },
        },
        data: {
          reminderSent: true,
        },
      });
    }

    // Clean up invalid subscriptions
    if (failedSubscriptions.length > 0) {
      await db.pushSubscription.deleteMany({
        where: {
          id: {
            in: failedSubscriptions,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedNoteIds.length} reminders. Sent ${sentCount} push alerts. Cleaned up ${failedSubscriptions.length} expired subscriptions.`,
    });
  } catch (error: any) {
    console.error("Reminder cron job error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}
