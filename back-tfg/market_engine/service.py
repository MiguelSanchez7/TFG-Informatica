import pandas as pd

from market_engine.config import (
    SCENARIOS_DIR, FEATURES_DIR,
    CONTEXT_DAYS, HORIZON_DAYS, TICKERS
)
from market_engine.models.rules import predict_from_row, prediction_to_dict


def list_tickers():
    return TICKERS


def _load_scenarios_df() -> pd.DataFrame:
    path = SCENARIOS_DIR / "scenarios.parquet"
    return pd.read_parquet(path)


def _normalize_scenario_id(value) -> str:
    # Siempre trabajamos con scenario_id como STRING (UUID incluido)
    if value is None:
        raise ValueError("Invalid scenario_id: None")
    return str(value).strip()


def get_scenario(scenario_id: str) -> dict:
    scenario_id_norm = _normalize_scenario_id(scenario_id)

    scenarios = _load_scenarios_df()

    # Normalizamos la columna scenario_id a string para comparar seguro
    if "scenario_id" not in scenarios.columns:
        raise ValueError("scenarios.parquet no tiene la columna 'scenario_id'")

    scenarios_ids = scenarios["scenario_id"].astype(str)
    row_s = scenarios[scenarios_ids == scenario_id_norm]

    if row_s.empty:
        raise ValueError(f"Scenario not found: {scenario_id_norm}")

    s = row_s.iloc[0]
    ticker = s["ticker"]
    t = pd.to_datetime(s["anchor_date"])

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    if t not in df.index:
        raise ValueError(f"Anchor date not found in features for {ticker}: {t}")

    # Historia hasta t (últimos CONTEXT_DAYS)
    df_upto_t = df.loc[:t].tail(CONTEXT_DAYS)

    # Features en t (fila)
    feat_row = df.loc[t]

    # IA reglas
    pred = predict_from_row(feat_row)

    payload = {
        "scenario_id": scenario_id_norm,  # UUID/string
        "ticker": ticker,
        "anchor_date": str(t.date()),
        "horizon_days": int(s.get("horizon_days", HORIZON_DAYS)),
        "context_days": int(s.get("context_days", CONTEXT_DAYS)),

        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in df_upto_t.iterrows()
        ],

        "features_at_t": {
            "adj_close": float(feat_row["adj_close"]),
            "ret_1d": None if pd.isna(feat_row["ret_1d"]) else float(feat_row["ret_1d"]),
            "sma20": float(feat_row["sma20"]),
            "sma50": float(feat_row["sma50"]),
            "rsi14": float(feat_row["rsi14"]),
            "vol20": float(feat_row["vol20"]),
            "drawdown60": float(feat_row["drawdown60"]),
            "vol_rel20": float(feat_row["vol_rel20"]),
        },

        "ai": prediction_to_dict(pred),
    }

    return payload


def get_random_scenario(ticker: str | None = None, seed: int | None = None) -> dict:
    scenarios = _load_scenarios_df()

    if ticker is not None:
        scenarios = scenarios[scenarios["ticker"] == ticker]
        if scenarios.empty:
            raise ValueError(f"No scenarios for ticker: {ticker}")

    # seed=None => aleatorio real, seed=int => reproducible
    s = scenarios.sample(1, random_state=seed).iloc[0]

    # IMPORTANTE: scenario_id es UUID/string
    random_id = _normalize_scenario_id(s["scenario_id"])
    return get_scenario(random_id)


def _score_action(action: str, y_real: float) -> float:
    action = action.upper().strip()
    if action not in ("BUY", "HOLD", "SELL"):
        raise ValueError(f"Invalid action: {action}")

    if action == "BUY":
        return float(y_real)
    if action == "SELL":
        return float(-y_real)
    return 0.0


def reveal_scenario(scenario_id: str, user_action: str) -> dict:
    scenario_id_norm = _normalize_scenario_id(scenario_id)

    scenarios = _load_scenarios_df()
    scenarios_ids = scenarios["scenario_id"].astype(str)
    row_s = scenarios[scenarios_ids == scenario_id_norm]

    if row_s.empty:
        raise ValueError(f"Scenario not found: {scenario_id_norm}")

    s = row_s.iloc[0]
    ticker = s["ticker"]
    t = pd.to_datetime(s["anchor_date"])
    h = int(s.get("horizon_days", HORIZON_DAYS))

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    if t not in df.index:
        raise ValueError(f"Anchor date not found in features for {ticker}: {t}")

    pred = predict_from_row(df.loc[t])
    ai_action = pred.action

    # Futuro: siguientes h días (incluyendo t)
    future = df.loc[t:].iloc[: h + 1]
    if len(future) < h + 1:
        raise ValueError(f"Not enough future data for reveal: {ticker} {t} (need {h} days)")

    price_t = float(future.iloc[0]["adj_close"])
    price_th = float(future.iloc[-1]["adj_close"])
    y_real = (price_th / price_t) - 1.0

    user_score = _score_action(user_action, y_real)
    ai_score = _score_action(ai_action, y_real)

    pred_dict = prediction_to_dict(pred)

    payload = {
        "scenario_id": scenario_id_norm,
        "ticker": ticker,
        "anchor_date": str(t.date()),
        "horizon_days": h,

        "user_action": user_action.upper().strip(),
        "ai_action": ai_action,

        "y_real": float(y_real),
        "user_score": float(user_score),
        "ai_score": float(ai_score),

        "future_path": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in future.iterrows()
        ],

        "ai_reasons": pred_dict.get("reasons"),
        "ai_confidence": pred_dict.get("confidence"),
        "ai_rule_score": pred_dict.get("score"),
    }

    return payload
