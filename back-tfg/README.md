# Backend – TFG Informática

Backend desarrollado con FastAPI.

## Arranque en local

```bash
cd back-tfg
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Contenido educativo

Las lecciones, el glosario y los quizzes se leen desde Supabase, no desde
archivos JSON locales.

Para preparar la base de datos:

1. Ejecuta `db/concepts_schema.sql` en el SQL editor de Supabase.
2. Ejecuta `db/concepts_seed.sql` para cargar el contenido inicial.

El endpoint `/concepts` mantiene el mismo formato de respuesta para el frontend.
