// Mirrors server/src/shelfLife.ts — kept as a small duplicated lookup table
// (rather than a shared package) since this is a two-package project. Used
// to suggest an expiry date in the add/edit form so users don't have to
// guess or look one up for every item.
const SHELF_LIFE_DAYS: { keyword: string; days: number }[] = [
  { keyword: "牛奶", days: 7 },
  { keyword: "酸奶", days: 14 },
  { keyword: "奶酪", days: 21 },
  { keyword: "黄油", days: 30 },
  { keyword: "鸡蛋", days: 21 },
  { keyword: "豆腐", days: 5 },
  { keyword: "生菜", days: 5 },
  { keyword: "菠菜", days: 5 },
  { keyword: "白菜", days: 10 },
  { keyword: "西红柿", days: 7 },
  { keyword: "番茄", days: 7 },
  { keyword: "黄瓜", days: 7 },
  { keyword: "胡萝卜", days: 21 },
  { keyword: "土豆", days: 30 },
  { keyword: "洋葱", days: 30 },
  { keyword: "青椒", days: 10 },
  { keyword: "蘑菇", days: 5 },
  { keyword: "香蕉", days: 5 },
  { keyword: "苹果", days: 21 },
  { keyword: "橙子", days: 21 },
  { keyword: "葡萄", days: 7 },
  { keyword: "草莓", days: 3 },
  { keyword: "猪肉", days: 3 },
  { keyword: "牛肉", days: 3 },
  { keyword: "鸡胸肉", days: 2 },
  { keyword: "鸡肉", days: 2 },
  { keyword: "鸡翅", days: 2 },
  { keyword: "虾", days: 2 },
  { keyword: "鱼", days: 2 },
  { keyword: "培根", days: 7 },
  { keyword: "香肠", days: 14 },
  { keyword: "面包", days: 5 },
  { keyword: "馒头", days: 5 },
  { keyword: "面条", days: 365 },
  { keyword: "米", days: 365 },
  { keyword: "面粉", days: 180 },
  { keyword: "罐头", days: 365 },
  { keyword: "酱油", days: 365 },
  { keyword: "醋", days: 365 },
  { keyword: "食用油", days: 180 },
  { keyword: "盐", days: 730 },
  { keyword: "糖", days: 365 },
  { keyword: "薯片", days: 90 },
  { keyword: "饼干", days: 90 },
  { keyword: "坚果", days: 90 },
  { keyword: "巧克力", days: 180 },
  { keyword: "饮料", days: 180 },
  { keyword: "果汁", days: 14 },
  { keyword: "啤酒", days: 180 },
  { keyword: "速冻", days: 90 },
  { keyword: "冷冻", days: 90 },
];

const CATEGORY_DEFAULT_DAYS: Record<string, number> = {
  蔬菜: 7,
  水果: 10,
  肉禽蛋: 3,
  海鲜水产: 2,
  乳制品: 10,
  主食谷物: 180,
  调味品: 365,
  零食: 90,
  饮料: 90,
  冷冻食品: 90,
  其他: 14,
};

export function guessShelfLifeDays(name: string, category?: string): number | null {
  const trimmed = name.trim();
  if (trimmed) {
    const hit = SHELF_LIFE_DAYS.find((entry) => trimmed.includes(entry.keyword));
    if (hit) return hit.days;
  }
  if (category && CATEGORY_DEFAULT_DAYS[category] !== undefined) return CATEGORY_DEFAULT_DAYS[category];
  return null;
}

export function guessExpiryDate(name: string, category: string, purchaseDateStr: string): string | null {
  const days = guessShelfLifeDays(name, category);
  if (days === null) return null;
  const d = new Date(purchaseDateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
