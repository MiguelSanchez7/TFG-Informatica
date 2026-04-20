from __future__ import annotations

import json
from dataclasses import dataclass

import joblib
import pandas as pd

from market_engine.training.dataset import FEATURE_COLUMNS, add_model_features
from market_engine.training.train_mlp import get_model_paths


@dataclass
class MLPPrediction:
    action: str                       # accion final: BUY, HOLD o SELL
    confidence: str                   # confianza resumida: high, medium o low
    probabilities: dict[str, float]   # probabilidad de cada clase
    feature_columns: list[str]        # columnas X que ha usado el modelo
    model_type: str = "MLPClassifier" # tipo de modelo usado


def _confidence_from_probability(probability: float) -> str:
    # Si la probabilidad es alta, devolvemos high.
    if probability >= 0.70:
        return "high"

    # Si la probabilidad es intermedia, devolvemos medium.
    if probability >= 0.50:
        return "medium"

    # Si no, devolvemos low.
    return "low"


class MLPPredictor:
    def __init__(self) -> None:
        # _pipelines = modelos cargados en memoria por fecha.
        self._pipelines: dict[str, object] = {}

        # _metadatas = metadata cargada en memoria por fecha.
        self._metadatas: dict[str, dict] = {}

    def _date_key(self, prediction_date: str) -> str:
        # Convertimos prediction_date a un formato corto tipo 2021-06-15.
        return str(pd.Timestamp(prediction_date).date())

    def is_available(self, prediction_date: str) -> bool:
        # Sacamos la ruta del modelo y la metadata de esa fecha.
        model_path, metadata_path = get_model_paths(prediction_date=prediction_date)

        # Solo devolvemos True si existen ambos archivos.
        return model_path.exists() and metadata_path.exists()

    def _ensure_loaded(self, prediction_date: str) -> None:
        # date_key = clave de la fecha del escenario.
        date_key = self._date_key(prediction_date)

        # Si ya esta cargado en memoria, no hace falta volver a cargarlo.
        if date_key in self._pipelines and date_key in self._metadatas:
            return

        # Si el modelo de esa fecha no existe, avisamos con error.
        if not self.is_available(prediction_date):
            raise FileNotFoundError(
                f"MLP model not found for prediction_date={prediction_date}. "
                "Run the pretraining script first."
            )

        # Recuperamos las rutas reales del modelo y su metadata.
        model_path, metadata_path = get_model_paths(prediction_date=prediction_date)

        # Cargamos el modelo entrenado en memoria.
        self._pipelines[date_key] = joblib.load(model_path)

        # Cargamos la metadata en memoria.
        self._metadatas[date_key] = json.loads(metadata_path.read_text(encoding="utf-8"))

    def predict_from_row(self, row: pd.Series, prediction_date: str) -> MLPPrediction:
        # Nos aseguramos de que el modelo correcto este cargado.
        self._ensure_loaded(prediction_date)

        # date_key = clave interna de la fecha del escenario.
        date_key = self._date_key(prediction_date)

        # pipeline = modelo ya entrenado.
        pipeline = self._pipelines[date_key]

        # metadata = informacion de ese modelo entrenado.
        metadata = self._metadatas[date_key]

        # Convertimos la fila actual del mercado en un DataFrame de una fila.
        row_df = pd.DataFrame([row])

        # Anadimos las mismas features derivadas que usamos al entrenar.
        row_df = add_model_features(row_df)

        # feature_columns = columnas X que espera este modelo.
        feature_columns = metadata.get("feature_columns", FEATURE_COLUMNS)

        # x_row = entradas reales que vamos a pasar al modelo.
        x_row = row_df[feature_columns]

        # action = clase predicha por el MLP.
        action = str(pipeline.predict(x_row)[0])

        # classes = clases que conoce el modelo.
        classes = list(pipeline.classes_)

        # probabilities_raw = probabilidades en bruto que devuelve el modelo.
        probabilities_raw = pipeline.predict_proba(x_row)[0]

        # probabilities = diccionario limpio con la probabilidad de cada clase.
        probabilities = {
            str(cls): float(prob)
            for cls, prob in zip(classes, probabilities_raw)
        }

        # confidence = version simplificada de la probabilidad ganadora.
        confidence = _confidence_from_probability(probabilities[action])

        # Devolvemos la prediccion empaquetada en MLPPrediction.
        return MLPPrediction(
            action=action,
            confidence=confidence,
            probabilities=probabilities,
            feature_columns=feature_columns,
        )


def prediction_to_dict(prediction: MLPPrediction) -> dict:
    # Convertimos MLPPrediction a dict para devolverlo facil en la app.
    return {
        "action": prediction.action,
        "confidence": prediction.confidence,
        "model_type": prediction.model_type,
        "probabilities": prediction.probabilities,
        "feature_columns": prediction.feature_columns,
    }
