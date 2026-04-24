from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd

from market_engine.config import FEATURES_DIR, STEP_DAYS, TICKERS


# FEATURE_COLUMNS = columnas X que entran al MLP
FEATURE_COLUMNS = [
    "ret_1d",         # retorno de 1 día
    "sma20",          # media móvil de 20 días
    "sma50",          # media móvil de 50 días
    "rsi14",          # RSI a 14 días
    "vol20",          # volatilidad a 20 días
    "drawdown60",     # caída desde máximo reciente
    "vol_rel20",      # volumen relativo
    "trend_gap",      # diferencia entre sma20 y sma50
    "price_vs_sma20", # distancia del precio a sma20
    "price_vs_sma50", # distancia del precio a sma50
]


@dataclass
class TemporalDatasetSplit:
    train_df: pd.DataFrame      # filas que sí usamos para entrenar
    test_df: pd.DataFrame       # filas reservadas para probar
    feature_columns: list[str]  # nombres de las columnas X
    horizon_days: int           # cuántos días al futuro miramos
    buy_threshold: float        # umbral a partir del cual es BUY
    sell_threshold: float       # umbral por debajo del cual es SELL
    train_end_date: str         # fecha límite usada en el corte temporal


# Aqui añadimos al dataset variables extra que ayudan al modelo a entender mejor la tendencia 
# y la posición del precio
def add_model_features(df: pd.DataFrame) -> pd.DataFrame:
    # Hacemos una copia para no tocar el DataFrame original
    df = df.copy()

    # trend_gap = cuánto se separa la sma20 de la sma50
    df["trend_gap"] = (df["sma20"] / df["sma50"]) - 1.0

    # price_vs_sma20 = cuánto se aleja el precio de la sma20
    df["price_vs_sma20"] = (df["adj_close"] / df["sma20"]) - 1.0

    # price_vs_sma50 = cuánto se aleja el precio de la sma50
    df["price_vs_sma50"] = (df["adj_close"] / df["sma50"]) - 1.0

    # Devolvemos el DataFrame ya preparado para el MLP
    return df


# Aqui convertimos la rentabilidad futura en una etiqueta BUY, HOLD o SELL
def label_from_future_return(
    future_return: float,               # Rentabilidad futura real de la acción
    buy_threshold: float,               # Umbral mínimo para considerar compra
    sell_threshold: float,              # Umbral para considerar venta
) -> str:
    # Si la rentabilidad futura supera buy_threshold, la Y será BUY
    if future_return >= buy_threshold:
        return "BUY"

    # Si cae por debajo de sell_threshold, la Y será SELL
    if future_return <= sell_threshold:
        return "SELL"

    # Si queda entre ambos umbrales, la Y será HOLD
    return "HOLD"


# Aqui construimos el dataset completo con las variables de entrada y la etiqueta final para entrenar
def build_labeled_dataset(
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
) -> pd.DataFrame:
    # Si no se pasan tickers, usamos todos los definidos en config
    tickers = list(tickers or TICKERS)

    # frames guardará un DataFrame por empresa
    frames: list[pd.DataFrame] = []

    for ticker in tickers:
        # path = parquet de features de la empresa actual
        path = FEATURES_DIR / f"{ticker}.parquet"
        if not path.exists():
            # Si esa empresa no tiene parquet, la saltamos
            continue

        # Cargamos las features y ordenamos por fecha
        df = pd.read_parquet(path).sort_index()

        # Añadimos las columnas extra que usará el MLP
        df = add_model_features(df)

        # date = fecha actual de la fila
        df["date"] = pd.to_datetime(df.index)

        # future_date = fecha que hay horizon_days por delante
        df["future_date"] = pd.Series(df.index, index=df.index).shift(-horizon_days)

        # Convertimos future_date a tipo fecha
        df["future_date"] = pd.to_datetime(df["future_date"])

        # future_adj_close = precio futuro usado para etiquetar
        df["future_adj_close"] = df["adj_close"].shift(-horizon_days)

        # future_return = rentabilidad futura en tanto por uno
        df["future_return"] = (df["future_adj_close"] / df["adj_close"]) - 1.0

        # target = Y del modelo: BUY, HOLD o SELL
        df["target"] = df["future_return"].apply(
            lambda x: label_from_future_return(
                future_return=float(x),
                buy_threshold=buy_threshold,
                sell_threshold=sell_threshold,
            )
            # Solo etiquetamos si x tiene valor
            if pd.notna(x)
            else None
        )

        # ticker = empresa a la que pertenece cada fila
        df["ticker"] = ticker

        # Guardamos este DataFrame en la lista general
        frames.append(df)

    # Si no se cargó ningún ticker, no podemos entrenar
    if not frames:
        raise ValueError("No feature files were found to build the dataset")

    # Unimos todas las empresas en un único dataset
    dataset = pd.concat(frames, axis=0, ignore_index=True)

    # Quitamos filas con huecos en X, target, future_return o future_date
    dataset = dataset.dropna(
        subset=FEATURE_COLUMNS + ["target", "future_return", "future_date"]
    )

    # Ordenamos por fecha y ticker para dejar el dataset limpio
    dataset = dataset.sort_values(["date", "ticker"]).reset_index(drop=True)

    # Devolvemos el dataset final listo para entrenar
    return dataset


