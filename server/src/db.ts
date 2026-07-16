// Uses Node.js's built-in node:sqlite module (Node 22+) — no external
// dependencies, no native compilation, so it starts up quickly anywhere.
// All data access is contained in this file; migrating to a production
// database like PostgreSQL/MySQL later only requires replacing this
// file's implementation, with no changes needed in the route layer.
import { DatabaseSync } from "node:sqlite";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DB_PATH || path.join(dataDir, "fridge.db");

export const raw = new DatabaseSync(dbPath);
// Note: some mounted/network filesystems don't support the shared-memory
// mapping that WAL mode needs, so we stick with the default DELETE
// journal mode to stay reliable on any filesystem.
raw.exec("PRAGMA foreign_keys = ON;");

raw.exec(`
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  household_id TEXT REFERENCES households(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  location TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  expiry_date TEXT,
  barcode TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consumption_logs (
  id TEXT PRIMARY KEY,
  food_item_id TEXT NOT NULL REFERENCES food_items(id),
  household_id TEXT NOT NULL REFERENCES households(id),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  quantity REAL NOT NULL,
  logged_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_items_household ON food_items(household_id);
CREATE INDEX IF NOT EXISTS idx_logs_household ON consumption_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_household ON push_subscriptions(household_id);
`);

// Lightweight migration helper: adds columns that didn't exist in earlier
// versions of the schema, so upgrading an already-deployed database doesn't
// require dropping data. Safe to run on every startup.
function ensureColumn(table: string, column: string, ddl: string) {
  const cols = raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    raw.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

ensureColumn("food_items", "unit_price", "unit_price REAL");
ensureColumn("food_items", "tracking_mode", "tracking_mode TEXT NOT NULL DEFAULT 'quantity'");
ensureColumn("food_items", "level", "level TEXT");
ensureColumn("food_items", "notified_at", "notified_at TEXT");
ensureColumn("consumption_logs", "value", "value REAL");

export function genId(): string {
  return nanoid();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Households ----------
export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export const households = {
  create(name: string, inviteCode: string): Household {
    const id = genId();
    const created_at = nowIso();
    raw
      .prepare(`INSERT INTO households (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)`)
      .run(id, name, inviteCode, created_at);
    return { id, name, invite_code: inviteCode, created_at };
  },
  findById(id: string): Household | undefined {
    return raw.prepare(`SELECT * FROM households WHERE id = ?`).get(id) as Household | undefined;
  },
  findByInviteCode(code: string): Household | undefined {
    return raw.prepare(`SELECT * FROM households WHERE invite_code = ?`).get(code) as Household | undefined;
  },
  rename(id: string, name: string): Household | undefined {
    raw.prepare(`UPDATE households SET name = ? WHERE id = ?`).run(name, id);
    return households.findById(id);
  },
  members(id: string) {
    return raw
      .prepare(`SELECT id, name, email FROM users WHERE household_id = ?`)
      .all(id) as { id: string; name: string; email: string }[];
  },
  all(): Household[] {
    return raw.prepare(`SELECT * FROM households`).all() as unknown as Household[];
  },
};

// ---------- Users ----------
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  household_id: string | null;
  created_at: string;
}

export const users = {
  create(email: string, passwordHash: string, name: string, householdId: string): UserRow {
    const id = genId();
    const created_at = nowIso();
    raw
      .prepare(`INSERT INTO users (id, email, password_hash, name, household_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, email, passwordHash, name, householdId, created_at);
    return { id, email, password_hash: passwordHash, name, household_id: householdId, created_at };
  },
  findByEmail(email: string): UserRow | undefined {
    return raw.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
  },
  findById(id: string): UserRow | undefined {
    return raw.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
  },
};

// ---------- Food Items ----------
export type TrackingMode = "quantity" | "level";
export type FoodLevel = "plenty" | "low" | "out";

export interface FoodItemRow {
  id: string;
  household_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchase_date: string;
  expiry_date: string | null;
  barcode: string | null;
  notes: string | null;
  status: string;
  unit_price: number | null;
  tracking_mode: TrackingMode;
  level: FoodLevel | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const foodItems = {
  create(
    data: Omit<
      FoodItemRow,
      "id" | "created_at" | "updated_at" | "status" | "unit_price" | "tracking_mode" | "level" | "notified_at"
    > &
      Partial<Pick<FoodItemRow, "unit_price" | "tracking_mode" | "level">>
  ): FoodItemRow {
    const id = genId();
    const ts = nowIso();
    raw
      .prepare(
        `INSERT INTO food_items
          (id, household_id, name, category, quantity, unit, location, purchase_date, expiry_date, barcode, notes,
           status, unit_price, tracking_mode, level, notified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        id,
        data.household_id,
        data.name,
        data.category,
        data.quantity,
        data.unit,
        data.location,
        data.purchase_date,
        data.expiry_date,
        data.barcode,
        data.notes,
        data.unit_price ?? null,
        data.tracking_mode ?? "quantity",
        data.level ?? null,
        ts,
        ts
      );
    return foodItems.findById(id)!;
  },
  findById(id: string): FoodItemRow | undefined {
    return raw.prepare(`SELECT * FROM food_items WHERE id = ?`).get(id) as FoodItemRow | undefined;
  },
  list(householdId: string, status: string): FoodItemRow[] {
    if (status === "all") {
      return raw
        .prepare(`SELECT * FROM food_items WHERE household_id = ? ORDER BY (expiry_date IS NULL), expiry_date ASC, created_at DESC`)
        .all(householdId) as unknown as FoodItemRow[];
    }
    return raw
      .prepare(
        `SELECT * FROM food_items WHERE household_id = ? AND status = ? ORDER BY (expiry_date IS NULL), expiry_date ASC, created_at DESC`
      )
      .all(householdId, status) as unknown as FoodItemRow[];
  },
  update(
    id: string,
    patch: Partial<Omit<FoodItemRow, "id" | "household_id" | "created_at" | "updated_at">>
  ): FoodItemRow {
    const current = foodItems.findById(id)!;
    const merged = { ...current, ...patch, updated_at: nowIso() };
    raw
      .prepare(
        `UPDATE food_items SET name=?, category=?, quantity=?, unit=?, location=?, purchase_date=?, expiry_date=?, barcode=?, notes=?,
           status=?, unit_price=?, tracking_mode=?, level=?, notified_at=?, updated_at=?
         WHERE id = ?`
      )
      .run(
        merged.name,
        merged.category,
        merged.quantity,
        merged.unit,
        merged.location,
        merged.purchase_date,
        merged.expiry_date,
        merged.barcode,
        merged.notes,
        merged.status,
        merged.unit_price,
        merged.tracking_mode,
        merged.level,
        merged.notified_at,
        merged.updated_at,
        id
      );
    return foodItems.findById(id)!;
  },
  remove(id: string): void {
    raw.prepare(`DELETE FROM food_items WHERE id = ?`).run(id);
  },
  activeByHousehold(householdId: string): FoodItemRow[] {
    return raw
      .prepare(`SELECT * FROM food_items WHERE household_id = ? AND status = 'active'`)
      .all(householdId) as unknown as FoodItemRow[];
  },
  allActive(): FoodItemRow[] {
    return raw.prepare(`SELECT * FROM food_items WHERE status = 'active'`).all() as unknown as FoodItemRow[];
  },
};

// ---------- Consumption Logs ----------
export interface ConsumptionLogRow {
  id: string;
  food_item_id: string;
  household_id: string;
  item_name: string;
  category: string;
  action: string;
  quantity: number;
  value: number | null;
  logged_at: string;
}

export const consumptionLogs = {
  create(data: Omit<ConsumptionLogRow, "id" | "logged_at" | "value"> & Partial<Pick<ConsumptionLogRow, "value">>): ConsumptionLogRow {
    const id = genId();
    const logged_at = nowIso();
    const value = data.value ?? null;
    raw
      .prepare(
        `INSERT INTO consumption_logs (id, food_item_id, household_id, item_name, category, action, quantity, value, logged_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.food_item_id, data.household_id, data.item_name, data.category, data.action, data.quantity, value, logged_at);
    return { id, logged_at, ...data, value };
  },
  since(householdId: string, sinceIso: string): ConsumptionLogRow[] {
    return raw
      .prepare(`SELECT * FROM consumption_logs WHERE household_id = ? AND logged_at >= ? ORDER BY logged_at DESC`)
      .all(householdId, sinceIso) as unknown as ConsumptionLogRow[];
  },
};

// ---------- Push subscriptions ----------
export interface PushSubscriptionRow {
  id: string;
  household_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export const pushSubscriptions = {
  upsert(householdId: string, userId: string, endpoint: string, p256dh: string, auth: string): PushSubscriptionRow {
    const existing = raw.prepare(`SELECT * FROM push_subscriptions WHERE endpoint = ?`).get(endpoint) as
      | PushSubscriptionRow
      | undefined;
    if (existing) {
      raw
        .prepare(`UPDATE push_subscriptions SET p256dh = ?, auth = ?, household_id = ?, user_id = ? WHERE id = ?`)
        .run(p256dh, auth, householdId, userId, existing.id);
      return { ...existing, p256dh, auth, household_id: householdId, user_id: userId };
    }
    const id = genId();
    const created_at = nowIso();
    raw
      .prepare(
        `INSERT INTO push_subscriptions (id, household_id, user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, householdId, userId, endpoint, p256dh, auth, created_at);
    return { id, household_id: householdId, user_id: userId, endpoint, p256dh, auth, created_at };
  },
  remove(endpoint: string): void {
    raw.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
  },
  byHousehold(householdId: string): PushSubscriptionRow[] {
    return raw
      .prepare(`SELECT * FROM push_subscriptions WHERE household_id = ?`)
      .all(householdId) as unknown as PushSubscriptionRow[];
  },
  all(): PushSubscriptionRow[] {
    return raw.prepare(`SELECT * FROM push_subscriptions`).all() as unknown as PushSubscriptionRow[];
  },
};
