# supabase_client.py
import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client


ENV_PATH = Path(__file__).with_name(".env")

# El fichero .env en Windows puede guardarse con BOM UTF-8, lo que rompe
# la primera variable si no se indica una codificación tolerante.
load_dotenv(dotenv_path=ENV_PATH, encoding="utf-8-sig")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        f"No se pudieron cargar las credenciales de Supabase desde {ENV_PATH}"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
