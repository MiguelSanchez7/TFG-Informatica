"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { addUserXp } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Option = {
  id: string;
  label: string;
};

type Question = {
  id: string;
  question: string;
  options: Option[];
  correctOptionId: string;
  explanation: string;
};

type LevelPlacement = {
  level: number;
  name: string;
  minXp: number;
  description: string;
};

const levelPlacements: LevelPlacement[] = [
  {
    level: 1,
    name: "Novato",
    minXp: 0,
    description: "Primer contacto con los retos de inversion.",
  },
  {
    level: 2,
    name: "Aprendiz",
    minXp: 100,
    description: "Empieza a reconocer patrones basicos.",
  },
  {
    level: 3,
    name: "Analista junior",
    minXp: 250,
    description: "Comprende indicadores y decisiones simples.",
  },
  {
    level: 4,
    name: "Estratega",
    minXp: 500,
    description: "Empieza a razonar con gestion de riesgo.",
  },
  {
    level: 5,
    name: "Analista",
    minXp: 900,
    description: "Evalua escenarios con mas consistencia.",
  },
  {
    level: 6,
    name: "Trader",
    minXp: 1400,
    description: "Toma decisiones con mayor criterio operativo.",
  },
  {
    level: 7,
    name: "Gestor de riesgo",
    minXp: 2100,
    description: "Prioriza riesgo, drawdown y tamano de posicion.",
  },
  {
    level: 8,
    name: "Quant junior",
    minXp: 3000,
    description: "Interpreta senales, metricas y modelos.",
  },
  {
    level: 9,
    name: "Experto",
    minXp: 4200,
    description: "Domina escenarios complejos.",
  },
  {
    level: 10,
    name: "Maestro",
    minXp: 6000,
    description: "Nivel avanzado de toma de decisiones.",
  },
];

