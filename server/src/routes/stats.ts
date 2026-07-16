import { Router } from "express";
import { consumptionLogs, foodItems } from "../db.js";
import { requireAuth, requireHousehold, type AuthedRequest } from "../auth.js";

const router = Router();
router.use(requireAuth, requireHousehold);

router.get("/", async (req: AuthedRequest, res) => {
  const householdId = req.auth!.householdId!;
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const logs = consumptionLogs.since(householdId, since.toISOString());

  const consumedCount = logs.filter((l) => l.action === "consumed").length;
  const discardedCount = logs.filter((l) => l.action === "discarded").length;
  const total = consumedCount + discardedCount;
  const wasteRate = total > 0 ? Math.round((discardedCount / total) * 1000) / 10 : 0;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const valueConsumed = round2(logs.filter((l) => l.action === "consumed").reduce((sum, l) => sum + (l.value ?? 0), 0));
  const valueDiscarded = round2(logs.filter((l) => l.action === "discarded").reduce((sum, l) => sum + (l.value ?? 0), 0));
  const hasPriceData = logs.some((l) => l.value != null);

  const byName = new Map<
    string,
    { name: string; category: string; buyCount: number; consumed: number; discarded: number; discardedValue: number }
  >();
  for (const l of logs) {
    const key = l.item_name;
    if (!byName.has(key)) byName.set(key, { name: l.item_name, category: l.category, buyCount: 0, consumed: 0, discarded: 0, discardedValue: 0 });
    const entry = byName.get(key)!;
    entry.buyCount += 1;
    if (l.action === "consumed") entry.consumed += 1;
    if (l.action === "discarded") {
      entry.discarded += 1;
      entry.discardedValue += l.value ?? 0;
    }
  }
  const topItems = Array.from(byName.values())
    .sort((a, b) => b.buyCount - a.buyCount)
    .slice(0, 10);

  const wastefulItems = Array.from(byName.values())
    .filter((i) => i.discarded > 0)
    .sort((a, b) => b.discardedValue - a.discardedValue || b.discarded - a.discarded)
    .slice(0, 10)
    .map((i) => ({ ...i, discardedValue: round2(i.discardedValue) }));

  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  const activeItems = foodItems.activeByHousehold(householdId);
  const expiredCount = activeItems.filter((i) => i.expiry_date && new Date(i.expiry_date) < now).length;
  const expiringSoonCount = activeItems.filter(
    (i) => i.expiry_date && new Date(i.expiry_date) >= now && new Date(i.expiry_date) <= soon
  ).length;

  res.json({
    rangeDays: 90,
    consumedCount,
    discardedCount,
    wasteRate,
    hasPriceData,
    valueConsumed,
    valueDiscarded,
    topItems,
    wastefulItems,
    expiredCount,
    expiringSoonCount,
    activeItemCount: activeItems.length,
  });
});

export default router;
