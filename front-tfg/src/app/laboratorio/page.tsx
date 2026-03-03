"use client";

import { useState } from "react";
import { getRandomScenario, getScenarioById, API_URL } from "@/lib/api";
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
   HELPERS
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
 */
function isActionCorrect(action: Action, y: number): boolean {
  const HOLD_EPS = 0.02; // 2% (multi-turn de 5 días)
  if (action === "BUY") return y > HOLD_EPS;
  if (action === "SELL") return y < -HOLD_EPS;
  return Math.abs(y) <= HOLD_EPS;
}

function fmtPct2(x: number): string {
  const pct = x * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtPrice2(x: number): string {
  return x.toFixed(2);
}

function fmtMaybePct2(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return fmtPct2(n);
}

function fmtMaybeInt(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toString();
}

function fmtEur2(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2) + " €";
}

/* =====================================================
   PAGE
===================================================== */

export default function LaboratorioPage() {
  const [scenario, setScenario] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [started, setStarted] = useState(false);

  // ✅ NUEVO: cantidad de acciones (solo para BUY/SELL)
  const [quantity, setQuantity] = useState<number>(1);

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
     DERIVADOS
  ========================= */

  const ticker = scenario?.ticker ?? "—";
  const anchor = scenario?.anchor_date ?? "—";

  const finished = Boolean(scenario?.finished);
  const turn = typeof scenario?.turn === "number" ? scenario.turn : null;
  const maxTurns =
    typeof scenario?.max_turns === "number" ? scenario.max_turns : 5;

  const aiAction = scenario?.ai?.action ?? scenario?.ai_action ?? null;
  const aiConfidence =
    scenario?.ai?.confidence ?? scenario?.ai_confidence ?? null;

  // OJO: este "score" es el de reglas, NO el acierto
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

  // ✅ NUEVO: wallet (si backend lo devuelve)
  const wallet = scenario?.wallet ?? null;

  /* =========================
     MULTI-TURN API
  ========================= */

  async function startMultiTurn(id: string) {
    const res = await fetch(`${API_URL}/market/multiturn/start/${id}`, {
      method: "POST",
    });
    const data = await res.json();
    setScenario(data);
    setStarted(true);
  }

  async function stepMultiTurn(id: string, action: Action, qty: number) {
    const res = await fetch(`${API_URL}/market/multiturn/step/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, quantity: qty }),
    });
    const data = await res.json();
    return data;
  }

  /* =========================
     UI ACTIONS
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

      // ✅ reset cantidad
      setQuantity(1);

      if (id) await startMultiTurn(id);
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

      setQuantity(1);

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
      const prevAnchor = scenario?.anchor_date;
      const prevPrice = findAdjCloseByDateFromHistory(scenario, prevAnchor);

      const qtyToSend =
        action === "HOLD" ? 0 : Math.max(1, Math.floor(quantity || 1));

      const nextScenario = await stepMultiTurn(id, action, qtyToSend);

      const newAnchor = nextScenario?.anchor_date;
      const newPrice = findAdjCloseByDateFromHistory(nextScenario, newAnchor);

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
     STYLES
  ========================= */

  const btnClass =
    "px-4 py-2 rounded-md bg-slate-700 text-white hover:bg-slate-800 transition " +
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border border-slate-500";

  const inputClass =
    "px-3 py-2 border border-slate-500 rounded w-96 max-w-full bg-transparent";

  const actionBtnClass =
    "w-32 sm:w-36 px-4 py-2 rounded-full border border-slate-500 " +
    "bg-slate-800/40 text-slate-100 hover:bg-slate-700/60 " +
    "transition shadow-sm " +
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const resultBoxClass = (ok: boolean) =>
    ok
      ? "border border-emerald-500/60 bg-emerald-900/25 text-emerald-100"
      : "border border-rose-500/60 bg-rose-900/25 text-rose-100";

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

        {error && <p className="mt-4 text-rose-300">{error}</p>}

        {/* ✅ NUEVO: CARTERA (recuadro extra, sin tocar tu diseño) */}
        {wallet && (
          <div className="mt-6 border border-slate-600 rounded-lg p-4 text-sm">
            <div className="font-semibold mb-2">Cartera del escenario (simulada)</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <span className="opacity-70">Cash:</span>{" "}
                <b className="font-semibold">{fmtEur2(wallet.cash)}</b>
              </div>
              <div>
                <span className="opacity-70">Acciones:</span>{" "}
                <b className="font-semibold">{wallet.shares ?? "—"}</b>
              </div>
              <div>
                <span className="opacity-70">Valor total:</span>{" "}
                <b className="font-semibold">{fmtEur2(wallet.portfolio_value)}</b>
              </div>
              <div>
                <span className="opacity-70">PnL:</span>{" "}
                <b className="font-semibold">
                  {Number(wallet.pnl_total) >= 0 ? "+" : ""}
                  {fmtEur2(wallet.pnl_total)}
                </b>
              </div>
            </div>
          </div>
        )}

        {/* INFO (formateada) */}
        <div className="mt-6 border border-slate-600 rounded-lg p-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
            <div>
              <span className="opacity-70">Ticker:</span>{" "}
              <b className="font-semibold">{ticker}</b>
            </div>
            <div>
              <span className="opacity-70">Anchor:</span>{" "}
              <b className="font-semibold">{anchor}</b>
            </div>
            <div>
              <span className="opacity-70">Turno:</span>{" "}
              <b className="font-semibold">
                {turn ?? "—"} / {maxTurns}
              </b>
            </div>

            <div>
              <span className="opacity-70">Rentabilidad acumulada (tú):</span>{" "}
              <b className="font-semibold">{fmtMaybePct2(userScoreAccum)}</b>
            </div>
            <div>
              <span className="opacity-70">Rentabilidad acumulada (IA):</span>{" "}
              <b className="font-semibold">{fmtMaybePct2(aiScoreAccum)}</b>
            </div>
          </div>

          {scenario && finished && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${endBoxClass}`}>
              <div className="font-semibold text-base">✅ Sesión finalizada</div>
              <div className="opacity-90 mt-1">
                Has llegado al máximo de turnos ({maxTurns}). Para continuar,
                pulsa <b>Random</b> o carga otro <b>ID</b>.
              </div>
            </div>
          )}
        </div>

        {/* IA */}
        {scenario && aiAction && (
          <div className="mt-6 border border-slate-600 rounded-lg p-5">
            <h2 className="text-lg font-semibold">Recomendación IA</h2>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-center">
              <div>
                <div className="opacity-70">Acción IA</div>
                <div className="font-semibold">{aiAction}</div>
              </div>

              <div>
                <div className="opacity-70">Confianza</div>
                <div className="font-semibold">{aiConfidence ?? "—"}</div>
              </div>

              <div>
                <div className="opacity-70">Fuerza de señal (reglas)</div>
                <div className="font-semibold">{fmtMaybeInt(aiRuleScore)}</div>
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

        {/* ✅ NUEVO: cantidad (sin romper tu layout) */}
        <div className="mt-3 flex justify-center gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <span className="opacity-70">Cantidad:</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              className="px-3 py-2 border border-slate-500 rounded w-28 bg-transparent"
              disabled={actionsDisabled}
            />
          </div>

          <button
            className={actionBtnClass}
            onClick={() => onAction("BUY")}
            disabled={actionsDisabled}
            title="Compra (usa la cantidad indicada)"
          >
            BUY
          </button>
          <button
            className={actionBtnClass}
            onClick={() => onAction("HOLD")}
            disabled={actionsDisabled}
            title="Mantener (ignora cantidad)"
          >
            HOLD
          </button>
          <button
            className={actionBtnClass}
            onClick={() => onAction("SELL")}
            disabled={actionsDisabled}
            title="Vende (usa la cantidad indicada)"
          >
            SELL
          </button>
        </div>

        {lastResult && (
          <div
            className={`mt-3 mx-auto max-w-3xl p-2 rounded-md text-xs ${resultBoxClass(
              lastResult.correct
            )}`}
          >
            <div className="font-semibold">
              {lastResult.correct ? "✔ Acción correcta" : "✘ Acción incorrecta"}
            </div>
            <div className="opacity-90 mt-1">
              <b>{lastResult.action}</b> · {lastResult.prevAnchor} (
              {fmtPrice2(lastResult.prevPrice)}) → {lastResult.newAnchor} (
              {fmtPrice2(lastResult.newPrice)}) · <b>{fmtPct2(lastResult.y)}</b>
            </div>
          </div>
        )}

        <MarketChart scenario={scenario} />

        {/* JSON */}
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