# Aqui separamos el dataset en datos de entrenamiento y de prueba según una fecha
def temporal_train_test_split(
    dataset: pd.DataFrame,
    train_end_date: str = "2021-12-31",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    # cutoff = fecha que separa train y test
    cutoff = pd.Timestamp(train_end_date)

    # train_df = filas cuya fecha futura no cruza el corte temporal.
    # Asi evitamos fuga temporal en la etiqueta.
    train_df = dataset[dataset["future_date"] <= cutoff].copy()

    # test_df = filas cuyo punto de partida ya cae despues del corte.
    test_df = dataset[dataset["date"] > cutoff].copy()

    # Si alguna fila de train usa futuro posterior al corte, el split es invalido.
    if not train_df.empty and (train_df["future_date"] > cutoff).any():
        raise ValueError(
            "Temporal split leakage detected: train rows use future data "
            "after the cutoff date."
        )

    # Si uno sale vacío, este split no sirve
    if train_df.empty or test_df.empty:
        raise ValueError(
            "Temporal split produced an empty train or test set. "
            "Adjust the cutoff date."
        )

    # Devolvemos train y test ya separados
    return train_df, test_df


# Aqui dejamos solo los datos que serían válidos para entrenar antes de una fecha concreta, 
# sin usar información futura
def filter_training_data_for_prediction_date(
    dataset: pd.DataFrame,
    prediction_date: str,
) -> pd.DataFrame:
    # prediction_cutoff = fecha del escenario que queremos evaluar
    prediction_cutoff = pd.Timestamp(prediction_date)

    # Solo usamos filas cuyo future_date cae antes del escenario
    # Así evitamos meter "futuro" que el modelo no debería conocer
    train_df = dataset[dataset["future_date"] < prediction_cutoff].copy()

    # Si no queda nada, no hay datos válidos para entrenar
    if train_df.empty:
        raise ValueError(
            "No training rows are available before the requested prediction date."
        )

    # Devolvemos solo las filas válidas para entrenar este escenario
    return train_df


# Aqui creamos directamente el dataset ya etiquetado y además lo dividimos en train y test
def build_temporal_dataset_split(
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
    train_end_date: str = "2021-12-31",
) -> TemporalDatasetSplit:
    
    # Construimos el dataset completo ya etiquetado
    dataset = build_labeled_dataset(
        tickers=tickers,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
    )

    # Lo dividimos en train y test usando train_end_date
    train_df, test_df = temporal_train_test_split(
        dataset,
        train_end_date=train_end_date,
    )

    # Devolvemos todo agrupado en TemporalDatasetSplit
    return TemporalDatasetSplit(
        train_df=train_df,
        test_df=test_df,
        feature_columns=FEATURE_COLUMNS,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        train_end_date=train_end_date,
    )


# Aqui finalemnete creamos el dataset de entrenamiento para una fecha concreta usando solo 
# datos anteriores a esa fecha
def build_training_dataset_for_prediction_date(
    prediction_date: str,
    tickers: Iterable[str] | None = None,
    horizon_days: int = STEP_DAYS,
    buy_threshold: float = 0.02,
    sell_threshold: float = -0.02,
) -> TemporalDatasetSplit:
    # Construimos el dataset completo con X e y.
    dataset = build_labeled_dataset(
        tickers=tickers,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
    )

    # Filtramos solo las filas válidas anteriores a prediction_date
    train_df = filter_training_data_for_prediction_date(
        dataset,
        prediction_date=prediction_date,
    )

    # Aquí no devolvemos test real porque esta ruta sirve para un escenario concreto
    return TemporalDatasetSplit(
        train_df=train_df,
        test_df=pd.DataFrame(),
        feature_columns=FEATURE_COLUMNS,
        horizon_days=horizon_days,
        buy_threshold=buy_threshold,
        sell_threshold=sell_threshold,
        train_end_date=str(pd.Timestamp(prediction_date).date()),
    )
