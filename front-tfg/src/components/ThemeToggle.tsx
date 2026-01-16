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
    "inline-flex items-center justify-center rounded-full w-9 h-9 text-sm " +
    "select-none transition cursor-pointer focus:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[.97] " +
    "focus-visible:ring-sky-400/80 focus-visible:ring-offset-slate-100 " +
    "dark:focus-visible:ring-offset-[#020617]";

  const light =
    "text-slate-800 border border-slate-300 bg-white hover:bg-slate-100";
  const dark =
    "text-slate-100 border border-slate-600 bg-slate-800 hover:bg-slate-700";

  return (
    <button
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={`Cambiar a modo ${isDark ? "claro" : "oscuro"}`}
      className={`${base} ${isDark ? dark : light}`}
    >
      {/* Sol / Luna “serios” en SVG */}
      {isDark ? (
        // Luna
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z"
            fill="currentColor"
          />
        </svg>
      ) : (
        // Sol
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
            <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
            <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
          </g>
        </svg>
      )}
    </button>
  );
}
