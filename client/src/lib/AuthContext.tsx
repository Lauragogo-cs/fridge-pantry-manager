import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken } from "./api";
import type { Me } from "./types";

interface AuthContextValue {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    mode: "create" | "join";
    householdName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const hasToken = !!localStorage.getItem("fridge_token");
    if (!hasToken) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<Me>("/auth/me");
      setMe(data);
    } catch {
      setToken(null);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<{ token: string }>("/auth/login", { email, password });
      setToken(data.token);
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      name: string;
      mode: "create" | "join";
      householdName?: string;
      inviteCode?: string;
    }) => {
      const data = await api.post<{ token: string }>("/auth/register", payload);
      setToken(data.token);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
  }, []);

  return (
    <AuthContext.Provider value={{ me, loading, refresh, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
