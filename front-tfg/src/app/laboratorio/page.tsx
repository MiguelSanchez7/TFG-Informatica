"use client";

import { useState } from "react";
import { getRandomScenario, getScenarioById } from "@/lib/api";
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
   HELPERS PARA MULTI-TURN
===================================================== */

function extractScenarioId(data: any): string {
  return data?.scenario_id ?? data?.id ?? data?.scenarioId ?? "";
}

function findAdjCloseByDateFromHistory(
  scenario: any,
  dateStr: string
): number | null {
  if (!scenario || !Array.isArray(scenario.history) || !dateStr) return null;
  const row = scenario.history.find((r: any) => r?.date === dateStr);
  const v = row?.adj_close;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * ✅ Baremo coherente (zona neutral):
 * - BUY correcto si y > +eps
 * - SELL correcto si y < -eps
 * - HOLD correcto si |y| <= eps
 *
 * Para STEP_DAYS=5, eps=1% suele ser razonable.
 */
function isActionCorrect(action: Action, y: number): boolean {
  const HOLD_EPS = 0.02; // 2% (para multi-turn de 5 días)
  if (action === "BUY") return y > HOLD_EPS;
  if (action === "SELL") return y < -HOLD_EPS;
  return Math.abs(y) <= HOLD_EPS;
}

function fmtPct(x: number): string {
  const pct = x * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtPrice(x: number): string {
  return x.toFixed(2);
}

/* =====================================================
   PAGE
===================================================== */

export default function LaboratorioPage() {
  const [scenario, setScenario] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Multi-turn activo
  const [started, setStarted] = useState(false);

  // Resultado de la última acción
  const [lastResult, setLastResult] = useState<null | {
    action: Action;
    y: number;
    correct: boolean;
    prevPrice: number;
    newPrice: number;
    prevAnchor: string;
    newAnchor: string;
  }>(null);

  /* =========================
     DATOS DERIVADOS
  ========================= */

  const ticker = scenario?.ticker ?? "—";
  const anchor = scenario?.anchor_date ?? "—";

  const finished = Boolean(scenario?.finished);
  const turn = typeof scenario?.turn === "number" ? scenario.turn : null;
  const maxTurns =
    typeof scenario?.max_turns === "number" ? scenario.max_turns : 5;

  const estado = !scenario
    ? "—"
    : finished
    ? "FINALIZADO"
    : started
    ? "MULTI-TURN"
    : "ESCENARIO";

  const aiAction = scenario?.ai?.action ?? scenario?.ai_action ?? null;
  const aiConfidence =
    scenario?.ai?.confidence ?? scenario?.ai_confidence ?? null;

  const aiRuleScore =
    typeof scenario?.ai?.score === "number"
      ? scenario.ai.score
      : typeof scenario?.ai_rule_score === "number"
      ? scenario.ai_rule_score
      : null;

  const aiReasons =
    (Array.isArray(scenario?.ai?.reasons) && scenario.ai.reasons) ||
    (Array.isArray(scenario?.ai_reasons) && scenario.ai_reasons) ||
    [];

  const userScoreAccum = scenario?.user_score ?? null;
  const aiScoreAccum = scenario?.ai_score ?? null;

  /* =========================
     MULTI-TURN API
  ========================= */

  async function startMultiTurn(id: string) {
    const res = await fetch(
      `http://localhost:8000/market/multiturn/start/${id}`,
      {
        method: "POST",
      }
    );
    const data = await res.json();
    setScenario(data);
    setStarted(true);
  }

  async function stepMultiTurn(id: string, action: Action) {
    const res = await fetch(
      `http://localhost:8000/market/multiturn/step/${id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }
    );
    const data = await res.json();
    return data;
  }

  /* =========================
     ACCIONES UI
  ========================= */

  async function onRandom() {
    setLoading(true);
    setError("");
    setStarted(false);
    setLastResult(null);

    try {
      const data = await getRandomScenario();
      const id = extractScenarioId(data);
      setScenario(data);
      setScenarioId(id);

      if (id) {
        await startMultiTurn(id);
      }
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
    setStarted(false);
    setLastResult(null);

    try {
      const data = await getScenarioById(id);
      setScenario(data);
      setScenarioId(id);
      await startMultiTurn(id);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onAction(action: Action) {
    const id = scenarioId.trim();
    if (!id) {
      setError("No hay scenario_id.");
      return;
    }
    if (!scenario) {
      setError("Primero carga un escenario (Random o por ID).");
      return;
    }

    if (finished) {
      setError("La sesión ya ha finalizado. Pulsa Random para empezar otra.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Precio antes (anchor actual)
      const prevAnchor = scenario?.anchor_date;
      const prevPrice = findAdjCloseByDateFromHistory(scenario, prevAnchor);

      // Step
      const nextScenario = await stepMultiTurn(id, action);

      // Precio después (nuevo anchor)
      const newAnchor = nextScenario?.anchor_date;
      const newPrice = findAdjCloseByDateFromHistory(nextScenario, newAnchor);

      // Variación + correcto/incorrecto
      if (
        prevPrice != null &&
        newPrice != null &&
        prevPrice !== 0 &&
        prevAnchor &&
        newAnchor
      ) {
        const y = newPrice / prevPrice - 1.0;
        const correct = isActionCorrect(action, y);

        setLastResult({
          action,
          y,
          correct,
          prevPrice,
          newPrice,
          prevAnchor,
          newAnchor,
        });
      } else {
        setLastResult(null);
      }

      setScenario(nextScenario);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     ESTILOS
  ========================= */

  const btnClass =
    "px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-800 transition " +
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-slate-500";

  const inputClass =
    "px-3 py-2 border border-slate-500 rounded w-96 max-w-full bg-transparent";

  const resultBoxClass = (ok: boolean) =>
    ok
      ? "border border-emerald-500/60 bg-emerald-900/30 text-emerald-100"
      : "border border-rose-500/60 bg-rose-900/30 text-rose-100";

  const endBoxClass =
    "border border-indigo-400/60 bg-indigo-900/30 text-indigo-100";

  const actionsDisabled = loading || !started || finished;

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Escenarios (Market Engine)</h1>
        <p className="mt-2 text-sm opacity-80">
          Simulación histórica multi-turn con decisiones BUY / HOLD / SELL.
        </p>

        {/* CONTROLES */}
        <div className="mt-6 flex flex-wrap gap-3 items-center">
          <button className={btnClass} onClick={onRandom} disabled={loading}>
            Random
          </button>

          <input
            className={inputClass}
            value={scenarioId}
            onChange={(e) => setScenarioId(e.target.value)}
            placeholder="scenario_id (UUID)"
            disabled={loading}
          />

          <button className={btnClass} onClick={onLoadById} disabled={loading}>
            Cargar por ID
          </button>
        </div>

        {/* ACCIONES */}
        <div className="mt-4 flex gap-3 flex-wrap">
          <button
            className={btnClass}
            onClick={() => onAction("BUY")}
            disabled={actionsDisabled}
          >
            BUY
          </button>
          <button
            className={btnClass}
            onClick={() => onAction("HOLD")}
            disabled={actionsDisabled}
          >
            HOLD
          </button>
          <button
            className={btnClass}
            onClick={() => onAction("SELL")}
            disabled={actionsDisabled}
          >
            SELL
          </button>
        </div>

        {error && <p className="mt-4 text-rose-300">{error}</p>}

        {/* INFO */}
        <div className="mt-6 border border-slate-600 rounded-lg p-4 text-sm">
          <div>
            <b>Ticker:</b> {ticker}
          </div>
          <div>
            <b>Anchor:</b> {anchor}
          </div>
          <div>
            <b>Estado:</b> {estado}
          </div>
          <div>
            <b>Turno:</b> {turn ?? "—"} / {maxTurns}
          </div>
          <div>
            <b>Tu score acumulado:</b> {userScoreAccum ?? "—"}
          </div>
          <div>
            <b>Score IA acumulado:</b> {aiScoreAccum ?? "—"}
          </div>
        </div>

        {/* FIN DE SESIÓN */}
        {scenario && finished && (
          <div className={`mt-6 p-4 rounded-lg text-sm ${endBoxClass}`}>
            <div className="font-semibold text-base">✅ Sesión finalizada</div>
            <div className="opacity-90 mt-1">
              Has llegado al máximo de turnos ({maxTurns}). Para continuar, pulsa{" "}
              <b>Random</b> o carga otro <b>ID</b>.
            </div>
          </div>
        )}

        {/* IA */}
        {scenario && aiAction && (
          <div className="mt-6 border border-slate-600 rounded-lg p-5">
            <h2 className="text-lg font-semibold">Recomendación IA</h2>

            <div className="mt-3 text-sm">
              <div>
                <b>Acción IA:</b> {aiAction}
              </div>
              <div>
                <b>Confianza:</b> {aiConfidence ?? "—"}
              </div>
              <div>
                <b>Rule score:</b> {aiRuleScore?.toFixed?.(3) ?? "—"}
              </div>
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
                        <span className="opacity-70"> ({explanation})</span>
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

        {/* MENSAJE DE RESULTADO (ENCIMA DEL GRÁFICO) */}
        {lastResult && (
          <div
            className={`mt-3 mb-3 p-3 rounded-md text-sm ${resultBoxClass(
              lastResult.correct
            )}`}
          >
            <div className="font-semibold">
              {lastResult.correct ? "✔ Acción correcta" : "✘ Acción incorrecta"}
            </div>
            <div className="opacity-90 mt-1">
              Acción: <b>{lastResult.action}</b> · {lastResult.prevAnchor} (
              {fmtPrice(lastResult.prevPrice)}) → {lastResult.newAnchor} (
              {fmtPrice(lastResult.newPrice)}) · Variación:{" "}
              <b>{fmtPct(lastResult.y)}</b>
            </div>
            <div className="opacity-70 mt-1">
              Baremo: BUY si sube &gt; 1%, SELL si baja &lt; -1%, HOLD si |variación| ≤ 1%.
            </div>
          </div>
        )}

        <MarketChart scenario={scenario} />

        {/* DEBUG */}
        <div className="mt-8">
          <h2 className="text-lg font-medium">Respuesta (JSON)</h2>
          <pre className="mt-2 p-4 border border-slate-600 rounded overflow-auto max-h-[55vh] text-sm">
            {scenario ? JSON.stringify(scenario, null, 2) : "Sin escenario aún"}
          </pre>
        </div>
      </div>
    </main>
  );
}
