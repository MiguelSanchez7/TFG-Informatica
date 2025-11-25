// src/app/page.tsx
"use client";

import Link from "next/link";
import Navbar from "../components/Navbar";
import { TestSupabase } from "../components/TestSupabase";

export default function Home() {
  return (
    <main className="relative font-sans tracking-tight min-h-screen bg-[#020617] text-[#e5e7eb]">
      <Navbar />

      {/* Fondo azul marino muy sutil */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10rem] h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#0a0f1f]/30 to-[#1e293b]/20 blur-[100px]" />
        <div className="absolute right-[-6rem] bottom-[-6rem] h-[18rem] w-[18rem] rounded-full bg-gradient-to-tr from-[#111827]/20 to-[#0f172a]/30 blur-[100px]" />
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-5xl px-6 pt-28 pb-10 text-center">
        <p className="text-xs tracking-[0.25em] text-[#475569] dark:text-[#94a3b8] uppercase font-medium">
          TFG · Plataforma educativa con IA
        </p>

        <h1 className="mt-3 text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-[#f9fafb]">
          IA{" "}
          <span className="bg-gradient-to-r from-[#1e293b] via-[#0f172a] to-[#1e293b] bg-clip-text text-transparent">
            explicativa
          </span>{" "}
          y{" "}
          <span className="bg-gradient-to-r from-[#1e293b] via-[#111827] to-[#0f172a] bg-clip-text text-transparent">
            generativa
          </span>{" "}
          aplicada a la inversión
        </h1>

        <p className="mx-auto mt-5 max-w-3xl text-lg md:text-xl text-[#cbd5e1]/80 font-light">
          Entrena con retos históricos, entiende las señales con XAI (SHAP/contrafactuales) y practica gestión de riesgo en un entorno seguro.
        </p>

        {/* Botones principales del hero */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/principiante"
            className="btn-hero inline-flex w-full sm:w-auto items-center justify-center px-8 py-4 text-[15px] font-medium tracking-wide uppercase bg-[#0f172a] text-white border border-[#1e293b] hover:bg-[#1e293b] hover:border-[#334155] transition-all duration-200 rounded-md shadow-sm"
          >
            Modo principiante
          </Link>

          <Link
            href="/avanzado"
            className="btn-hero inline-flex w-full sm:w-auto items-center justify-center px-8 py-4 text-[15px] font-medium tracking-wide uppercase bg-[#111827] text-[#e2e8f0] border border-[#334155] hover:bg-[#1e293b] hover:text-white hover:border-[#475569] transition-all duration-200 rounded-md shadow-sm"
          >
            Modo avanzado
          </Link>
        </div>
      </section>

      {/* Sección de módulos */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              href: "/retos-historicos",
              title: "Retos históricos",
              desc: "Decide comprar/evitar con datos hasta la fecha T. Sin fuga de futuro.",
              cta: "Explorar →",
            },
            {
              href: "/xai",
              title: "Explicaciones XAI",
              desc: "Top señales a favor/en contra, confianza y contrafactuales simples.",
              cta: "Ver señales →",
            },
            {
              href: "/riesgo",
              title: "Laboratorio de riesgo",
              desc: "Simula stop/objetivo, payoff y drawdown esperado con sliders.",
              cta: "Simular →",
            },
          ].map((card, i) => (
            <Link
              key={i}
              href={card.href}
              className="group relative overflow-hidden rounded-xl p-6 bg-[#0f172a]/40 border border-[#1f2937] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-gradient-to-b before:from-[#1e293b] before:via-[#334155] before:to-[#1e293b] before:opacity-70 group-hover:before:opacity-100"
            >
              <h3 className="pl-4 text-lg font-semibold text-[#f9fafb]">{card.title}</h3>
              <p className="pl-4 mt-2 text-sm font-light text-[#cbd5e1]/80">{card.desc}</p>
              <span className="pl-4 mt-4 inline-block text-sm font-medium text-[#e5e7eb] group-hover:underline underline-offset-4">
                {card.cta}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <TestSupabase />
    </main>
  );
}
