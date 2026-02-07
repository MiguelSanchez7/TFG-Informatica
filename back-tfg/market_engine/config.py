from pathlib import Path

# Fechas del dataset (congelado)
START_DATE = "2008-01-01"
END_DATE = "2025-12-31"

# Simulador
HORIZON_DAYS = 20          # revelar a 20 días de mercado
CONTEXT_DAYS = 252         # mostrar ~1 año de histórico hasta t

# Multi-turn mode (TFG)
STEP_DAYS = 5      # días que avanza cada turno
MAX_TURNS = 5      # número máximo de turnos


# Tickers (30)
TICKERS = [
    "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","INTC","CSCO","IBM",
    "JPM","BAC","GS","MS","V","MA","AXP",
    "KO","PEP","MCD","NKE","WMT","DIS","BA","CAT",
    "JNJ","PFE","UNH","PG","XOM"
]

# Paths de datos dentro del motor
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

RAW_DIR = DATA_DIR / "raw"
CLEAN_DIR = DATA_DIR / "clean"
FEATURES_DIR = DATA_DIR / "features"
SCENARIOS_DIR = DATA_DIR / "scenarios"
MANIFEST_DIR = DATA_DIR / "manifest"

for d in [RAW_DIR, CLEAN_DIR, FEATURES_DIR, SCENARIOS_DIR, MANIFEST_DIR]:
    d.mkdir(parents=True, exist_ok=True)

