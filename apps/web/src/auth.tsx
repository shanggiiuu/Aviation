import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { LoginInput, ProfileUpdate, RegisterInput, User } from "@aerolearn/shared";
import { api } from "./api";
import { STATIC } from "./config";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (i: LoginInput) => Promise<void>;
  register: (i: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  update: (u: ProfileUpdate) => Promise<void>;
  forget: () => void;
}
const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!STATIC);

  useEffect(() => {
    if (STATIC) return; // no server: everyone learns as a local guest
    api<{ user: User | null }>("/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (i: LoginInput) => setUser((await api<{ user: User }>("/auth/login", { method: "POST", body: i })).user), []);
  const register = useCallback(async (i: RegisterInput) => setUser((await api<{ user: User }>("/auth/register", { method: "POST", body: i })).user), []);
  const logout = useCallback(async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); setUser(null); }, []);
  const update = useCallback(async (u: ProfileUpdate) => setUser((await api<{ user: User }>("/me", { method: "PATCH", body: u })).user), []);
  const forget = useCallback(() => setUser(null), []);

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, update, forget }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
