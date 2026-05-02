import pandas as pd
import random
from typing import Dict

from market_engine.config import (
    SCENARIOS_DIR,
    FEATURES_DIR,
    CONTEXT_DAYS,
    HORIZON_DAYS,
    TICKERS,
    STEP_DAYS,
    MAX_TURNS,
)
# MLPPredictor carga el modelo entrenado si ya existe.
# mlp_prediction_to_dict pasa la predicción del modelo a un dict simple.
from market_engine.models.mlp import (
    MLPPredictor,
    prediction_to_dict as mlp_prediction_to_dict,
)


# Devuelve la lista de tickers disponibles en el proyecto.
def list_tickers():
    return TICKERS


# Lee el archivo scenarios.parquet.
# Ahí están guardados todos los escenarios históricos del simulador.
def _load_scenarios_df() -> pd.DataFrame:
    return pd.read_parquet(SCENARIOS_DIR / "scenarios.parquet")


# Convierte scenario_id a string limpio.
# Esto evita errores por espacios o tipos distintos.
def _normalize_scenario_id(value) -> str:
    if value is None:
        raise ValueError("Invalid scenario_id")
    return str(value).strip()


# Calcula la puntuación de una acción respecto al resultado real.
# action puede ser BUY, HOLD o SELL.
# y_real es el retorno real que hubo después.
HOLD_SCORE_EPS = 0.02


def _score_action(action: str, y_real: float) -> float:
    action = action.upper().strip()  # normalizamos el texto de entrada
    if action not in ("BUY", "HOLD", "SELL"):
        raise ValueError("Invalid action")

    if action == "BUY":
        return float(y_real - HOLD_SCORE_EPS)
    if action == "SELL":
        return float((-y_real) - HOLD_SCORE_EPS)
    return float(HOLD_SCORE_EPS - abs(y_real))


# Creamos una sola instancia del predictor MLP.
# Si el modelo está guardado en disco, esta instancia podrá usarlo.
MLP_PREDICTOR = MLPPredictor()


# row es la fila del día actual con las features del mercado.
# prediction_date es la fecha del escenario/turno que queremos predecir.
def _predict_ai_from_row(row: pd.Series, prediction_date: pd.Timestamp) -> dict:
    # Usamos únicamente el MLP entrenado para la fecha del escenario.
    prediction = MLP_PREDICTOR.predict_from_row(
        row,
        prediction_date=str(prediction_date.date()),
    )
    return mlp_prediction_to_dict(prediction)


# Devuelve un escenario concreto para enseñarlo en el front.
# scenario_id identifica qué escenario queremos abrir.
def get_scenario(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)  # limpiamos el id

    scenarios = _load_scenarios_df()  # cargamos todos los escenarios
    row = scenarios[scenarios["scenario_id"].astype(str) == scenario_id]  # buscamos el suyo
    if row.empty:
        raise ValueError("Scenario not found")

    s = row.iloc[0]  # cogemos la fila concreta del escenario
    ticker = s["ticker"]  # acción del escenario, por ejemplo AAPL
    anchor = pd.to_datetime(s["anchor_date"])  # fecha donde empieza la decisión

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")  # features de ese ticker
    if anchor not in df.index:
        raise ValueError("Anchor not in features")

    context = df.loc[:anchor].tail(CONTEXT_DAYS)  # histórico previo que verá el usuario
    feat_row = df.loc[anchor]  # fila exacta del día actual
    pred = _predict_ai_from_row(feat_row, anchor)  # recomendación de la IA en ese día

    return {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "anchor_date": str(anchor.date()),
        "horizon_days": int(s.get("horizon_days", HORIZON_DAYS)),
        "context_days": CONTEXT_DAYS,
        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in context.iterrows()
        ],
        "features_at_t": {
            "adj_close": float(feat_row["adj_close"]),
            "ret_1d": None if pd.isna(feat_row.get("ret_1d")) else float(feat_row["ret_1d"]),
            "sma20": float(feat_row["sma20"]),
            "sma50": float(feat_row["sma50"]),
            "rsi14": float(feat_row["rsi14"]),
            "vol20": float(feat_row["vol20"]),
            "drawdown60": float(feat_row["drawdown60"]),
            "vol_rel20": float(feat_row["vol_rel20"]),
        },
        "ai": pred,
    }


# Elige un escenario aleatorio del dataset.
# seed es opcional por si quieres repetir el mismo random.
def get_random_scenario(seed: int | None = None) -> dict:
    scenarios = _load_scenarios_df()  # cargamos todos los escenarios
    s = scenarios.sample(1, random_state=seed).iloc[0]  # elegimos uno al azar
    return get_scenario(str(s["scenario_id"]))  # devolvemos ese escenario completo


def get_scenario_by_date_range(
    start_date: str,
    end_date: str,
    seed: int | None = None,
) -> dict:
    scenarios = _load_scenarios_df()
    start = pd.to_datetime(start_date)
    end = pd.to_datetime(end_date)

    if start > end:
        raise ValueError("Invalid date range")

    anchors = pd.to_datetime(scenarios["anchor_date"])
    filtered = scenarios[(anchors >= start) & (anchors <= end)]
    if filtered.empty:
        raise ValueError("No scenarios found for date range")

    s = filtered.sample(1, random_state=seed).iloc[0]
    return get_scenario(str(s["scenario_id"]))


