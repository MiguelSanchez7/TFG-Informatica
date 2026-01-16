import pandas as pd

from market_engine.config import RAW_DIR, CLEAN_DIR, TICKERS


REQUIRED_COLS = ["open", "high", "low", "close", "adj_close", "volume"]


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    # Asegura índice datetime y orden
    df = df.copy()
    df.index = pd.to_datetime(df.index)
    df = df[~df.index.duplicated(keep="first")]
    df = df.sort_index()
    df.index.name = "date"

    # Normaliza nombres de columnas
    df.columns = [str(c).lower().replace(" ", "_") for c in df.columns]

    # A veces adj_close no viene: si falta, usa close
    if "adj_close" not in df.columns and "adjclose" in df.columns:
        df = df.rename(columns={"adjclose": "adj_close"})
    if "adj_close" not in df.columns and "close" in df.columns:
        df["adj_close"] = df["close"]

    # Asegura que existan las columnas mínimas
    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    # Quédate solo con columnas requeridas y en orden
    df = df[REQUIRED_COLS]

    # Tipos numéricos
    for c in REQUIRED_COLS:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Elimina filas inválidas
    df = df.dropna(subset=["close"])
    df = df[df["volume"].fillna(0) >= 0]

    return df


def clean_all():
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)

    ok, failed = 0, 0

    for ticker in TICKERS:
        try:
            raw_path = RAW_DIR / f"{ticker}.parquet"
            if not raw_path.exists():
                print(f"⚠️ {ticker}: raw parquet not found")
                failed += 1
                continue

            df = pd.read_parquet(raw_path)
            df = _normalize(df)

            out_path = CLEAN_DIR / f"{ticker}.parquet"
            df.to_parquet(out_path)

            print(f"✅ {ticker}: {len(df)} rows ({df.index.min().date()} → {df.index.max().date()})")
            ok += 1

        except Exception as e:
            print(f"❌ {ticker}: {e}")
            failed += 1

    print(f"\nDone. OK={ok}, Failed={failed}")


if __name__ == "__main__":
    clean_all()

