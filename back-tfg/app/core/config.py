import os

class Settings:
    PROJECT_NAME = "Market Engine API"
    VERSION = "0.1.0"

    # Entorno
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # Supabase (ejemplo, aunque ahora no lo uses)
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

settings = Settings()