# Aquí guardamos las partidas multi-turn que están activas.
# La clave será el scenario_id.
ACTIVE_SESSIONS: Dict[str, dict] = {}

# Valor aproximado con el que empieza cada partida.
INITIAL_PORTFOLIO_VALUE = 100_000.0

# Caja inicial objetivo para que las cantidades se vean redondas.
MIN_STARTING_CASH = 10_000.0
MAX_STARTING_CASH = 60_000.0
STARTING_CASH_STEP = 5_000.0


def _build_starting_portfolio(price: float, scenario_id: str) -> dict:
    if price <= 0:
        return {
            "initial_cash": float(INITIAL_PORTFOLIO_VALUE),
            "cash": float(INITIAL_PORTFOLIO_VALUE),
            "shares": 0,
        }

    rng = random.Random(f"{scenario_id}:{price:.4f}")

    cash_options: list[float] = []
    current_cash = MIN_STARTING_CASH
    while current_cash <= MAX_STARTING_CASH:
        cash_options.append(float(current_cash))
        current_cash += STARTING_CASH_STEP

    starting_cash = float(rng.choice(cash_options))
    shares = max(1, int((INITIAL_PORTFOLIO_VALUE - starting_cash) // price))
    initial_portfolio_value = float(starting_cash + shares * price)

    return {
        "initial_cash": initial_portfolio_value,
        "cash": starting_cash,
        "shares": shares,
    }


# Crea una nueva sesión multi-turn para un escenario concreto.
def start_multiturn_session(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)  # limpiamos el id

    scenarios = _load_scenarios_df()  # cargamos todos los escenarios
    row = scenarios[scenarios["scenario_id"].astype(str) == scenario_id]  # buscamos el suyo
    if row.empty:
        raise ValueError("Scenario not found")

    s = row.iloc[0]  # fila del escenario
    ticker = s["ticker"]  # acción del escenario
    anchor = pd.to_datetime(s["anchor_date"])  # fecha inicial del escenario

    df = pd.read_parquet(FEATURES_DIR / f"{ticker}.parquet")  # features del ticker
    if anchor not in df.index:
        raise ValueError("Anchor not in features")

    price_t = float(df.loc[anchor]["adj_close"])
    starting_portfolio = _build_starting_portfolio(
        price=price_t,
        scenario_id=scenario_id,
    )

    # Guardamos el estado inicial de la partida.
    ACTIVE_SESSIONS[scenario_id] = {
        "scenario_id": scenario_id,
        "ticker": ticker,
        "current_date": anchor,  # fecha actual de juego
        "model_date": anchor,  # fecha con la que se entrenó el modelo de toda la partida
        "turn": 0,  # turno actual
        "user_score": 0.0,  # puntuación acumulada del usuario
        "ai_score": 0.0,  # puntuación acumulada de la IA
        "finished": False,  # indica si la partida ya terminó
        "history": [],  # historial de movimientos por turno
        "initial_cash": float(starting_portfolio["initial_cash"]),  # valor inicial de referencia
        "cash": float(starting_portfolio["cash"]),  # dinero actual disponible
        "shares": int(starting_portfolio["shares"]),  # acciones actuales que tiene el usuario
    }

    return get_multiturn_state(scenario_id)  # devolvemos el estado recién creado


# Calcula una foto rápida de la cartera actual.
# st guarda el estado de la sesión.
# price es el precio actual del activo en ese momento.
def _wallet_snapshot(st: dict, price: float) -> dict:
    cash = float(st["cash"])  # dinero actual
    shares = int(st["shares"])  # acciones actuales
    portfolio_value = cash + shares * float(price)  # valor total de la cartera
    pnl_total = portfolio_value - float(st["initial_cash"])  # beneficio o pérdida total
    return {
        "initial_cash": float(st["initial_cash"]),
        "cash": cash,
        "shares": shares,
        "portfolio_value": float(portfolio_value),
        "pnl_total": float(pnl_total),
    }


# Devuelve el estado actual de una sesión multi-turn.
# Sirve para que el front sepa cómo va la partida en este instante.
def get_multiturn_state(scenario_id: str) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)  # limpiamos el id
    if scenario_id not in ACTIVE_SESSIONS:
        raise ValueError("Session not started")

    st = ACTIVE_SESSIONS[scenario_id]  # estado guardado de la partida
    df = pd.read_parquet(FEATURES_DIR / f"{st['ticker']}.parquet")  # features del ticker
    t = st["current_date"]  # fecha actual del turno
    model_date = st["model_date"]  # fecha inicial del escenario usada para el modelo

    context = df.loc[:t].tail(CONTEXT_DAYS)  # histórico que se enseñará
    feat_row = df.loc[t]  # fila del mercado en la fecha actual
    pred = _predict_ai_from_row(feat_row, model_date)  # recomendación actual usando el modelo inicial

    price_t = float(df.loc[t]["adj_close"])  # precio actual
    wallet = _wallet_snapshot(st, price_t)  # resumen de cartera

    return {
        "scenario_id": scenario_id,
        "ticker": st["ticker"],
        "anchor_date": str(t.date()),
        "turn": st["turn"],
        "max_turns": MAX_TURNS,
        "finished": st["finished"],
        "user_score": st["user_score"],
        "ai_score": st["ai_score"],
        "wallet": wallet,
        "history": [
            {
                "date": str(idx.date()),
                "adj_close": float(r["adj_close"]),
                "close": float(r["close"]),
                "volume": float(r["volume"]),
            }
            for idx, r in context.iterrows()
        ],
        "turn_history": st["history"],
        "features_at_t": {
            "adj_close": float(feat_row["adj_close"]),
            "sma20": float(feat_row["sma20"]),
            "sma50": float(feat_row["sma50"]),
            "rsi14": float(feat_row["rsi14"]),
            "vol20": float(feat_row["vol20"]),
            "drawdown60": float(feat_row["drawdown60"]),
            "vol_rel20": float(feat_row["vol_rel20"]),
        },
        "ai": pred,
    }


# Avanza un turno de la partida.
# user_action es lo que hace el usuario: BUY, HOLD o SELL.
# quantity es cuántas acciones quiere mover.
def step_multiturn_session(scenario_id: str, user_action: str, quantity: int = 0) -> dict:
    scenario_id = _normalize_scenario_id(scenario_id)  # limpiamos el id
    if scenario_id not in ACTIVE_SESSIONS:
        raise ValueError("Session not started")

    st = ACTIVE_SESSIONS[scenario_id]  # estado actual de la partida
    if st["finished"]:
        return get_multiturn_state(scenario_id)  # si terminó, devolvemos el estado final

    df = pd.read_parquet(FEATURES_DIR / f"{st['ticker']}.parquet")  # features del ticker
    t = st["current_date"]  # fecha actual
    model_date = st["model_date"]  # fecha inicial del escenario usada para el modelo

    pred = _predict_ai_from_row(df.loc[t], model_date)  # decisión de la IA usando el modelo inicial
    ai_action = pred["action"]  # acción de la IA: BUY, HOLD o SELL

    idx = df.index.get_loc(t)  # posición actual dentro del DataFrame
    next_idx = idx + STEP_DAYS  # saltamos STEP_DAYS días hacia delante
    if next_idx >= len(df):
        st["finished"] = True  # si no hay más datos, se termina la partida
        return get_multiturn_state(scenario_id)

    t_next = df.index[next_idx]  # nueva fecha después del salto

    price_t = float(df.loc[t]["adj_close"])  # precio en t
    price_next = float(df.loc[t_next]["adj_close"])  # precio en t_next
    y = (price_next / price_t) - 1.0  # retorno real entre ambas fechas

    action = user_action.upper().strip()  # normalizamos la acción del usuario
    qty_req = int(quantity or 0)  # cantidad pedida por el usuario
    if qty_req < 0:
        qty_req = 0  # no permitimos cantidades negativas

    executed_qty = 0  # cantidad que realmente se ejecuta
    cash_before = float(st["cash"])  # dinero antes de operar
    shares_before = int(st["shares"])  # acciones antes de operar

    # Si el usuario compra, miramos cuántas acciones puede pagar realmente.
    if action == "BUY" and qty_req > 0:
        max_affordable = int(cash_before // price_t) if price_t > 0 else 0
        executed_qty = min(qty_req, max_affordable)
        st["cash"] = cash_before - executed_qty * price_t
        st["shares"] = shares_before + executed_qty

    # Si el usuario vende, miramos cuántas acciones tiene realmente.
    elif action == "SELL" and qty_req > 0:
        executed_qty = min(qty_req, shares_before)
        st["cash"] = cash_before + executed_qty * price_t
        st["shares"] = shares_before - executed_qty

    cash_after_trade = float(st["cash"])  # dinero después de operar
    shares_after_trade = int(st["shares"])  # acciones después de operar

    user_score = _score_action(action, y)  # puntos del usuario según el retorno real
    ai_score = _score_action(ai_action, y)  # puntos de la IA según el retorno real

    st["user_score"] += user_score  # acumulamos puntos del usuario
    st["ai_score"] += ai_score  # acumulamos puntos de la IA

    # Guardamos en history todo lo que pasó en este turno.
    st["history"].append(
        {
            "turn": st["turn"] + 1,
            "from": str(t.date()),
            "to": str(t_next.date()),
            "user_action": action,
            "ai_action": ai_action,
            "y_step": float(y),
            "quantity_requested": int(qty_req),
            "quantity_executed": int(executed_qty),
            "price_t": float(price_t),
            "cash_after_trade": float(cash_after_trade),
            "shares_after_trade": int(shares_after_trade),
        }
    )

    st["turn"] += 1  # pasamos al siguiente turno
    st["current_date"] = t_next  # actualizamos la fecha actual

    if st["turn"] >= MAX_TURNS:
        st["finished"] = True  # si llegamos al máximo de turnos, termina la partida

    return get_multiturn_state(scenario_id)  # devolvemos el estado actualizado
