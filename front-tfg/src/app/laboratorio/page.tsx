"use client";

import { useEffect, useState } from "react";
import {
  addUserXp,
  getRandomScenario,
  getScenarioByDateRange,
  getScenarioById,
  API_URL,
} from "@/lib/api";
import MarketChart from "@/components/marketchart";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Action = "BUY" | "HOLD" | "SELL";
type AiModelType = "auto" | "mlp" | "random_forest" | "gradient_boosting";

const XP_REWARD_CORRECT_DECISION = 10;
const XP_REWARD_PROFITABLE_SCENARIO = 35;
const AI_MODEL_OPTIONS: Array<{ value: AiModelType; label: string }> = [
  { value: "auto", label: "Mejor accuracy" },
  { value: "mlp", label: "MLPClassifier" },
  { value: "random_forest", label: "RandomForestClassifier" },
  { value: "gradient_boosting", label: "GradientBoostingClassifier" },
];

const HISTORICAL_CHALLENGES: Record<
  string,
  {
    title: string;
    startDate: string;
    endDate: string;
    requiredLevel: number;
  }
> = {
  "mercado-lateral": {
    title: "Mercado lateral prolongado",
    startDate: "2015-01-01",
    endDate: "2016-12-31",
    requiredLevel: 2,
  },
  "crisis-2008": {
    title: "Crisis financiera de 2008",
    startDate: "2009-04-01",
    endDate: "2009-12-31",
    requiredLevel: 5,
  },
  "covid-2020": {
    title: "Crash COVID y recuperacion",
    startDate: "2020-04-01",
    endDate: "2020-12-31",
    requiredLevel: 7,
  },
  "subidas-tipos-2022": {
    title: "Mercado bajista por subidas de tipos",
    startDate: "2022-01-01",
    endDate: "2022-12-31",
    requiredLevel: 7,
  },
};

/* =====================================================
   HELPERS (FORMATO ES)
===================================================== */

const NF_ES_2 = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const NF_ES_0 = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

function fmtNumberES2(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return NF_ES_2.format(n);
}

function fmtIntES(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return NF_ES_0.format(Math.round(n));
}

function fmtEurES(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `${fmtNumberES2(n)} €`;
}

/* =====================================================
   HELPERS (SCENARIO)
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
 * Baremo coherente (zona neutral):
 * - BUY correcto si y > +eps
 * - SELL correcto si y < -eps
 * - HOLD correcto si |y| <= eps
 */
function isActionCorrect(action: Action, y: number): boolean {
  const HOLD_EPS = 0.02; // 2%
  if (action === "BUY") return y > HOLD_EPS;
  if (action === "SELL") return y < -HOLD_EPS;
  return Math.abs(y) <= HOLD_EPS;
}

function expectedActionFromReturn(y: number): Action {
  const HOLD_EPS = 0.02;
  if (y > HOLD_EPS) return "BUY";
  if (y < -HOLD_EPS) return "SELL";
  return "HOLD";
}

