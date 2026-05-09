from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from market_engine.training.dataset import (
    FEATURE_COLUMNS,
    add_model_features,
    build_training_dataset_for_prediction_date,
)

try:
    import shap
except ImportError:  # pragma: no cover - depende del entorno
    shap = None


DEFAULT_BACKGROUND_SIZE = 40
DEFAULT_TOP_FEATURES = 5
DEFAULT_MAX_EVALS = 128


@dataclass
class ShapExplanationResult:
    available: bool
    summary: dict | None = None
    reason: str | None = None


class MLPShapExplainer:
    def __init__(self) -> None:
        self._explainers: dict[str, object] = {}
        self._backgrounds: dict[str, pd.DataFrame] = {}

    def explain_prediction(
        self,
        pipeline,
        row: pd.Series,
        prediction_date: str,
        feature_columns: list[str],
        predicted_action: str,
        probabilities: dict[str, float],
    ) -> ShapExplanationResult:
        if shap is None:
            return ShapExplanationResult(
                available=False,
                reason="shap_not_installed",
            )

        try:
            x_row = self._prepare_row(row=row, feature_columns=feature_columns)
            explainer = self._get_explainer(
                pipeline=pipeline,
                prediction_date=prediction_date,
                feature_columns=feature_columns,
            )
            explanation = explainer(x_row, max_evals=DEFAULT_MAX_EVALS)

            classes = [str(cls) for cls in pipeline.classes_]
            class_index = classes.index(predicted_action)

            row_values = explanation.values
            if row_values.ndim == 3:
                shap_values = row_values[0, :, class_index]
            elif row_values.ndim == 2:
                shap_values = row_values[0]
            else:
                raise ValueError("Unexpected SHAP values shape")

            base_values = explanation.base_values
            if getattr(base_values, "ndim", 0) == 2:
                base_value = float(base_values[0, class_index])
            elif getattr(base_values, "ndim", 0) == 1 and len(classes) > 1:
                base_value = float(base_values[class_index])
            else:
                base_value = float(base_values[0] if getattr(base_values, "ndim", 0) else base_values)

            row_dict = x_row.iloc[0].to_dict()
            contributions = []
            for feature_name, shap_value in zip(feature_columns, shap_values):
                feature_value = row_dict.get(feature_name)
                contributions.append(
                    {
                        "feature": feature_name,
                        "feature_value": None if pd.isna(feature_value) else float(feature_value),
                        "shap_value": float(shap_value),
                        "impact": (
                            "increase" if float(shap_value) > 0 else "decrease"
                            if float(shap_value) < 0 else "neutral"
                        ),
                    }
                )

            ordered = sorted(
                contributions,
                key=lambda item: abs(item["shap_value"]),
                reverse=True,
            )

            return ShapExplanationResult(
                available=True,
                summary={
                    "target_action": predicted_action,
                    "predicted_probability": float(probabilities[predicted_action]),
                    "base_value": base_value,
                    "top_features": ordered[:DEFAULT_TOP_FEATURES],
                    "feature_contributions": ordered,
                },
            )
        except Exception as exc:  # pragma: no cover - fallback defensivo
            return ShapExplanationResult(
                available=False,
                reason=f"shap_error:{type(exc).__name__}",
            )

    def _date_key(self, prediction_date: str) -> str:
        return str(pd.Timestamp(prediction_date).date())

    def _pipeline_key(self, pipeline, prediction_date: str) -> str:
        model_name = type(pipeline.steps[-1][1]).__name__
        return f"{self._date_key(prediction_date)}:{model_name}"

    def _prepare_row(self, row: pd.Series, feature_columns: list[str]) -> pd.DataFrame:
        row_df = pd.DataFrame([row])
        row_df = add_model_features(row_df)
        return row_df[feature_columns]

    def _get_background(
        self,
        prediction_date: str,
        feature_columns: list[str],
    ) -> pd.DataFrame:
        date_key = self._date_key(prediction_date)
        if date_key in self._backgrounds:
            return self._backgrounds[date_key]

        split = build_training_dataset_for_prediction_date(prediction_date=prediction_date)
        background = split.train_df[feature_columns]

        if len(background) > DEFAULT_BACKGROUND_SIZE:
            background = background.sample(
                n=DEFAULT_BACKGROUND_SIZE,
                random_state=42,
            )

        self._backgrounds[date_key] = background.reset_index(drop=True)
        return self._backgrounds[date_key]

    def _get_explainer(
        self,
        pipeline,
        prediction_date: str,
        feature_columns: list[str] | None = None,
    ):
        pipeline_key = self._pipeline_key(pipeline, prediction_date)
        if pipeline_key in self._explainers:
            return self._explainers[pipeline_key]

        feature_columns = feature_columns or FEATURE_COLUMNS
        background = self._get_background(
            prediction_date=prediction_date,
            feature_columns=feature_columns,
        )

        self._explainers[pipeline_key] = shap.Explainer(
            pipeline.predict_proba,
            background,
            feature_names=feature_columns,
            algorithm="permutation",
            seed=42,
        )
        return self._explainers[pipeline_key]
