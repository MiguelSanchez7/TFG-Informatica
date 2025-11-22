// src/app/retos-historicos/page.tsx
import Link from "next/link";

const retos = [
  {
    id: 1,
    titulo: "Crisis financiera 2008",
    periodo: "2007–2009",
    nivel: "Intermedio",
    descripcion:
      "Pon a prueba tu gestión del riesgo en uno de los periodos más volátiles de la historia reciente. Decide cuándo entrar, cuándo salir y cómo ajustar el tamaño de posición.",
  },
  {
    id: 2,
    titulo: "COVID & crash 2020",
    periodo: "2020–2021",
    nivel: "Avanzado",
    descripcion:
      "Simula decisiones durante la caída brusca de marzo de 2020 y la posterior recuperación en V. Aprende a reaccionar ante noticias extremas y gaps de apertura.",
  },
  {
    id: 3,
    titulo: "Burbuja tecnológica",
    periodo: "1999–2001",
    nivel: "Avanzado",
    descripcion:
      "Vive la euforia de la burbuja puntocom y entrena cómo gestionar burbujas, momentum extremo y caídas prolongadas.",
  },
  {
    id: 4,
    titulo: "Régimen lateral prolongado",
    periodo: "Escenario sintético",
    nivel: "Principiante",
    descripcion:
      "Practica en un mercado aburrido y lateral, ideal para entender conceptos básicos de stops, objetivos y gestión del riesgo sin movimientos extremos.",
  },
];

export default function RetosHistoricosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-24 md:px-8">
        {/* Migas de pan + volver */}
        <div className="flex items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-slate-700 px-3 py-1 hover:bg-slate-800/60"
            >
              ← Volver al inicio
            </Link>
            <span className="hidden text-slate-600 md:inline">/</span>
            <span className="hidden text-slate-400 md:inline">
              Retos históricos
            </span>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
            Modo entrenamiento
          </span>
        </div>

        {/* Hero */}
        <section className="grid gap-10 md:grid-cols-[1.3fr,1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-emerald-300/80">
              TFG · RETOS HISTÓRICOS
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-50 md:text-4xl">
              Entrena tu toma de decisiones
              <span className="block text-slate-400">
                con datos de mercados reales
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">
              Elige un episodio histórico y simula tus decisiones de inversión
              con datos OHLCV reales. La plataforma te mostrará explicaciones
              XAI (SHAP/contrafactuales) y métricas de riesgo para cada
              decisión.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700 px-3 py-1">
                ⏱ Sesiones de 10–20 minutos
              </span>
              <span className="rounded-full border border-slate-700 px-3 py-1">
                📊 Datos diarios e intradía
              </span>
              <span className="rounded-full border border-slate-700 px-3 py-1">
                🔍 Enfoque en gestión de riesgo
              </span>
            </div>
          </div>

          {/* Panel lateral: resumen de progreso (placeholder) */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/30 p-5 shadow-xl shadow-black/40">
            <h2 className="text-sm font-semibold text-slate-100">
              Tu progreso en retos históricos
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Esta sección se puede conectar al perfil del usuario y mostrar su
              evolución.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Retos completados</span>
                <span className="font-semibold text-emerald-300">0 / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Drawdown máximo simulado</span>
                <span className="font-semibold text-slate-100">– %</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Racha de decisiones correctas</span>
                <span className="font-semibold text-slate-100">–</span>
              </div>
            </div>

            <button
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Empezar un reto aleatorio
            </button>
          </div>
        </section>

        {/* Lista de retos */}
        <section className="mt-4">
          <h2 className="text-lg font-semibold text-slate-100 md:text-xl">
            Escoge un reto para comenzar
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Cada reto carga una serie temporal distinta, junto con explicaciones
            XAI y un laboratorio de riesgo adaptado al escenario.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {retos.map((reto) => (
              <article
                key={reto.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-5 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-emerald-500/60 hover:bg-slate-900/80"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-50">
                      {reto.titulo}
                    </h3>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      {reto.nivel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Periodo: {reto.periodo}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    {reto.descripcion}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Datos: OHLCV + señales modelo
                  </span>
                  <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-950 transition group-hover:bg-emerald-400 group-hover:text-slate-950">
                    Abrir reto
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
