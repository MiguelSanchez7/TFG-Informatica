// src/components/UserBadge.tsx
"use client";

import { useAuth } from "../context/AuthContext";

export default function UserBadge() {
  const { user, logout } = useAuth();

  // Sin sesión → solo icono genérico
  if (!user) {
    return (
      <div
        className="flex items-center justify-center w-9 h-9 rounded-full
                   border border-[#334155] bg-[#020617]/60 text-[#e5e7eb]
                   shadow-sm"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-3.33 0-6 1.34-6 3v1h12v-1c0-1.66-2.67-3-6-3Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  // Con sesión
  const initial = user.username?.charAt(0).toUpperCase() ?? "?";

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-[#020617]/80
                 border border-[#334155] px-3 py-1.5 shadow-sm"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e293b] text-sm font-semibold text-[#e5e7eb]">
        {initial}
      </div>
      <div className="hidden sm:flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
          Conectado
        </span>
        <span className="text-sm text-[#e5e7eb]">{user.username}</span>
      </div>
      <button
        type="button"
        onClick={logout}
        className="ml-1 text-[10px] text-[#9ca3af] hover:text-[#e5e7eb] uppercase tracking-[0.18em]"
      >
        Salir
      </button>
    </div>
  );
}
