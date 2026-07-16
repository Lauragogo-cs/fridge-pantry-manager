import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Stats } from "../lib/types";

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>("/stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">加载中...</p>;
  if (!stats) return <p className="text-sm text-red-600">加载统计数据失败</p>;

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-800 mb-4">用量统计（近{stats.rangeDays}天）</h1>

      {stats.hasPriceData ? (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-3xl font-semibold text-brand-600">¥{stats.valueConsumed}</div>
            <div className="text-xs text-gray-500 mt-1">已充分利用的食材价值</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-3xl font-semibold text-red-600">¥{stats.valueDiscarded}</div>
            <div className="text-xs text-gray-500 mt-1">因过期/丢弃损失的金额</div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6 text-xs text-amber-700">
          在添加食材时填写"预估单价"，这里就能显示你实际节省/浪费了多少钱，比抽象的百分比更直观。
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="库存中" value={stats.activeItemCount} />
        <Metric label="已消耗" value={stats.consumedCount} color="text-brand-600" />
        <Metric label="已丢弃" value={stats.discardedCount} color="text-red-600" />
        <Metric label="浪费率" value={`${stats.wasteRate}%`} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Metric label="当前已过期" value={stats.expiredCount} color="text-red-600" />
        <Metric label="3天内到期" value={stats.expiringSoonCount} color="text-amber-600" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">最常购买</h2>
          {stats.topItems.length === 0 ? (
            <p className="text-xs text-gray-400">暂无数据，先添加并消耗一些食材吧</p>
          ) : (
            <ul className="space-y-2">
              {stats.topItems.map((it) => (
                <li key={it.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{it.name}</span>
                  <span className="text-gray-400 text-xs">
                    购买 {it.buyCount} 次 · 吃完 {it.consumed} · 丢弃 {it.discarded}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-3">
            建议：优先补货购买频率高、消耗稳定的食材，控制单次采购量以减少浪费。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">最容易浪费</h2>
          {stats.wastefulItems.length === 0 ? (
            <p className="text-xs text-gray-400">目前没有丢弃记录，继续保持！</p>
          ) : (
            <ul className="space-y-2">
              {stats.wastefulItems.map((it) => (
                <li key={it.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{it.name}</span>
                  <span className="text-red-500 text-xs">
                    丢弃 {it.discarded} 次{it.discardedValue > 0 ? ` · 约 ¥${it.discardedValue}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mt-3">建议：减少这些食材的单次采购量，或改为更小包装。</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color = "text-gray-800" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
