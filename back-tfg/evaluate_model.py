"""
Script para evaluar el rendimiento del modelo MLP sin necesidad de reentrenar.

Uso:
    python evaluate_model.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)

from market_engine.config import MODELS_DIR
from market_engine.models.mlp import MLPPredictor
from market_engine.training.dataset import (
    FEATURE_COLUMNS,
    add_model_features,
    build_temporal_dataset_split,
)


def evaluate_model(
    prediction_date: str | None = None,
    verbose: bool = True,
) -> dict:
    """
    Evalúa el modelo MLP en el conjunto de test.
    
    Args:
        prediction_date: Fecha del modelo específico a evaluar.
                        Si es None, usa el modelo global.
        verbose: Si True, imprime el classification report.
    
    Returns:
        Diccionario con las métricas de evaluación.
    """
    # 1. Cargar el split de train/test
    split = build_temporal_dataset_split()
    
    # 2. Verificar que hay datos de test
    if split.test_df.empty:
        raise ValueError("No hay datos de test disponibles")
    
    # 3. Preparar datos de test
    x_test = split.test_df[FEATURE_COLUMNS]
    y_test = split.test_df["target"]
    
    if verbose:
        print(f"Muestras de test: {len(x_test)}")
        print(f"Distribución de clases en test:")
        print(y_test.value_counts())
        print()
    
    # 4. Cargar el modelo
    model_path, metadata_path = _get_model_paths(prediction_date)
    
    if not model_path.exists():
        raise FileNotFoundError(
            f"Modelo no encontrado en: {model_path}\n"
            "No hay modelos disponibles para evaluar."
        )
    
    # 5. Cargar metadata
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    
    if verbose:
        print(f"Modelo: {metadata.get('model_type')}")
        print(f"Fecha de entrenamiento: {metadata.get('train_end_date')}")
        print(f"Muestras de entrenamiento: {metadata.get('train_samples')}")
        print()
    
    # 6. Crear predictor y evaluar
    predictor = MLPPredictor()
    
    # Usar la fecha de fin de entrenamiento del modelo como prediction_date
    eval_date = metadata.get("train_end_date") or prediction_date
    
    if verbose:
        print(f"Evaluando con modelo hasta: {eval_date}")
        print()
    
    # Realizar predicciones
    predictions = []
    for idx, row in x_test.iterrows():
        try:
            pred = predictor.predict_from_row(row, eval_date)
            predictions.append(pred.action)
        except Exception as e:
            # Si falla la predicción, usar HOLD como fallback
            predictions.append("HOLD")
            if verbose:
                print(f"Warning: Error en predicción para índice {idx}: {e}")
    
    # 7. Calcular métricas
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, digits=4, output_dict=True)
    cm = confusion_matrix(y_test, predictions)
    
    # 8. Imprimir resultados
    if verbose:
        print("=" * 60)
        print("RESULTADOS DE EVALUACIÓN")
        print("=" * 60)
        print(f"\nAccuracy global: {accuracy:.2%}")
        print("\nClassification Report:")
        print(classification_report(y_test, predictions, digits=4))
        print("\nMatriz de confusión:")
        print(f"           BUY    HOLD    SELL")
        print(f"BUY      {cm[0][0]:5d}  {cm[0][1]:5d}  {cm[0][2]:5d}")
        print(f"HOLD     {cm[1][0]:5d}  {cm[1][1]:5d}  {cm[1][2]:5d}")
        print(f"SELL     {cm[2][0]:5d}  {cm[2][1]:5d}  {cm[2][2]:5d}")
    
    # 9. Devolver métricas
    return {
        "accuracy": accuracy,
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "metadata": metadata,
        "predictions": predictions,
        "true_labels": y_test.tolist(),
    }


def _get_model_paths(prediction_date: str | None = None) -> tuple[Path, Path]:
    """Obtiene las rutas del modelo según la fecha."""
    # Si no hay prediction_date, usar el modelo global si existe,
    # sino usar el modelo más reciente disponible
    if prediction_date is None:
        # Intentar primero el modelo global
        model_path = MODELS_DIR / "mlp_model.joblib"
        metadata_path = MODELS_DIR / "mlp_metadata.json"
        
        if not model_path.exists():
            # Buscar el modelo más reciente
            model_files = sorted(MODELS_DIR.glob("mlp_model_until_*.joblib"))
            if model_files:
                latest = model_files[-1]
                model_path = latest
                metadata_path = MODELS_DIR / f"mlp_metadata{latest.stem[len('mlp_model'):]}.json"
            else:
                raise FileNotFoundError(f"No se encontró ningún modelo en {MODELS_DIR}")
    else:
        model_path = MODELS_DIR / f"mlp_model_until_{prediction_date}.joblib"
        metadata_path = MODELS_DIR / f"mlp_metadata_until_{prediction_date}.json"
    return model_path, metadata_path


def evaluate_by_confidence() -> dict:
    """
    Evalúa el accuracy segmentado por nivel de confianza.
    
    Returns:
        Diccionario con accuracy por nivel de confianza.
    """
    # Obtener el modelo más reciente
    model_path, metadata_path = _get_model_paths(None)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    eval_date = metadata.get("train_end_date")
    
    # Cargar datos de test
    split = build_temporal_dataset_split()
    
    if split.test_df.empty:
        raise ValueError("No hay datos de test disponibles")
    
    x_test = split.test_df[FEATURE_COLUMNS]
    y_test = split.test_df["target"]
    
    predictor = MLPPredictor()
    
    results = {"high": [], "medium": [], "low": []}
    
    for idx, row in x_test.iterrows():
        try:
            pred = predictor.predict_from_row(row, eval_date)
            confidence = pred.confidence
            is_correct = pred.action == y_test.loc[idx]
            results[confidence].append(is_correct)
        except Exception:
            pass
    
    # Calcular accuracy por confianza
    metrics = {}
    for level, preds in results.items():
        if preds:
            metrics[level] = {
                "accuracy": sum(preds) / len(preds),
                "count": len(preds),
            }
        else:
            metrics[level] = {"accuracy": 0.0, "count": 0}
    
    print("\nAccuracy por nivel de confianza:")
    print("-" * 40)
    for level, data in metrics.items():
        print(f"{level.upper():8s}: {data['accuracy']:6.2%} ({data['count']} muestras)")
    
    return metrics


def main():
    """Función principal."""
    print("=" * 60)
    print("EVALUACIÓN DEL MODELO MLP")
    print("=" * 60)
    print()
    
    try:
        # Evaluación general
        results = evaluate_model(verbose=True)
        
        # Evaluación por confianza
        print("\n" + "=" * 60)
        print("EVALUACIÓN POR CONFIANZA")
        print("=" * 60)
        evaluate_by_confidence()
        
    except FileNotFoundError as e:
        print(f"\nError: {e}")
        return 1
    except Exception as e:
        print(f"\nError inesperado: {e}")
        raise
    
    return 0


if __name__ == "__main__":
    exit(main())