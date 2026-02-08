import argparse
import time
from collections import defaultdict

import requests


def is_correct(action: str, y: float, hold_eps: float) -> bool:
    action = action.upper().strip()
    if action == "BUY":
        return y > 0
    if action == "SELL":
        return y < 0
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="URL del backend FastAPI")
    parser.add_argument("--n", type=int, default=300, help="Número de escenarios a evaluar")
    parser.add_argument("--sleep", type=float, default=0.0, help="Pausa en segundos entre requests (0 = nada)")
    parser.add_argument("--timeout", type=float, default=20.0, help="Timeout HTTP")

    # ✅ No hace falta que lo pases por comando; queda por defecto razonable
    parser.add_argument(
        "--hold-eps",
        type=float,
        default=0.02,  # 2% por defecto
        help="Umbral para considerar HOLD acierto (0.01 = 1%). Normalmente NO necesitas tocarlo."
    )

    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    n = args.n
    hold_eps = args.hold_eps

    by_conf = defaultdict(lambda: {"total": 0, "correct": 0, "sum_y": 0.0})
    by_action = defaultdict(lambda: {"total": 0, "correct": 0, "sum_y": 0.0})
    errors = 0

    session = requests.Session()

    for i in range(1, n + 1):
        try:
            # 1) Random scenario (single-shot) -> saca scenario_id + ai
            r = session.get(f"{base}/market/scenario/random", timeout=args.timeout)
            r.raise_for_status()
            scenario = r.json()

            scenario_id = scenario.get("scenario_id") or scenario.get("id") or scenario.get("scenarioId")
            if not scenario_id:
                raise ValueError("No encuentro scenario_id en la respuesta del random")

            ai_action = safe_get(scenario, "ai", "action")
            ai_conf = safe_get(scenario, "ai", "confidence", default="unknown")
            if not ai_action:
                raise ValueError("No encuentro ai.action en la respuesta del random")

            # 2) Start multiturn
            s = session.post(f"{base}/market/multiturn/start/{scenario_id}", timeout=args.timeout)
            s.raise_for_status()
            state0 = s.json()

            # (Opcional) podríamos volver a leer ai del estado, pero ya lo tenemos

            # 3) Step multiturn con la acción de la IA
            st = session.post(
                f"{base}/market/multiturn/step/{scenario_id}",
                json={"action": ai_action},
                timeout=args.timeout,
            )
            st.raise_for_status()
            state1 = st.json()

            # 4) Leer y_step del último turno
            turn_hist = state1.get("turn_history") or []
            if not turn_hist:
                raise ValueError("No hay turn_history en la respuesta (¿has añadido turn_history en service.py?)")

            last_turn = turn_hist[-1]
            y_step = last_turn.get("y_step")
            if y_step is None:
                raise ValueError("No encuentro y_step en turn_history[-1]")

            y = float(y_step)
            ok = is_correct(ai_action, y, hold_eps)

            conf = str(ai_conf).strip().lower()
            if conf not in ("low", "medium", "high"):
                conf = "unknown"

            act = ai_action.upper().strip()

            by_conf[conf]["total"] += 1
            by_conf[conf]["correct"] += 1 if ok else 0
            by_conf[conf]["sum_y"] += y

            by_action[act]["total"] += 1
            by_action[act]["correct"] += 1 if ok else 0
            by_action[act]["sum_y"] += y

            if i % 25 == 0 or i == n:
                print(f"[{i}/{n}] OK. conf={conf}, action={act}, y_step={y:+.4%}, correct={ok}")

            if args.sleep > 0:
                time.sleep(args.sleep)

        except Exception as e:
            errors += 1
            print(f"[{i}/{n}] ERROR: {e}")

    print("\n" + "=" * 60)
    print(f"RESULTADOS (n={n}, errors={errors}, hold_eps={hold_eps:.4%})")
    print("=" * 60)

    def print_block(title, stats_dict, order):
        print(f"\n{title}")
        print("-" * len(title))
        for key in order:
            st = stats_dict.get(key)
            if not st or st["total"] == 0:
                print(f"{key:>8}: total=0")
                continue
            acc = st["correct"] / st["total"]
            avg_y = st["sum_y"] / st["total"]
            print(f"{key:>8}: total={st['total']:>4} | acc={acc:>6.2%} | avg(y)={avg_y:>+7.3%}")

    print_block("Por confianza", by_conf, ["low", "medium", "high", "unknown"])
    print_block("Por acción IA", by_action, ["BUY", "HOLD", "SELL"])

    print("\nNota sobre HOLD:")
    print(f"  HOLD cuenta como acierto si abs(y) <= {hold_eps:.4%}. (Por defecto 2%)")
    print("  Si quieres experimentar: --hold-eps 0.005 (0.5%) o --hold-eps 0.02 (2%).")


if __name__ == "__main__":
    main()
