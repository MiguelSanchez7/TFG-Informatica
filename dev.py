import os
import sys
import subprocess
import time
import webbrowser
import signal

# Rutas del proyecto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "back-tfg")
FRONTEND_DIR = os.path.join(BASE_DIR, "front-tfg")

def get_backend_python():
    """
    Retorna la ruta al Python dentro del entorno .venv de back-tfg.
    Si no existe, usa python del sistema.
    """
    if os.name == "nt":  # Windows
        venv_python = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    else:  # Mac / Linux
        venv_python = os.path.join(BACKEND_DIR, ".venv", "bin", "python")

    return venv_python if os.path.exists(venv_python) else sys.executable


def main():
    print("=== 🚀 Iniciando entorno TFG (backend + frontend) ===")

    backend_python = get_backend_python()

    # Comando para backend
    backend_cmd = [
        backend_python,
        "-m", "uvicorn",
        "main:app",
        "--reload",
        "--port", "8000"
    ]

    # Comando para frontend
    frontend_cmd = ["npm", "run", "dev"]

    backend_proc = None
    frontend_proc = None

    try:
        print(f"[BACKEND] Lanzando FastAPI con: {' '.join(backend_cmd)}")
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=BACKEND_DIR,
            creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
        )

        print(f"[FRONTEND] Lanzando Next.js con: {' '.join(frontend_cmd)}")
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=FRONTEND_DIR,
            shell=(os.name == "nt"),
            creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == "nt" else 0
        )

        # Esperamos un poco y abrimos navegador
        time.sleep(3)
        print("[NAV] Abriendo http://localhost:3000 ...")
        webbrowser.open("http://localhost:3000")

        print("=== Todo listo ✨  Pulsa Ctrl+C para cerrar ===")

        backend_proc.wait()

    except KeyboardInterrupt:
        print("\n🛑 Ctrl+C detectado. Cerrando los procesos...")

    finally:
        for proc in (frontend_proc, backend_proc):
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                except Exception:
                    pass

        print("=== 💀 Entorno de desarrollo detenido ===")


if __name__ == "__main__":
    main()
