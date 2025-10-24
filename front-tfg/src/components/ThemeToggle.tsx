"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    const darkMode = initial === "dark";
    document.documentElement.classList.toggle("dark", darkMode);
    setIsDark(darkMode);
  }, []);

  if (!mounted) return null;

  const toggle = () => {
    const newIsDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    setIsDark(newIsDark);
  };

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm " +
    "select-none transition cursor-pointer focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[.98] " +
    "whitespace-nowrap w-[122px] flex-shrink-0"; // <- ancho fijo + no encoge

  const light =
    "text-white border border-white/25 bg-white/5 hover:bg-white/15 " +
    "focus-visible:ring-white/60 focus-visible:ring-offset-[#0f172a]";

  const dark =
    "text-[#0f172a] border border-black/15 bg-white hover:bg-slate-100 " +
    "focus-visible:ring-[#0f172a]/40 focus-visible:ring-offset-white";

  return (
    <button
      onClick={toggle}
      aria-pressed={isDark}
      title={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      className={`${base} ${isDark ? dark : light}`}
    >
      {isDark ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
