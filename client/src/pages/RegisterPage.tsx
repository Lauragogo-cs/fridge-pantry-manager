import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { ApiError } from "../lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({ email, password, name, mode, householdName, inviteCode });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "注册失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🧊</div>
          <h1 className="text-lg font-semibold text-gray-800">创建账号</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">昵称</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">邮箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码（至少6位）</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex-1 py-2 ${mode === "create" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
            >
              新建家庭
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex-1 py-2 ${mode === "join" ? "bg-brand-600 text-white" : "bg-white text-gray-600"}`}
            >
              加入已有家庭
            </button>
          </div>

          {mode === "create" ? (
            <div>
              <label className="block text-sm text-gray-600 mb-1">家庭名称（可选）</label>
              <input
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="例如：我家"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-600 mb-1">邀请码</label>
              <input
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="6位邀请码"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-md transition"
          >
            {busy ? "提交中..." : "注册"}
          </button>
        </form>
        <p className="text-sm text-gray-500 text-center mt-4">
          已有账号？{" "}
          <Link to="/login" className="text-brand-600 hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
