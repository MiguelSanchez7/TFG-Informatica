from __future__ import annotations

import time

import pandas as pd

from market_engine.config import SCENARIOS_DIR
from market_engine.training.train_mlp import get_model_paths, train_mlp_classifier


def load_unique_anchor_dates() -> list[str]:
    scenarios_path = SCENARIOS_DIR / "scenarios.parquet"
    scenarios = pd.read_parquet(scenarios_path)

    # Sacamos las fechas ancla únicas de todos los escenarios.
    anchor_dates = (
        pd.to_datetime(scenarios["anchor_date"])
        .dt.date.astype(str)
        .drop_duplicates()
        .sort_values()
        .tolist()
    )
    return anchor_dates


def pretrain_all_models(skip_existing: bool = True) -> None:
    anchor_dates = load_unique_anchor_dates()
    total = len(anchor_dates)

    print(f"Found {total} unique anchor dates to pretrain.")

    global_start = time.time()
    trained = 0
    skipped = 0
    failed = 0

    try:
        for index, anchor_date in enumerate(anchor_dates, start=1):
            model_path, metadata_path = get_model_paths(prediction_date=anchor_date)

            if skip_existing and model_path.exists() and metadata_path.exists():
                skipped += 1
                print(f"[{index}/{total}] {anchor_date} -> skipped (already exists)")
                continue

            print(f"[{index}/{total}] {anchor_date} -> training...")
            start = time.time()

            try:
                train_mlp_classifier(prediction_date=anchor_date)
                elapsed = time.time() - start
                trained += 1
                print(
                    f"[{index}/{total}] {anchor_date} -> done in {elapsed:.2f}s"
                )
            except Exception as exc:
                elapsed = time.time() - start
                failed += 1
                print(
                    f"[{index}/{total}] {anchor_date} -> FAILED in {elapsed:.2f}s: {exc}"
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
