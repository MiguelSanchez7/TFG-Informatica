from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd

from market_engine.config import FEATURES_DIR, STEP_DAYS, TICKERS


# Estas columnas serán la X del modelo.
# Cada una describe cómo estaba el mercado en una fecha.
FEATURE_COLUMNS = [
    "ret_1d",         # retorno de 1 día
    "sma20",          # media móvil de 20 días
    "sma50",          # media móvil de 50 días
    "rsi14",          # indicador RSI de 14 días
    "vol20",          # volatilidad en ventana de 20 días
    "drawdown60",     # caída respecto al máximo reciente
    "vol_rel20",      # volumen relativo
    "trend_gap",      # separación relativa entre sma20 y sma50
    "price_vs_sma20", # distancia del precio a sma20
    "price_vs_sma50", # distancia del precio a sma50
]


@dataclass
class TemporalDatasetSplit:
    train_df: pd.DataFrame      # datos para entrenar
    test_df: pd.DataFrame       # datos para probar
    feature_columns: list[str]  # columnas X usadas por el modelo
    horizon_days: int           # días al futuro que miramos
    buy_threshold: float        # umbral para decir BUY
    sell_threshold: float       # umbral para decir SELL
    train_end_date: str         # fecha límite usada al construir train


def add_model_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()  # copiamos para no modificar el DataFrame original

    # trend_gap mide si la sma20 está por encima o por debajo de la sma50.
    df["trend_gap"] = (df["sma20"] / df["sma50"]) - 1.0

    # price_vs_sma20 mide qué tan lejos está el precio actual de la sma20.
    df["price_vs_sma20"] = (df["adj_close"] / df["sma20"]) - 1.0

    # price_vs_sma50 hace lo mismo pero contra la sma50.
    df["price_vs_sma50"] = (df["adj_close"] / df["sma50"]) - 1.0

    return df


def label_from_future_return(
    future_return: float,
    buy_threshold: float,
    sell_threshold: float,
) -> str:
    # Si la rentabilidad futura supera buy_threshold, etiquetamos BUY.
    if future_return >= buy_threshold:
        return "BUY"

    # Si la rentabilidad futura cae por debajo de sell_threshold, es SELL.
    if future_return <= sell_threshold:
        return "SELL"

    # Si queda entre medias, es HOLD.
    return "HOLD"


def build_labeled_dataset(
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
) -> pd.DataFrame:
    # Si no se pasan tickers, usamos todos los del proyecto.
    tickers = list(tickers or TICKERS)

    # Aquí iremos guardando un DataFrame por cada ticker.
    frames: list[pd.DataFrame] = []

    for ticker in tickers:
        # Buscamos el parquet de features del ticker actual.
        path = FEATURES_DIR / f"{ticker}.parquet"
        if not path.exists():
            continue  # si no existe, saltamos ese ticker

        # Cargamos el parquet y ordenamos por fecha.
        df = pd.read_parquet(path).sort_index()

        # Añadimos las features extra del modelo.
        df = add_model_features(df)

        # date será la fecha actual de cada fila.
        df["date"] = pd.to_datetime(df.index)

        # future_date es la fecha real a horizon_days pasos vista desde esa fila.
        df["future_date"] = pd.Series(df.index, index=df.index).shift(-horizon_days)
        df["future_date"] = pd.to_datetime(df["future_date"])

        # future_adj_close es el precio dentro de horizon_days pasos.
        df["future_adj_close"] = df["adj_close"].shift(-horizon_days)

        # future_return es la subida o bajada futura en porcentaje decimal.
        df["future_return"] = (df["future_adj_close"] / df["adj_close"]) - 1.0

        # target será la Y del modelo: BUY, HOLD o SELL.
        df["target"] = df["future_return"].apply(
            lambda x: label_from_future_return(
                future_return=float(x),
                buy_threshold=buy_threshold,
                sell_threshold=sell_threshold,
            )
            if pd.notna(x)   # solo etiquetamos si x no es NaN
            else None
        )

        # Guardamos también el ticker como columna normal.
        df["ticker"] = ticker

        # Añadimos este DataFrame a la lista general.
        frames.append(df)

    # Si no se pudo cargar ningún ticker, lanzamos error.
    if not frames:
        raise ValueError("No feature files were found to build the dataset")

    # Unimos todos los tickers en un único DataFrame grande.
    dataset = pd.concat(frames, axis=0, ignore_index=True)

    # Quitamos filas con valores vacíos en X, target o future_return.
    dataset = dataset.dropna(
        subset=FEATURE_COLUMNS + ["target", "future_return", "future_date"]
    )

    # Ordenamos por fecha y ticker para dejar el dataset limpio.
    dataset = dataset.sort_values(["date", "ticker"]).reset_index(drop=True)

    return dataset


def temporal_train_test_split(
    dataset: pd.DataFrame,
    train_end_date: str = "2021-12-31",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    # cutoff es la fecha límite entre train y test.
    cutoff = pd.Timestamp(train_end_date)

    # train_df contiene solo filas hasta la fecha límite.
    train_df = dataset[dataset["date"] <= cutoff].copy()

    # test_df contiene solo filas posteriores a la fecha límite.
    test_df = dataset[dataset["date"] > cutoff].copy()

    # Si uno de los dos queda vacío, el split no sirve.
    if train_df.empty or test_df.empty:
        raise ValueError(
            "Temporal split produced an empty train or test set. "
            "Adjust the cutoff date."
        )

    return train_df, test_df


def filter_training_data_for_prediction_date(
    dataset: pd.DataFrame,
    prediction_date: str,
) -> pd.DataFrame:
    # prediction_cutoff es la fecha del escenario que queremos predecir.
    prediction_cutoff = pd.Timestamp(prediction_date)

    # Solo usamos filas cuyo future_date es anterior a prediction_cutoff.
    # Así el entrenamiento no usa ejemplos que necesiten "futuro" del escenario actual.
    train_df = dataset[dataset["future_date"] < prediction_cutoff].copy()

    if train_df.empty:
        raise ValueError(
            "No training rows are available before the requested prediction date."
        )

    return train_df


def build_temporal_dataset_split(
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
    train_end_date: str = "2021-12-31",
) -> TemporalDatasetSplit:
    # Primero construimos el dataset completo con etiquetas.
    dataset = build_labeled_dataset(
        tickers=tickers,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
    )

    # Luego lo dividimos temporalmente en train y test.
    train_df, test_df = temporal_train_test_split(
        dataset,
        train_end_date=train_end_date,
    )

    # Devolvemos todo empaquetado en una sola estructura.
    return TemporalDatasetSplit(
        train_df=train_df,
        test_df=test_df,
        feature_columns=FEATURE_COLUMNS,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        train_end_date=train_end_date,
    )


def build_training_dataset_for_prediction_date(
    prediction_date: str,
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
) -> TemporalDatasetSplit:
    # Construimos primero el dataset completo etiquetado.
    dataset = build_labeled_dataset(
        tickers=tickers,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
    )

    # Nos quedamos solo con las filas válidas para entrenar antes del escenario.
    train_df = filter_training_data_for_prediction_date(
        dataset,
        prediction_date=prediction_date,
    )

    # Aquí no devolvemos test real, porque esta ruta se usa para predecir un escenario concreto.
    return TemporalDatasetSplit(
        train_df=train_df,
        test_df=pd.DataFrame(),
        feature_columns=FEATURE_COLUMNS,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        train_end_date=str(pd.Timestamp(prediction_date).date()),
    )
