import { Router } from "express";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { households, users } from "../db.js";
import { signToken, requireAuth, type AuthedRequest } from "../auth.js";

const router = Router();
const inviteCodeGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "密码至少6位"),
  name: z.string().min(1),
  mode: z.enum(["create", "join"]),
  householdName: z.string().optional(),
  inviteCode: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "输入有误" });
  }
  const { email, password, name, mode, householdName, inviteCode } = parsed.data;

  if (users.findByEmail(email)) {
    return res.status(409).json({ error: "该邮箱已注册" });
  }

  let household;
  if (mode === "create") {
    household = households.create(householdName?.trim() || `${name}的家庭`, inviteCodeGen());
  } else {
    if (!inviteCode) return res.status(400).json({ error: "请输入邀请码" });
    household = households.findByInviteCode(inviteCode.toUpperCase());
    if (!household) return res.status(404).json({ error: "邀请码无效" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = users.create(email, passwordHash, name, household.id);

  const token = signToken({ userId: user.id, householdId: household.id });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
    household: { id: household.id, name: household.name, inviteCode: household.invite_code },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "输入有误" });
  const { email, password } = parsed.data;

  const user = users.findByEmail(email);
  if (!user) return res.status(401).json({ error: "邮箱或密码错误" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "邮箱或密码错误" });

  const token = signToken({ userId: user.id, householdId: user.household_id });
  const household = user.household_id ? households.findById(user.household_id) : undefined;
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
    household: household ? { id: household.id, name: household.name, inviteCode: household.invite_code } : null,
  });
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = users.findById(req.auth!.userId);
  if (!user) return res.status(404).json({ error: "用户不存在" });
  let household = null;
  if (user.household_id) {
    const h = households.findById(user.household_id);
    if (h) household = { id: h.id, name: h.name, inviteCode: h.invite_code, members: households.members(h.id) };
  }
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    household,
  });
});

export default router;
