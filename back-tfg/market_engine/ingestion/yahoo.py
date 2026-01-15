import json
import yfinance as yf
import pandas as pd
from datetime import datetime, timezone
from tqdm import tqdm

from market_engine.config import (
    TICKERS, START_DATE, END_DATE,
    RAW_DIR, MANIFEST_DIR
)

def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    # A veces yfinance devuelve MultiIndex (o tuplas) en columnas.
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [str(c[0]) for c in df.columns]  # nos quedamos con el primer nivel
    else:
        # Si son tuplas sueltas
        df.columns = [str(c[0]) if isinstance(c, tuple) else str(c) for c in df.columns]

    df.columns = [c.lower().replace(" ", "_") for c in df.columns]
    return df


def download_all():
    manifest = {
        "source": "Yahoo Finance",
        "start_date": START_DATE,
        "end_date": END_DATE,
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
        "tickers": {}
    }

    for ticker in tqdm(TICKERS, desc="Downloading Yahoo data"):
        df = yf.download(
            ticker,
            start=START_DATE,
            end=END_DATE,
            interval="1d",
            auto_adjust=False,
            progress=False
        )

        if df is None or df.empty:
            print(f"⚠️ No data for {ticker}")
            continue

        df.index = pd.to_datetime(df.index)
        df.index.name = "date"

        df = _normalize_columns(df)

        # Guardar parquet
        path = RAW_DIR / f"{ticker}.parquet"
        df.to_parquet(path)

        manifest["tickers"][ticker] = {
            "rows": int(len(df)),
            "from": str(df.index.min().date()),
            "to": str(df.index.max().date()),
            "columns": list(df.columns)
        }

    # Guardar manifest en JSON
    manifest_path = MANIFEST_DIR / "raw_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("✅ Yahoo download finished")


if __name__ == "__main__":
    download_all()
