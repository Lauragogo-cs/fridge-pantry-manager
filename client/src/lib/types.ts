export type TrackingMode = "quantity" | "level";
export type FoodLevel = "plenty" | "low" | "out";

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  purchaseDate: string;
  expiryDate: string | null;
  barcode: string | null;
  notes: string | null;
  status: "active" | "consumed" | "discarded";
  unitPrice: number | null;
  trackingMode: TrackingMode;
  level: FoodLevel | null;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  email: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  members: HouseholdMember[];
}

export interface Me {
  user: { id: string; email: string; name: string };
  household: Household | null;
}

export interface StatItemSummary {
  name: string;
  category: string;
  buyCount: number;
  consumed: number;
  discarded: number;
}

export interface Stats {
  rangeDays: number;
  consumedCount: number;
  discardedCount: number;
  wasteRate: number;
  hasPriceData: boolean;
  valueConsumed: number;
  valueDiscarded: number;
  topItems: StatItemSummary[];
  wastefulItems: (StatItemSummary & { discardedValue: number })[];
  expiredCount: number;
  expiringSoonCount: number;
  activeItemCount: number;
}

export const CATEGORIES = ["蔬菜", "水果", "肉禽蛋", "海鲜水产", "乳制品", "主食谷物", "调味品", "零食", "饮料", "冷冻食品", "其他"];
export const LOCATIONS = ["冷藏", "冷冻", "常温/柜子"];
export const UNITS = ["个", "克", "千克", "包", "瓶", "盒", "袋", "份", "只", "根"];

export const LEVEL_LABELS: Record<FoodLevel, string> = {
  plenty: "充足",
  low: "剩一点",
  out: "没了",
};
