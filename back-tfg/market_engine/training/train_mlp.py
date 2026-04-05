from __future__ import annotations

import json
from pathlib import Path
import warnings

import joblib
from sklearn.metrics import classification_report
from sklearn.neural_network import MLPClassifier
from sklearn.exceptions import ConvergenceWarning
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from market_engine.config import MODELS_DIR
from market_engine.training.dataset import (
    build_temporal_dataset_split,
    build_training_dataset_for_prediction_date,
)


MODEL_PATH = MODELS_DIR / "mlp_model.joblib"
METADATA_PATH = MODELS_DIR / "mlp_metadata.json"


def get_model_paths(prediction_date: str | None = None) -> tuple[Path, Path]:
    # Si no se pasa fecha, usamos el nombre "global" de antes.
    if prediction_date is None:
        return MODEL_PATH, METADATA_PATH

    # Si se pasa una fecha, guardamos un modelo distinto para ese corte temporal.
    date_key = str(prediction_date)
    model_path = MODELS_DIR / f"mlp_model_until_{date_key}.joblib"
    metadata_path = MODELS_DIR / f"mlp_metadata_until_{date_key}.json"
    return model_path, metadata_path


def _build_pipeline() -> Pipeline:
    # El pipeline hace dos pasos seguidos:
    # 1. scaler -> pone todas las variables a una escala parecida
    # 2. mlp -> red neuronal que aprende BUY/HOLD/SELL
    return Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "mlp",
                MLPClassifier(
                    hidden_layer_sizes=(16,),
                    activation="relu",
                    solver="adam",
                    alpha=1e-4,
                    batch_size=64,
                    learning_rate_init=1e-3,
                    max_iter=200,
                    random_state=42,
                    early_stopping=False,
                    n_iter_no_change=20,
                ),
            ),
        ]
    )


def train_mlp_classifier(prediction_date: str | None = None) -> tuple[Path, Path]:
    # Si prediction_date es None, entrenamos el modelo "global" como antes.
    if prediction_date is None:
        split = build_temporal_dataset_split()
    else:
        # Si prediction_date tiene valor, entrenamos solo con datos anteriores a esa fecha.
        split = build_training_dataset_for_prediction_date(prediction_date=prediction_date)

    # x = indicadores; y = respuesta correcta.
    x_train = split.train_df[split.feature_columns]
    y_train = split.train_df["target"]

    has_test_split = not split.test_df.empty
    if has_test_split:
        x_test = split.test_df[split.feature_columns]
        y_test = split.test_df["target"]

    pipeline = _build_pipeline()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=ConvergenceWarning)
        pipeline.fit(x_train, y_train)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_path, metadata_path = get_model_paths(prediction_date=prediction_date)
    joblib.dump(pipeline, model_path)

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
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    # El classification report solo tiene sentido en el modelo global con test separado.
    if has_test_split:
        y_pred = pipeline.predict(x_test)
        print("\nClassification report:\n")
        print(classification_report(y_test, y_pred, digits=4))

    return model_path, metadata_path


if __name__ == "__main__":
    train_mlp_classifier()
