from __future__ import annotations

import time

import pandas as pd

from market_engine.config import SCENARIOS_DIR
from market_engine.training.model_registry import supported_model_types
from market_engine.training.train_mlp import get_model_paths, train_mlp_classifier


def load_unique_anchor_dates() -> list[str]:
    scenarios_path = SCENARIOS_DIR / "scenarios.parquet"
    scenarios = pd.read_parquet(scenarios_path)

    return (
        pd.to_datetime(scenarios["anchor_date"])
        .dt.date.astype(str)
        .drop_duplicates()
        .sort_values()
        .tolist()
    )


def pretrain_all_models(
    skip_existing: bool = True,
    model_types: list[str] | None = None,
) -> None:
    anchor_dates = load_unique_anchor_dates()
    selected_model_types = model_types or supported_model_types()

    total = len(anchor_dates) * len(selected_model_types)
    print(f"Found {len(anchor_dates)} unique anchor dates to pretrain.")
    print(f"Models: {', '.join(selected_model_types)}")

    global_start = time.time()
    trained = 0
    skipped = 0
    failed = 0
    current = 0

    try:
        for anchor_date in anchor_dates:
            for model_type in selected_model_types:
                current += 1
                model_path, metadata_path = get_model_paths(
                    prediction_date=anchor_date,
                    model_type=model_type,
                )

                if skip_existing and model_path.exists() and metadata_path.exists():
                    skipped += 1
                    print(
                        f"[{current}/{total}] {anchor_date} {model_type} "
                        "-> skipped (already exists)"
                    )
                    continue

                print(f"[{current}/{total}] {anchor_date} {model_type} -> training...")
                start = time.time()

                try:
                    train_mlp_classifier(
                        prediction_date=anchor_date,
                        model_type=model_type,
                    )
                    elapsed = time.time() - start
                    trained += 1
                    print(
                        f"[{current}/{total}] {anchor_date} {model_type} "
                        f"-> done in {elapsed:.2f}s"
                    )
                except Exception as exc:
                    elapsed = time.time() - start
                    failed += 1
                    print(
                        f"[{current}/{total}] {anchor_date} {model_type} "
                        f"-> FAILED in {elapsed:.2f}s: {exc}"
                    )
    except KeyboardInterrupt:
        print("\nPretraining interrupted by user (Ctrl + C).")

    total_elapsed = time.time() - global_start
    print("\nPretraining finished.")
    print(f"Trained: {trained}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")
    print(f"Total time: {total_elapsed:.2f}s")


if __name__ == "__main__":
    pretrain_all_models()
