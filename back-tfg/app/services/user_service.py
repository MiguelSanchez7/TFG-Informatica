from typing import List, Dict, Any
import bcrypt
from supabase_client import supabase


def create_user(username: str, email: str, password: str) -> Dict[str, Any]:
    existing_username = (
        supabase.table("users")
        .select("id")
        .eq("username", username)
        .execute()
    )
    if existing_username.data:
        raise ValueError("El nombre de usuario ya está en uso")

    existing_email = (
        supabase.table("users")
        .select("id")
        .eq("email", email)
        .execute()
    )
    if existing_email.data:
        raise ValueError("El email ya está en uso")

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
        .select(
            "id, username, email, points, level, role, "
            "name, surname, country, avatar_url, created_at"
        )
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    response = (
        supabase.table("users")
        .select(
            "id, username, email, password_hash, points, level, role, "
            "name, surname, country, avatar_url, created_at"
        )
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

    user.pop("password_hash", None)
    return user


def update_user(user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    response = (
        supabase.table("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise ValueError("Usuario no encontrado")

    return response.data[0]