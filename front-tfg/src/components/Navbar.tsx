"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserBadge from "./UserBadge";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const userLevel = Math.max(1, user?.level ?? 1);
  const scenariosUnlocked = userLevel >= 3;
  const showScenariosButton = user && pathname !== "/laboratorio";

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0a0f1f] border-b border-slate-300 dark:border-[#1e293b] shadow-sm">
      <div className="flex w-full items-center px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Volver al menu principal"
            title="Volver al menu principal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#334155] bg-[#1e293b] text-[#e5e7eb] shadow-sm transition hover:bg-[#334155] hover:border-[#475569]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 11 9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </Link>

          {showScenariosButton &&
            (scenariosUnlocked ? (
              <Link
                href="/laboratorio"
                className="inline-flex items-center justify-center cursor-pointer
                  px-4 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase
                  bg-[#1e293b] text-[#e5e7eb] border border-[#334155]
                  hover:bg-[#334155] hover:border-[#475569]
                  rounded-md shadow-sm transition-all duration-200"
              >
                Escenarios
              </Link>
            ) : (
              <span
                title="Escenarios se desbloquea al alcanzar el nivel 3"
                className="inline-flex items-center justify-center
                  px-4 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase
                  bg-[#111827] text-[#94a3b8] border border-[#243244]
                  rounded-md shadow-sm opacity-75"
              >
                Escenarios - Lvl 3
              </span>
            ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {!user && (
            <>
              <Link
                href="/login"
                className="inline-flex items-center justify-center cursor-pointer
                  px-4 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase
                  bg-[#1e293b] text-[#e5e7eb] border border-[#334155]
                  hover:bg-[#334155] hover:border-[#475569]
                  rounded-md shadow-sm transition-all duration-200"
              >
                Iniciar sesion
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center justify-center cursor-pointer
                  px-4 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase
                  bg-[#1e293b] text-[#e5e7eb] border border-[#334155]
                  hover:bg-[#334155] hover:border-[#475569]
                  rounded-md shadow-sm transition-all duration-200"
              >
                Registrarse
              </Link>
            </>
          )}

          {user && <UserBadge />}
        </div>
      </div>
    </nav>
  );
}
