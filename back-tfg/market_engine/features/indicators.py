import pandas as pd
import numpy as np

from market_engine.config import CLEAN_DIR, FEATURES_DIR, TICKERS


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _drawdown(series: pd.Series, window: int = 60) -> pd.Series:
    rolling_max = series.rolling(window).max()
    drawdown = (series - rolling_max) / rolling_max
    return drawdown


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Retorno diario (usamos adj_close)
    df["ret_1d"] = df["adj_close"].pct_change()

    # Tendencia
    df["sma20"] = df["adj_close"].rolling(20).mean()
    df["sma50"] = df["adj_close"].rolling(50).mean()

    # Momento
    df["rsi14"] = _rsi(df["adj_close"], 14)

    # Riesgo
    df["vol20"] = df["ret_1d"].rolling(20).std()
    df["drawdown60"] = _drawdown(df["adj_close"], 60)

    # Volumen relativo
    df["vol_rel20"] = df["volume"] / df["volume"].rolling(20).mean()

    return df


def build_all():
    FEATURES_DIR.mkdir(parents=True, exist_ok=True)

    ok, failed = 0, 0

    for ticker in TICKERS:
        try:
            path = CLEAN_DIR / f"{ticker}.parquet"
            if not path.exists():
                print(f"⚠️ {ticker}: clean parquet not found")
                failed += 1
                continue

            df = pd.read_parquet(path)
            df_feat = compute_features(df)

            out = FEATURES_DIR / f"{ticker}.parquet"
            df_feat.to_parquet(out)

            print(f"✅ {ticker}: features OK ({len(df_feat)} rows)")
            ok += 1

        except Exception as e:
            print(f"❌ {ticker}: {e}")
            failed += 1

    print(f"\nFeatures done. OK={ok}, Failed={failed}")


if __name__ == "__main__":
    build_all()

