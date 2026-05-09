from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from market_engine.config import MODELS_DIR


DEFAULT_MODEL_TYPE = "mlp"
AUTO_MODEL_TYPE = "auto"
COMPARISON_RESULTS_PATH = MODELS_DIR / "model_comparison_results.json"


@dataclass(frozen=True)
class ModelSpec:
    key: str
    display_name: str
    filename_prefix: str
    directory_name: str


MODEL_SPECS: dict[str, ModelSpec] = {
    "mlp": ModelSpec("mlp", "MLPClassifier", "mlp", "mlp"),
    "random_forest": ModelSpec(
        "random_forest",
        "RandomForestClassifier",
        "random_forest",
        "random_forest",
    ),
    "gradient_boosting": ModelSpec(
        "gradient_boosting",
        "GradientBoostingClassifier",
        "gradient_boosting",
        "gradient_boosting",
    ),
}


def supported_model_types() -> list[str]:
    return list(MODEL_SPECS.keys())


def get_default_model_type() -> str:
    if not COMPARISON_RESULTS_PATH.exists():
        return DEFAULT_MODEL_TYPE

    try:
        data = json.loads(COMPARISON_RESULTS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return DEFAULT_MODEL_TYPE

    best_model_type = data.get("best_model_type")
    if best_model_type in MODEL_SPECS:
        return str(best_model_type)
    return DEFAULT_MODEL_TYPE


def normalize_model_type(model_type: str | None = None) -> str:
    key = (model_type or DEFAULT_MODEL_TYPE).strip().lower()
    if key == AUTO_MODEL_TYPE:
        return get_default_model_type()
    if key not in MODEL_SPECS:
        raise ValueError(
            f"Unsupported model_type={model_type}. "
            f"Use one of: {', '.join(supported_model_types())}"
        )
    return key


def get_model_spec(model_type: str | None = None) -> ModelSpec:
    return MODEL_SPECS[normalize_model_type(model_type)]


def get_model_paths(
    prediction_date: str | None = None,
    model_type: str | None = None,
) -> tuple[Path, Path]:
    spec = get_model_spec(model_type)
    model_dir = MODELS_DIR / spec.directory_name

    if prediction_date is None:
        return (
            model_dir / "model.joblib",
            model_dir / "metadata.json",
        )

    date_key = str(prediction_date)
    return (
        model_dir / f"model_until_{date_key}.joblib",
        model_dir / f"metadata_until_{date_key}.json",
    )


def build_model_pipeline(model_type: str | None = None):
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    key = normalize_model_type(model_type)

    if key == "mlp":
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

    if key == "random_forest":
        return Pipeline(
            steps=[
                (
                    "random_forest",
                    RandomForestClassifier(
                        n_estimators=120,
                        max_depth=12,
                        min_samples_leaf=3,
                        random_state=42,
                        n_jobs=1,
                    ),
                ),
            ]
        )

    if key == "gradient_boosting":
        return Pipeline(
            steps=[
                (
                    "gradient_boosting",
                    GradientBoostingClassifier(
                        n_estimators=120,
                        learning_rate=0.05,
                        max_depth=3,
                        random_state=42,
                    ),
                ),
            ]
        )

    raise ValueError(f"Unsupported model_type={model_type}")
