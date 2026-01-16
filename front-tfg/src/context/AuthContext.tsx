"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  points?: number | null;
  level?: number | null;
  role?: string | null;
  name?: string | null;
  surname?: string | null;
  country?: string | null;
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

  // cargar usuario desde localStorage al iniciar
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("tfg-user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem("tfg-user");
      }
    }
  }, []);

  // guardar usuario en localStorage cuando cambie
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem("tfg-user", JSON.stringify(user));
    } else {
      window.localStorage.removeItem("tfg-user");
    }
  }, [user]);

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
