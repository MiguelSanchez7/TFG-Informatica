from dataclasses import dataclass
from typing import List, Dict, Any

import numpy as np
import pandas as pd


ACTIONS = ("BUY", "HOLD", "SELL")


@dataclass
class RulePrediction:
    action: str
    confidence: str          # "low" | "medium" | "high"
    score: int
    reasons: List[str]


def _conf_from_score(score: int) -> str:
    if abs(score) >= 2:
        return "high"
    if abs(score) == 1:
        return "medium"
    return "low"


def predict_from_row(row: pd.Series) -> RulePrediction:
    """
    Entrada: fila de features en fecha t.
    Salida: acción + score + razones (explicables).
    """
    reasons = []
    score = 0

    sma20 = float(row["sma20"])
    sma50 = float(row["sma50"])
    rsi14 = float(row["rsi14"])
    vol20 = float(row["vol20"])
    drawdown60 = float(row["drawdown60"])
    vol_rel20 = float(row["vol_rel20"])

    # 1) Tendencia (SMA20 vs SMA50)
    if sma20 > sma50:
        score += 1
        reasons.append(f"Trend up: sma20 > sma50 ({sma20:.2f} > {sma50:.2f})")
    else:
        score -= 1
        reasons.append(f"Trend down: sma20 <= sma50 ({sma20:.2f} <= {sma50:.2f})")

    # 2) RSI (momento / sobrecompra-sobreventa)
    if rsi14 < 30:
        score += 1
        reasons.append(f"RSI indicates oversold: rsi14={rsi14:.1f} (<30)")
    elif rsi14 > 70:
        score -= 1
        reasons.append(f"RSI indicates overbought: rsi14={rsi14:.1f} (>70)")
    else:
        reasons.append(f"RSI neutral: rsi14={rsi14:.1f} (30-70)")

    # 3) Volatilidad (riesgo) - regla suave
    # Umbral típico: 2% diario ≈ 0.02 (depende del activo, pero sirve como baseline educativo)
    if vol20 > 0.02:
        score -= 1
        reasons.append(f"High volatility: vol20={vol20:.3f} (>0.020)")
    else:
        reasons.append(f"Volatility OK: vol20={vol20:.3f} (<=0.020)")

    # 4) Drawdown (si está muy cerca de máximos recientes vs caída)
    # drawdown es negativo: -0.10 significa -10% desde el máximo de 60 días
    if drawdown60 < -0.10:
        score -= 1
        reasons.append(f"Strong recent drawdown: drawdown60={drawdown60:.3f} (<-0.10)")
    else:
        reasons.append(f"Drawdown mild: drawdown60={drawdown60:.3f} (>=-0.10)")

    # 5) Volumen relativo (señal secundaria)
    if vol_rel20 > 1.3:
        score += 1
        reasons.append(f"Unusually high volume: vol_rel20={vol_rel20:.2f} (>1.30)")
    elif vol_rel20 < 0.7:
        score -= 1
        reasons.append(f"Unusually low volume: vol_rel20={vol_rel20:.2f} (<0.70)")
    else:
        reasons.append(f"Volume normal: vol_rel20={vol_rel20:.2f} (0.70-1.30)")

    # Decisión final
    if score >= 2:
        action = "BUY"
    elif score <= -2:
        action = "SELL"
    else:
        action = "HOLD"

    confidence = _conf_from_score(score)

    return RulePrediction(
        action=action,
        confidence=confidence,
        score=int(score),
        reasons=reasons
    )


def prediction_to_dict(p: RulePrediction) -> Dict[str, Any]:
    return {
        "action": p.action,
        "confidence": p.confidence,
        "score": p.score,
        "reasons": p.reasons
    }

