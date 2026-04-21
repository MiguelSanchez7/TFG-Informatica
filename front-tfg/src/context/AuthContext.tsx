"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  xp?: number | null;
  level?: number | null;
  level_name?: string | null;
  level_min_xp?: number | null;
  next_level_xp?: number | null;
  next_level?: number | null;
  xp_in_level?: number | null;
  xp_for_next_level?: number | null;
  xp_to_next_level?: number | null;
  level_progress?: number | null;
  xpTarget?: number | null;
  role?: string | null;
  name?: string | null;
  surname?: string | null;
  country?: string | null;
  investorType?: string | null;
  riskProfile?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (u: AuthUser) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return ctx;
}
