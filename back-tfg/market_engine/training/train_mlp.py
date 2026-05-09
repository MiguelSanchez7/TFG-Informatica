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
from market_engine.training.model_registry import (
    build_model_pipeline,
    get_model_paths as get_registered_model_paths,
    get_model_spec,
)


# Rutas historicas del MLP global. Se mantienen por compatibilidad.
MODEL_PATH = MODELS_DIR / "mlp" / "model.joblib"
METADATA_PATH = MODELS_DIR / "mlp" / "metadata.json"


def get_model_paths(
    prediction_date: str | None = None,
    model_type: str | None = None,
) -> tuple[Path, Path]:
    return get_registered_model_paths(
        prediction_date=prediction_date,
        model_type=model_type or "mlp",
    )


def _build_pipeline(model_type: str | None = None):
    return build_model_pipeline(model_type or "mlp")


def train_mlp_classifier(
    prediction_date: str | None = None,
    model_type: str | None = None,
) -> tuple[Path, Path]:
    from sklearn.exceptions import ConvergenceWarning

    spec = get_model_spec(model_type or "mlp")

    if prediction_date is None:
        split = build_temporal_dataset_split()
    else:
        split = build_training_dataset_for_prediction_date(
            prediction_date=prediction_date,
        )

    x_train = split.train_df[split.feature_columns]
    y_train = split.train_df["target"]

    has_test_split = not split.test_df.empty
    if has_test_split:
        x_test = split.test_df[split.feature_columns]
        y_test = split.test_df["target"]

    pipeline = _build_pipeline(spec.key)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=ConvergenceWarning)
        pipeline.fit(x_train, y_train)

    model_path, metadata_path = get_model_paths(
        prediction_date=prediction_date,
        model_type=spec.key,
    )
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)

    metadata = {
        "model_type": spec.display_name,
        "model_key": spec.key,
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

    if has_test_split:
        from sklearn.metrics import classification_report

        y_pred = pipeline.predict(x_test)
        print(f"\nClassification report ({spec.display_name}):\n")
        print(classification_report(y_test, y_pred, digits=4))

    return model_path, metadata_path


if __name__ == "__main__":
    train_mlp_classifier()
