import { Router } from "express";
import { z } from "zod";
import { households } from "../db.js";
import { requireAuth, requireHousehold, type AuthedRequest } from "../auth.js";

const router = Router();
router.use(requireAuth, requireHousehold);

router.get("/", async (req: AuthedRequest, res) => {
  const h = households.findById(req.auth!.householdId!);
  if (!h) return res.status(404).json({ error: "家庭不存在" });
  res.json({ household: { id: h.id, name: h.name, inviteCode: h.invite_code, members: households.members(h.id) } });
});

const renameSchema = z.object({ name: z.string().min(1) });

router.put("/", async (req: AuthedRequest, res) => {
  const parsed = renameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "输入有误" });
  const h = households.rename(req.auth!.householdId!, parsed.data.name);
  res.json({ household: h });
});

export default router;
