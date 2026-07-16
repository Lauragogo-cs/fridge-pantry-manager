import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { FoodItem, FoodLevel } from "../lib/types";
import { expiryLevel } from "../lib/expiry";
import ItemCard from "../components/ItemCard";

type Filter = "all" | "expired" | "soon" | "fresh";

export default function DashboardPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ items: FoodItem[] }>("/items?status=active");
      setItems(data.items);
    } catch {
      setError("加载食材列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConsume(id: string, action: "consumed" | "discarded") {
    try {
      await api.post(`/items/${id}/consume`, { action });
      load();
    } catch {
      alert("操作失败，请重试");
    }
  }

  async function handleSetLevel(id: string, level: FoodLevel) {
    try {
      await api.post(`/items/${id}/level`, { level });
      load();
    } catch {
      alert("操作失败，请重试");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个食材记录吗？")) return;
    try {
      await api.delete(`/items/${id}`);
      load();
    } catch {
      alert("删除失败，请重试");
    }
  }

  const counts = useMemo(() => {
    const c = { expired: 0, soon: 0, fresh: 0, unknown: 0 };
    for (const item of items) c[expiryLevel(item.expiryDate)]++;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    return items
      .filter((item) => (filter === "all" ? true : expiryLevel(item.expiryDate) === filter))
      .filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [items, filter, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-800">我的食材</h1>
        <Link to="/add" className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md">
          + 添加食材
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <SummaryCard label="已过期" value={counts.expired} color="text-red-600" onClick={() => setFilter("expired")} />
        <SummaryCard label="即将过期(3天内)" value={counts.soon} color="text-amber-600" onClick={() => setFilter("soon")} />
        <SummaryCard label="新鲜" value={counts.fresh} color="text-emerald-600" onClick={() => setFilter("fresh")} />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 text-sm bg-white border border-gray-200 rounded-md p-1">
          {(["all", "expired", "soon", "fresh"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded ${filter === f ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {f === "all" ? "全部" : f === "expired" ? "已过期" : f === "soon" ? "即将过期" : "新鲜"}
            </button>
          ))}
        </div>
        <input
          placeholder="搜索食材名..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading && <p className="text-sm text-gray-500">加载中...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-gray-400 py-16 text-sm">
          暂无食材，<Link to="/add" className="text-brand-600 hover:underline">去添加一个</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} onConsume={handleConsume} onSetLevel={handleSetLevel} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, onClick }: { label: string; value: number; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white border border-gray-200 rounded-lg p-3 text-left hover:shadow-sm transition">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </button>
  );
}
