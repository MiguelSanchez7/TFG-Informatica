import yfinance as yf
import pandas as pd
from pathlib import Path

# =========================
# CONFIGURACIÓN
# =========================

DATA_DIR = Path("datos")  # usa tu carpeta "datos"
DATA_DIR.mkdir(exist_ok=True)

# Top S&P 500 por peso (Slickcharts). Ajustes:
# - BRK.B -> BRK-B (formato Yahoo)
# - Quitamos GOOG para no duplicar Alphabet (dejamos GOOGL)
# - Añadimos AMAT para compensar y mantener ~50 tickers
TICKERS = [
    "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL",
    "META", "TSLA", "AVGO", "BRK-B", "LLY",
    "WMT", "JPM", "V", "ORCL", "MA",
    "JNJ", "XOM", "PLTR", "NFLX", "BAC",
    "ABBV", "COST", "HD", "PG", "AMD",
    "GE", "CSCO", "KO", "UNH", "CVX",
    "WFC", "MU", "IBM", "MS", "GS",
    "CAT", "AXP", "MRK", "PM", "CRM",
    "RTX", "APP", "MCD", "TMUS", "ABT",
    "TMO", "LRCX", "PEP", "C", "AMAT"
]

START_DATE = "2010-01-01"
END_DATE   = "2025-12-31"

CSV_PYTHON = DATA_DIR / "prices.csv"
CSV_EXCEL  = DATA_DIR / "prices_excel.csv"

# =========================
# DESCARGA
# =========================

all_rows = []

for ticker in TICKERS:
    print(f"📥 Descargando {ticker}...")

    df = yf.download(
        ticker,
        start=START_DATE,
        end=END_DATE,
        auto_adjust=False,
        progress=False,
        group_by="column"  # ayuda a evitar columnas raras
    )

    if df is None or df.empty:
        print(f"⚠️  No se han obtenido datos para {ticker}")
        continue

    df = df.reset_index()  # Date -> columna
    df["ticker"] = ticker

    # Aplanar columnas si vienen como tuplas (a veces yfinance lo hace)
    df.columns = [c[0] if isinstance(c, tuple) else c for c in df.columns]

    # Normalizar nombres
    df.columns = [c.lower().replace(" ", "_") for c in df.columns]

    # Selección estándar OHLCV
    # (si alguna columna faltase por un caso raro, lo verás en el error)
    df = df[["date", "ticker", "open", "high", "low", "close", "volume"]]

    all_rows.append(df)

if not all_rows:
    raise RuntimeError("❌ No se han descargado datos de ningún ticker.")

data = pd.concat(all_rows, ignore_index=True)
data["date"] = pd.to_datetime(data["date"])
data = data.sort_values(["ticker", "date"])

# =========================
# GUARDAR
# =========================

# 1) CSV estándar para Python / ML / Supabase
data.to_csv(CSV_PYTHON, index=False)
print(f"✅ Creado {CSV_PYTHON}")

# 2) CSV “bonito” para Excel (España): ; y coma decimal
data.to_csv(CSV_EXCEL, sep=";", decimal=",", index=False)
print(f"✅ Creado {CSV_EXCEL} (para Excel)")

print("\n🎉 Proceso completado")
print("Tickers descargados:", data["ticker"].nunique())
print("Filas totales:", len(data))
print("\nPrimeras filas:")
print(data.head())
