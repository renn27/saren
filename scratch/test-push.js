const { PrismaClient } = require("@prisma/client");
const webpush = require("web-push");

const prisma = new PrismaClient();

async function main() {
  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:mrendi@example.com";

  if (!publicVapidKey || !privateVapidKey) {
    console.error("VAPID keys not found in environment! Please make sure --env-file=.env is specified.");
    return;
  }

  webpush.setVapidDetails(subject, publicVapidKey, privateVapidKey);

  console.log("Fetching subscriptions from database...");
  const subs = await prisma.pushSubscription.findMany();

  if (subs.length === 0) {
    console.log("No subscriptions found in the database. Please open the app in a browser to register first!");
    return;
  }

  console.log(`Found ${subs.length} active subscription(s). Sending test notification...`);

  const payload = JSON.stringify({
    title: "⚡ Test Notifikasi SAREN",
    body: "Notifikasi ini dikirim dari server menggunakan Web Push Protocol!",
    url: "/nomor"
  });

  for (const sub of subs) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      await webpush.sendNotification(pushSubscription, payload);
      console.log(`Successfully sent to endpoint: ${sub.endpoint.substring(0, 40)}...`);
    } catch (err) {
      console.error(`Failed to send to subscription ${sub.id}:`, err);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
