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


def get_scenario(scenario_id: str) -> dict:
    scenarios = _load_scenarios_df()
    row_s = scenarios[scenarios["scenario_id"] == scenario_id]
    if row_s.empty:
        raise ValueError(f"Scenario not found: {scenario_id}")

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

    # Payload listo para el front
    payload = {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "anchor_date": str(t.date()),
        "horizon_days": int(s["horizon_days"]),
        "context_days": int(s["context_days"]),

        # History para graficar (solo lo necesario)
        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in df_upto_t.iterrows()
        ],

        # Features en t (para mostrar al usuario)
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

        # Recomendación IA (reglas)
        "ai": prediction_to_dict(pred),
    }

    return payload


def get_random_scenario(ticker: str | None = None, seed: int = 42) -> dict:
    scenarios = _load_scenarios_df()

    if ticker is not None:
        scenarios = scenarios[scenarios["ticker"] == ticker]
        if scenarios.empty:
            raise ValueError(f"No scenarios for ticker: {ticker}")

    s = scenarios.sample(1, random_state=seed).iloc[0]
    return get_scenario(str(s["scenario_id"]))


def _score_action(action: str, y_real: float) -> float:
    """
    scoring educativo simple:
    - BUY  -> score = y_real
    - SELL -> score = -y_real
    - HOLD -> score = 0
    """
    action = action.upper().strip()
    if action not in ("BUY", "HOLD", "SELL"):
        raise ValueError(f"Invalid action: {action}")

    if action == "BUY":
        return float(y_real)
    if action == "SELL":
        return float(-y_real)
    return 0.0


def reveal_scenario(scenario_id: str, user_action: str) -> dict:
    """
    Devuelve el futuro real (t -> t+h) y la comparación usuario vs IA.
    """
    scenarios = _load_scenarios_df()
    row_s = scenarios[scenarios["scenario_id"] == scenario_id]
    if row_s.empty:
        raise ValueError(f"Scenario not found: {scenario_id}")

    s = row_s.iloc[0]
    ticker = s["ticker"]
    t = pd.to_datetime(s["anchor_date"])
    h = int(s["horizon_days"])

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    if t not in df.index:
        raise ValueError(f"Anchor date not found in features for {ticker}: {t}")

    # IA (acción en t)
    pred = predict_from_row(df.loc[t])
    ai_action = pred.action

    # Construimos futuro: siguientes h días de mercado (excluyendo t)
    future = df.loc[t:].iloc[: h + 1]  # incluye t y h días después
    if len(future) < h + 1:
        raise ValueError(f"Not enough future data for reveal: {ticker} {t} (need {h} days)")

    price_t = float(future.iloc[0]["adj_close"])
    price_th = float(future.iloc[-1]["adj_close"])

    y_real = (price_th / price_t) - 1.0

    user_score = _score_action(user_action, y_real)
    ai_score = _score_action(ai_action, y_real)

    payload = {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "anchor_date": str(t.date()),
        "horizon_days": h,

        "user_action": user_action.upper().strip(),
        "ai_action": ai_action,

        "y_real": float(y_real),
        "user_score": float(user_score),
        "ai_score": float(ai_score),

        # Para graficar el reveal
        "future_path": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in future.iterrows()
        ],

        # razones IA (para mostrar junto al reveal)
        "ai_reasons": prediction_to_dict(pred)["reasons"],
        "ai_confidence": prediction_to_dict(pred)["confidence"],
        "ai_rule_score": prediction_to_dict(pred)["score"],
    }

    return payload
