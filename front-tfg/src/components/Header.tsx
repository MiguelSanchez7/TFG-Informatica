"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header
      className="
        site-header
        sticky top-0 z-40 w-full border-b backdrop-blur transition-colors
        bg-[#0f172a] text-white border-white/10                  /* MODO CLARO */
        dark:bg-[#e5e7eb] dark:text-[#0f172a] dark:border-black/10   /* MODO OSCURO — gris claro */
      "
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        {/* Logo + Título */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="
              logo-dot h-8 w-8 rounded-full transition-colors
              bg-white ring-4 ring-white/30
              dark:bg-[#0f172a] dark:ring-[#64748b]/60
            "
          />
          <span className="font-semibold transition-colors">
            TFG · Inversión con IA
          </span>
        </Link>

        {/* Navegación + Botón modo */}
        <div className="flex items-center gap-2">
          <Navbar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