const questions: Question[] = [
  {
    id: "q1",
    question: "Que relacion suele existir entre rentabilidad potencial y riesgo?",
    correctOptionId: "b",
    explanation:
      "Una mayor rentabilidad potencial normalmente exige aceptar mas incertidumbre o posibles perdidas.",
    options: [
      { id: "a", label: "Mas rentabilidad siempre implica menos riesgo" },
      { id: "b", label: "Mas rentabilidad potencial suele venir con mas riesgo" },
      { id: "c", label: "No existe ninguna relacion posible" },
    ],
  },
  {
    id: "q2",
    question: "Que busca una diversificacion bien planteada?",
    correctOptionId: "c",
    explanation:
      "Diversificar no es comprar muchas cosas al azar, sino reducir dependencia de una sola empresa, sector o factor.",
    options: [
      { id: "a", label: "Comprar muchas acciones del mismo sector" },
      { id: "b", label: "Eliminar todo el riesgo de mercado" },
      { id: "c", label: "Repartir riesgo entre activos que no dependan de lo mismo" },
    ],
  },
  {
    id: "q3",
    question: "Una tendencia alcista suele mostrar:",
    correctOptionId: "a",
    explanation:
      "Una estructura alcista suele tener maximos y minimos crecientes, aunque nunca garantiza continuidad.",
    options: [
      { id: "a", label: "Maximos y minimos crecientes" },
      { id: "b", label: "Maximos y minimos decrecientes" },
      { id: "c", label: "Precio sin rango ni direccion" },
    ],
  },
  {
    id: "q4",
    question: "Que indica la liquidez de un activo?",
    correctOptionId: "b",
    explanation:
      "La liquidez mide la facilidad para comprar o vender sin desplazar demasiado el precio.",
    options: [
      { id: "a", label: "La rentabilidad garantizada del activo" },
      { id: "b", label: "La facilidad para entrar o salir a un precio razonable" },
      { id: "c", label: "El dividendo exacto del proximo ano" },
    ],
  },
  {
    id: "q5",
    question: "Que es el RSI?",
    correctOptionId: "a",
    explanation:
      "El RSI es un indicador de momento. Puede sugerir sobrecompra o sobreventa, pero necesita contexto.",
    options: [
      { id: "a", label: "Un indicador de momento" },
      { id: "b", label: "Una medida contable de deuda" },
      { id: "c", label: "Una orden automatica de compra" },
    ],
  },
  {
    id: "q6",
    question: "Que compara la relacion riesgo-beneficio?",
    correctOptionId: "c",
    explanation:
      "Compara lo que se puede perder con lo que se aspira a ganar antes de abrir la operacion.",
    options: [
      { id: "a", label: "El volumen con el PER" },
      { id: "b", label: "La inflacion con los dividendos" },
      { id: "c", label: "La perdida posible con la ganancia potencial" },
    ],
  },
  {
    id: "q7",
    question: "Si una cartera cae de 10.000 a 8.000 euros, cual es su drawdown?",
    correctOptionId: "b",
    explanation:
      "La caida es de 2.000 sobre 10.000, por tanto el drawdown es del 20%.",
    options: [
      { id: "a", label: "2%" },
      { id: "b", label: "20%" },
      { id: "c", label: "25%" },
    ],
  },
  {
    id: "q8",
    question: "Por que importa el tamano de posicion?",
    correctOptionId: "a",
    explanation:
      "El tamano de posicion controla cuanto capital queda expuesto si la idea falla.",
    options: [
      { id: "a", label: "Porque limita cuanto puede danar una operacion a la cartera" },
      { id: "b", label: "Porque garantiza que una entrada sera rentable" },
      { id: "c", label: "Porque elimina la necesidad de stop" },
    ],
  },
  {
    id: "q9",
    question: "Que mide la varianza de una serie de rendimientos?",
    correctOptionId: "c",
    explanation:
      "La varianza mide dispersion respecto a la media elevando las diferencias al cuadrado.",
    options: [
      { id: "a", label: "Solo el rendimiento mas reciente" },
      { id: "b", label: "El beneficio por accion de una empresa" },
      { id: "c", label: "Cuanto se alejan los rendimientos de su media" },
    ],
  },
  {
    id: "q10",
    question: "Que problema puede tener un backtest demasiado ajustado al pasado?",
    correctOptionId: "b",
    explanation:
      "El sobreajuste puede hacer que una estrategia parezca muy buena en el historico y falle fuera de muestra.",
    options: [
      { id: "a", label: "Que sea imposible calcularlo" },
      { id: "b", label: "Que funcione en el pasado pero no generalice al futuro" },
      { id: "c", label: "Que elimine los costes reales de mercado" },
    ],
  },
  {
    id: "q11",
    question: "Que interpreta el ratio Sharpe?",
    correctOptionId: "a",
    explanation:
      "El Sharpe relaciona exceso de rentabilidad con volatilidad asumida para medir rendimiento ajustado al riesgo.",
    options: [
      { id: "a", label: "Rentabilidad ajustada por volatilidad" },
      { id: "b", label: "Solo la capitalizacion bursatil" },
      { id: "c", label: "El numero exacto de acciones negociadas" },
    ],
  },
  {
    id: "q12",
    question: "Que sugiere una beta superior a 1 frente al mercado?",
    correctOptionId: "c",
    explanation:
      "Una beta superior a 1 suele indicar mas sensibilidad al mercado, aunque es una medida historica.",
    options: [
      { id: "a", label: "Que el activo no se mueve" },
      { id: "b", label: "Que el activo no tiene riesgo sistematico" },
      { id: "c", label: "Que tiende a moverse mas que el mercado" },
    ],
  },
];

function placementFromScore(score: number): LevelPlacement {
  if (score >= 12) return levelPlacements[9];
  if (score >= 11) return levelPlacements[8];
  if (score >= 10) return levelPlacements[7];
  if (score >= 9) return levelPlacements[6];
  if (score >= 8) return levelPlacements[5];
  if (score >= 6) return levelPlacements[4];
  if (score >= 5) return levelPlacements[3];
  if (score >= 3) return levelPlacements[2];
  if (score >= 2) return levelPlacements[1];
  return levelPlacements[0];
}

