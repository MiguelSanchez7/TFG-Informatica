import pandas as pd
from typing import Dict

from market_engine.config import (
    SCENARIOS_DIR,
    FEATURES_DIR,
    CONTEXT_DAYS,
    HORIZON_DAYS,
    TICKERS,
    STEP_DAYS,
    MAX_TURNS,
)

from market_engine.models.rules import predict_from_row, prediction_to_dict


# ======================================================
# Utils
# ======================================================

def list_tickers():
    return TICKERS


def _load_scenarios_df() -> pd.DataFrame:
    return pd.read_parquet(SCENARIOS_DIR / "scenarios.parquet")


def _normalize_scenario_id(value) -> str:
    if value is None:
        raise ValueError("Invalid scenario_id")
    return str(value).strip()


def _score_action(action: str, y_real: float) -> float:
    action = action.upper().strip()
    if action not in ("BUY", "HOLD", "SELL"):
        raise ValueError("Invalid action")

    if action == "BUY":
        return float(y_real)
    if action == "SELL":
        return float(-y_real)
    return 0.0


# ======================================================
# SINGLE-SHOT (NO TOCAR)
# ======================================================

def get_scenario(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)

    scenarios = _load_scenarios_df()
    row = scenarios[scenarios["scenario_id"].astype(str) == scenario_id]
    if row.empty:
        raise ValueError("Scenario not found")

    s = row.iloc[0]
    ticker = s["ticker"]
    anchor = pd.to_datetime(s["anchor_date"])

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    if anchor not in df.index:
        raise ValueError("Anchor not in features")

    context = df.loc[:anchor].tail(CONTEXT_DAYS)
    feat_row = df.loc[anchor]

    pred = predict_from_row(feat_row)

    return {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "anchor_date": str(anchor.date()),
        "horizon_days": int(s.get("horizon_days", HORIZON_DAYS)),
        "context_days": CONTEXT_DAYS,
        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in context.iterrows()
        ],
        "features_at_t": {
            "adj_close": float(feat_row["adj_close"]),
            "ret_1d": None if pd.isna(feat_row.get("ret_1d")) else float(feat_row["ret_1d"]),
            "sma20": float(feat_row["sma20"]),
            "sma50": float(feat_row["sma50"]),
            "rsi14": float(feat_row["rsi14"]),
            "vol20": float(feat_row["vol20"]),
            "drawdown60": float(feat_row["drawdown60"]),
            "vol_rel20": float(feat_row["vol_rel20"]),
        },
        "ai": prediction_to_dict(pred),
    }


def get_random_scenario(seed: int | None = None) -> dict:
    scenarios = _load_scenarios_df()
    s = scenarios.sample(1, random_state=seed).iloc[0]
    return get_scenario(str(s["scenario_id"]))


# ======================================================
# MULTI-TURN ENGINE (EL BUENO)
# ======================================================

ACTIVE_SESSIONS: Dict[str, dict] = {}


def start_multiturn_session(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)

    scenarios = _load_scenarios_df()
    row = scenarios[scenarios["scenario_id"].astype(str) == scenario_id]
    if row.empty:
        raise ValueError("Scenario not found")

    s = row.iloc[0]
    ticker = s["ticker"]
    anchor = pd.to_datetime(s["anchor_date"])

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    if anchor not in df.index:
        raise ValueError("Anchor not in features")

    ACTIVE_SESSIONS[scenario_id] = {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "current_date": anchor,
        "turn": 0,
        "user_score": 0.0,
        "ai_score": 0.0,
        "finished": False,

        # ✅ Esto es el historial de TURNOS (no tocar el nombre interno)
        "history": [],
    }

    return get_multiturn_state(scenario_id)


def get_multiturn_state(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)
    if scenario_id not in ACTIVE_SESSIONS:
        raise ValueError("Session not started")

    st = ACTIVE_SESSIONS[scenario_id]
    df = pd.read_parquet(FEATURES_DIR / f"{st['ticker']}.parquet")
    t = st["current_date"]

    context = df.loc[:t].tail(CONTEXT_DAYS)
    feat_row = df.loc[t]
    pred = predict_from_row(feat_row)

    return {
        "scenario_id": scenario_id,
        "ticker": st["ticker"],
        "anchor_date": str(t.date()),
        "turn": st["turn"],
        "max_turns": MAX_TURNS,
        "finished": st["finished"],
        "user_score": st["user_score"],
        "ai_score": st["ai_score"],

        # ✅ HISTORIAL DE PRECIOS para el gráfico (NO ROMPER FRONT)
        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in context.iterrows()
        ],

        # ✅ NUEVO: HISTORIAL DE TURNOS con y_step (para scripts/estadísticas)
        "turn_history": st["history"],

        "features_at_t": {
            "adj_close": float(feat_row["adj_close"]),
            "sma20": float(feat_row["sma20"]),
            "sma50": float(feat_row["sma50"]),
            "rsi14": float(feat_row["rsi14"]),
            "vol20": float(feat_row["vol20"]),
            "drawdown60": float(feat_row["drawdown60"]),
            "vol_rel20": float(feat_row["vol_rel20"]),
        },
        "ai": prediction_to_dict(pred),
    }


def step_multiturn_session(scenario_id: str, user_action: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)
    if scenario_id not in ACTIVE_SESSIONS:
        raise ValueError("Session not started")

    st = ACTIVE_SESSIONS[scenario_id]
    if st["finished"]:
        return get_multiturn_state(scenario_id)

    df = pd.read_parquet(FEATURES_DIR / f"{st['ticker']}.parquet")
    t = st["current_date"]

    pred = predict_from_row(df.loc[t])
    ai_action = pred.action

    idx = df.index.get_loc(t)
    next_idx = idx + STEP_DAYS
    if next_idx >= len(df):
        st["finished"] = True
        return get_multiturn_state(scenario_id)

    t_next = df.index[next_idx]

    price_t = df.loc[t]["adj_close"]
    price_next = df.loc[t_next]["adj_close"]
    y = (price_next / price_t) - 1.0

    user_score = _score_action(user_action, y)
    ai_score = _score_action(ai_action, y)

    st["user_score"] += user_score
    st["ai_score"] += ai_score

    st["history"].append({
        "turn": st["turn"] + 1,
        "from": str(t.date()),
        "to": str(t_next.date()),
        "user_action": user_action,
        "ai_action": ai_action,
        "y_step": float(y),
    })

    st["turn"] += 1
    st["current_date"] = t_next

    if st["turn"] >= MAX_TURNS:
        st["finished"] = True

    return get_multiturn_state(scenario_id)
