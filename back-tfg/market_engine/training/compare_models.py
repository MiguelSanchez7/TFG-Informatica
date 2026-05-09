from __future__ import annotations

import json
import time

import joblib
from sklearn.metrics import accuracy_score, classification_report

from market_engine.config import MODELS_DIR
from market_engine.training.dataset import build_temporal_dataset_split
from market_engine.training.model_registry import (
    COMPARISON_RESULTS_PATH,
    build_model_pipeline,
    get_model_paths,
    get_model_spec,
    supported_model_types,
)


def compare_models(model_types: list[str] | None = None) -> dict:
    split = build_temporal_dataset_split()
    x_train = split.train_df[split.feature_columns]
    y_train = split.train_df["target"]
    x_test = split.test_df[split.feature_columns]
    y_test = split.test_df["target"]

    selected_model_types = model_types or supported_model_types()
    results = []

    for model_type in selected_model_types:
        spec = get_model_spec(model_type)
        pipeline = build_model_pipeline(spec.key)

        train_start = time.perf_counter()
        pipeline.fit(x_train, y_train)
        train_seconds = time.perf_counter() - train_start

        predict_start = time.perf_counter()
        y_pred = pipeline.predict(x_test)
        predict_seconds = time.perf_counter() - predict_start

        accuracy = float(accuracy_score(y_test, y_pred))
        model_path, metadata_path = get_model_paths(model_type=spec.key)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(pipeline, model_path)

        report = classification_report(y_test, y_pred, digits=4, output_dict=True)
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
            "prediction_date": None,
            "accuracy": accuracy,
            "train_seconds": train_seconds,
            "predict_seconds": predict_seconds,
        }
        metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        results.append(
            {
                "model_type": spec.display_name,
                "model_key": spec.key,
                "accuracy": accuracy,
                "train_seconds": train_seconds,
                "predict_seconds": predict_seconds,
                "classification_report": report,
            }
        )

        print(
            f"{spec.display_name}: accuracy={accuracy:.4f}, "
            f"train={train_seconds:.3f}s, predict={predict_seconds:.3f}s"
        )

    best = max(results, key=lambda item: item["accuracy"])
    output = {
        "best_model_type": best["model_key"],
        "best_model_display_name": best["model_type"],
        "results": results,
    }
    COMPARISON_RESULTS_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(
        "\nBest model: "
        f"{best['model_type']} "
        f"(accuracy={best['accuracy']:.4f})"
    )
    print(f"Results saved to: {COMPARISON_RESULTS_PATH}")
    return output


if __name__ == "__main__":
    compare_models()
