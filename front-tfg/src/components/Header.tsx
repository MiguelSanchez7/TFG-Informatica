"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-[#0b1020]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-2xl bg-brand-600 ring-4 ring-brand-100/60 dark:ring-white/10" />
          <span className="font-semibold">TFG · Inversión con IA</span>
        </Link>
        <div className="flex items-center gap-2">
          <Navbar />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
