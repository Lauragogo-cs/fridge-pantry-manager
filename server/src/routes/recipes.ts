import { Router } from "express";
import { foodItems } from "../db.js";
import { suggestRecipes } from "../recipes.js";
import { requireAuth, requireHousehold, type AuthedRequest } from "../auth.js";

const router = Router();
router.use(requireAuth, requireHousehold);

router.get("/suggestions", (req: AuthedRequest, res) => {
  const scope = (req.query.scope as string) || "expiring";
  const active = foodItems.activeByHousehold(req.auth!.householdId!);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date();
  soon.setDate(soon.getDate() + 5);

  const pool =
    scope === "all"
      ? active
      : active.filter((i) => i.expiry_date && new Date(i.expiry_date) <= soon);

  const names = (pool.length > 0 ? pool : active).map((i) => i.name);
  const suggestions = suggestRecipes(names);

  res.json({
    basedOn: (pool.length > 0 ? pool : active).map((i) => i.name),
    suggestions: suggestions.map((s) => ({
      id: s.recipe.id,
      name: s.recipe.name,
      cookTimeMinutes: s.recipe.cookTimeMinutes,
      steps: s.recipe.steps,
      matchedIngredients: s.matchedIngredients,
      matchedOptional: s.matchedOptional,
      missingIngredients: s.missingIngredients,
    })),
  });
});

export default router;
