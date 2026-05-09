from __future__ import annotations

import json
from dataclasses import dataclass

import joblib
import pandas as pd

from market_engine.explain.shap_explainer import MLPShapExplainer
from market_engine.training.dataset import FEATURE_COLUMNS, add_model_features
from market_engine.training.model_registry import get_model_paths, get_model_spec


@dataclass
class MLPPrediction:
    action: str                       # accion final: BUY, HOLD o SELL
    confidence: str                   # confianza resumida: high, medium o low
    probabilities: dict[str, float]   # probabilidad de cada clase
    feature_columns: list[str]        # columnas X que ha usado el modelo
    shap: dict | None = None          # explicacion local SHAP si esta disponible
    model_type: str = "MLPClassifier" # tipo de modelo usado
    model_key: str = "mlp"            # clave interna del modelo


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
    def __init__(self, model_type: str | None = None) -> None:
        self.model_type = model_type or "mlp"

        # _pipelines = modelos cargados en memoria por fecha.
        self._pipelines: dict[str, object] = {}

        # _metadatas = metadata cargada en memoria por fecha.
        self._metadatas: dict[str, dict] = {}

        # _shap_explainer genera explicaciones locales para cada prediccion.
        self._shap_explainer = MLPShapExplainer()

    def _date_key(self, prediction_date: str) -> str:
        # Convertimos prediction_date a un formato corto tipo 2021-06-15.
        return str(pd.Timestamp(prediction_date).date())

    def _cache_key(self, prediction_date: str, model_type: str | None = None) -> str:
        spec = get_model_spec(model_type or self.model_type)
        return f"{spec.key}:{self._date_key(prediction_date)}"

    def is_available(
        self,
        prediction_date: str,
        model_type: str | None = None,
    ) -> bool:
        # Sacamos la ruta del modelo y la metadata de esa fecha.
        model_path, metadata_path = get_model_paths(
            prediction_date=prediction_date,
            model_type=model_type or self.model_type,
        )

        # Solo devolvemos True si existen ambos archivos.
        return model_path.exists() and metadata_path.exists()

    def _ensure_loaded(
        self,
        prediction_date: str,
        model_type: str | None = None,
    ) -> None:
        # date_key = clave de la fecha del escenario.
        spec = get_model_spec(model_type or self.model_type)
        date_key = self._cache_key(prediction_date, spec.key)

        # Si ya esta cargado en memoria, no hace falta volver a cargarlo.
        if date_key in self._pipelines and date_key in self._metadatas:
            return

        # Si el modelo de esa fecha no existe, avisamos con error.
        if not self.is_available(prediction_date, spec.key):
            from market_engine.training.train_mlp import train_mlp_classifier

            train_mlp_classifier(
                prediction_date=prediction_date,
                model_type=spec.key,
            )

        # Recuperamos las rutas reales del modelo y su metadata.
        model_path, metadata_path = get_model_paths(
            prediction_date=prediction_date,
            model_type=spec.key,
        )

        # Cargamos el modelo entrenado en memoria.
        self._pipelines[date_key] = joblib.load(model_path)

        # Cargamos la metadata en memoria.
        self._metadatas[date_key] = json.loads(metadata_path.read_text(encoding="utf-8"))

    def predict_from_row(
        self,
        row: pd.Series,
        prediction_date: str,
        model_type: str | None = None,
    ) -> MLPPrediction:
        # Nos aseguramos de que el modelo correcto este cargado.
        spec = get_model_spec(model_type or self.model_type)
        self._ensure_loaded(prediction_date, spec.key)

        # date_key = clave interna de la fecha del escenario.
        date_key = self._cache_key(prediction_date, spec.key)

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

        # shap_summary = explicacion local de la clase predicha.
        shap_result = self._shap_explainer.explain_prediction(
            pipeline=pipeline,
            row=row,
            prediction_date=prediction_date,
            feature_columns=feature_columns,
            predicted_action=action,
            probabilities=probabilities,
        )

        shap_summary = None
        if shap_result.available:
            shap_summary = shap_result.summary
        else:
            shap_summary = {
                "available": False,
                "reason": shap_result.reason,
            }

        # Devolvemos la prediccion empaquetada en MLPPrediction.
        return MLPPrediction(
            action=action,
            confidence=confidence,
            probabilities=probabilities,
            feature_columns=feature_columns,
            shap=shap_summary,
            model_type=metadata.get("model_type", spec.display_name),
            model_key=metadata.get("model_key", spec.key),
        )


def prediction_to_dict(prediction: MLPPrediction) -> dict:
    # Convertimos MLPPrediction a dict para devolverlo facil en la app.
    return {
        "action": prediction.action,
        "confidence": prediction.confidence,
        "model_type": prediction.model_type,
        "model_key": prediction.model_key,
        "probabilities": prediction.probabilities,
        "feature_columns": prediction.feature_columns,
        "shap": prediction.shap,
    }
