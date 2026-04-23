"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import UserBadge from "./UserBadge";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const showScenariosButton = user && pathname !== "/laboratorio";

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0a0f1f] border-b border-slate-300 dark:border-[#1e293b] shadow-sm">
      <div className="flex w-full items-center px-4 sm:px-6 py-3">
        {/* IZQUIERDA */}
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Inicio">
            <Image
              src="/favicon.ico"
              alt="Logo TFG inversión"
              width={28}
              height={28}
              className="rounded"
            />
          </Link>
          {showScenariosButton && (
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
          )}

        </div>

        {/* DERECHA */}
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
                Iniciar sesión
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
