"use client";

import { useState } from "react";
import {
  getRandomScenario,
  getScenarioById,
  revealScenario,
} from "@/lib/api";
import MarketChart from "@/components/marketchart";

type Action = "BUY" | "HOLD" | "SELL";

/* =====================================================
   EXPLICACIONES IA
===================================================== */

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
};

function formatMathSpacing(text: string): string {
  return text
    .replace(/<=/g, " <= ")
    .replace(/>=/g, " >= ")
    .replace(/</g, " < ")
    .replace(/>/g, " > ")
    .replace(/=/g, " = ")
    .replace(/\s+/g, " ")
    .trim();
}

function getReasonExplanation(formattedReason: string): string | null {
  const key = Object.keys(IA_REASON_EXPLANATIONS).find((k) =>
    formattedReason.startsWith(k)
  );
  return key ? IA_REASON_EXPLANATIONS[key] : null;
}

/* =====================================================
   PAGE
===================================================== */

export default function LaboratorioPage() {
  const [scenario, setScenario] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
     🔥 MULTI-TURN STATE
  ========================= */

  const [multiTurn] = useState(true); // activo por defecto
  const [started, setStarted] = useState(false);

  function extractScenarioId(data: any): string {
    return data?.scenario_id ?? data?.id ?? data?.scenarioId ?? "";
  }

  /* =========================
     DATOS DERIVADOS
  ========================= */

  const ticker = scenario?.ticker ?? "—";
  const anchor = scenario?.anchor_date ?? "—";
  const horizon = scenario?.horizon_days ?? "—";

  const hasContext =
    Array.isArray(scenario?.history) && scenario.history.length > 0;

  const estado = !scenario
    ? "—"
    : scenario?.finished
    ? "FINALIZADO"
    : started
    ? "MULTI-TURN"
    : "ESCENARIO";

  const aiAction = scenario?.ai?.action ?? scenario?.ai_action ?? null;
  const aiConfidence =
    scenario?.ai?.confidence ?? scenario?.ai_confidence ?? null;
  const aiScore =
    typeof scenario?.ai?.score === "number"
      ? scenario.ai.score
      : typeof scenario?.ai_rule_score === "number"
      ? scenario.ai_rule_score
      : null;

  const aiReasons =
    (Array.isArray(scenario?.ai?.reasons) && scenario.ai.reasons) ||
    (Array.isArray(scenario?.ai_reasons) && scenario.ai_reasons) ||
    [];

  const userScore = scenario?.user_score ?? null;
  const aiScoreAccum = scenario?.ai_score ?? null;

  /* =========================
     API ACTIONS
  ========================= */

  async function onRandom() {
    setLoading(true);
    setError("");
    setStarted(false);

    try {
      const data = await getRandomScenario();
      const id = extractScenarioId(data);
      setScenario(data);
      setScenarioId(id);

      if (multiTurn && id) {
        await startMultiTurn(id);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onLoadById() {
    if (!scenarioId.trim()) {
      setError("Introduce un scenario_id.");
      return;
    }

    setLoading(true);
    setError("");
    setStarted(false);

    try {
      const data = await getScenarioById(scenarioId);
      setScenario(data);

      if (multiTurn) {
        await startMultiTurn(scenarioId);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     🔥 MULTI-TURN API REAL
  ========================= */

  async function startMultiTurn(id: string) {
    const res = await fetch(
      `http://localhost:8000/market/multiturn/start/${id}`,
      { method: "POST" }
    );
    const data = await res.json();
    setScenario(data);
    setStarted(true);
  }

  async function stepMultiTurn(action: Action) {
    const res = await fetch(
      `http://localhost:8000/market/multiturn/step/${scenarioId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    const data = await res.json();
    setScenario(data);
  }

  async function onAction(action: Action) {
    if (!scenarioId) {
      setError("No hay scenario_id.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (multiTurn) {
        await stepMultiTurn(action);
      } else {
        const data = await revealScenario(scenarioId, action);
        setScenario(data);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">
          Escenarios (Market Engine)
        </h1>

        <p className="mt-2 text-sm opacity-80">
          Simulación histórica con decisiones BUY / HOLD / SELL.
          Multi-turn activo.
        </p>

        {/* CONTROLES */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button onClick={onRandom} disabled={loading}>
            Random
          </button>

          <input
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            placeholder="scenario_id (UUID)"
          />

          <button onClick={onLoadById} disabled={loading}>
            Cargar por ID
          </button>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => onAction("BUY")} disabled={loading}>
            BUY
          </button>
          <button onClick={() => onAction("HOLD")} disabled={loading}>
            HOLD
          </button>
          <button onClick={() => onAction("SELL")} disabled={loading}>
            SELL
          </button>
        </div>

        {error && <p className="mt-4 text-red-500">{error}</p>}

        {/* INFO */}
        <div className="mt-6 border rounded-lg p-4">
          <div><b>Ticker:</b> {ticker}</div>
          <div><b>Anchor:</b> {anchor}</div>
          <div><b>Horizonte:</b> {horizon}</div>
          <div><b>Estado:</b> {estado}</div>

          {multiTurn && scenario && (
            <>
              <div><b>Turno:</b> {scenario.turn}</div>
              <div><b>Tu score acumulado:</b> {userScore}</div>
              <div><b>Score IA acumulado:</b> {aiScoreAccum}</div>
            </>
          )}
        </div>

        {/* IA */}
        {scenario && aiAction && (
          <div className="mt-6 border rounded-lg p-5">
            <h2 className="text-lg font-semibold">Recomendación IA</h2>

            <div className="mt-3 text-sm">
              <div><b>Acción IA:</b> {aiAction}</div>
              <div><b>Confianza:</b> {aiConfidence ?? "—"}</div>
              <div><b>Rule score:</b> {aiScore?.toFixed?.(3) ?? "—"}</div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Razones IA:</div>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-sm">
                {aiReasons.map((raw: string, i: number) => {
                  const formatted = formatMathSpacing(raw);
                  const explanation = getReasonExplanation(formatted);
                  return (
                    <li key={i}>
                      {formatted}
                      {explanation && (
                        <span className="opacity-70">
                          {" "}({explanation})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* GRÁFICO */}
        <h2 className="mt-8 text-lg font-medium">Gráfico</h2>
        <MarketChart scenario={scenario} />

        {/* DEBUG */}
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
