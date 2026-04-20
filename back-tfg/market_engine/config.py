from pathlib import Path

# START_DATE = fecha más antigua de los datos que usamos.
START_DATE = "2008-01-01"

# END_DATE = fecha más reciente del dataset congelado.
END_DATE = "2025-12-31"

# HORIZON_DAYS = horizonte temporal del escenario single-shot.
HORIZON_DAYS = 20

# CONTEXT_DAYS = cuántos días históricos mostramos al usuario antes del punto actual.
CONTEXT_DAYS = 252

# STEP_DAYS = cuántos días avanza el simulador en cada turno del multiturno.
STEP_DAYS = 5

# MAX_TURNS = número máximo de turnos por partida multiturno.
MAX_TURNS = 5


# TICKERS = lista de empresas con las que trabaja el proyecto.
TICKERS = [
    "AAPL","MSFT","GOOGL","AMZN","META","NVDA","TSLA","INTC","CSCO","IBM",
    "JPM","BAC","GS","MS","V","MA","AXP",
    "KO","PEP","MCD","NKE","WMT","DIS","BA","CAT",
    "JNJ","PFE","UNH","PG","XOM"
]

# BASE_DIR = carpeta donde está este archivo config.py.
BASE_DIR = Path(__file__).resolve().parent

# DATA_DIR = carpeta principal donde guardamos todos los datos del motor.
DATA_DIR = BASE_DIR / "data"

# RAW_DIR = datos descargados tal cual, sin limpiar.
RAW_DIR = DATA_DIR / "raw"

# CLEAN_DIR = datos ya limpiados y preparados.
CLEAN_DIR = DATA_DIR / "clean"

# FEATURES_DIR = datos con indicadores calculados.
FEATURES_DIR = DATA_DIR / "features"

# SCENARIOS_DIR = escenarios históricos que usa la aplicación.
SCENARIOS_DIR = DATA_DIR / "scenarios"

# MANIFEST_DIR = archivos auxiliares o de control del pipeline.
MANIFEST_DIR = DATA_DIR / "manifest"

# MODELS_DIR = carpeta para guardar modelos MLP ya entrenados y sus metadatos.
MODELS_DIR = DATA_DIR / "models"

# Creamos todas las carpetas si todavía no existen.
for d in [RAW_DIR, CLEAN_DIR, FEATURES_DIR, SCENARIOS_DIR, MANIFEST_DIR, MODELS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

