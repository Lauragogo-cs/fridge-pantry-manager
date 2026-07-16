import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { CATEGORIES, LOCATIONS, UNITS, LEVEL_LABELS, type FoodItem, type FoodLevel, type TrackingMode } from "../lib/types";
import { guessExpiryDate } from "../lib/shelfLife";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ItemFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [name, setName] = useState(params.get("name") || "");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("quantity");
  const [level, setLevel] = useState<FoodLevel>("plenty");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(UNITS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [purchaseDate, setPurchaseDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState("");
  const [barcode, setBarcode] = useState(params.get("barcode") || "");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get<{ item: FoodItem }>(`/items/${id}`)
      .then(({ item }) => {
        setName(item.name);
        setCategory(item.category);
        setTrackingMode(item.trackingMode || "quantity");
        setLevel(item.level || "plenty");
        setQuantity(String(item.quantity));
        setUnit(item.unit);
        setLocation(item.location);
        setPurchaseDate(item.purchaseDate.slice(0, 10));
        setExpiryDate(item.expiryDate ? item.expiryDate.slice(0, 10) : "");
        setBarcode(item.barcode || "");
        setUnitPrice(item.unitPrice != null ? String(item.unitPrice) : "");
        setNotes(item.notes || "");
        setSuggestionDismissed(true);
      })
      .catch(() => setError("加载食材信息失败"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const suggestedExpiry = useMemo(() => {
    if (expiryDate || suggestionDismissed) return null;
    return guessExpiryDate(name, category, purchaseDate);
  }, [name, category, purchaseDate, expiryDate, suggestionDismissed]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload = {
      name,
      category,
      quantity: trackingMode === "level" ? 1 : Number(quantity),
      unit: trackingMode === "level" ? "份" : unit,
      location,
      purchaseDate,
      expiryDate: expiryDate || null,
      barcode: barcode || null,
      notes: notes || null,
      unitPrice: unitPrice ? Number(unitPrice) : null,
      trackingMode,
      level: trackingMode === "level" ? level : null,
    };
    try {
      if (isEdit) {
        await api.put(`/items/${id}`, payload);
      } else {
        await api.post("/items", payload);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">加载中...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">{isEdit ? "编辑食材" : "添加食材"}</h1>
      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">名称</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="例如：牛奶"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">存放位置</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">记录方式</label>
          <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm w-fit">
            <button
              type="button"
              onClick={() => setTrackingMode("quantity")}
              className={`px-3 py-1.5 ${trackingMode === "quantity" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
            >
              按数量
            </button>
            <button
              type="button"
              onClick={() => setTrackingMode("level")}
              className={`px-3 py-1.5 ${trackingMode === "level" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
            >
              按剩余程度
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {trackingMode === "level"
              ? '适合半棵白菜、一把青菜这类不方便精确计数的食材，只需标记"充足/剩一点/没了"。'
              : "适合有明确数量的食材，如几盒牛奶、几个鸡蛋。"}
          </p>
        </div>

        {trackingMode === "quantity" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">数量</label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">单位</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-600 mb-1">剩余程度</label>
            <div className="flex gap-2">
              {(["plenty", "low", "out"] as FoodLevel[]).map((lv) => (
                <button
                  type="button"
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${
                    level === lv ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"
                  }`}
                >
                  {LEVEL_LABELS[lv]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">购买日期</label>
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">保质期至（可选）</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => {
                setExpiryDate(e.target.value);
                setSuggestionDismissed(true);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {suggestedExpiry && (
          <div className="flex items-center gap-2 text-xs bg-brand-50 border border-brand-100 rounded-md px-3 py-2">
            <span className="text-brand-700">根据"{name}"的常见保质期，建议到期日：{suggestedExpiry}</span>
            <button
              type="button"
              onClick={() => setExpiryDate(suggestedExpiry)}
              className="ml-auto px-2 py-0.5 rounded bg-brand-600 text-white hover:bg-brand-700"
            >
              使用
            </button>
            <button type="button" onClick={() => setSuggestionDismissed(true)} className="text-gray-400 hover:text-gray-600">
              忽略
            </button>
          </div>
        )}

        <div className="flex gap-2 text-xs text-gray-500">
          <span>快捷设置到期日：</span>
          {[3, 7, 14, 30].map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => {
                setExpiryDate(addDays(d));
                setSuggestionDismissed(true);
              }}
              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
            >
              {d}天后
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">条码（可选）</label>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">预估单价（可选，元）</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="用于统计节省/浪费金额"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">备注（可选）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            {busy ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-gray-500 px-4 py-2 rounded-md hover:bg-gray-100"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
