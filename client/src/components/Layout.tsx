import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const navItems = [
  { to: "/", label: "食材", end: true },
  { to: "/add", label: "添加" },
  { to: "/scan", label: "扫码/小票" },
  { to: "/recipes", label: "菜谱" },
  { to: "/stats", label: "统计" },
  { to: "/household", label: "家庭" },
];

export default function Layout() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧊</span>
            <span className="font-semibold text-gray-800">冰箱食材管家</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="hidden sm:inline">{me?.household?.name}</span>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-gray-500 hover:text-gray-800"
            >
              退出登录
            </button>
          </div>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded-t-md border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-brand-600 text-brand-700 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
