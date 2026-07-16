import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { Household } from "../lib/types";
import { disablePush, enablePush, getPushStatus, pushSupported } from "../lib/push";

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    getPushStatus().then((s) => setPushSubscribed(s.subscribed));
  }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushSubscribed) {
        await disablePush();
        setPushSubscribed(false);
      } else {
        const result = await enablePush();
        if (result.ok) setPushSubscribed(true);
        else setPushError(result.error || "开启失败");
      }
    } catch {
      setPushError("开启失败，请重试");
    } finally {
      setPushBusy(false);
    }
  }

  function load() {
    setLoading(true);
    api
      .get<{ household: Household }>("/household")
      .then((d) => {
        setHousehold(d.household);
        setName(d.household.name);
      })
      .catch(() => setError("加载家庭信息失败"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onRename(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put("/household", { name });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "保存失败");
    }
  }

  function copyInvite() {
    if (!household) return;
    navigator.clipboard.writeText(household.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading) return <p className="text-sm text-gray-500">加载中...</p>;
  if (!household) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-800 mb-4">家庭设置</h1>
        <form onSubmit={onRename} className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
          <label className="block text-sm text-gray-600">家庭名称</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-md">保存</button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-2">邀请家人加入</h2>
        <p className="text-xs text-gray-500 mb-3">分享下方邀请码，家人注册时选择"加入已有家庭"并输入即可共享同一个食材库存。</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-mono tracking-widest bg-gray-50 border border-gray-200 rounded-md px-4 py-2">
            {household.inviteCode}
          </span>
          <button onClick={copyInvite} className="text-sm text-brand-600 hover:underline">
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-2">到期提醒推送</h2>
        {!pushSupported() ? (
          <p className="text-xs text-gray-400">当前浏览器不支持推送通知。</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-3">
              开启后，浏览器会在食材即将过期或已过期时推送提醒。
              <br />
              iPhone 用户请注意：iOS 上必须先通过 Safari 的"分享 → 添加到主屏幕"把本应用安装到主屏幕，
              并从主屏幕图标打开后再开启推送，直接在 Safari 网页标签页里是无法收到推送的（这是 iOS 的系统限制，不是本应用的问题）。
            </p>
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className={`text-sm px-3 py-1.5 rounded-md ${
                pushSubscribed ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-brand-600 hover:bg-brand-700 text-white"
              } disabled:opacity-60`}
            >
              {pushBusy ? "处理中..." : pushSubscribed ? "关闭推送提醒" : "开启推送提醒"}
            </button>
            {pushError && <p className="text-sm text-amber-600 mt-2">{pushError}</p>}
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-2">家庭成员（{household.members.length}）</h2>
        <ul className="space-y-1">
          {household.members.map((m) => (
            <li key={m.id} className="text-sm text-gray-600 flex justify-between">
              <span>{m.name}</span>
              <span className="text-gray-400">{m.email}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
