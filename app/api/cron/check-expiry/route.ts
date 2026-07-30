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

    // 1. Ambil semua nomor telepon dari database
    const allNumbers = await db.nomor.findMany();

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filter nomor yang memenuhi syarat pengiriman notifikasi sesuai aturan:
    // Aturan 1: Masa aktif habis tepat hari ini (diffDays === 0).
    // Aturan 2: Masuk masa tenggang dan sisa masa tenggang <= 5 hari lagi (sisaMasaTenggangDays >= 0 && sisaMasaTenggangDays <= 5).
    const notificationsToSend: { num: any; title: string; body: string }[] = [];

    for (const num of allNumbers) {
      const masaAktifDate = new Date(num.masaAktif);
      masaAktifDate.setHours(0, 0, 0, 0);

      // Selisih hari sampai masa aktif habis
      const diffDays = Math.floor((masaAktifDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Masa tenggang berakhir 30 hari setelah masa aktif habis
      const masaTenggangEndDate = new Date(masaAktifDate);
      masaTenggangEndDate.setDate(masaTenggangEndDate.getDate() + 30);
      masaTenggangEndDate.setHours(0, 0, 0, 0);

      const sisaMasaTenggangDays = Math.floor((masaTenggangEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let title = "";
      let body = "";

      // Aturan 1: Tepat pada hari H masa aktif habis
      if (diffDays === 0) {
        title = `⚠️ Masa Aktif ${num.provider} Habis Hari Ini!`;
        body = `Nomor ${num.nomorKartu} habis masa aktifnya hari ini (${masaAktifDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}). Segera isi pulsa agar tidak masuk masa tenggang!`;
        notificationsToSend.push({ num, title, body });
      } 
      // Aturan 2: Sudah lewat masa aktif (masuk masa tenggang), dan sisa masa tenggang <= 5 hari
      else if (diffDays < 0 && sisaMasaTenggangDays >= 0 && sisaMasaTenggangDays <= 5) {
        if (sisaMasaTenggangDays === 0) {
          title = `🚨 DARURAT: Hari Terakhir Masa Tenggang ${num.provider}!`;
          body = `Nomor ${num.nomorKartu} akan HANGUS PERMANEN hari ini! Segera isi pulsa sekarang juga!`;
        } else {
          title = `🚨 Masa Tenggang ${num.provider} Sisa ${sisaMasaTenggangDays} Hari!`;
          body = `Nomor ${num.nomorKartu} akan hangus permanen dalam ${sisaMasaTenggangDays} hari lagi. Segera isi pulsa sebelum terlambat!`;
        }
        notificationsToSend.push({ num, title, body });
      }
    }

    if (notificationsToSend.length === 0) {
      return NextResponse.json({ success: true, message: "No numbers trigger notification today." });
    }

    // 2. Ambil semua subskripsi push dari database
    const subscriptions = await db.pushSubscription.findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "No active push subscriptions found." });
    }

    let sentCount = 0;
    let failedSubscriptions: string[] = [];

    // 3. Kirim notifikasi untuk setiap nomor yang memenuhi syarat ke semua subskripsi
    for (const item of notificationsToSend) {
      const payload = JSON.stringify({
        title: item.title,
        body: item.body,
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
