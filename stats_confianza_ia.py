import argparse
import os
import sys
import time
from collections import defaultdict


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "back-tfg")

# Añadimos back-tfg al path para poder importar market_engine.service
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from market_engine.service import (  # noqa: E402
    get_random_scenario,
    start_multiturn_session,
    step_multiturn_session,
)


def is_correct(action: str, y: float, hold_eps: float) -> bool:
    action = action.upper().strip()
    if action == "BUY":
        return y > hold_eps
    if action == "SELL":
        return y < -hold_eps
    if action == "HOLD":
        return abs(y) <= hold_eps
    return False


def safe_get(d, *keys, default=None):
    cur = d
    for k in keys:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur


def empty_stats():
    return {
        "total": 0,
        "correct": 0,
        "sum_y": 0.0,
    }


def update_bucket(bucket, y: float, ok: bool):
    bucket["total"] += 1
    bucket["correct"] += 1 if ok else 0
    bucket["sum_y"] += y


def print_block(title, stats_dict, order):
    print(f"\n{title}")
    print("-" * len(title))
    for key in order:
        st = stats_dict.get(key)
        if not st or st["total"] == 0:
            print(f"{key:>14}: total=0")
            continue
        acc = st["correct"] / st["total"]
        avg_y = st["sum_y"] / st["total"]
        print(
            f"{key:>14}: total={st['total']:>5} | "
            f"acc={acc:>6.2%} | avg(y)={avg_y:>+7.3%}"
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--n",
        type=int,
        default=2000,
        help="Número de escenarios random a evaluar",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Pausa en segundos entre escenarios",
    )
    parser.add_argument(
        "--hold-eps",
        type=float,
        default=0.02,
        help="Umbral para considerar HOLD acierto",
    )
    parser.add_argument(
        "--only-mlp",
        action="store_true",
        default=True,
        help="Siempre mide solo turnos con model_type=MLPClassifier",
    )

    args = parser.parse_args()

    hold_eps = args.hold_eps

    by_conf = defaultdict(empty_stats)
    by_action = defaultdict(empty_stats)
    by_model = defaultdict(empty_stats)

    scenarios_ok = 0
    turns_ok = 0
    errors = 0

    for i in range(1, args.n + 1):
        try:
            # 1) Pedimos un escenario random directamente
            scenario = get_random_scenario()
            scenario_id = scenario.get("scenario_id")
            if not scenario_id:
                raise ValueError("No encuentro scenario_id en el escenario random")

            # 2) Arrancamos la sesión multiturno.
            state = start_multiturn_session(scenario_id)
            scenarios_ok += 1

            # 3) Recorremos toda la partida de 5 turnos.
            while not state.get("finished", False):
                ai_action = safe_get(state, "ai", "action")
                ai_conf = safe_get(state, "ai", "confidence", default="unknown")
                model_type = safe_get(state, "ai", "model_type", default="unknown")

                if not ai_action:
                    raise ValueError("No encuentro ai.action en el estado actual")

                # Ejecutamos la acción de la IA.
                next_state = step_multiturn_session(
                    scenario_id,
                    ai_action,
                    0,  # quantity=0 porque aquí solo evaluamos la dirección
                )

                # Leemos el último turno ya ejecutado.
                turn_hist = next_state.get("turn_history") or []
                if not turn_hist:
                    raise ValueError("No hay turn_history en la respuesta")

                last_turn = turn_hist[-1]
                y = float(last_turn["y_step"])
                ok = is_correct(ai_action, y, hold_eps)

                conf = str(ai_conf).strip().lower()
                if conf not in ("low", "medium", "high"):
                    conf = "unknown"

                act = ai_action.upper().strip()
                model = str(model_type).strip() or "unknown"

                if model != "MLPClassifier":
                    raise ValueError(
                        f"Se esperaba MLPClassifier y llegó model_type={model}"
                    )

                update_bucket(by_conf[conf], y, ok)
                update_bucket(by_action[act], y, ok)
                update_bucket(by_model[model], y, ok)
                turns_ok += 1

                state = next_state

            if i % 25 == 0 or i == args.n:
                print(
                    f"[{i}/{args.n}] escenarios_ok={scenarios_ok} | "
                    f"turnos_contados={turns_ok}"
                )

            if args.sleep > 0:
                time.sleep(args.sleep)

        except Exception as exc:
            errors += 1
            print(f"[{i}/{args.n}] ERROR: {exc}")

    print("\n" + "=" * 72)
    print(
        f"RESULTADOS IA (escenarios={args.n}, escenarios_ok={scenarios_ok}, "
        f"turnos={turns_ok}, errors={errors}, hold_eps={hold_eps:.2%})"
    )
    print("=" * 72)

    print_block("Por confianza", by_conf, ["low", "medium", "high", "unknown"])
    print_block("Por acción IA", by_action, ["BUY", "HOLD", "SELL"])
    print_block(
        "Por tipo de modelo",
        by_model,
        ["MLPClassifier", "rules_fallback", "unknown"],
    )

    print("\nNotas:")
    print("  - Cada escenario se juega completo, contando todos sus turnos.")
    print("  - BUY acierta si y > hold_eps.")
    print("  - SELL acierta si y < -hold_eps.")
    print("  - HOLD acierta si abs(y) <= hold_eps.")
    print("  - Solo se han contado turnos con model_type=MLPClassifier.")


if __name__ == "__main__":
    main()
