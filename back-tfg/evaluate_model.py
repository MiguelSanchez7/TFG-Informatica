from __future__ import annotations

import json
from pathlib import Path

from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from market_engine.models.mlp import MLPPredictor
from market_engine.training.dataset import FEATURE_COLUMNS, build_temporal_dataset_split
from market_engine.training.model_registry import get_model_paths, get_model_spec


def _get_model_paths(
    prediction_date: str | None = None,
    model_type: str | None = None,
) -> tuple[Path, Path]:
    spec = get_model_spec(model_type or "mlp")

    if prediction_date is not None:
        return get_model_paths(prediction_date=prediction_date, model_type=spec.key)

    model_path, metadata_path = get_model_paths(model_type=spec.key)
    if model_path.exists() and metadata_path.exists():
        return model_path, metadata_path

    model_files = sorted(model_path.parent.glob("model_until_*.joblib"))
    if not model_files:
        raise FileNotFoundError(
            f"No se encontro ningun modelo {spec.display_name} en {model_path.parent}"
        )

    latest = model_files[-1]
    return latest, latest.parent / f"metadata{latest.stem[len('model'):]}.json"


def evaluate_model(
    prediction_date: str | None = None,
    model_type: str | None = None,
    verbose: bool = True,
) -> dict:
    spec = get_model_spec(model_type or "mlp")
    split = build_temporal_dataset_split()

    if split.test_df.empty:
        raise ValueError("No hay datos de test disponibles")

    x_test = split.test_df[FEATURE_COLUMNS]
    y_test = split.test_df["target"]

    model_path, metadata_path = _get_model_paths(prediction_date, spec.key)
    if not model_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(f"Modelo no encontrado en: {model_path}")

    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    eval_date = metadata.get("train_end_date") or prediction_date

    if verbose:
        print(f"Modelo: {metadata.get('model_type', spec.display_name)}")
        print(f"Fecha de entrenamiento: {metadata.get('train_end_date')}")
        print(f"Muestras de test: {len(x_test)}")
        print()

    predictor = MLPPredictor()
    predictions = []
    for idx, row in x_test.iterrows():
        try:
            pred = predictor.predict_from_row(row, eval_date, model_type=spec.key)
            predictions.append(pred.action)
        except Exception as exc:
            predictions.append("HOLD")
            if verbose:
                print(f"Warning: error en prediccion para indice {idx}: {exc}")

    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, digits=4, output_dict=True)
    cm = confusion_matrix(y_test, predictions)

    if verbose:
        print("=" * 60)
        print("RESULTADOS DE EVALUACION")
        print("=" * 60)
        print(f"\nAccuracy global: {accuracy:.2%}")
        print("\nClassification Report:")
        print(classification_report(y_test, predictions, digits=4))
        print("\nMatriz de confusion:")
        print("           BUY    HOLD    SELL")
        print(f"BUY      {cm[0][0]:5d}  {cm[0][1]:5d}  {cm[0][2]:5d}")
        print(f"HOLD     {cm[1][0]:5d}  {cm[1][1]:5d}  {cm[1][2]:5d}")
        print(f"SELL     {cm[2][0]:5d}  {cm[2][1]:5d}  {cm[2][2]:5d}")

    return {
        "accuracy": accuracy,
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "metadata": metadata,
        "predictions": predictions,
        "true_labels": y_test.tolist(),
    }


def evaluate_by_confidence(model_type: str | None = None) -> dict:
    spec = get_model_spec(model_type or "mlp")
    _, metadata_path = _get_model_paths(None, spec.key)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    eval_date = metadata.get("train_end_date")

    split = build_temporal_dataset_split()
    if split.test_df.empty:
        raise ValueError("No hay datos de test disponibles")

    x_test = split.test_df[FEATURE_COLUMNS]
    y_test = split.test_df["target"]
    predictor = MLPPredictor()
    results = {"high": [], "medium": [], "low": []}

    for idx, row in x_test.iterrows():
        try:
            pred = predictor.predict_from_row(row, eval_date, model_type=spec.key)
            results[pred.confidence].append(pred.action == y_test.loc[idx])
        except Exception:
            pass

    metrics = {}
    for level, preds in results.items():
        metrics[level] = {
            "accuracy": sum(preds) / len(preds) if preds else 0.0,
            "count": len(preds),
        }

    print("\nAccuracy por nivel de confianza:")
    print("-" * 40)
    for level, data in metrics.items():
        print(f"{level.upper():8s}: {data['accuracy']:6.2%} ({data['count']} muestras)")

    return metrics


def main() -> int:
    print("=" * 60)
    print("EVALUACION DEL MODELO")
    print("=" * 60)
    print()

    try:
        evaluate_model(verbose=True)
        print("\n" + "=" * 60)
        print("EVALUACION POR CONFIANZA")
        print("=" * 60)
        evaluate_by_confidence()
    except FileNotFoundError as exc:
        print(f"\nError: {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
