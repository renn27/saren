import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import webpush from "web-push";

export async function GET(request: Request) {
  // Simple check for authorization (cron secret can be added here)
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

    // 1. Ambil semua nomor yang masa aktifnya akan habis dalam <= 7 hari, ATAU sudah habis
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Ambil nomor yang masa aktif <= 7 hari ke depan
    const warningNumbers = await db.nomor.findMany({
      where: {
        masaAktif: {
          lte: sevenDaysFromNow,
        },
      },
    });

    if (warningNumbers.length === 0) {
      return NextResponse.json({ success: true, message: "No numbers expiring soon." });
    }

    // 2. Ambil semua subskripsi push dari database
    const subscriptions = await db.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No active push subscriptions found." });
    }

    let sentCount = 0;
    let failedSubscriptions: string[] = [];

    // 3. Kirim notifikasi untuk setiap nomor ke semua subskripsi
    for (const num of warningNumbers) {
      const daysLeft = Math.ceil((new Date(num.masaAktif).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let title = "";
      let body = "";
      
      if (daysLeft < 0) {
        title = `🚨 Masa Aktif ${num.provider} Habis!`;
        body = `Nomor ${num.nomorKartu} telah melewati masa aktif sejak ${new Date(num.masaAktif).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}.`;
      } else if (daysLeft === 0) {
        title = `⚠️ Masa Aktif ${num.provider} Habis Hari Ini!`;
        body = `Nomor ${num.nomorKartu} habis masa aktifnya hari ini. Segera isi pulsa sekarang!`;
      } else {
        title = `⚠️ Masa Aktif ${num.provider} Hampir Habis!`;
        body = `Nomor ${num.nomorKartu} akan berakhir dalam ${daysLeft} hari (${new Date(num.masaAktif).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}).`;
      }

      const payload = JSON.stringify({
        title,
        body,
        url: "/nomor",
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
          // Jika subskripsi kadaluarsa atau tidak valid (status 410 atau 404), kumpulkan id-nya untuk dihapus
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedSubscriptions.push(sub.id);
          }
        }
      }
    }

    // 4. Bersihkan subskripsi yang tidak valid/kadaluarsa dari database
    if (failedSubscriptions.length > 0) {
      await db.pushSubscription.deleteMany({
        where: {
          id: {
            in: failedSubscriptions,
          },
        },
      });
      console.log(`Cleaned up ${failedSubscriptions.length} expired subscriptions.`);
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} notifications. Cleaned up ${failedSubscriptions.length} expired subscriptions.`,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Internal server error" }, { status: 500 });
  }
}
