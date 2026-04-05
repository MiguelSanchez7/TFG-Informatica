from __future__ import annotations

import json
from dataclasses import dataclass

import joblib
import pandas as pd

from market_engine.training.dataset import FEATURE_COLUMNS, add_model_features
from market_engine.training.train_mlp import get_model_paths


@dataclass
class MLPPrediction:
    action: str
    confidence: str
    probabilities: dict[str, float]
    feature_columns: list[str]
    model_type: str = "MLPClassifier"


def _confidence_from_probability(probability: float) -> str:
    if probability >= 0.70:
        return "high"
    if probability >= 0.50:
        return "medium"
    return "low"


class MLPPredictor:
    def __init__(self) -> None:
        # Guardamos modelos en memoria por fecha para no recargarlos todo el rato.
        self._pipelines: dict[str, object] = {}
        self._metadatas: dict[str, dict] = {}

    def _date_key(self, prediction_date: str) -> str:
        return str(pd.Timestamp(prediction_date).date())

    def is_available(self, prediction_date: str) -> bool:
        model_path, metadata_path = get_model_paths(prediction_date=prediction_date)
        return model_path.exists() and metadata_path.exists()

    def _ensure_loaded(self, prediction_date: str) -> None:
        date_key = self._date_key(prediction_date)

        if date_key in self._pipelines and date_key in self._metadatas:
            return

        # Si el modelo para esa fecha no existe aún, avisamos.
        # El preentrenamiento debe hacerse antes con el script offline.
        if not self.is_available(prediction_date):
            raise FileNotFoundError(
                f"MLP model not found for prediction_date={prediction_date}. "
                "Run the pretraining script first."
            )

        model_path, metadata_path = get_model_paths(prediction_date=prediction_date)
        self._pipelines[date_key] = joblib.load(model_path)
        self._metadatas[date_key] = json.loads(metadata_path.read_text(encoding="utf-8"))

    def predict_from_row(self, row: pd.Series, prediction_date: str) -> MLPPrediction:
        self._ensure_loaded(prediction_date)
        date_key = self._date_key(prediction_date)

        pipeline = self._pipelines[date_key]
        metadata = self._metadatas[date_key]

        row_df = pd.DataFrame([row])
        row_df = add_model_features(row_df)

        feature_columns = metadata.get("feature_columns", FEATURE_COLUMNS)
        x_row = row_df[feature_columns]

        action = str(pipeline.predict(x_row)[0])
        classes = list(pipeline.classes_)
        probabilities_raw = pipeline.predict_proba(x_row)[0]
        probabilities = {
            str(cls): float(prob)
            for cls, prob in zip(classes, probabilities_raw)
        }
        confidence = _confidence_from_probability(probabilities[action])

        return MLPPrediction(
            action=action,
            confidence=confidence,
            probabilities=probabilities,
            feature_columns=feature_columns,
        )


def prediction_to_dict(prediction: MLPPrediction) -> dict:
    return {
        "action": prediction.action,
        "confidence": prediction.confidence,
        "model_type": prediction.model_type,
        "probabilities": prediction.probabilities,
        "feature_columns": prediction.feature_columns,
    }
