// src/app/profile/page.tsx
"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import Image from "next/image";

type ProfileTab = "datos" | "logros" | "otro";

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("datos");

  const displayName = user?.username || user?.email || "Inversor";
  const level = user?.level ?? 1;
  const levelName = user?.level_name ?? "Novato";
  const xp = user?.xp ?? 0;
  const xpInLevel = user?.xp_in_level ?? xp;
  const xpForNextLevel = user?.xp_for_next_level ?? 100;
  const xpToNextLevel = user?.xp_to_next_level ?? 100;
  const progress = user?.level_progress ?? 0;

  const email = user?.email ?? "usuario@ejemplo.com";
  const country = user?.country ?? "España";
  const investorType = user?.investorType ?? "Principiante";
  const riskProfile = user?.riskProfile ?? "Moderado";
  const signupDate = user?.created_at ?? "12/03/2025";

  return (
    <main className="relative min-h-screen bg-[#020617] text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        {/* HEADER CON IMAGEN DE FONDO */}
        <section className="relative overflow-hidden rounded-2xl border border-[#1f2937] bg-[#020617] mb-8">

          {/* IMAGEN DE FONDO */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/profile-bg.jpg"
              alt="Gráfico de velas"
              fill
              className="object-cover opacity-55 blur-[1px] scale-150"
              priority
            />
          </div>

          {/* CAPA OSCURA PARA DAR ELEGANCIA */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-[#020617]/90" />

          {/* CONTENIDO */}
          <div className="relative px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col items-center gap-4">

              {/* AVATAR POR DEFECTO */}
              <div className="h-20 w-20 rounded-full border-2 border-[#38bdf8] bg-[#0f172a] flex items-center justify-center shadow-lg">
                {/* Icono de usuario */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10 text-[#38bdf8]"
                >
                  <path
                    fill="currentColor"
                    d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z"
                  />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-sm text-[#94a3b8]">Perfil de usuario</p>
                <h1 className="text-xl sm:text-2xl font-semibold text-[#f9fafb]">
                  {displayName}
                </h1>
              </div>

              {/* PROGRESO DE XP */}
              <div className="w-full max-w-xl mt-2">
                <div className="flex items-center justify-between text-xs text-[#cbd5e1]/80 mb-1">
                  <span>
                    Lvl. {level} - {levelName}
                  </span>
                  <span>{xpInLevel}/{xpForNextLevel || xpInLevel} XP</span>
                </div>

                <div className="h-2 rounded-full bg-[#020617] border border-[#1f2937] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#38bdf8] via-[#22c55e] to-[#facc15]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* BOTÓN EDITAR */}
            <button
              className="absolute right-4 top-4 sm:right-6 sm:top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1f2937] bg-[#020617]/70 hover:bg-[#0f172a] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-[#e5e7eb]"
              >
                <path
                  d="M4 20h4l9-9-4-4L4 16v4z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 6l4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </section>

        {/* PESTAÑAS */}
        <section className="rounded-2xl border border-[#1f2937] bg-[#020617]/80">
          <div className="flex border-b border-[#1f2937] text-xs sm:text-sm">
            <button
              onClick={() => setTab("datos")}
              className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 ${
                tab === "datos"
                  ? "text-[#e5e7eb] border-b-2 border-[#38bdf8]"
                  : "text-[#94a3b8] hover:bg-[#0f1120]"
              }`}
            >
              Datos personales
            </button>

            <button
              onClick={() => setTab("logros")}
              className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 ${
                tab === "logros"
                  ? "text-[#e5e7eb] border-b-2 border-[#38bdf8]"
                  : "text-[#94a3b8] hover:bg-[#0f1120]"
              }`}
            >
              Historial de logros
            </button>

            <button
              onClick={() => setTab("otro")}
              className={`flex-1 px-4 py-2 sm:px-6 sm:py-3 ${
                tab === "otro"
                  ? "text-[#e5e7eb] border-b-2 border-[#38bdf8]"
                  : "text-[#94a3b8] hover:bg-[#0f1120]"
              }`}
            >
              Próximas funciones
            </button>
          </div>

          {/* CONTENIDO PESTAÑAS */}
          <div className="px-4 py-4 sm:px-6 sm:py-6">

            {/* DATOS PERSONALES */}
            {tab === "datos" && (
              <div className="space-y-5 text-sm">
                <p className="text-[#cbd5e1]/80">
                  Información básica de tu cuenta.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <DataItem label="Nombre de usuario" value={displayName} />
                  <DataItem label="Email" value={email} />
                  <DataItem label="País" value={country} />
                  <DataItem label="Tipo de inversor" value={investorType} />
                  <DataItem label="Perfil de riesgo" value={riskProfile} />
                  <DataItem label="Fecha de registro" value={signupDate} />
                  <DataItem label="Nivel actual" value={`Lvl. ${level} - ${levelName}`} />
                  <DataItem label="XP total" value={`${xp} XP`} />
                  <DataItem label="XP para el siguiente nivel" value={`${xpToNextLevel} XP`} />
                </div>

                <button
                  className="mt-4 inline-flex items-center rounded-md border border-[#1f2937] bg-[#020617] px-4 py-2 hover:bg-[#0b1120] transition-all"
                >
                  Cambiar contraseña
                </button>
              </div>
            )}

            {/* LOGROS */}
            {tab === "logros" && (
              <div className="space-y-3 text-sm">
                <Achievement title="Primer reto completado" date="15/02/2025" />
                <Achievement title="10 decisiones correctas seguidas" date="03/03/2025" />
                <Achievement title="Primer uso del laboratorio de riesgo" date="21/03/2025" />
              </div>
            )}

            {/* OTRO */}
            {tab === "otro" && (
              <p className="text-[#cbd5e1]/80 text-sm">
                Próximas funciones del TFG aparecerán aquí.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* --- COMPONENTES AUXILIARES --- */

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[#94a3b8]">{label}</p>
      <p className="rounded-md border border-[#1f2937] bg-[#020617] px-3 py-2">
        {value}
      </p>
    </div>
  );
}

function Achievement({ title, date }: { title: string; date: string }) {
  return (
    <div className="rounded-md border border-[#1f2937] bg-[#020617] px-3 py-2 flex justify-between text-sm">
      <span>{title}</span>
      <span className="text-[#94a3b8] text-xs">{date}</span>
    </div>
  );
}
