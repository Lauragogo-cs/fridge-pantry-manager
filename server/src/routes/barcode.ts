import { Router } from "express";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

// Look up product info by barcode via the Open Food Facts open database.
// Proxied through the server to avoid browser CORS restrictions.
router.get("/:code", async (req, res) => {
  const code = req.params.code.trim();
  if (!/^[0-9]{6,14}$/.test(code)) {
    return res.status(400).json({ error: "条码格式不正确" });
  }
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    if (!r.ok) return res.status(502).json({ error: "查询服务暂不可用" });
    const data = (await r.json()) as any;
    if (data.status !== 1 || !data.product) {
      return res.json({ found: false, barcode: code });
    }
    const p = data.product;
    res.json({
      found: true,
      barcode: code,
      name: p.product_name_zh || p.product_name || p.generic_name || "",
      brand: p.brands || "",
      category: p.categories_tags?.[0]?.replace(/^\w+:/, "") || "",
      imageUrl: p.image_front_small_url || p.image_url || "",
      quantityText: p.quantity || "",
    });
  } catch {
    res.status(502).json({ error: "查询失败，请检查网络" });
  }
});

export default router;
