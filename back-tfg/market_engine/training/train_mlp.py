from __future__ import annotations

import json
from pathlib import Path
import warnings

import joblib

from market_engine.config import MODELS_DIR
from market_engine.training.dataset import (
    build_temporal_dataset_split,
    build_training_dataset_for_prediction_date,
)


# MODEL_PATH = ruta del modelo "global" si entrenamos sin fecha concreta.
MODEL_PATH = MODELS_DIR / "mlp_model.joblib"

# METADATA_PATH = ruta de la metadata del modelo "global".
METADATA_PATH = MODELS_DIR / "mlp_metadata.json"

# Aqui decidimos que nombre de archivo usar para guardar o cargar un modelo MLP
def get_model_paths(prediction_date: str | None = None) -> tuple[Path, Path]:
    
    # Si no hay prediction_date, usamos el nombre global de siempre.
    if prediction_date is None:
        return MODEL_PATH, METADATA_PATH

    # date_key = fecha del escenario para nombrar el modelo.
    date_key = str(prediction_date)

    # model_path = archivo .joblib del modelo entrenado para esa fecha.
    model_path = MODELS_DIR / f"mlp_model_until_{date_key}.joblib"

    # metadata_path = archivo .json con la información de ese modelo.
    metadata_path = MODELS_DIR / f"mlp_metadata_until_{date_key}.json"

    # Devolvemos ambas rutas ya preparadas.
    return model_path, metadata_path

# Aqui creamos el pipeline completo de machine learning (pasos)
def _build_pipeline() -> Pipeline:
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    # El pipeline une en orden el preprocesado y el modelo.
    return Pipeline(
        steps=[
            # scaler = normaliza las variables X para que estén en escalas parecidas.
            ("scaler", StandardScaler()),
            (
                "mlp",
                # MLPClassifier = red neuronal que aprende BUY, HOLD o SELL.
                MLPClassifier(
                    # hidden_layer_sizes = tamaño de las capas ocultas.
                    hidden_layer_sizes=(16,),

                    # activation = función de activación de la red.
                    activation="relu",

                    # solver = algoritmo que ajusta los pesos de la red.
                    solver="adam",

                    # alpha = regularización para evitar sobreajuste.
                    alpha=1e-4,

                    # batch_size = cuántas filas usa en cada mini-bloque.
                    batch_size=64,

                    # learning_rate_init = tamaño inicial del paso de aprendizaje.
                    learning_rate_init=1e-3,

                    # max_iter = máximo de iteraciones del entrenamiento.
                    max_iter=200,

                    # random_state = semilla fija para reproducibilidad.
                    random_state=42,

                    # early_stopping = aquí está desactivado para evitar problemas al entrenar.
                    early_stopping=False,

                    # n_iter_no_change = paciencia antes de considerar que ya no mejora.
                    n_iter_no_change=20,
                ),
            ),
        ]
    )

# Aqui entrenamos el MLP, o guardamos en disco y generamos su metadata
def train_mlp_classifier(prediction_date: str | None = None) -> tuple[Path, Path]:
    from sklearn.exceptions import ConvergenceWarning

    # Si prediction_date es None, entrenamos un modelo global con train y test
    if prediction_date is None:
        split = build_temporal_dataset_split()
    else:
        # Si hay prediction_date, entrenamos solo con datos anteriores a esa fecha
        split = build_training_dataset_for_prediction_date(prediction_date=prediction_date)

    # x_train = columnas X que ve el modelo -> sma20, sma50, rsi14, vol20...
    x_train = split.train_df[split.feature_columns]

    # y_train = etiqueta correcta que queremos que aprenda -> BUY, HOLD o SELL
    y_train = split.train_df["target"]

    # has_test_split indica si este entrenamiento trae test separado
    has_test_split = not split.test_df.empty

    # Si hay test, preparamos tambien x_test e y_test
    if has_test_split:
        x_test = split.test_df[split.feature_columns]
        y_test = split.test_df["target"]

    # pipeline = flujo completo scaler + MLP.
    pipeline = _build_pipeline()

    # Ocultamos ConvergenceWarning para que el log no se ensucie al entrenar.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=ConvergenceWarning)

        # fit = fase donde el modelo aprende con x_train e y_train.
        pipeline.fit(x_train, y_train)

    # Nos aseguramos de que la carpeta de modelos exista.
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Obtenemos las rutas donde guardaremos modelo y metadata.
    model_path, metadata_path = get_model_paths(prediction_date=prediction_date)

    # Guardamos el modelo ya entrenado en disco.
    joblib.dump(pipeline, model_path)

    # metadata = información útil para saber cómo se entrenó este modelo.
    metadata = {
        "model_type": "MLPClassifier",
        "feature_columns": split.feature_columns,
        "horizon_days": split.horizon_days,
        "buy_threshold": split.buy_threshold,
        "sell_threshold": split.sell_threshold,
        "train_end_date": split.train_end_date,
        "train_samples": int(len(split.train_df)),
        "test_samples": int(len(split.test_df)),
        "classes": sorted(split.train_df["target"].unique().tolist()),
        "prediction_date": prediction_date,
    }

    # Guardamos la metadata en un .json.
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    # El classification report solo tiene sentido si hay test separado.
    if has_test_split:
        from sklearn.metrics import classification_report

        # y_pred = predicción del modelo sobre el conjunto de test.
        y_pred = pipeline.predict(x_test)
        print("\nClassification report:\n")
        print(classification_report(y_test, y_pred, digits=4))

    # Devolvemos dónde se guardó el modelo y su metadata.
    return model_path, metadata_path


if __name__ == "__main__":
    # Si ejecutamos este archivo directamente, entrena el modelo global.
    train_mlp_classifier()
