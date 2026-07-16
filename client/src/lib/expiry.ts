export type ExpiryLevel = "expired" | "soon" | "fresh" | "unknown";

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryLevel(dateStr: string | null): ExpiryLevel {
  const d = daysUntil(dateStr);
  if (d === null) return "unknown";
  if (d < 0) return "expired";
  if (d <= 3) return "soon";
  return "fresh";
}

export function expiryLabel(dateStr: string | null): string {
  const d = daysUntil(dateStr);
  if (d === null) return "无到期日期";
  if (d < 0) return `已过期 ${Math.abs(d)} 天`;
  if (d === 0) return "今天到期";
  return `${d} 天后到期`;
}

export const levelStyles: Record<ExpiryLevel, { badge: string; card: string; dot: string }> = {
  expired: { badge: "bg-red-100 text-red-700", card: "border-red-200 bg-red-50/60", dot: "bg-red-500" },
  soon: { badge: "bg-amber-100 text-amber-700", card: "border-amber-200 bg-amber-50/60", dot: "bg-amber-500" },
  fresh: { badge: "bg-emerald-100 text-emerald-700", card: "border-emerald-200 bg-white", dot: "bg-emerald-500" },
  unknown: { badge: "bg-gray-100 text-gray-600", card: "border-gray-200 bg-white", dot: "bg-gray-400" },
};
