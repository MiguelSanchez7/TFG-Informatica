"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { demoUsers } from "@/data/mockUsers";
import type { AuthUser, RegisterUserInput } from "@/types/auth";

const USERS_STORAGE_KEY = "tfg-auth-users";

type AuthContextValue = {
  users: AuthUser[];
  initialized: boolean;
  registerUser: (
    input: RegisterUserInput,
  ) => { success: true } | { success: false; error: string };
  authenticate: (username: string, password: string) => AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sanitizeUsers(rawUsers: unknown): AuthUser[] {
  if (!Array.isArray(rawUsers)) {
    return demoUsers;
  }

  const validUsers: AuthUser[] = [];
  for (const entry of rawUsers) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as AuthUser).username === "string" &&
      typeof (entry as AuthUser).password === "string" &&
      typeof (entry as AuthUser).name === "string" &&
      typeof (entry as AuthUser).role === "string"
    ) {
      validUsers.push({
        username: (entry as AuthUser).username,
        password: (entry as AuthUser).password,
        name: (entry as AuthUser).name,
        role: (entry as AuthUser).role,
      });
    }
  }

  return validUsers.length > 0 ? validUsers : demoUsers;
}

function persistUsers(users: AuthUser[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error("No se pudo persistir la lista de usuarios", error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AuthUser[]>(demoUsers);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedUsers = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!storedUsers) {
      persistUsers(demoUsers);
      setUsers(demoUsers);
      setInitialized(true);
      return;
    }

    try {
      const parsed = JSON.parse(storedUsers);
      const sanitized = sanitizeUsers(parsed);
      setUsers(sanitized);
    } catch (error) {
      console.error("No se pudo leer la lista de usuarios, restaurando los de demo", error);
      setUsers(demoUsers);
      persistUsers(demoUsers);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    persistUsers(users);
  }, [users, initialized]);

  const registerUser = useCallback<AuthContextValue["registerUser"]>((input) => {
    const trimmedName = input.name.trim();
    const trimmedUsername = input.username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    if (!normalizedUsername) {
      return { success: false, error: "El usuario es obligatorio" };
    }

    if (!trimmedName) {
      return {
        success: false,
        error: "Introduce tu nombre para personalizar la experiencia.",
      };
    }

    let alreadyExists = false;

    setUsers((prev) => {
      alreadyExists = prev.some(
        (user) => user.username.trim().toLowerCase() === normalizedUsername,
      );

      if (alreadyExists) {
        return prev;
      }

      const newUser: AuthUser = {
        username: trimmedUsername,
        password: input.password,
        name: trimmedName,
        role: input.role,
      };

      return [...prev, newUser];
    });

    if (alreadyExists) {
      return {
        success: false,
        error: "Este usuario ya está registrado. Prueba con otro nombre.",
      };
    }

    return { success: true };
  }, []);

  const authenticate = useCallback<AuthContextValue["authenticate"]>(
    (username, password) => {
      const normalizedUsername = username.trim().toLowerCase();
      if (!normalizedUsername || !password) {
        return null;
      }

      const matchedUser = users.find(
        (user) =>
          user.username.trim().toLowerCase() === normalizedUsername &&
          user.password === password,
      );

      return matchedUser ?? null;
    },
    [users],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ users, initialized, registerUser, authenticate }),
    [users, initialized, registerUser, authenticate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }

  return context;
}
