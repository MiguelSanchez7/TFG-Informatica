"use client";

import { useEffect } from "react";

export default function ThemeToggle() {
  const isClient = typeof window !== "undefined";

  useEffect(() => {
    if (!isClient) return;
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, [isClient]);

  if (!isClient) return null;

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  return (
    <button onClick={toggle} className="rounded-xl border px-3 py-1.5 text-sm hover:bg-white/60 dark:hover:bg-white/10">
      Modo {document.documentElement.classList.contains("dark") ? "claro" : "oscuro"}
    </button>
  );
}
