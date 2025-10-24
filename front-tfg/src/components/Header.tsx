"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const headerBase =
    "site-header sticky top-0 z-40 w-full border-b backdrop-blur transition-colors";
  const headerLight = "bg-[#0f172a] text-white border-white/10";
  const headerDark = "dark:bg-[#e5e7eb] dark:text-[#0f172a] dark:border-black/10";

  const logoBase =
    "logo-dot h-8 w-8 rounded-full transition-colors";
  const logoLight = "bg-white ring-4 ring-white/30";
  const logoDark =
    "dark:bg-[#0f172a] dark:ring-4 dark:ring-[rgba(0,0,0,.14)]";

  return (
    <header className={`${headerBase} ${headerLight} ${headerDark}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        {/* Logo + título */}
        <Link href="/" className="flex items-center gap-3">
          <div className={`${logoBase} ${logoLight} ${logoDark}`} />
          <span className="font-semibold transition-colors">
            TFG · Inversión con IA
          </span>
        </Link>

        {/* Nav + toggle */}
        <div className="flex items-center gap-2">
          <Navbar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
