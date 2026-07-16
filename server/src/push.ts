import webpush from "web-push";
import { pushSubscriptions, type PushSubscriptionRow } from "./db.js";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

export const pushEnabled = Boolean(publicKey && privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
} else {
  console.warn(
    "[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — expiry push notifications are disabled. " +
      "See server/.env.example for how to generate a keypair."
  );
}

export function getVapidPublicKey(): string | null {
  return publicKey || null;
}

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

async function sendToSubscription(sub: PushSubscriptionRow, payload: NotificationPayload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    // 410 Gone / 404 means the subscription is no longer valid on the
    // browser's push service (uninstalled, permission revoked, etc.) —
    // clean it up so we stop trying.
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      pushSubscriptions.remove(sub.endpoint);
    } else {
      console.error("[push] failed to send notification:", err?.message || err);
    }
  }
}

export async function notifyHousehold(householdId: string, payload: NotificationPayload) {
  if (!pushEnabled) return;
  const subs = pushSubscriptions.byHousehold(householdId);
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}
