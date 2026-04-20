from typing import List, Dict, Any
import bcrypt
from supabase_client import supabase
from app.services.level_service import enrich_user_progression, get_level_progression


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
                "xp": 0,
                "level": 1,
            }
        )
        .execute()
    )

    if not response.data:
        raise RuntimeError("No se pudo crear el usuario en Supabase")

    return enrich_user_progression(response.data[0])


def get_users() -> List[Dict[str, Any]]:
    response = (
        supabase.table("users")
        .select(
            "id, username, email, xp, level, role, "
            "name, surname, country, avatar_url, created_at"
        )
        .order("created_at", desc=True)
        .execute()
    )
    return [enrich_user_progression(user) for user in response.data or []]


def get_user(user_id: str) -> Dict[str, Any]:
    response = (
        supabase.table("users")
        .select(
            "id, username, email, xp, level, role, "
            "name, surname, country, avatar_url, created_at"
        )
        .eq("id", user_id)
        .execute()
    )

    users = response.data or []
    if not users:
        raise ValueError("Usuario no encontrado")

    return enrich_user_progression(users[0])


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    response = (
        supabase.table("users")
        .select(
            "id, username, email, password_hash, xp, level, role, "
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
    return enrich_user_progression(user)


def update_user(user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
    response = (
        supabase.table("users")
        .update(update_data)
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise ValueError("Usuario no encontrado")

    return enrich_user_progression(response.data[0])


def add_user_xp(user_id: str, xp_delta: int) -> Dict[str, Any]:
    if xp_delta <= 0:
        raise ValueError("La experiencia a sumar debe ser mayor que 0")

    current_response = (
        supabase.table("users")
        .select("id, xp")
        .eq("id", user_id)
        .execute()
    )

    users = current_response.data or []
    if not users:
        raise ValueError("Usuario no encontrado")

    new_xp = int(users[0].get("xp") or 0) + int(xp_delta)
    progression = get_level_progression(new_xp)

    response = (
        supabase.table("users")
        .update({"xp": new_xp, "level": progression["level"]})
        .eq("id", user_id)
        .execute()
    )

    if not response.data:
        raise ValueError("Usuario no encontrado")

    return enrich_user_progression(response.data[0])
