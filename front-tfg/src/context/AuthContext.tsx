"use client";

// src/context/AuthContext.tsx
// Contexto global que mantiene el usuario autenticado y funciones para login/registro/logout.
import { createContext, useContext, useState, ReactNode } from "react";

type Rol = "alumno" | "profesor";

type AuthUser = {
  id: number;
  nombre: string;
  rol: Rol;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  register: (nombre: string, password: string, rol: Rol) => Promise<AuthUser>;
  login: (nombre: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "tfg-auth-user";

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Ocurrió un error inesperado");
  }
  return data.user as AuthUser;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch (error) {
    console.warn("No se pudo parsear el usuario guardado", error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const loading = false;

  const persistUser = (nextUser: AuthUser | null) => {
    if (typeof window === "undefined") return;
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const register = async (nombre: string, password: string, rol: Rol) => {
    const user = await handleResponse(
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, password, rol }),
      })
    );
    setUser(user);
    persistUser(user);
    return user;
  };

  const login = async (nombre: string, password: string) => {
    const user = await handleResponse(
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, password }),
      })
    );
    setUser(user);
    persistUser(user);
    return user;
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
