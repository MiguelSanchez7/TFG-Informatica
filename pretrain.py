import os
import subprocess
import sys


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "back-tfg")


def get_backend_python():
    # Si existe el .venv del backend, usamos ese Python.
    if os.name == "nt":
        venv_python = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    else:
        venv_python = os.path.join(BACKEND_DIR, ".venv", "bin", "python")

    return venv_python if os.path.exists(venv_python) else sys.executable


def main():
    backend_python = get_backend_python()

    cmd = [
        backend_python,
        "-m",
        "market_engine.training.pretrain_models",
    ]

    print("=== Preentrenamiento de modelos MLP ===")
    print("Ejecutando:", " ".join(cmd))
    print("Carpeta:", BACKEND_DIR)

    try:
        result = subprocess.run(cmd, cwd=BACKEND_DIR)
        sys.exit(result.returncode)
    except KeyboardInterrupt:
        print("\nPretraining launcher interrupted by user.")
        sys.exit(130)


if __name__ == "__main__":
    main()
