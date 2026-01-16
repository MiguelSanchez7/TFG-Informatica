// src/components/UserBadge.tsx
"use client";

import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function UserBadge() {
  const { user, logout } = useAuth();

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

  const initial = user.username?.charAt(0).toUpperCase() ?? "?";
  const avatar = user.avatar_url; // ← FOTO DE PERFIL

  return (
    <div
      className="flex items-center gap-2 rounded-full bg-[#020617]/80
                 border border-[#334155] px-3 py-1.5 shadow-sm"
    >
      {/* FOTO o INICIAL (link al perfil) */}
      <Link
        href="/profile"
        className="flex items-center justify-center w-8 h-8 rounded-full
                   bg-[#1e293b] text-sm font-semibold text-[#e5e7eb]
                   hover:bg-[#111827] transition overflow-hidden"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </Link>

      {/* Texto de usuario */}
      <div className="hidden sm:flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af]">
          Conectado
        </span>
        <span className="text-sm text-[#e5e7eb]">{user.username}</span>
      </div>

      {/* Botón salir */}
      <button
        type="button"
        onClick={logout}
        className="ml-1 text-[10px] text-[#9ca3af] hover:text-[#e5e7eb] uppercase tracking-[0.18em] cursor-pointer"
      >
        Salir
      </button>
    </div>
  );
}
