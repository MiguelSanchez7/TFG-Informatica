import yfinance as yf
import pandas as pd
from pathlib import Path

# =========================
# CONFIGURACIÓN
# =========================

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

TICKERS = [
    "AAPL",
    "MSFT",
    "TSLA",
    "ITX.MC",
    "SAN.MC"
]

START_DATE = "2010-01-01"
END_DATE   = "2025-12-31"

CSV_PYTHON = DATA_DIR / "prices.csv"
CSV_EXCEL  = DATA_DIR / "prices_excel.csv"

# =========================
# DESCARGA DE DATOS
# =========================

all_rows = []

for ticker in TICKERS:
    print(f"📥 Descargando {ticker}...")

    df = yf.download(
        ticker,
        start=START_DATE,
        end=END_DATE,
        auto_adjust=False,
        progress=False
    )

    if df.empty:
        print(f"⚠️  No se han obtenido datos para {ticker}")
        continue

    df = df.reset_index()
    df["ticker"] = ticker

    # Aplanar columnas si vienen como tuplas
    df.columns = [
        c[0] if isinstance(c, tuple) else c
        for c in df.columns
    ]

    # Normalizar nombres
    df.columns = [
        c.lower().replace(" ", "_")
        for c in df.columns
    ]

    df = df[
        ["date", "ticker", "open", "high", "low", "close", "volume"]
    ]

    all_rows.append(df)

if not all_rows:
    raise RuntimeError("❌ No se han descargado datos")

# =========================
# UNIFICAR Y ORDENAR
# =========================

data = pd.concat(all_rows, ignore_index=True)
data["date"] = pd.to_datetime(data["date"])
data = data.sort_values(["ticker", "date"])

# =========================
# GUARDAR CSV PARA PYTHON / ML
# =========================

data.to_csv(CSV_PYTHON, index=False)
print(f"✅ Creado {CSV_PYTHON}")

# =========================
# GUARDAR CSV PARA EXCEL (ESPAÑOL)
# =========================

data.to_csv(
    CSV_EXCEL,
    sep=";",
    decimal=",",
    index=False
)
print(f"✅ Creado {CSV_EXCEL} (para Excel)")

print("\n🎉 PROCESO COMPLETADO")
print(f"Filas totales: {len(data)}")