export default function FinanceTestPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    placement: LevelPlacement;
    xpAdded: number;
  } | null>(null);

  const answeredCount = Object.keys(answers).length;
  const canSubmit = answeredCount === questions.length && !isSubmitting;
  const reviewedQuestions = useMemo(
    () =>
      questions.map((question) => ({
        ...question,
        selectedOptionId: answers[question.id],
        wasCorrect: answers[question.id] === question.correctOptionId,
      })),
    [answers]
  );

  function chooseAnswer(questionId: string, optionId: string) {
    if (result) return;
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  }

  async function submitTest() {
    if (!user?.id) {
      setError("Necesitas registrarte o iniciar sesion antes de hacer el test inicial.");
      return;
    }
    if (!canSubmit) {
      setError("Responde todas las preguntas antes de terminar el test.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const score = reviewedQuestions.filter((question) => question.wasCorrect).length;
    const placement = placementFromScore(score);
    const currentXp = Math.max(0, Number(user.xp ?? 0));
    const xpAdded = Math.max(0, placement.minXp - currentXp);

    try {
      const updatedUser = xpAdded > 0 ? await addUserXp(user.id, xpAdded) : user;
      setUser(updatedUser);
      setResult({ score, placement, xpAdded });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el resultado del test."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-[#e5e7eb] md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-lg border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
            Test inicial
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">
            Calibramos tu nivel de finanzas
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Este test coloca tu usuario en el nivel que mejor encaja con tus
            conocimientos actuales. No resta XP: solo te ahorra repetir contenido
            demasiado basico si ya vienes con experiencia.
          </p>
          <div className="mt-4 rounded-md border border-slate-700 bg-slate-950/50 p-3 text-sm text-slate-300">
            Progreso: {answeredCount}/{questions.length} respuestas
          </div>
        </header>

        {!user && (
          <section className="mt-6 rounded-lg border border-amber-500/50 bg-amber-950/25 p-5 text-sm text-amber-100">
            Necesitas una cuenta para guardar el resultado.{" "}
            <Link href="/register" className="font-semibold underline">
              Crear cuenta
            </Link>
          </section>
        )}

        {error && (
          <section className="mt-6 rounded-lg border border-rose-500/50 bg-rose-950/25 p-4 text-sm text-rose-100">
            {error}
          </section>
        )}

        {result ? (
          <section className="mt-6 rounded-lg border border-emerald-500/50 bg-emerald-950/25 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-200">
              Resultado guardado
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Nivel {result.placement.level}: {result.placement.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-emerald-50">
              Has acertado {result.score}/{questions.length}.{" "}
              {result.xpAdded > 0
                ? `Se han sumado ${result.xpAdded} XP para colocarte en este nivel.`
                : "Ya tenias XP suficiente para este nivel."}
            </p>
            <p className="mt-2 text-sm text-emerald-100/85">
              {result.placement.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Entrar a la app
              </button>
              <button
                type="button"
                onClick={() => router.push("/conceptos")}
                className="rounded-md border border-emerald-300/60 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/40"
              >
                Ir a conceptos
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {questions.map((question, index) => (
              <article
                key={question.id}
                className="rounded-lg border border-slate-800 bg-slate-900/55 p-5"
              >
                <p className="text-sm font-semibold text-white">
                  {index + 1}. {question.question}
                </p>
                <div className="mt-4 grid gap-2">
                  {question.options.map((option) => {
                    const checked = answers[question.id] === option.id;
                    return (
                      <label
                        key={option.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                          checked
                            ? "border-emerald-300 bg-emerald-900/30 text-white"
                            : "border-slate-700 bg-slate-950/30 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={checked}
                          onChange={() => chooseAnswer(question.id, option.id)}
                          className="h-4 w-4 accent-emerald-300"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}

            <div className="sticky bottom-0 rounded-lg border border-slate-700 bg-slate-950/95 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-300">
                  Respuestas: {answeredCount}/{questions.length}
                </p>
                <button
                  type="button"
                  onClick={submitTest}
                  disabled={!canSubmit || !user}
                  className="rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando nivel..." : "Terminar test inicial"}
                </button>
              </div>
            </div>
          </section>
        )}

        {result && (
          <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/45 p-5">
            <h2 className="text-lg font-semibold text-white">Revision rapida</h2>
            <div className="mt-4 space-y-3">
              {reviewedQuestions.map((question, index) => {
                const selected = question.options.find(
                  (option) => option.id === question.selectedOptionId
                );
                const correct = question.options.find(
                  (option) => option.id === question.correctOptionId
                );
                return (
                  <div
                    key={question.id}
                    className={`rounded-md border p-3 text-sm ${
                      question.wasCorrect
                        ? "border-emerald-500/40 bg-emerald-950/20"
                        : "border-rose-500/40 bg-rose-950/20"
                    }`}
                  >
                    <p className="font-semibold text-white">
                      {index + 1}. {question.question}
                    </p>
                    <p className="mt-2 text-slate-300">
                      Tu respuesta: {selected?.label ?? "Sin respuesta"}
                    </p>
                    {!question.wasCorrect && (
                      <p className="mt-1 text-emerald-200">
                        Correcta: {correct?.label}
                      </p>
                    )}
                    <p className="mt-2 text-slate-300">{question.explanation}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
