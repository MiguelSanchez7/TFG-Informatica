// src/app/page.tsx
"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { TestSupabase } from "../components/TestSupabase";

export default function Home() {
  const { user } = useAuth();

  if (!user) {
    return (
      <main className="relative font-sans tracking-tight min-h-screen bg-[#020617] text-[#e5e7eb]">
        <Navbar />

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 pb-16 pt-28">
          <section className="w-full max-w-3xl rounded-2xl border border-[#1f2937] bg-[#020617]/70 p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.55)]">
            <p className="text-xs tracking-[0.25em] text-[#64748b] uppercase font-medium">
              TFG · Plataforma educativa con IA
            </p>

            <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-[#f9fafb]">
              Empieza iniciando sesion
              <span className="block mt-1 bg-gradient-to-r from-[#38bdf8] via-[#22c55e] to-[#facc15] bg-clip-text text-transparent">
                o creando tu cuenta
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-[#cbd5e1]/80 font-light">
              Accede para guardar tu progreso, desbloquear niveles y continuar con
              retos historicos, teoria y laboratorio de estrategia.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-[#334155] bg-[#1e293b] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#e5e7eb] transition hover:bg-[#334155]"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-md border border-[#334155] bg-transparent px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-[#e5e7eb] transition hover:bg-[#111827]"
              >
                Registrarse
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const displayName = user?.username || user?.email || "Inversor";
  const level = user?.level ?? 1;
  const levelName = user?.level_name ?? "Novato";
  const xp = user?.xp ?? 0;
  const xpInLevel = user?.xp_in_level ?? xp;
  const xpForNextLevel = user?.xp_for_next_level ?? 100;
  const progress = user?.level_progress ?? 0;

  return (
    <main className="relative font-sans tracking-tight min-h-screen bg-[#020617] text-[#e5e7eb]">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-28 pb-16">
        {/* Cabecera principal */}
        <header className="text-center mb-10">
          <p className="text-xs tracking-[0.25em] text-[#64748b] uppercase font-medium">
            Hola, {displayName}
          </p>

          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-[#f9fafb]">
            Aprende a invertir de manera
            <span className="block mt-1 text-[#f9fafb]">
              sencilla y divertida
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg text-[#cbd5e1]/80 font-light">
            Descubre y entiende conceptos de inversión desde nivel básico a nivel experto.
            Entrena tus decisiones con datos históricos y disfruta del proceso en un entorno seguro.
          </p>

          {/* Barra de nivel / XP */}
          <div className="mt-6 mx-auto max-w-xl">
            <div className="flex items-center justify-between text-xs text-[#94a3b8] mb-1">
              <span>
                Lvl. {level} - {levelName}
              </span>
              <span>
                {xpInLevel}/{xpForNextLevel || xpInLevel} XP
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#020617] border border-[#1f2937] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#38bdf8] via-[#22c55e] to-[#facc15]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </header>

        {/* Tarjetas principales */}
        <section className="grid gap-6 md:grid-cols-3">
          {/* Retos históricos */}
          <Link
            href="/retos-historicos"
            className="group relative flex flex-col rounded-xl border border-[#1f2937] bg-[#020617]/60 px-6 py-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="mb-4 flex h-20 items-center justify-center">
              {/* Icono tipo velas */}
              <div className="relative h-14 w-14 rounded-lg border border-[#1f2937] bg-[#020617] flex items-end justify-center gap-1 px-2">
                <div className="w-1.5 h-6 bg-[#38bdf8] rounded-sm" />
                <div className="w-1.5 h-9 bg-[#22c55e] rounded-sm" />
                <div className="w-1.5 h-4 bg-[#f97316] rounded-sm" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-2 text-center md:text-left">
              Retos históricos
            </h2>
            <p className="text-sm text-[#cbd5e1]/80 mb-4 text-center md:text-left">
              Practica con datos históricos reales. Decide comprar, mantener o evitar sin fuga de futuro.
            </p>
            <span className="mt-auto text-sm font-medium text-[#e5e7eb] group-hover:underline underline-offset-4 text-center md:text-left">
              Ir a retos históricos →
            </span>
          </Link>

          {/* Aprende conceptos */}
          <Link
            href="/conceptos"
            className="group relative flex flex-col rounded-xl border border-[#1f2937] bg-[#020617]/60 px-6 py-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="mb-4 flex h-20 items-center justify-center">
              {/* Icono tipo pizarra */}
              <div className="relative h-14 w-16 rounded-lg border border-[#1f2937] bg-[#020617] flex items-center justify-center">
                <div className="absolute inset-2 border border-[#1f2937] rounded-md" />
                <div className="w-8 h-0.5 bg-[#38bdf8] absolute top-4 left-4" />
                <div className="w-5 h-0.5 bg-[#22c55e] absolute top-6 left-4" />
                <div className="w-3 h-0.5 bg-[#f97316] absolute top-8 left-4" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-2 text-center md:text-left">
              Aprende conceptos
            </h2>
            <p className="text-sm text-[#cbd5e1]/80 mb-4 text-center md:text-left">
              Revisa conceptos clave de inversión con ejemplos visuales y preguntas cortas para afianzar la teoría.
            </p>
            <span className="mt-auto text-sm font-medium text-[#e5e7eb] group-hover:underline underline-offset-4 text-center md:text-left">
              Ir a conceptos →
            </span>
          </Link>

          {/* Diseña tu estrategia */}
          <Link
            href="/estrategia"
            className="group relative flex flex-col rounded-xl border border-[#1f2937] bg-[#020617]/60 px-6 py-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="mb-4 flex h-20 items-center justify-center">
              {/* Icono tipo gráfico de línea */}
              <div className="relative h-14 w-16 rounded-lg border border-[#1f2937] bg-[#020617] flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-[#22c55e]"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="3 17 9 11 13 15 21 7"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-2 text-center md:text-left">
              Diseña tu estrategia
            </h2>
            <p className="text-sm text-[#cbd5e1]/80 mb-4 text-center md:text-left">
              Define tamaño de posición, stops y objetivos. Simula el impacto en tu curva de capital antes de ejecutar.
            </p>
            <span className="mt-auto text-sm font-medium text-[#e5e7eb] group-hover:underline underline-offset-4 text-center md:text-left">
              Ir al laboratorio de estrategia →
            </span>
          </Link>
        </section>

        {/* Solo para tus pruebas con Supabase */}
        <div className="mt-10">
          <TestSupabase />
        </div>
      </div>
    </main>
  );
}
