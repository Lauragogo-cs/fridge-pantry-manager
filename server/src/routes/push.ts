import { Router } from "express";
import { z } from "zod";
import { pushSubscriptions } from "../db.js";
import { getVapidPublicKey, pushEnabled } from "../push.js";
import { requireAuth, requireHousehold, type AuthedRequest } from "../auth.js";

const router = Router();

router.get("/vapid-public-key", (_req, res) => {
  res.json({ enabled: pushEnabled, publicKey: getVapidPublicKey() });
});

router.use(requireAuth, requireHousehold);

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

router.post("/subscribe", (req: AuthedRequest, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid subscription payload" });
  const { endpoint, keys } = parsed.data;
  pushSubscriptions.upsert(req.auth!.householdId!, req.auth!.userId, endpoint, keys.p256dh, keys.auth);
  res.status(201).json({ ok: true });
});

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

router.post("/unsubscribe", (req: AuthedRequest, res) => {
  const parsed = unsubscribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
  pushSubscriptions.remove(parsed.data.endpoint);
  res.json({ ok: true });
});

export default router;
