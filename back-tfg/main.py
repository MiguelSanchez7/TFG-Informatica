# main.py
from typing import List, Optional, Dict, Any

import bcrypt
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr

from supabase_client import supabase


app = FastAPI(title="TFG Inversión - Backend")

# CORS (abierto para desarrollo; en producción se ajusta)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción: ["http://localhost:3000"] etc.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========= LÓGICA DE USUARIOS =========

def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
    # comprobar username
    existing_username = (
        supabase.table("users")
        .select("id")
        .eq("username", username)
        .execute()
    )
    if existing_username.data:
        raise ValueError("El nombre de usuario ya está en uso")

    # comprobar email
    existing_email = (
        supabase.table("users")
        .select("id")
        .eq("email", email)
        .execute()
    )
    if existing_email.data:
        raise ValueError("El email ya está en uso")

    # hash de contraseña
    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    response = (
        supabase.table("users")
        .insert(
            {
                "username": username,
                "email": email,
                "password_hash": password_hash,
            }
        )
        .execute()
    )

    if not response.data:
        raise RuntimeError("No se pudo crear el usuario en Supabase")

    return response.data[0]


def get_users() -> List[Dict[str, Any]]:
    response = (
        supabase.table("users")
        .select("id, username, email, points, level, role, created_at")
        .order("created_at", desc=True)
        .execute()
    )

    return response.data or []


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Busca un usuario por email y comprueba la contraseña.
    """
    response = (
        supabase.table("users")
        .select("id, username, email, password_hash, points, level, role, created_at")
        .eq("email", email)
        .execute()
    )

    users = response.data or []
    if not users:
        raise ValueError("Credenciales incorrectas")

    user = users[0]
    stored_hash = user.get("password_hash", "")

    if not stored_hash:
        raise ValueError("Credenciales incorrectas")

    if not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
        raise ValueError("Credenciales incorrectas")

    # No devolvemos el password_hash
    user.pop("password_hash", None)
    return user


# ========= ESQUEMAS Pydantic =========

class UserCreate(BaseModel):
    username: constr(min_length=3, max_length=50)
    email: EmailStr
    password: constr(min_length=6, max_length=100)


class UserPublic(BaseModel):
    id: str
    username: str
    email: EmailStr
    points: Optional[int] = 0
    level: Optional[int] = 1
    role: Optional[str] = "user"


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=100)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    country: Optional[str] = None


# ========= ENDPOINTS =========

@app.get("/users", response_model=List[UserPublic])
def list_users():
    try:
        users = get_users()
        return users
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/users", response_model=UserPublic)
def register_user(payload: UserCreate):
    try:
        user = create_user(
            username=payload.username,
            email=payload.email,
            password=payload.password,
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login", response_model=UserPublic)
def login(payload: LoginRequest):
    """
    Login básico por email + password.
    Devuelve los datos públicos del usuario si las credenciales son correctas.
    """
    try:
        user = authenticate_user(email=payload.email, password=payload.password)
        return user
    except ValueError as e:
        # Credenciales incorrectas
        raise HTTPException(status_code=401, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/users/{user_id}", response_model=UserPublic)
def update_user(user_id: str, payload: UserUpdate):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No se enviaron cambios.")

    response = (
        supabase.table("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return response.data[0]
