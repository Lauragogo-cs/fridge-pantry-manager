import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../lib/api";

interface BarcodeResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
}

export default function ScanPage() {
  const [tab, setTab] = useState<"barcode" | "receipt">("barcode");
  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">扫码 / 小票识别</h1>
      <div className="flex gap-1 text-sm bg-white border border-gray-200 rounded-md p-1 w-fit mb-4">
        <button
          onClick={() => setTab("barcode")}
          className={`px-3 py-1.5 rounded ${tab === "barcode" ? "bg-brand-600 text-white" : "text-gray-500"}`}
        >
          条码扫描
        </button>
        <button
          onClick={() => setTab("receipt")}
          className={`px-3 py-1.5 rounded ${tab === "receipt" ? "bg-brand-600 text-white" : "text-gray-500"}`}
        >
          小票识别 (OCR)
        </button>
      </div>
      {tab === "barcode" ? <BarcodeTab /> : <ReceiptTab />}
    </div>
  );
}

function BarcodeTab() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function lookup(code: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await api.get<BarcodeResult>(`/barcode/${code}`);
      setResult(data);
    } catch {
      setError("查询商品信息失败（可能是网络问题），可手动填写食材信息");
      setResult({ found: false, barcode: code });
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    setError(null);
    setResult(null);
    if (!containerRef.current) return;
    const scanner = new Html5Qrcode(containerRef.current.id);
    scannerRef.current = scanner;
    try {
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await scanner.stop().catch(() => {});
          setScanning(false);
          lookup(decodedText);
        },
        undefined
      );
    } catch {
      setScanning(false);
      setError("无法打开摄像头，请检查浏览器权限，或使用下方手动输入条码");
    }
  }

  async function stopScan() {
    await scannerRef.current?.stop().catch(() => {});
    setScanning(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div id="barcode-reader" ref={containerRef} className="w-full rounded-md overflow-hidden bg-gray-100 min-h-[200px]" />

      <div className="flex gap-2">
        {!scanning ? (
          <button onClick={startScan} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-md">
            开始扫描
          </button>
        ) : (
          <button onClick={stopScan} className="bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-md">
            停止扫描
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="或手动输入条码数字"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          disabled={!manualCode || busy}
          onClick={() => lookup(manualCode)}
          className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-3 py-2 rounded-md"
        >
          查询
        </button>
      </div>

      {busy && <p className="text-sm text-gray-500">查询中...</p>}
      {error && <p className="text-sm text-amber-600">{error}</p>}

      {result && (
        <div className="border border-gray-200 rounded-md p-3 flex gap-3 items-center">
          {result.imageUrl && <img src={result.imageUrl} alt="" className="w-14 h-14 object-cover rounded" />}
          <div className="flex-1 text-sm">
            <p className="font-medium text-gray-800">{result.found ? result.name || "（未知商品名）" : "未在开放数据库中找到该商品"}</p>
            <p className="text-gray-500 text-xs">{result.brand}</p>
            <p className="text-gray-400 text-xs">条码：{result.barcode}</p>
          </div>
          <button
            onClick={() =>
              navigate(`/add?barcode=${encodeURIComponent(result.barcode)}&name=${encodeURIComponent(result.name || "")}`)
            }
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap"
          >
            添加食材
          </button>
        </div>
      )}
    </div>
  );
}

function ReceiptTab() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRunning(true);
    setProgress(0);
    setError(null);
    setText("");
    setSelected(new Set());
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("chi_sim+eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const {
        data: { text: recognized },
      } = await worker.recognize(file);
      await worker.terminate();
      const cleaned = recognized.trim();
      setText(cleaned);
      // Pre-select every recognized line so a full receipt can be added in
      // one tap; the user can uncheck lines that aren't actual food items
      // (store name, totals, etc.) before adding.
      const lineCount = cleaned.split("\n").map((l) => l.trim()).filter(Boolean).length;
      setSelected(new Set(Array.from({ length: lineCount }, (_, i) => i)));
    } catch {
      setError("识别失败：首次使用需要联网下载识别模型，请检查网络后重试");
    } finally {
      setRunning(false);
    }
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function addSelected() {
    const names = lines.filter((_, i) => selected.has(i));
    if (names.length === 0) return;
    setBatchBusy(true);
    setError(null);
    try {
      await api.post("/items/batch", { items: names.map((name) => ({ name })) });
      navigate("/");
    } catch {
      setError("批量添加失败，请重试，或点击单行逐个添加");
    } finally {
      setBatchBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <p className="text-sm text-gray-500">
        拍照或上传购物小票，自动识别文字。识别结果仅供参考，请核对后再添加食材（首次使用需联网下载识别模型，约需十几秒到几十秒）。
      </p>
      <input type="file" accept="image/*" capture="environment" onChange={onFile} className="text-sm" />

      {running && (
        <div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">识别中 {progress}%</p>
        </div>
      )}
      {error && <p className="text-sm text-amber-600">{error}</p>}

      {lines.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              勾选下方识别到的行（去掉店名、总价等非食材行），一次性批量添加：
            </p>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setSelected(new Set(lines.map((_, i) => i)))} className="text-brand-600 hover:underline">
                全选
              </button>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:underline">
                清空
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {lines.map((line, i) => (
              <label
                key={i}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border cursor-pointer ${
                  selected.has(i) ? "border-brand-300 bg-brand-50" : "border-gray-200"
                }`}
              >
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="accent-brand-600" />
                <span className="flex-1">{line}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/add?name=${encodeURIComponent(line)}`);
                  }}
                  className="text-xs text-gray-400 hover:text-brand-600"
                >
                  单独编辑
                </button>
              </label>
            ))}
          </div>

          <button
            onClick={addSelected}
            disabled={selected.size === 0 || batchBusy}
            className="w-full mt-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-md"
          >
            {batchBusy ? "添加中..." : `批量添加已选 ${selected.size} 项`}
          </button>
          <p className="text-xs text-gray-400 mt-1">
            批量添加会用默认数量（1份）和按食材名猜测的保质期，添加后可在首页逐个编辑修正。
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full mt-3 rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      )}
    </div>
  );
}
