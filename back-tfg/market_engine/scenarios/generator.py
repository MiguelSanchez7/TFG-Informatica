# -*- coding: utf-8 -*-
import pandas as pd
import uuid

from market_engine.config import (
    FEATURES_DIR, SCENARIOS_DIR, TICKERS,
    CONTEXT_DAYS, HORIZON_DAYS
)


def generate_scenarios(max_per_ticker: int = 200):
    scenarios = []

    for ticker in TICKERS:
        path = FEATURES_DIR / f"{ticker}.parquet"
        if not path.exists():
            print(f"⚠️ {ticker}: features not found")
            continue

        df = pd.read_parquet(path)

        # Quitamos filas donde aún no hay features suficientes
        df = df.dropna(subset=[
            "sma20", "sma50", "rsi14", "vol20", "drawdown60", "vol_rel20"
        ])

        dates = df.index

        # Fechas válidas: con pasado suficiente y futuro suficiente
        valid_dates = dates[CONTEXT_DAYS:-HORIZON_DAYS]

        # Para no generar millones, muestreamos
        if len(valid_dates) > max_per_ticker:
            valid_dates = valid_dates.to_series().sample(
                max_per_ticker, random_state=42
            ).sort_values()

        for d in valid_dates:
            scenarios.append({
                "scenario_id": str(uuid.uuid4()),
                "ticker": ticker,
                "anchor_date": d,
                "horizon_days": HORIZON_DAYS,
                "context_days": CONTEXT_DAYS
            })

        print(f"✅ {ticker}: {len(valid_dates)} scenarios")

    out = pd.DataFrame(scenarios)
    SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = SCENARIOS_DIR / "scenarios.parquet"
    out.to_parquet(out_path)

    print(f"\n��� Total scenarios generated: {len(out)}")
    return out


if __name__ == "__main__":
    generate_scenarios()

