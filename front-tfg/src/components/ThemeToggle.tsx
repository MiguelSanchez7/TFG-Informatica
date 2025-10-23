"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  if (!mounted) return null;

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
