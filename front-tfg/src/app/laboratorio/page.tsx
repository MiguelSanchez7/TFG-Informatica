"use client";

import { useState } from "react";
import { getRandomScenario, getScenarioById, revealScenario } from "@/lib/api";
import MarketChart from "@/components/marketchart";

type Action = "BUY" | "HOLD" | "SELL";

// Explicaciones cortas para cada tipo de razón (sin cambiar el texto original)
const IA_REASON_EXPLANATIONS: Record<string, string> = {
  "Trend up": "tendencia alcista (el precio viene subiendo)",
  "Trend down": "tendencia bajista (el precio viene cayendo)",

  "RSI overbought": "sobrecomprado (podría corregir)",
  "RSI oversold": "sobrevendido (podría rebotar)",
  "RSI neutral": "RSI neutro (sin señal extrema)",

  "High volatility": "volatilidad alta (precio inestable)",
  "Volatility OK": "volatilidad baja/moderada (precio estable)",

  "Unusually high volume": "mucho volumen (movimiento con fuerza)",
  "Unusually low volume": "poco volumen (movimiento con poca fuerza)",

  "Drawdown mild": "caída previa leve",
  "Drawdown deep": "caída previa fuerte",

  // Si tu backend mete más etiquetas, puedes añadirlas aquí sin tocar nada más
};

