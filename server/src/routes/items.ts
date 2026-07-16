import { Router } from "express";
import { z } from "zod";
import { foodItems, consumptionLogs, type FoodItemRow } from "../db.js";
import { guessExpiryDate } from "../shelfLife.js";
import { requireAuth, requireHousehold, type AuthedRequest } from "../auth.js";

const router = Router();
router.use(requireAuth, requireHousehold);

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  location: z.string().min(1),
  purchaseDate: z.string(),
  expiryDate: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  trackingMode: z.enum(["quantity", "level"]).optional(),
  level: z.enum(["plenty", "low", "out"]).nullable().optional(),
});

function toApi(item: FoodItemRow | undefined | null) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    location: item.location,
    purchaseDate: item.purchase_date,
    expiryDate: item.expiry_date,
    barcode: item.barcode,
    notes: item.notes,
    status: item.status,
    unitPrice: item.unit_price,
    trackingMode: item.tracking_mode,
    level: item.level,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

router.get("/", async (req: AuthedRequest, res) => {
  const status = (req.query.status as string) || "active";
  const items = foodItems.list(req.auth!.householdId!, status);
  res.json({ items: items.map(toApi) });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const item = foodItems.findById(req.params.id);
  if (!item || item.household_id !== req.auth!.householdId) {
    return res.status(404).json({ error: "食材不存在" });
  }
  res.json({ item: toApi(item) });
});

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "输入有误" });
  const d = parsed.data;
  const trackingMode = d.trackingMode ?? "quantity";
  const item = foodItems.create({
    household_id: req.auth!.householdId!,
    name: d.name,
    category: d.category,
    quantity: d.quantity,
    unit: d.unit,
    location: d.location,
    purchase_date: d.purchaseDate,
    expiry_date: d.expiryDate || null,
    barcode: d.barcode || null,
    notes: d.notes || null,
    unit_price: d.unitPrice ?? null,
    tracking_mode: trackingMode,
    level: trackingMode === "level" ? d.level ?? "plenty" : null,
  });
  res.status(201).json({ item: toApi(item) });
});

// Batch-create items, e.g. after scanning a receipt and selecting several
// lines at once. Missing fields get sensible defaults so the whole flow
// takes one tap instead of filling out a form per item; users can still
// edit each item afterwards.
const batchItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
});

const batchSchema = z.object({
  items: z.array(batchItemSchema).min(1).max(50),
});

router.post("/batch", async (req: AuthedRequest, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "输入有误" });

  const today = new Date().toISOString().slice(0, 10);
  const created = parsed.data.items.map((d) => {
    const category = d.category || "其他";
    const purchaseDate = d.purchaseDate || today;
    const expiryDate = d.expiryDate !== undefined ? d.expiryDate : guessExpiryDate(d.name, category, purchaseDate);
    const item = foodItems.create({
      household_id: req.auth!.householdId!,
      name: d.name,
      category,
      quantity: d.quantity ?? 1,
      unit: d.unit || "份",
      location: d.location || "常温/柜子",
      purchase_date: purchaseDate,
      expiry_date: expiryDate || null,
      barcode: null,
      notes: null,
      unit_price: d.unitPrice ?? null,
      tracking_mode: "quantity",
      level: null,
    });
    return toApi(item);
  });

  res.status(201).json({ items: created });
});

router.put("/:id", async (req: AuthedRequest, res) => {
  const existing = foodItems.findById(req.params.id);
  if (!existing || existing.household_id !== req.auth!.householdId) {
    return res.status(404).json({ error: "食材不存在" });
  }
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || "输入有误" });
  const d = parsed.data;
  const item = foodItems.update(existing.id, {
    ...(d.name !== undefined ? { name: d.name } : {}),
    ...(d.category !== undefined ? { category: d.category } : {}),
    ...(d.quantity !== undefined ? { quantity: d.quantity } : {}),
    ...(d.unit !== undefined ? { unit: d.unit } : {}),
    ...(d.location !== undefined ? { location: d.location } : {}),
    ...(d.purchaseDate !== undefined ? { purchase_date: d.purchaseDate } : {}),
    ...(d.expiryDate !== undefined ? { expiry_date: d.expiryDate } : {}),
    ...(d.barcode !== undefined ? { barcode: d.barcode } : {}),
    ...(d.notes !== undefined ? { notes: d.notes } : {}),
    ...(d.unitPrice !== undefined ? { unit_price: d.unitPrice } : {}),
    ...(d.trackingMode !== undefined ? { tracking_mode: d.trackingMode } : {}),
    ...(d.level !== undefined ? { level: d.level } : {}),
  });
  res.json({ item: toApi(item) });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const existing = foodItems.findById(req.params.id);
  if (!existing || existing.household_id !== req.auth!.householdId) {
    return res.status(404).json({ error: "食材不存在" });
  }
  foodItems.remove(existing.id);
  res.json({ ok: true });
});

const consumeSchema = z.object({
  action: z.enum(["consumed", "discarded"]),
  quantity: z.number().positive().optional(),
});

router.post("/:id/consume", async (req: AuthedRequest, res) => {
  const existing = foodItems.findById(req.params.id);
  if (!existing || existing.household_id !== req.auth!.householdId) {
    return res.status(404).json({ error: "食材不存在" });
  }
  const parsed = consumeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "输入有误" });
  const { action, quantity } = parsed.data;
  const usedQty = quantity ?? existing.quantity;
  const value = existing.unit_price != null ? Math.round(usedQty * existing.unit_price * 100) / 100 : null;

  consumptionLogs.create({
    food_item_id: existing.id,
    household_id: existing.household_id,
    item_name: existing.name,
    category: existing.category,
    action,
    quantity: usedQty,
    value,
  });

  const remaining = Math.max(0, existing.quantity - usedQty);
  const item = foodItems.update(existing.id, {
    quantity: remaining,
    status: remaining <= 0 ? action : "active",
  });
  res.json({ item: toApi(item) });
});

// For "level"-tracked (plenty/low/out) items — a lighter-weight alternative
// to precise quantities for loose things like "half a cabbage". Setting the
// level to "out" logs it as consumed automatically.
const levelSchema = z.object({
  level: z.enum(["plenty", "low", "out"]),
});

router.post("/:id/level", async (req: AuthedRequest, res) => {
  const existing = foodItems.findById(req.params.id);
  if (!existing || existing.household_id !== req.auth!.householdId) {
    return res.status(404).json({ error: "食材不存在" });
  }
  const parsed = levelSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "输入有误" });
  const { level } = parsed.data;

  if (level === "out") {
    const value = existing.unit_price != null ? Math.round(existing.quantity * existing.unit_price * 100) / 100 : null;
    consumptionLogs.create({
      food_item_id: existing.id,
      household_id: existing.household_id,
      item_name: existing.name,
      category: existing.category,
      action: "consumed",
      quantity: existing.quantity,
      value,
    });
    const item = foodItems.update(existing.id, { level: "out", status: "consumed" });
    return res.json({ item: toApi(item) });
  }

  const item = foodItems.update(existing.id, { level });
  res.json({ item: toApi(item) });
});

export default router;
