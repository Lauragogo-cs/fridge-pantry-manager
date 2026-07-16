import { foodItems, households } from "./db.js";
import { notifyHousehold, pushEnabled } from "./push.js";

const NOTIFY_WITHIN_DAYS = 3;
// Don't re-notify about the same item more than once per this many hours,
// so a household isn't spammed every time the check runs.
const RENOTIFY_AFTER_HOURS = 20;

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

async function checkExpiringItems() {
  if (!pushEnabled) return;

  const allActive = foodItems.allActive();
  const byHousehold = new Map<string, typeof allActive>();
  for (const item of allActive) {
    if (!item.expiry_date) continue;
    const days = daysUntil(item.expiry_date);
    if (days > NOTIFY_WITHIN_DAYS) continue;

    if (item.notified_at) {
      const hoursSince = (Date.now() - new Date(item.notified_at).getTime()) / (1000 * 60 * 60);
      if (hoursSince < RENOTIFY_AFTER_HOURS) continue;
    }

    if (!byHousehold.has(item.household_id)) byHousehold.set(item.household_id, []);
    byHousehold.get(item.household_id)!.push(item);
  }

  for (const [householdId, items] of byHousehold) {
    const household = households.findById(householdId);
    const names = items.slice(0, 5).map((i) => i.name);
    const extra = items.length > 5 ? ` 等 ${items.length} 项` : "";
    const expired = items.filter((i) => i.expiry_date && daysUntil(i.expiry_date) < 0).length;

    await notifyHousehold(householdId, {
      title: expired > 0 ? "有食材已过期" : "有食材即将过期",
      body: `${household?.name || "你的家庭"}：${names.join("、")}${extra}`,
      url: "/",
    });

    const now = new Date().toISOString();
    for (const item of items) {
      foodItems.update(item.id, { notified_at: now });
    }
  }
}

export function startNotifyScheduler() {
  if (!pushEnabled) return;
  // Run once shortly after startup, then on a fixed interval. An hourly
  // check is frequent enough to catch newly-added subscriptions/items
  // without needing an external cron service.
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;
  setTimeout(() => {
    checkExpiringItems().catch((err) => console.error("[push] scheduler run failed:", err));
  }, 15_000);
  setInterval(() => {
    checkExpiringItems().catch((err) => console.error("[push] scheduler run failed:", err));
  }, CHECK_INTERVAL_MS);
}