// Formatea espaciado matemático SIN cambiar el contenido (solo espacios)
function formatMathSpacing(text: string): string {
  return (
    text
      // primero <= y >= para no romperlos al meter espacios con < o >
      .replace(/<=/g, " <= ")
      .replace(/>=/g, " >= ")
      .replace(/</g, " < ")
      .replace(/>/g, " > ")
      .replace(/=/g, " = ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// Devuelve explicación según el prefijo de la razón
function getReasonExplanation(formattedReason: string): string | null {
  const key = Object.keys(IA_REASON_EXPLANATIONS).find((k) =>
    formattedReason.startsWith(k)
  );
  return key ? IA_REASON_EXPLANATIONS[key] : null;
}

export default function LaboratorioPage() {
  const [scenario, setScenario] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  function extractScenarioId(data: any): string {
    return data?.scenario_id ?? data?.id ?? data?.scenarioId ?? "";
  }

  // Datos base (contexto o reveal)
  const ticker = scenario?.ticker ?? "—";
  const anchor = scenario?.anchor_date ?? "—";
  const horizon = scenario?.horizon_days ?? "—";

  const hasContext =
    Array.isArray(scenario?.history) && scenario.history.length > 0;
  const hasFuture =
    Array.isArray(scenario?.future_path) && scenario.future_path.length > 0;

  const estado = !scenario
    ? "—"
    : hasFuture
    ? "REVEAL (futuro)"
    : "ESCENARIO (contexto)";

  // IA (en contexto viene en scenario.ai; en reveal viene en campos sueltos)
  const aiAction: string | null =
    scenario?.ai_action ?? scenario?.ai?.action ?? null;

  const aiConfidence: string | null =
    scenario?.ai_confidence ?? scenario?.ai?.confidence ?? null;

  const aiScore: number | null =
    typeof scenario?.ai_rule_score === "number"
      ? scenario.ai_rule_score
      : typeof scenario?.ai?.score === "number"
      ? scenario.ai.score
      : null;

  const aiReasons: string[] =
    (Array.isArray(scenario?.ai_reasons) && scenario.ai_reasons) ||
    (Array.isArray(scenario?.ai?.reasons) && scenario.ai.reasons) ||
    [];

  // Resultado (solo existe en reveal)
  const userAction: string | null = scenario?.user_action ?? null;
  const yReal: number | null =
    typeof scenario?.y_real === "number" ? scenario.y_real : null;
  const userScore: number | null =
    typeof scenario?.user_score === "number" ? scenario.user_score : null;
  const aiScoreReveal: number | null =
    typeof scenario?.ai_score === "number" ? scenario.ai_score : null;

  async function onRandom() {
    setLoading(true);
    setError("");
    try {
      const data = await getRandomScenario();
      setScenario(data);
      const id = extractScenarioId(data);
      if (id) setScenarioId(String(id));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onLoadById() {
    const id = scenarioId.trim();
    if (!id) {
      setError("Introduce un scenario_id.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await getScenarioById(id);
      setScenario(data);
      const extracted = extractScenarioId(data);
      if (extracted) setScenarioId(String(extracted));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onAction(action: Action) {
    const id = scenarioId.trim() || extractScenarioId(scenario);

    if (!id) {
      setError("No hay scenario_id. Pulsa Random o carga por ID.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await revealScenario(id, action);
      setScenario(data);
      const extracted = extractScenarioId(data);
      if (extracted) setScenarioId(String(extracted));
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Escenarios (Market Engine)</h1>
        <p className="mt-2 text-sm opacity-80">
          MVP: escenario random, escenario por ID y acción BUY/HOLD/SELL (reveal).
        </p>

        {/* Controles */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button
            className="px-4 py-2 border rounded cursor-pointer
              hover:bg-slate-100 dark:hover:bg-[#111827]
              disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={onRandom}
            disabled={loading}
          >
            Random
          </button>

          <input
            className="px-3 py-2 border rounded w-96 max-w-full"
            placeholder="scenario_id (UUID)"
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            disabled={loading}
          />

          <button
            className="px-4 py-2 border rounded cursor-pointer
              hover:bg-slate-100 dark:hover:bg-[#111827]
              disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={onLoadById}
            disabled={loading}
          >
            Cargar por ID
          </button>
        </div>

        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            className="px-4 py-2 border rounded cursor-pointer
              hover:bg-slate-100 dark:hover:bg-[#111827]
              disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={() => onAction("BUY")}
            disabled={loading}
          >
            BUY
          </button>

          <button
            className="px-4 py-2 border rounded cursor-pointer
              hover:bg-slate-100 dark:hover:bg-[#111827]
              disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={() => onAction("HOLD")}
            disabled={loading}
          >
            HOLD
          </button>

          <button
            className="px-4 py-2 border rounded cursor-pointer
              hover:bg-slate-100 dark:hover:bg-[#111827]
              disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={() => onAction("SELL")}
            disabled={loading}
          >
            SELL
          </button>
        </div>

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {/* Info escenario */}
        <div className="mt-6 border rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="opacity-70">Ticker:</span>{" "}
              <span className="font-semibold">{ticker}</span>
            </div>
            <div>
              <span className="opacity-70">Anchor:</span>{" "}
              <span className="font-semibold">{anchor}</span>
            </div>
            <div>
              <span className="opacity-70">Horizonte:</span>{" "}
              <span className="font-semibold">{horizon} días</span>
            </div>
            <div>
              <span className="opacity-70">Estado:</span>{" "}
              <span className="font-semibold">{estado}</span>
            </div>
            <div>
              <span className="opacity-70">Contexto:</span>{" "}
              <span className="font-semibold">{hasContext ? "OK" : "—"}</span>
            </div>
            <div>
              <span className="opacity-70">Futuro:</span>{" "}
              <span className="font-semibold">{hasFuture ? "REVELADO" : "—"}</span>
            </div>
          </div>
        </div>

        {/* Panel IA (en contexto) */}
        {scenario && !hasFuture && aiAction && (
          <div className="mt-6 border rounded-lg p-5">
            <h2 className="text-lg font-semibold">Recomendación IA</h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="opacity-70">Acción IA:</span>{" "}
                <span className="font-semibold">{aiAction}</span>
              </div>
              <div>
                <span className="opacity-70">Confianza IA:</span>{" "}
                <span className="font-semibold">{aiConfidence ?? "—"}</span>
              </div>
              <div>
                <span className="opacity-70">Rule score IA:</span>{" "}
                <span className="font-semibold">
                  {typeof aiScore === "number" ? aiScore.toFixed(3) : "—"}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Razones IA:</div>
              {aiReasons.length === 0 ? (
                <div className="text-sm opacity-70 mt-2">—</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                  {aiReasons.map((raw: string, i: number) => {
                    const formatted = formatMathSpacing(raw);
                    const explanation = getReasonExplanation(formatted);

                    return (
                      <li key={i}>
                        {formatted}
                        {explanation && (
                          <span className="opacity-70">
                            {" "}
                            ({explanation})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Panel resultado (en reveal) */}
        {scenario && hasFuture && (
          <div className="mt-6 border rounded-lg p-5">
            <h2 className="text-lg font-semibold">Resultado</h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="opacity-70">Tu acción:</span>{" "}
                <span className="font-semibold">{userAction ?? "—"}</span>
              </div>
              <div>
                <span className="opacity-70">Acción IA:</span>{" "}
                <span className="font-semibold">{aiAction ?? "—"}</span>
              </div>

              <div>
                <span className="opacity-70">Resultado real (y_real):</span>{" "}
                <span className="font-semibold">
                  {typeof yReal === "number" ? `${(yReal * 100).toFixed(2)}%` : "—"}
                </span>
              </div>

              <div>
                <span className="opacity-70">Tu score:</span>{" "}
                <span className="font-semibold">
                  {typeof userScore === "number" ? userScore.toFixed(4) : "—"}
                </span>
              </div>

              <div>
                <span className="opacity-70">Score IA:</span>{" "}
                <span className="font-semibold">
                  {typeof aiScoreReveal === "number" ? aiScoreReveal.toFixed(4) : "—"}
                </span>
              </div>

              <div>
                <span className="opacity-70">Rule score IA:</span>{" "}
                <span className="font-semibold">
                  {typeof aiScore === "number" ? aiScore.toFixed(3) : "—"}
                </span>
              </div>

              <div>
                <span className="opacity-70">Confianza IA:</span>{" "}
                <span className="font-semibold">{aiConfidence ?? "—"}</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Razones IA:</div>
              {aiReasons.length === 0 ? (
                <div className="text-sm opacity-70 mt-2">—</div>
              ) : (
                <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                  {aiReasons.map((raw: string, i: number) => {
                    const formatted = formatMathSpacing(raw);
                    const explanation = getReasonExplanation(formatted);

                    return (
                      <li key={i}>
                        {formatted}
                        {explanation && (
                          <span className="opacity-70">
                            {" "}
                            ({explanation})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Gráfico */}
        <h2 className="mt-8 text-lg font-medium">Gráfico</h2>
        <MarketChart scenario={scenario} />

        {/* Debug JSON */}
        <div className="mt-8">
          <h2 className="text-lg font-medium">Respuesta (JSON)</h2>
          <pre className="mt-2 p-4 border rounded overflow-auto max-h-[55vh] text-sm">
            {scenario ? JSON.stringify(scenario, null, 2) : "Sin escenario aún"}
          </pre>
        </div>
      </div>
    </main>
  );
}