function fmtPct2(x: number): string {
  const pct = x * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function fmtPrice2(x: number): string {
  return fmtNumberES2(x);
}

function fmtMaybePct2(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "-";
  return fmtPct2(n);
}

function getPortfolioProfit(
  scenarioData:
    | {
        wallet?: {
          initial_cash?: unknown;
          portfolio_value?: unknown;
        } | null;
      }
    | null
    | undefined
): number | null {
  const scenarioWallet = scenarioData?.wallet;
  if (!scenarioWallet) return null;

  const initial = Number(scenarioWallet.initial_cash);
  const current = Number(scenarioWallet.portfolio_value);
  if (!Number.isFinite(initial) || !Number.isFinite(current)) return null;

  return current - initial;
}

function fmtShapValue(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(4)}`;
}

function formatFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    ret_1d: "Retorno 1d",
    sma20: "SMA 20",
    sma50: "SMA 50",
    rsi14: "RSI 14",
    vol20: "Volatilidad 20d",
    drawdown60: "Drawdown 60d",
    vol_rel20: "Volumen relativo",
    trend_gap: "Gap de tendencia",
    price_vs_sma20: "Precio vs SMA 20",
    price_vs_sma50: "Precio vs SMA 50",
  };

  return labels[feature] ?? feature;
}

/* =====================================================
   PAGE
===================================================== */

export default function LaboratorioPage() {
  const { user, setUser } = useAuth();
  const [scenario, setScenario] = useState<any>(null);
  const [scenarioId, setScenarioId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [started, setStarted] = useState(false);

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState<AiModelType>("auto");

  const [lastResult, setLastResult] = useState<null | {
    action: Action;
    aiAction: Action | null;
    expectedAction: Action;
    matchedAi: boolean;
    y: number;
    correct: boolean;
    prevPrice: number;
    newPrice: number;
    prevAnchor: string;
    newAnchor: string;
  }>(null);
  const [challengeTitle, setChallengeTitle] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<
    (typeof HISTORICAL_CHALLENGES)[string] | null
  >(null);
  const [xpEvents, setXpEvents] = useState<
    Array<{
      id: string;
      amount: number;
      title: string;
      detail: string;
      status: "saved" | "skipped" | "error";
    }>
  >([]);
  const [finalXpAwardedScenarioId, setFinalXpAwardedScenarioId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get("reto") ?? "";
    const selectedChallenge = HISTORICAL_CHALLENGES[challengeId] ?? null;
    setChallenge(selectedChallenge);
    setChallengeTitle(selectedChallenge?.title ?? null);
  }, []);

  /* =========================
     DERIVADOS
  ========================= */

  const ticker = scenario?.ticker ?? "-";
  const anchor = scenario?.anchor_date ?? "-";

  const finished = Boolean(scenario?.finished);
  const turn = typeof scenario?.turn === "number" ? scenario.turn : null;
  const maxTurns =
    typeof scenario?.max_turns === "number" ? scenario.max_turns : 5;

  const aiAction = scenario?.ai?.action ?? scenario?.ai_action ?? null;
  const aiConfidence =
    scenario?.ai?.confidence ?? scenario?.ai_confidence ?? null;
  const aiModelType = scenario?.ai?.model_type ?? "MLPClassifier";
  const aiProbabilities = scenario?.ai?.probabilities ?? {};
  const aiShap = scenario?.ai?.shap ?? null;
  const aiShapTopFeatures = Array.isArray(aiShap?.top_features)
    ? aiShap.top_features
    : [];
  const aiShapAvailable = Boolean(aiShap?.target_action);
  const hasUserMadeDecision = typeof turn === "number" && turn > 0;

  const userScoreAccum = scenario?.user_score ?? null;
  const aiScoreAccum = scenario?.ai_score ?? null;

  const wallet = scenario?.wallet ?? null;
  const availableCash = wallet ? Number(wallet.cash) : 0;
  const ownedShares = wallet ? Number(wallet.shares) : 0;
  const walletReturn =
    wallet &&
    Number.isFinite(Number(wallet.portfolio_value)) &&
    Number.isFinite(Number(wallet.initial_cash)) &&
    Number(wallet.initial_cash) !== 0
      ? Number(wallet.portfolio_value) / Number(wallet.initial_cash) - 1
      : null;

  const features = scenario?.features_at_t ?? null;
  const currentPrice = Number(features?.adj_close);
  const sma20 = Number(features?.sma20);
  const sma50 = Number(features?.sma50);
  const rsi14 = Number(features?.rsi14);
  const vol20 = Number(features?.vol20);
  const drawdown60 = Number(features?.drawdown60);
  const volRel20 = Number(features?.vol_rel20);
  const maxBuyQuantity =
    Number.isFinite(currentPrice) && currentPrice > 0 && Number.isFinite(availableCash)
      ? Math.max(0, Math.floor(availableCash / currentPrice))
      : 0;
  const maxSellQuantity = Number.isFinite(ownedShares)
    ? Math.max(0, Math.floor(ownedShares))
    : 0;

  const trendReading =
    Number.isFinite(currentPrice) && Number.isFinite(sma20) && Number.isFinite(sma50)
      ? currentPrice > sma20 && sma20 > sma50
        ? "Alcista"
        : currentPrice < sma20 && sma20 < sma50
        ? "Bajista"
        : "Mixta"
      : "Sin datos";
  const rsiReading = Number.isFinite(rsi14)
    ? rsi14 >= 70
      ? "Sobrecompra"
      : rsi14 <= 30
      ? "Sobreventa"
      : "Zona neutral"
    : "Sin datos";
  const riskReading = Number.isFinite(drawdown60)
    ? drawdown60 <= -0.15
      ? "Ca?da fuerte"
      : drawdown60 <= -0.07
      ? "Ca?da moderada"
      : "Drawdown contenido"
    : "Sin datos";

  /* =========================
     ✅ NUEVO: RESULTADO FINAL (GANAS/PIERDES)
  ========================= */

  const initialPortfolioValue =
    wallet && Number.isFinite(Number(wallet.initial_cash))
      ? Number(wallet.initial_cash)
      : 100000;

  const finalValue =
    wallet && Number.isFinite(Number(wallet.portfolio_value))
      ? Number(wallet.portfolio_value)
      : null;

  const deltaValue =
    finalValue != null ? finalValue - initialPortfolioValue : null;

  const EPS_EUR = 0.01; // tolerancia por redondeos (1 céntimo)

  const outcome =
    deltaValue == null
      ? null
      : deltaValue > EPS_EUR
      ? "WIN"
      : deltaValue < -EPS_EUR
      ? "LOSS"
      : "FLAT";

  const outcomeBoxClass =
    outcome === "WIN"
      ? "border border-emerald-500/60 bg-emerald-900/25 text-emerald-100"
      : outcome === "LOSS"
      ? "border border-rose-500/60 bg-rose-900/25 text-rose-100"
      : "border border-slate-500/60 bg-slate-900/25 text-slate-100";

  const userDecisionScore = Number(userScoreAccum);
  const aiDecisionScore = Number(aiScoreAccum);
  const hasDecisionComparison =
    Number.isFinite(userDecisionScore) && Number.isFinite(aiDecisionScore);
  const decisionWinner = !hasDecisionComparison
    ? null
    : userDecisionScore > aiDecisionScore
    ? "USER"
    : userDecisionScore < aiDecisionScore
    ? "AI"
    : "TIE";

  const decisionBoxClass =
    decisionWinner === "USER"
      ? "border border-emerald-500/60 bg-emerald-900/25 text-emerald-100"
      : decisionWinner === "AI"
      ? "border border-rose-500/60 bg-rose-900/25 text-rose-100"
      : "border border-slate-500/60 bg-slate-900/25 text-slate-100";

  /* =========================
     MULTI-TURN API
  ========================= */

  async function startMultiTurn(id: string, modelType: AiModelType = selectedModel) {
    const params = new URLSearchParams({ model_type: modelType });
    const res = await fetch(`${API_URL}/market/multiturn/start/${id}?${params}`, {
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
      body: JSON.stringify({ action, quantity: qty, model_type: selectedModel }),
    });
    const data = await res.json();
    return data;
  }

  async function awardXp(amount: number, title: string, detail: string) {
    const eventId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (!user?.id) {
      setXpEvents((current) => [
        {
          id: eventId,
          amount,
          title,
          detail: "Inicia sesion para guardar esta recompensa de XP.",
          status: "skipped",
        },
        ...current,
      ]);
      return;
    }

    try {
      const updatedUser = await addUserXp(user.id, amount);
      setUser(updatedUser);
      setXpEvents((current) => [
        {
          id: eventId,
          amount,
          title,
          detail,
          status: "saved",
        },
        ...current,
      ]);
    } catch (xpError) {
      setXpEvents((current) => [
        {
          id: eventId,
          amount,
          title,
          detail:
            xpError instanceof Error
              ? xpError.message
              : "No se pudo guardar la XP.",
          status: "error",
        },
        ...current,
      ]);
    }
  }

  async function onModelChange(modelType: AiModelType) {
    setSelectedModel(modelType);
    if (!scenarioId.trim() || !started) return;

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ model_type: modelType });
      const res = await fetch(
        `${API_URL}/market/multiturn/state/${scenarioId.trim()}?${params}`,
        { method: "GET" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail ?? "Error cambiando el modelo de IA");
      }
      setScenario(data);
    } catch (e: any) {
      setError(e?.message ?? "Error cambiando el modelo de IA");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     UI ACTIONS
  ========================= */

  async function onHistoricalChallenge() {
    if (!challenge) return;

    setLoading(true);
    setError("");
    setStarted(false);
    setLastResult(null);
    setXpEvents([]);
    setFinalXpAwardedScenarioId(null);
    setChallengeTitle(challenge.title);

    try {
      const data = await getScenarioByDateRange(
        challenge.startDate,
        challenge.endDate,
        undefined,
        selectedModel
      );
      const id = extractScenarioId(data);
      setScenario(data);
      setScenarioId(id);
      setQuantity(1);

      if (id) await startMultiTurn(id, selectedModel);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando el reto histórico");
    } finally {
      setLoading(false);
    }
  }

  async function onRandom() {
    setLoading(true);
    setError("");
    setStarted(false);
    setLastResult(null);
    setXpEvents([]);
    setFinalXpAwardedScenarioId(null);
    setChallengeTitle(null);

    try {
      const data = await getRandomScenario(selectedModel);
      const id = extractScenarioId(data);
      setScenario(data);
      setScenarioId(id);

      setQuantity(1);

      if (id) await startMultiTurn(id, selectedModel);
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
    setXpEvents([]);
    setFinalXpAwardedScenarioId(null);
    setChallengeTitle(null);

    try {
      const data = await getScenarioById(id, selectedModel);
      setScenario(data);
      setScenarioId(id);

      setQuantity(1);

      await startMultiTurn(id, selectedModel);
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
      const aiSuggestedAction =
        scenario?.ai?.action ?? scenario?.ai_action ?? null;
      const prevAnchor = scenario?.anchor_date;
      const prevPrice = findAdjCloseByDateFromHistory(scenario, prevAnchor);

      let qtyToSend = 0;
      if (action === "BUY") {
        qtyToSend = Math.min(
          Math.max(1, Math.floor(quantity || 1)),
          maxBuyQuantity
        );
      } else if (action === "SELL") {
        qtyToSend = Math.min(
          Math.max(1, Math.floor(quantity || 1)),
          maxSellQuantity
        );
      }

      if ((action === "BUY" && qtyToSend <= 0) || (action === "SELL" && qtyToSend <= 0)) {
        setError(
          action === "BUY"
            ? "No tienes suficiente cash para comprar esa cantidad."
            : "No tienes suficientes acciones para vender esa cantidad."
        );
        setLoading(false);
        return;
      }

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
        const expectedAction = expectedActionFromReturn(y);

        setLastResult({
          action,
          aiAction: aiSuggestedAction,
          expectedAction,
          matchedAi: aiSuggestedAction === action,
          y,
          correct,
          prevPrice,
          newPrice,
          prevAnchor,
          newAnchor,
        });

        if (correct) {
          await awardXp(
            XP_REWARD_CORRECT_DECISION,
            "Decision correcta",
            `+${XP_REWARD_CORRECT_DECISION} XP por elegir ${action} entre ${prevAnchor} y ${newAnchor}.`
          );
        }
      } else {
        setLastResult(null);
      }

      const nextScenarioId = extractScenarioId(nextScenario) || id;
      const finalProfit = getPortfolioProfit(nextScenario);
      if (
        nextScenario?.finished &&
        finalXpAwardedScenarioId !== nextScenarioId &&
        finalProfit != null &&
        finalProfit > EPS_EUR
      ) {
        setFinalXpAwardedScenarioId(nextScenarioId);
        await awardXp(
          XP_REWARD_PROFITABLE_SCENARIO,
          "Escenario con ganancias",
          `+${XP_REWARD_PROFITABLE_SCENARIO} XP por acabar con ${fmtEurES(finalProfit)} sobre el capital inicial.`
        );
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

  const actionsDisabled = loading || !started || finished;
  const userLevel = Math.max(1, user?.level ?? 1);
  const requiredAccessLevel = challenge?.requiredLevel ?? 3;
  const scenariosUnlocked = userLevel >= requiredAccessLevel;

  if (!scenariosUnlocked) {
    return (
      <main className="min-h-screen bg-[#020617] px-6 pb-6 pt-24 text-[#e5e7eb]">
        <Navbar />

        <section className="mx-auto max-w-5xl rounded-lg border border-slate-700 bg-slate-900/70 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Escenarios bloqueados
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Necesitas alcanzar el nivel {requiredAccessLevel}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            {challenge
              ? "Este reto histórico usa simulación multi-turn y se habilita al alcanzar su nivel requerido."
              : "Los escenarios libres usan simulación multi-turn y se habilitan cuando tu perfil llega como mínimo al nivel 3."} Puedes subir de nivel con los conceptos y sus tests.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/conceptos"
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Ir a conceptos
            </Link>
            <Link
              href="/retos-historicos"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
            >
              Ver retos históricos
            </Link>
          </div>
        </section>
      </main>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="min-h-screen bg-[#020617] px-6 pb-6 pt-24 text-[#e5e7eb]">
      <Navbar />

      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold">Escenarios (Market Engine)</h1>
        <p className="mt-2 text-sm opacity-80">
          Simulación histórica multi-turn con decisiones BUY / HOLD / SELL.
        </p>

        {challengeTitle && (
          <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm text-emerald-100">
            <p className="font-semibold">Reto histórico: {challengeTitle}</p>
            <p className="mt-1 opacity-90">
              Genera un escenario dentro del periodo del reto para practicar sin usar el aleatorio general.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3 items-center">
          {challenge && (
            <button
              className={btnClass}
              onClick={onHistoricalChallenge}
              disabled={loading}
            >
              Generar escenario del reto
            </button>
          )}

          {!challenge && (
            <button className={btnClass} onClick={onRandom} disabled={loading}>
              Random
            </button>
          )}

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

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <span className="opacity-80">Modelo IA</span>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value as AiModelType)}
              disabled={loading}
              className="rounded-md border border-slate-500 bg-slate-950 px-3 py-2 text-slate-100"
            >
              {AI_MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-4 text-rose-300">{error}</p>}

        {xpEvents.length > 0 && (
          <section className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/25 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-emerald-100">XP del escenario</h2>
              <span className="text-xs text-emerald-200/80">
                Decision correcta: +{XP_REWARD_CORRECT_DECISION} XP | Final con ganancias: +{XP_REWARD_PROFITABLE_SCENARIO} XP
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {xpEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className={`rounded-md border px-3 py-2 ${
                    event.status === "saved"
                      ? "border-emerald-400/50 bg-emerald-900/30 text-emerald-50"
                      : event.status === "skipped"
                      ? "border-amber-400/50 bg-amber-900/25 text-amber-50"
                      : "border-rose-400/50 bg-rose-900/25 text-rose-50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{event.title}</span>
                    <span className="font-semibold">+{event.amount} XP</span>
                  </div>
                  <p className="mt-1 text-xs opacity-85">{event.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {scenario && finished && (
          <section className="mt-6 border border-slate-600 rounded-lg p-5 text-sm text-[#e5e7eb]">
            <div className="rounded-lg border border-sky-400/60 bg-sky-950/40 p-4">
              <h2 className="text-lg font-semibold text-[#f9fafb]">
                <span className="mr-2 text-emerald-300">OK</span>
                Resultados de la sesión
              </h2>
              <p className="mt-1 text-[#cbd5e1]">
                Sesión finalizada: has llegado al máximo de turnos ({maxTurns}).
                Para continuar, pulsa <b>Random</b> o carga otro <b>ID</b>.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {finalValue != null && deltaValue != null && (
                <div className={`rounded-lg p-4 ${outcomeBoxClass}`}>
                  <div className="font-semibold text-base">
                    {outcome === "WIN"
                      ? "Has terminado con ganancias"
                      : outcome === "LOSS"
                      ? "Has terminado con pérdidas"
                      : "Has terminado en tablas"}
                  </div>

                  <div className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 opacity-90">
                    <span>Capital inicial:</span>
                    <b>{fmtEurES(initialPortfolioValue)}</b>
                  </div>
                  <div className="grid grid-cols-[8rem_1fr] gap-x-3 opacity-90">
                    <span>Valor final:</span>
                    <b>{fmtEurES(finalValue)}</b>
                  </div>
                  <div className="grid grid-cols-[8rem_auto_auto] gap-x-3 opacity-90">
                    <span>Resultado:</span>
                    <b>
                      {deltaValue > 0 ? "+" : ""}
                      {fmtEurES(deltaValue)}
                    </b>
                    <b>{walletReturn != null ? fmtPct2(walletReturn) : "-"}</b>
                  </div>
                </div>
              )}

              {hasDecisionComparison && (
                <div className={`rounded-lg p-4 ${decisionBoxClass}`}>
                  <div className="font-semibold text-base">
                    {decisionWinner === "USER"
                      ? "Has obtenido mejor puntuación de decisiones que la IA"
                      : decisionWinner === "AI"
                      ? "La IA ha obtenido mejor puntuación de decisiones"
                      : "Empate en puntuación de decisiones"}
                  </div>

                  <div className="mt-2 grid grid-cols-[9rem_1fr] gap-x-3 opacity-90">
                    <span>Tu puntuación:</span>
                    <b>{fmtPct2(userDecisionScore)}</b>
                  </div>
                  <div className="grid grid-cols-[9rem_1fr] gap-x-3 opacity-90">
                    <span>Puntuación IA:</span>
                    <b>{fmtPct2(aiDecisionScore)}</b>
                  </div>
                  <p className="mt-2 opacity-80">
                    Esta comparación no mide el dinero final de la cartera. Mide
                    cómo de alineadas estuvieron tus decisiones BUY, HOLD o SELL
                    con el movimiento real posterior del precio.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* INFO */}
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
                {turn ?? "-"} / {maxTurns}
              </b>
            </div>

            <div>
              <span className="opacity-70">
                Rendimiento acumulado de decisiones (tú):
              </span>{" "}
              <b className="font-semibold">{fmtMaybePct2(userScoreAccum)}</b>
            </div>
            <div>
              <span className="opacity-70">
                Rendimiento acumulado de decisiones (IA):
              </span>{" "}
              <b className="font-semibold">{fmtMaybePct2(aiScoreAccum)}</b>
            </div>
          </div>
        </div>

        {scenario && features && (
          <section className="mt-6 rounded-lg border border-slate-600 bg-slate-900/35 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  Datos para decidir
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Lectura rápida del momento actual antes de elegir BUY, HOLD o SELL.
                </p>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm">
                <span className="text-slate-400">Precio actual: </span>
                <b>{Number.isFinite(currentPrice) ? fmtPrice2(currentPrice) : "-"}</b>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DecisionMetric
                label="Tendencia"
                value={trendReading}
                detail={`SMA20 ${Number.isFinite(sma20) ? fmtPrice2(sma20) : "-"} - SMA50 ${
                  Number.isFinite(sma50) ? fmtPrice2(sma50) : "-"
                }`}
              />
              <DecisionMetric
                label="RSI 14"
                value={Number.isFinite(rsi14) ? fmtNumberES2(rsi14) : "-"}
                detail={rsiReading}
              />
              <DecisionMetric
                label="Volatilidad 20d"
                value={Number.isFinite(vol20) ? fmtPct2(vol20) : "-"}
                detail="Movimiento reciente esperado"
              />
              <DecisionMetric
                label="Drawdown 60d"
                value={Number.isFinite(drawdown60) ? fmtPct2(drawdown60) : "-"}
                detail={riskReading}
              />
              <DecisionMetric
                label="Volumen relativo"
                value={Number.isFinite(volRel20) ? `${fmtNumberES2(volRel20)}x` : "-"}
                detail={
                  Number.isFinite(volRel20) && volRel20 > 1.2
                    ? "Actividad por encima de lo normal"
                    : "Actividad normal o baja"
                }
              />
              <DecisionMetric
                label="Turno"
                value={`${turn ?? "-"} / ${maxTurns}`}
                detail="Progreso de la partida"
              />
              <DecisionMetric
                label="Tu decisión acumulada"
                value={fmtMaybePct2(userScoreAccum)}
                detail="Suma de aciertos de dirección"
              />
              <DecisionMetric
                label="Decisión IA acumulada"
                value={fmtMaybePct2(aiScoreAccum)}
                detail="Referencia, no respuesta obligatoria"
              />
            </div>
          </section>
        )}

        {/* IA */}
        {scenario && aiAction && (
          <details className="mt-6 rounded-lg border border-sky-500/35 bg-sky-950/20 p-4">
            <summary className="cursor-pointer list-none text-base font-medium text-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span>Ver recomendación IA</span>
                  <p className="mt-1 text-sm font-normal text-slate-400">
                    Pulsa aquí para desplegar la recomendación del modelo antes de decidir.
                  </p>
                </div>
                <span className="rounded-full border border-sky-400/40 bg-sky-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
                  Click para abrir
                </span>
              </div>
            </summary>
            <p className="mt-3 text-sm text-slate-400">
              Esta sección está oculta por defecto para no darte una pista inmediata si prefieres decidir por tu cuenta.
            </p>

            <div className="mt-4 border border-slate-600 rounded-lg p-5">
              <h2 className="text-lg font-semibold">Recomendación IA</h2>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-center">
                <div>
                  <div className="opacity-70">Acción IA</div>
                  <div className="font-semibold">{aiAction}</div>
                </div>

                <div>
                  <div className="opacity-70">Confianza</div>
                  <div className="font-semibold">{aiConfidence ?? "?"}</div>
                </div>

                <div>
                  <div className="opacity-70">Modelo</div>
                  <div className="font-semibold">{aiModelType}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(["BUY", "HOLD", "SELL"] as Action[]).map((action) => {
                  const probability = Number(aiProbabilities?.[action]);
                  const isSelected = aiAction === action;

                  return (
                    <div
                      key={action}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        isSelected
                          ? "border-sky-400/60 bg-sky-950/30 text-sky-100"
                          : "border-slate-700 bg-slate-950/40 text-slate-200"
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                        {action}
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {Number.isFinite(probability) ? fmtPct2(probability) : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasUserMadeDecision && aiShapAvailable && (
                <div className="mt-5 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                        Por qué la IA recomienda {aiShap.target_action}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        La IA partía de una probabilidad base de {fmtPct2(Number(aiShap.base_value))} para {aiShap.target_action}. Estas variables la empujan a favor o en contra.
                      </p>
                    </div>

                    <div className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Probabilidad
                      </div>
                      <div className="text-lg font-semibold text-slate-50">
                        {fmtPct2(Number(aiShap.predicted_probability))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-slate-400">
                        <tr className="border-b border-slate-800">
                          <th className="px-0 py-2 font-medium">Variable</th>
                          <th className="px-3 py-2 font-medium">Valor</th>
                          <th className="px-3 py-2 font-medium">Impacto SHAP</th>
                          <th className="px-3 py-2 font-medium">Lectura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiShapTopFeatures.map((item: any) => {
                          const shapValue = Number(item?.shap_value);
                          const isPositive = Number.isFinite(shapValue) && shapValue >= 0;

                          return (
                            <tr
                              key={`${item?.feature}-${item?.shap_value}`}
                              className="border-b border-slate-900/80 last:border-b-0"
                            >
                              <td className="px-0 py-3 font-medium text-slate-100">
                                {formatFeatureLabel(String(item?.feature ?? ""))}
                              </td>
                              <td className="px-3 py-3 text-slate-300">
                                {fmtNumberES2(item?.feature_value)}
                              </td>
                              <td
                                className={`px-3 py-3 font-semibold ${
                                  isPositive ? "text-emerald-300" : "text-rose-300"
                                }`}
                              >
                                {fmtShapValue(item?.shap_value)}
                              </td>
                              <td className="px-3 py-3 text-slate-300">
                                {isPositive
                                  ? `Empuja hacia ${aiShap.target_action}`
                                  : `Resta fuerza a ${aiShap.target_action}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasUserMadeDecision && !aiShapAvailable && aiShap?.available === false && (
                <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-950/20 p-4 text-sm text-amber-100">
                  La explicación SHAP no está disponible para esta predicción.
                </div>
              )}
            </div>
          </details>
        )}

        {/* CARTERA */}
        {wallet && (
          <div className="mt-6 border border-slate-600 rounded-lg p-4 text-sm">
            <div className="font-semibold mb-2">Cartera</div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-4 gap-y-2">
              <div>
                <span className="opacity-70">Cash:</span>{" "}
                <b className="font-semibold">{fmtEurES(wallet.cash)}</b>
              </div>
              <div>
                <span className="opacity-70">Acciones:</span>{" "}
                <b className="font-semibold">{fmtIntES(wallet.shares)}</b>
              </div>
              <div>
                <span className="opacity-70">Valor total:</span>{" "}
                <b className="font-semibold">
                  {fmtEurES(wallet.portfolio_value)}
                </b>
              </div>
              <div>
                <span className="opacity-70">Beneficio/Pérdida:</span>{" "}
                <b className="font-semibold">
                  {Number(wallet.pnl_total) >= 0 ? "+" : ""}
                  {fmtEurES(wallet.pnl_total)}
                </b>
              </div>
              <div>
                <span className="opacity-70">Rentabilidad cartera:</span>{" "}
                <b className="font-semibold">
                  {walletReturn != null ? fmtPct2(walletReturn) : "-"}
                </b>
              </div>
            </div>
          </div>
        )}

        {/* GRAFICO */}
        <h2 className="mt-8 text-lg font-medium">Gráfico</h2>

        {/* cantidad */}
        <div className="mt-3 flex justify-center gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 text-sm opacity-90">
            <span className="opacity-70">Cantidad:</span>
            <input
              type="number"
              min={1}
              max={Math.max(maxBuyQuantity, maxSellQuantity, 1)}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.max(
                    1,
                    Math.min(
                      Math.floor(Number(e.target.value) || 1),
                      Math.max(maxBuyQuantity, maxSellQuantity, 1)
                    )
                  )
                )
              }
              className="px-3 py-2 border border-slate-500 rounded w-28 bg-transparent"
              disabled={actionsDisabled}
            />
          </div>

          <div className="text-xs text-slate-400">
            Max comprar: {fmtIntES(maxBuyQuantity)} | Max vender: {fmtIntES(maxSellQuantity)}
          </div>

          <button
            className={actionBtnClass}
            onClick={() => onAction("BUY")}
            disabled={actionsDisabled || maxBuyQuantity <= 0}
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
            disabled={actionsDisabled || maxSellQuantity <= 0}
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
              {lastResult.correct ? "Acción alineada con el movimiento real" : "Acción no alineada con el movimiento real"}
            </div>
            <div className="opacity-90 mt-1">
              <b>{lastResult.action}</b> | {lastResult.prevAnchor} (
              {fmtPrice2(lastResult.prevPrice)}) {"->"} {lastResult.newAnchor} (
              {fmtPrice2(lastResult.newPrice)}) | <b>{fmtPct2(lastResult.y)}</b>
            </div>
            <div className="opacity-80 mt-1">
              La acción que mejor encajaba con ese movimiento era <b>{lastResult.expectedAction}</b>.
              {lastResult.aiAction && (
                <>
                  {" "}La IA sugirió <b>{lastResult.aiAction}</b> y tú{" "}
                  {lastResult.matchedAi ? "coincidiste" : "no coincidiste"} con ella.
                </>
              )}
            </div>
          </div>
        )}

        <MarketChart scenario={scenario} />
      </div>
    </main>
  );
}

function DecisionMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/45 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-50">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

