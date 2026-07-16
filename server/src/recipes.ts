// A small built-in recipe database used to suggest what to cook with
// ingredients that are about to expire. This is intentionally offline/local
// (no external recipe API or LLM call) so it works without extra API keys
// or network access. Each recipe lists generic ingredient keywords; matching
// is a simple substring check against the household's food item names.
export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  optionalIngredients?: string[];
  steps: string[];
  cookTimeMinutes: number;
}

export const RECIPES: Recipe[] = [
  {
    id: "tomato-egg",
    name: "西红柿炒鸡蛋",
    ingredients: ["西红柿", "鸡蛋"],
    optionalIngredients: ["葱"],
    steps: ["鸡蛋打散炒熟盛出", "西红柿切块炒出汁水", "倒入鸡蛋炒匀，加盐调味"],
    cookTimeMinutes: 15,
  },
  {
    id: "egg-fried-rice",
    name: "蛋炒饭",
    ingredients: ["鸡蛋", "米"],
    optionalIngredients: ["胡萝卜", "葱", "香肠"],
    steps: ["剩米饭打散", "鸡蛋炒熟盛出", "米饭下锅炒散，加入配菜和鸡蛋", "加盐/酱油调味"],
    cookTimeMinutes: 15,
  },
  {
    id: "milk-pancake",
    name: "牛奶煎饼/松饼",
    ingredients: ["牛奶", "鸡蛋", "面粉"],
    steps: ["面粉、鸡蛋、牛奶搅拌成面糊", "平底锅小火煎至两面金黄"],
    cookTimeMinutes: 20,
  },
  {
    id: "chicken-stirfry-veg",
    name: "时蔬炒鸡肉",
    ingredients: ["鸡胸肉", "青椒"],
    optionalIngredients: ["洋葱", "胡萝卜", "蘑菇"],
    steps: ["鸡胸肉切片腌制", "热锅炒至变色盛出", "炒配菜后加入鸡肉炒匀调味"],
    cookTimeMinutes: 20,
  },
  {
    id: "pork-cabbage",
    name: "白菜炒肉片",
    ingredients: ["白菜", "猪肉"],
    optionalIngredients: ["葱", "蒜"],
    steps: ["猪肉切片腌制炒至变色", "加入白菜炒软", "加盐/酱油调味"],
    cookTimeMinutes: 20,
  },
  {
    id: "shrimp-fried-egg",
    name: "虾仁炒蛋",
    ingredients: ["虾", "鸡蛋"],
    steps: ["虾去壳腌制炒熟盛出", "鸡蛋炒至半凝固", "混合翻炒调味"],
    cookTimeMinutes: 15,
  },
  {
    id: "potato-beef-stew",
    name: "土豆炖牛肉",
    ingredients: ["土豆", "牛肉"],
    optionalIngredients: ["胡萝卜", "洋葱"],
    steps: ["牛肉焯水", "锅中炒香配菜和牛肉", "加水炖煮至牛肉软烂，最后放土豆炖熟"],
    cookTimeMinutes: 60,
  },
  {
    id: "cucumber-salad",
    name: "凉拌黄瓜",
    ingredients: ["黄瓜"],
    optionalIngredients: ["蒜"],
    steps: ["黄瓜拍碎切段", "加蒜末、醋、盐、香油拌匀"],
    cookTimeMinutes: 10,
  },
  {
    id: "mushroom-soup",
    name: "蘑菇汤",
    ingredients: ["蘑菇"],
    optionalIngredients: ["鸡蛋", "胡萝卜"],
    steps: ["蘑菇切片下锅炒香", "加水煮开", "可淋入蛋液，加盐调味"],
    cookTimeMinutes: 20,
  },
  {
    id: "banana-smoothie",
    name: "香蕉牛奶奶昔",
    ingredients: ["香蕉", "牛奶"],
    steps: ["香蕉切段", "与牛奶一起放入料理机打匀"],
    cookTimeMinutes: 5,
  },
  {
    id: "fruit-yogurt",
    name: "水果酸奶杯",
    ingredients: ["酸奶"],
    optionalIngredients: ["香蕉", "苹果", "葡萄", "草莓"],
    steps: ["水果切块", "与酸奶混合即可"],
    cookTimeMinutes: 5,
  },
  {
    id: "veggie-noodle-soup",
    name: "青菜鸡蛋面",
    ingredients: ["面条", "鸡蛋"],
    optionalIngredients: ["白菜", "菠菜"],
    steps: ["水开下面条", "打入鸡蛋煮熟", "加入青菜稍煮，调味即可"],
    cookTimeMinutes: 15,
  },
  {
    id: "grilled-cheese",
    name: "芝士三明治",
    ingredients: ["面包", "奶酪"],
    optionalIngredients: ["黄油", "培根"],
    steps: ["面包夹奶酪（和培根）", "平底锅小火煎至两面金黄、奶酪融化"],
    cookTimeMinutes: 10,
  },
  {
    id: "onion-soup",
    name: "洋葱汤",
    ingredients: ["洋葱"],
    optionalIngredients: ["奶酪", "面包"],
    steps: ["洋葱切丝炒至焦糖色", "加水/高汤煮15分钟", "可加面包片和奶酪焗烤"],
    cookTimeMinutes: 30,
  },
  {
    id: "fish-steam",
    name: "清蒸鱼",
    ingredients: ["鱼"],
    optionalIngredients: ["葱", "姜"],
    steps: ["鱼处理干净，姜葱铺底", "大火蒸8-10分钟", "淋蒸鱼豉油，浇热油"],
    cookTimeMinutes: 20,
  },
  {
    id: "sausage-fried-rice",
    name: "香肠炒饭",
    ingredients: ["香肠", "米"],
    optionalIngredients: ["鸡蛋", "胡萝卜"],
    steps: ["香肠切丁炒香", "加入剩米饭炒散", "可加鸡蛋、胡萝卜丁，调味即可"],
    cookTimeMinutes: 15,
  },
  {
    id: "carrot-egg-stirfry",
    name: "胡萝卜炒蛋",
    ingredients: ["胡萝卜", "鸡蛋"],
    steps: ["胡萝卜切丝或切片炒软", "倒入蛋液炒匀调味"],
    cookTimeMinutes: 12,
  },
  {
    id: "bacon-pasta",
    name: "培根意面",
    ingredients: ["培根", "面条"],
    optionalIngredients: ["洋葱", "奶酪"],
    steps: ["面条煮熟备用", "培根、洋葱炒香", "加入面条拌炒，撒奶酪调味"],
    cookTimeMinutes: 20,
  },
];

