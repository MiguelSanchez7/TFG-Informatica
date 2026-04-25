"use client";

// src/app/retos-historicos/page.tsx
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

const retos = [
  {
    id: "mercado-lateral",
    titulo: "Mercado lateral prolongado",
    periodo: "2015-2016",
    dificultad: "Principiante",
    requiredLevel: 2,
    foco: "Paciencia, stops y operaciones sin tendencia",
    contexto:
      "No todos los mercados son dramaticos. En fases laterales el precio se mueve sin direccion clara y las operaciones impulsivas suelen desgastar la cartera.",
    desafio:
      "Entrenaras la paciencia, el control del tamano de posicion y la decision de mantenerte fuera cuando la relacion riesgo-recompensa no acompana.",
  },
  {
    id: "crisis-2008",
    titulo: "Crisis financiera de 2008",
    periodo: "2009",
    dificultad: "Intermedio",
    requiredLevel: 5,
    foco: "Gestion de riesgo en caidas prolongadas",
    contexto:
      "El dataset disponible empieza en 2009, asi que este reto se centra en la fase posterior al gran shock financiero: un mercado todavia fragil, con volatilidad y recuperaciones dificiles de interpretar.",
    desafio:
      "Te enfrentaras a rebotes falsos, dudas sobre continuidad de tendencia y decisiones incomodas sobre reducir exposicion, mantener liquidez o intentar comprar debilidad.",
  },
  {
    id: "covid-2020",
    titulo: "Crash COVID y recuperacion",
    periodo: "2020",
    dificultad: "Avanzado",
    requiredLevel: 7,
    foco: "Volatilidad extrema y recuperacion rapida",
    contexto:
      "La pandemia provoca una venta acelerada en marzo de 2020 y despues una recuperacion muy vertical. El problema no es solo detectar la caida, sino no quedarse fuera del rebote.",
    desafio:
      "Practicaras decisiones bajo movimientos bruscos, senales contradictorias y cambios rapidos de regimen entre panico y apetito por riesgo.",
  },
  {
    id: "subidas-tipos-2022",
    titulo: "Mercado bajista por subidas de tipos",
    periodo: "2022",
    dificultad: "Avanzado",
    requiredLevel: 7,
    foco: "Cambio de regimen, inflacion y compresion de valoraciones",
    contexto:
      "En 2022 la inflacion y las subidas de tipos presionan especialmente a activos de crecimiento. El mercado alterna rebotes intensos con nuevas caidas.",
    desafio:
      "Tendras que distinguir rebotes tecnicos de cambios reales de tendencia y gestionar posiciones cuando el entorno macro deja de favorecer el riesgo.",
  },
].sort((a, b) => a.requiredLevel - b.requiredLevel);

const dificultadClass: Record<string, string> = {
  Principiante: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  Intermedio: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  Avanzado: "bg-amber-500/15 text-amber-200 border-amber-500/30",
};

export default function RetosHistoricosPage() {
  const { user } = useAuth();
  const userLevel = Math.max(1, user?.level ?? 1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-24 md:px-8">
        <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-slate-700 px-3 py-2 hover:bg-slate-800/60"
            >
              Volver al inicio
            </Link>
            <span className="hidden text-slate-600 md:inline">/</span>
            <span className="hidden text-slate-400 md:inline">
              Retos historicos
            </span>
          </div>
          <span className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300">
            Nivel actual: {userLevel}
          </span>
        </div>

        <section className="grid gap-8 md:grid-cols-[1.2fr,0.8fr] md:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-emerald-300/80">
              TFG - RETOS HISTORICOS
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-50 md:text-4xl">
              Desbloquea retos por nivel y practica episodios concretos.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Cada reto carga un escenario real dentro del periodo historico del
              episodio. Si eliges COVID, el simulador arrancara en fechas de
              2020; si eliges un reto lateral, usara un tramo de mercado lateral.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Desbloqueo por dificultad
            </h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>Nivel 2: retos principiantes.</p>
              <p>Nivel 5: retos intermedios.</p>
              <p>Nivel 7: retos avanzados.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100 md:text-xl">
            Retos disponibles
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Estan ordenados de menor a mayor dificultad.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {retos.map((reto) => {
              const unlocked = userLevel >= reto.requiredLevel;

              return (
                <article
                  key={reto.id}
                  className={`flex flex-col rounded-lg border p-5 shadow-lg shadow-black/25 transition ${
                    unlocked
                      ? "border-slate-800 bg-slate-900/50 hover:border-emerald-500/60 hover:bg-slate-900/80"
                      : "border-slate-800 bg-slate-900/25 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-50">
                        {reto.titulo}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Periodo: {reto.periodo}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          dificultadClass[reto.dificultad]
                        }`}
                      >
                        {reto.dificultad}
                      </span>
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Lvl {reto.requiredLevel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                      Contexto historico
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {reto.contexto}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      A que te enfrentaras
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {reto.desafio}
                    </p>
                  </div>

                  <div className="mt-4 rounded-md border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
                    <span className="font-semibold text-slate-100">Foco:</span>{" "}
                    {reto.foco}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {unlocked
                        ? "Carga un escenario acorde al periodo"
                        : `Se desbloquea en nivel ${reto.requiredLevel}`}
                    </span>
                    {unlocked ? (
                      <Link
                        href={`/laboratorio?reto=${reto.id}`}
                        className="rounded-md bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                      >
                        Practicar reto
                      </Link>
                    ) : (
                      <span className="rounded-md border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-500">
                        Bloqueado
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
