import pandas as pd

from market_engine.config import FEATURES_DIR, SCENARIOS_DIR
from market_engine.models.rules import predict_from_row, prediction_to_dict


def main():
    scenarios = pd.read_parquet(SCENARIOS_DIR / "scenarios.parquet")
    s = scenarios.sample(1, random_state=1).iloc[0]

    ticker = s["ticker"]
    t = pd.to_datetime(s["anchor_date"])

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")
    row = df.loc[t]

    pred = predict_from_row(row)
    print("Scenario:", s["scenario_id"], ticker, str(t.date()))
    print(prediction_to_dict(pred))


if __name__ == "__main__":
    main()