export interface RecipeSuggestion {
  recipe: Recipe;
  matchedIngredients: string[];
  matchedOptional: string[];
  missingIngredients: string[];
  score: number;
}

/**
 * Score recipes by how many required/optional ingredients are covered by
 * the given food item names (typically the household's soon-to-expire or
 * active items), so the highest-scoring recipes use up what's on hand.
 */
export function suggestRecipes(itemNames: string[], limit = 8): RecipeSuggestion[] {
  const names = itemNames.map((n) => n.trim()).filter(Boolean);

  function findMatches(keywords: string[]): string[] {
    return keywords.filter((kw) => names.some((n) => n.includes(kw) || kw.includes(n)));
  }

  const results: RecipeSuggestion[] = RECIPES.map((recipe) => {
    const matchedIngredients = findMatches(recipe.ingredients);
    const matchedOptional = findMatches(recipe.optionalIngredients ?? []);
    const missingIngredients = recipe.ingredients.filter((i) => !matchedIngredients.includes(i));
    // Weight required-ingredient matches heavily; a recipe only "counts" if
    // at least one required ingredient is on hand.
    const score = matchedIngredients.length * 2 + matchedOptional.length;
    return { recipe, matchedIngredients, matchedOptional, missingIngredients, score };
  })
    .filter((r) => r.matchedIngredients.length > 0)
    .sort((a, b) => b.score - a.score || a.missingIngredients.length - b.missingIngredients.length);

  return results.slice(0, limit);
}
