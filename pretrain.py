import os                   # Modulo de python que permite interactuar con el so -> so.name nos da info sobre dónde 
import subprocess           # se está ejecutando el programa -> Si es nt = Windows
import sys                  #                                -> Si no es nt = Resto


# BASE_DIR = carpeta principal del proyecto, donde esta este archivo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# BACKEND_DIR = carpeta del backend, desde donde se puede importar market_engine
BACKEND_DIR = os.path.join(BASE_DIR, "back-tfg")


def get_backend_python():
    
    # Si existe el .venv del backend (nt = windows)
    if os.name == "nt":
        
        # Ruta de Python en Windows
        venv_python = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    else:
        # Ruta de Python en Linux/Mac
        venv_python = os.path.join(BACKEND_DIR, ".venv", "bin", "python")

    # Si el entorno virtual no existe, usamos el Python con el que se lanzo este script
    return venv_python if os.path.exists(venv_python) else sys.executable


def main():
    
    # backend_python = versión de python que ejecutara el modulo de preentrenamiento
    backend_python = get_backend_python()

    # cmd = comando real que se va a ejecutar
    # Usamos -m para lanzar el modulo como parte del paquete market_engine
    cmd = [
        backend_python,
        "-m",
        "market_engine.training.pretrain_models",
    ]

    # Mostramos por consola que se va a ejecutar para que sea facil comprobarlo
    print("=== Preentrenamiento de modelos MLP ===")
    print("Ejecutando:", " ".join(cmd))
    print("Carpeta:", BACKEND_DIR)

    try:
        # Ejecutamos el comando dentro de back-tfg para que las importaciones funcionen bien
        result = subprocess.run(cmd, cwd=BACKEND_DIR)

        # Devolvemos el mismo codigo de salida que haya devuelto el entrenamiento
        sys.exit(result.returncode)
        
    except KeyboardInterrupt:
        
        # Si el usuario corta con Ctrl+C, salimos con codigo 130, que indica interrupcion
        print("\nPretraining launcher interrupted by user.")
        sys.exit(130)


# Si ejecuto este mismo archivo -> __name__ = "__main__" -> y va directo al "main"
if __name__ == "__main__":
    # Si ejecutamos python pretrain.py, empieza aqui
    main()
