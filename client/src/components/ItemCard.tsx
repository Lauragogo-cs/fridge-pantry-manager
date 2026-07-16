import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LEVEL_LABELS, type FoodItem, type FoodLevel } from "../lib/types";
import { expiryLabel, expiryLevel, levelStyles } from "../lib/expiry";

interface Props {
  item: FoodItem;
  onConsume: (id: string, action: "consumed" | "discarded") => void;
  onSetLevel: (id: string, level: FoodLevel) => void;
  onDelete: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export default function ItemCard({ item, onConsume, onSetLevel, onDelete }: Props) {
  const expLevel = expiryLevel(item.expiryDate);
  const style = levelStyles[expLevel];
  const isLevelMode = item.trackingMode === "level";

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (isLevelMode) return; // swipe gesture only applies to quantity-tracked items
    startX.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || startX.current === null) return;
    const delta = e.clientX - startX.current;
    setDragX(Math.max(-140, Math.min(140, delta)));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) onConsume(item.id, "consumed");
    else if (dragX < -SWIPE_THRESHOLD) onConsume(item.id, "discarded");
    setDragX(0);
    startX.current = null;
  }

  return (
    <div className={`relative rounded-lg border overflow-hidden ${style.card}`}>
      {!isLevelMode && (
        <div className="absolute inset-0 z-0 flex items-stretch text-sm font-medium text-white">
          <div className="flex-1 bg-emerald-500 flex items-center pl-4">吃完了 →</div>
          <div className="flex-1 bg-gray-500 flex items-center justify-end pr-4">← 丢弃</div>
        </div>
      )}

      <div
        className={`relative z-10 bg-inherit p-4 flex flex-col gap-2 select-none ${!isLevelMode ? "touch-pan-y" : ""}`}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${style.dot}`} />
              <h3 className="font-medium text-gray-800">{item.name}</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {item.category} · {item.location} ·{" "}
              {isLevelMode ? LEVEL_LABELS[item.level || "plenty"] : `${item.quantity}${item.unit}`}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${style.badge}`}>
            {expiryLabel(item.expiryDate)}
          </span>
        </div>
        {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}

        {isLevelMode ? (
          <div className="flex items-center gap-2 mt-1 text-sm">
            {(["plenty", "low", "out"] as FoodLevel[]).map((lv) => (
              <button
                key={lv}
                onClick={() => onSetLevel(item.id, lv)}
                className={`px-2.5 py-1 rounded-md border ${
                  item.level === lv ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"
                }`}
              >
                {LEVEL_LABELS[lv]}
              </button>
            ))}
            <Link to={`/edit/${item.id}`} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
              编辑
            </Link>
            <button onClick={() => onDelete(item.id)} className="ml-auto px-2.5 py-1 rounded-md text-red-500 hover:bg-red-50">
              删除
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1 text-sm">
            <button
              onClick={() => onConsume(item.id, "consumed")}
              className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100"
            >
              吃完了
            </button>
            <button
              onClick={() => onConsume(item.id, "discarded")}
              className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              丢弃
            </button>
            <Link to={`/edit/${item.id}`} className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200">
              编辑
            </Link>
            <button onClick={() => onDelete(item.id)} className="ml-auto px-2.5 py-1 rounded-md text-red-500 hover:bg-red-50">
              删除
            </button>
            <span className="hidden sm:inline text-xs text-gray-300 ml-1">（也可左右滑动）</span>
          </div>
        )}
      </div>
    </div>
  );
}
