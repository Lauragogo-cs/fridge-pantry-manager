import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface RecipeSuggestion {
  id: string;
  name: string;
  cookTimeMinutes: number;
  steps: string[];
  matchedIngredients: string[];
  matchedOptional: string[];
  missingIngredients: string[];
}

interface SuggestionsResponse {
  basedOn: string[];
  suggestions: RecipeSuggestion[];
}

export default function RecipesPage() {
  const [scope, setScope] = useState<"expiring" | "all">("expiring");
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<SuggestionsResponse>(`/recipes/suggestions?scope=${scope}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-800 mb-1">今天吃什么</h1>
      <p className="text-sm text-gray-500 mb-4">根据冰箱里快过期的食材推荐菜谱，尽量把它们用掉。</p>

      <div className="flex gap-1 text-sm bg-white border border-gray-200 rounded-md p-1 w-fit mb-4">
        <button
          onClick={() => setScope("expiring")}
          className={`px-3 py-1.5 rounded ${scope === "expiring" ? "bg-brand-600 text-white" : "text-gray-500"}`}
        >
          优先用掉快过期的
        </button>
        <button
          onClick={() => setScope("all")}
          className={`px-3 py-1.5 rounded ${scope === "all" ? "bg-brand-600 text-white" : "text-gray-500"}`}
        >
          看看现有食材能做什么
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">加载中...</p>}

      {!loading && data && data.basedOn.length === 0 && (
        <p className="text-sm text-gray-400">冰箱里还没有食材，先去添加一些吧。</p>
      )}

      {!loading && data && data.basedOn.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">参考食材：{data.basedOn.join("、")}</p>
          {data.suggestions.length === 0 ? (
            <p className="text-sm text-gray-400">暂时没有匹配的菜谱，试试切换到"看看现有食材能做什么"。</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.suggestions.map((r) => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800">{r.name}</h3>
                    <span className="text-xs text-gray-400">约 {r.cookTimeMinutes} 分钟</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    用到：
                    <span className="text-brand-700 font-medium">{r.matchedIngredients.join("、")}</span>
                    {r.matchedOptional.length > 0 && <span>（可加：{r.matchedOptional.join("、")}）</span>}
                  </p>
                  {r.missingIngredients.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">还需要：{r.missingIngredients.join("、")}</p>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="text-xs text-brand-600 hover:underline mt-2"
                  >
                    {expanded === r.id ? "收起做法" : "查看做法"}
                  </button>
                  {expanded === r.id && (
                    <ol className="list-decimal list-inside text-xs text-gray-600 mt-2 space-y-1">
                      {r.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
