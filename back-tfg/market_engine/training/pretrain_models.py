from __future__ import annotations      # permite usar anotaciones
import time                             # permite medir cuánto tarda cada entrenamiento y el proceso completo
import pandas as pd                     # se utiliza para leer el archivo de escenarios y trabajar con las fechas

from market_engine.config import SCENARIOS_DIR                                          # SCENARIOS_DIR = es donde están guardados los escenarios históricos -> "scenarios.parquet" 
from market_engine.training.train_mlp import get_model_paths, train_mlp_classifier      # ambas funciones vienen de train_mlp.py
                                                                                        # get_model_paths = donde esta guardado el modelo
                                                                                        # train_mlp_classifier = funcion que entrena


# Aqui leemos los escenarios y sacamos las fechas en las que hara falta tener un modelo MLP
# list[str] será "anchor_dates"
def load_unique_anchor_dates() -> list[str]:                            
    
    # scenarios_path = archivo parquet con todos los escenarios historicos
    scenarios_path = SCENARIOS_DIR / "scenarios.parquet"

    # Cargamos todos los escenarios generados por el proyecto -> scenario (dataframe de "pandas") = tabla con filas y columnas
    scenarios = pd.read_parquet(scenarios_path)

    # Sacamos las fechas ancla únicas de todos los escenarios
    # Cada fecha ancla tiene su propio modelo entrenado solo con datos anteriores
    anchor_dates = (
        pd.to_datetime(scenarios["anchor_date"])        # 1. convertir la columna "anchor_date" a formato fecha
        .dt.date.astype(str)                            # 2. 
        .drop_duplicates()                              # 3. eliminar fechas repetidas
        .sort_values()                                  # 4. ordenarlas
        .tolist()                                       # 5. convertir el resultado en una lista normal de python
    )

    # Devolvemos las fechas ordenadas de mas antigua a mas reciente
    return anchor_dates


# Aqui para cada fecha del "anchor_date" entrenamos su modelo
def pretrain_all_models(skip_existing: bool = True) -> None:
    
    anchor_dates = load_unique_anchor_dates()                       # anchor_dates = lista de fechas obtenida

    total = len(anchor_dates)                                       # total = numero total de modelos que habria que revisar o entrenar

    print(f"Found {total} unique anchor dates to pretrain.")

    global_start = time.time()                                      # global_start sirve para medir el tiempo total del proceso

    # Contadores 
    trained = 0                                                     # modelos entrenados correctamente
    skipped = 0                                                     # modelos saltados porque ya existían
    failed = 0                                                      # modelos que han fallado

    try:
        # Recorremos cada fecha ancla una a una
        for index, anchor_date in enumerate(anchor_dates, start = 1):
            
            # Obtenemos las rutas donde deberian estar el modelo y su metadata
            model_path, metadata_path = get_model_paths(prediction_date = anchor_date)

            # Si ya existen ambos archivos, no repetimos el entrenamiento
            if skip_existing and model_path.exists() and metadata_path.exists():
                skipped += 1
                print(f"[{index}/{total}] {anchor_date} -> skipped (already exists)")
                continue

            # Si falta el modelo o la metadata, entrenamos esa fecha
            print(f"[{index}/{total}] {anchor_date} -> training...")
            start = time.time()                                         # guardamos su tiempo de inicio para calcular su tiempo de entreno

            try:
                # Aqui llamamos a train_mlp_classifier prepara el dataset temporal, entrenar el MLP y guardarlo
                #
                # train_mlp_classifier está en train_mlp.py
                #
                train_mlp_classifier(prediction_date=anchor_date)

                # Medimos cuanto ha tardado este modelo concreto
                elapsed = time.time() - start
                trained += 1
                print(
                    f"[{index}/{total}] {anchor_date} -> done in {elapsed:.2f}s"
                )
            except Exception as exc:
                
                # Si una fecha falla, la apuntamos pero seguimos con las demas
                elapsed = time.time() - start
                failed += 1
                print(
                    f"[{index}/{total}] {anchor_date} -> FAILED in {elapsed:.2f}s: {exc}"
                )
                
    except KeyboardInterrupt:
        
        # Si el usuario corta el proceso, paramos sin ocultar lo ya entrenado
        print("\nPretraining interrupted by user (Ctrl + C).")

    # Al terminar, mostramos un resumen corto del preentrenamiento
    total_elapsed = time.time() - global_start
    print("\nPretraining finished.")
    print(f"Trained: {trained}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")
    print(f"Total time: {total_elapsed:.2f}s")


if __name__ == "__main__":
    
    pretrain_all_models()
