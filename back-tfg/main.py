# main.py
from typing import List, Optional, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr

from market_engine.service import (
    get_random_scenario,
    get_scenario,
    reveal_scenario
)

from app.services.user_service import (
    create_user,
    get_users,
    authenticate_user,
    update_user
)

# ======================================================
# APP
# ======================================================

app = FastAPI(title="TFG Inversión - Backend")

# CORS (abierto para desarrollo; en producción se ajusta)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en producción: restringir
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ESQUEMAS (Pydantic)
# ======================================================

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
    name: Optional[str] = None
    surname: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[Any] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=100)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None

# ======================================================
# ENDPOINTS USUARIOS
# ======================================================

@app.get("/users", response_model=List[UserPublic])
def list_users():
    try:
        return get_users()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/users", response_model=UserPublic)
def register_user(payload: UserCreate):
    try:
        return create_user(
            username=payload.username,
            email=payload.email,
            password=payload.password,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login", response_model=UserPublic)
def login(payload: LoginRequest):
    try:
        return authenticate_user(
            email=payload.email,
            password=payload.password
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/users/{user_id}", response_model=UserPublic)
def update_user_endpoint(user_id: str, payload: UserUpdate):
    update_data = {
        k: v
        for k, v in payload.dict(exclude_unset=True).items()
        if v is not None
    }

    if not update_data:
        raise HTTPException(status_code=400, detail="No se enviaron cambios.")

    try:
        return update_user(user_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

# ======================================================
# MARKET ENGINE
# ======================================================

@app.get("/market/scenario/random")
def api_random_scenario():
    try:
        return get_random_scenario()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/scenario/{scenario_id}")
def api_get_scenario(scenario_id: str):
    try:
        return get_scenario(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/market/scenario/{scenario_id}/reveal")
def api_reveal_scenario(scenario_id: str, body: dict):
    action = body.get("action")

    if action not in {"BUY", "HOLD", "SELL"}:
        raise HTTPException(status_code=400, detail="Invalid action")

    try:
        return reveal_scenario(scenario_id, action)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
