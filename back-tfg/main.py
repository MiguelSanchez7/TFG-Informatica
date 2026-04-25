# main.py
from typing import List, Optional, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, constr

from market_engine.service import (
    get_random_scenario,
    get_scenario_by_date_range,
    get_scenario,
    start_multiturn_session,
    get_multiturn_state,
    step_multiturn_session,
)

from app.services.user_service import (
    create_user,
    get_users,
    get_user,
    authenticate_user,
    update_user,
    add_user_xp,
)
from app.services.concept_service import get_concepts
from app.services.tutor_service import ask_finance_tutor

# ======================================================
# APP
# ======================================================

app = FastAPI(title="TFG Inversión - Backend")

# CORS (abierto para desarrollo; en producción se ajusta)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    xp: Optional[int] = 0
    level: Optional[int] = 1
    level_name: Optional[str] = "Novato"
    level_min_xp: Optional[int] = 0
    next_level_xp: Optional[int] = None
    next_level: Optional[int] = None
    xp_in_level: Optional[int] = 0
    xp_for_next_level: Optional[int] = 0
    xp_to_next_level: Optional[int] = 0
    level_progress: Optional[int] = 0
    xpTarget: Optional[int] = 100
    role: Optional[str] = "user"
    name: Optional[str] = None
    surname: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[Any] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=100)


class UserXpAdd(BaseModel):
    xp: int


class UserUpdate(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    country: Optional[str] = None
    avatar_url: Optional[str] = None


# ✅ CAMBIO: ahora la acción puede traer quantity (nº acciones)
class StepRequest(BaseModel):
    action: str
    quantity: Optional[int] = 0


class ConceptLesson(BaseModel):
    id: str
    slug: str
    level: str
    title: str
    summary: str
    whyItMatters: str
    keyIdeas: List[str]
    example: str
    checkQuestion: str
    checkAnswer: str
    orderIndex: Optional[int] = None


class ConceptGlossaryItem(BaseModel):
    id: str
    term: str
    definition: str
    orderIndex: Optional[int] = None


class ConceptQuizOption(BaseModel):
    id: str
    label: str


class ConceptQuizQuestion(BaseModel):
    id: str
    question: str
    options: List[ConceptQuizOption]
    correctOptionId: str
    explanation: str


class ConceptQuiz(BaseModel):
    level: str
    title: str
    description: str
    xpRewardPerCorrect: int
    xpPenaltyPerWrong: int
    questions: List[ConceptQuizQuestion]


class ConceptsResponse(BaseModel):
    lessons: List[ConceptLesson]
    glossary: List[ConceptGlossaryItem]
    quizzes: List[ConceptQuiz]


class TutorMessage(BaseModel):
    role: str
    content: str


class TutorQuestionRequest(BaseModel):
    question: constr(min_length=1, max_length=800)
    history: List[TutorMessage] = []


class TutorQuestionResponse(BaseModel):
    answer: str
    model: str


# ======================================================
# ENDPOINTS USUARIOS
# ======================================================

@app.get("/users", response_model=List[UserPublic])
def list_users():
    try:
        return get_users()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/users/{user_id}", response_model=UserPublic)
def get_user_endpoint(user_id: str):
    try:
        return get_user(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
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
# MARKET ENGINE — SINGLE SHOT (NO TOCAR)
# ======================================================

@app.post("/users/{user_id}/xp", response_model=UserPublic)
def add_user_xp_endpoint(user_id: str, payload: UserXpAdd):
    try:
        return add_user_xp(user_id, payload.xp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/concepts", response_model=ConceptsResponse)
def get_concepts_endpoint():
    try:
        return get_concepts()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/assistant/tutor", response_model=TutorQuestionResponse)
def ask_tutor_endpoint(payload: TutorQuestionRequest):
    try:
        history = [item.dict() for item in payload.history]
        return ask_finance_tutor(payload.question, history)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/scenario/random")
def api_random_scenario():
    try:
        return get_random_scenario()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/scenario/by-date")
def api_scenario_by_date(
    start_date: str,
    end_date: str,
    seed: Optional[int] = None,
):
    try:
        return get_scenario_by_date_range(start_date, end_date, seed)
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


# ======================================================
# MARKET ENGINE — MULTI TURN (EL BUENO)
# ======================================================

@app.post("/market/multiturn/start/{scenario_id}")
def api_start_multiturn(scenario_id: str):
    try:
        return start_multiturn_session(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/multiturn/state/{scenario_id}")
def api_get_multiturn_state(scenario_id: str):
    try:
        return get_multiturn_state(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/market/multiturn/step/{scenario_id}")
def api_step_multiturn(scenario_id: str, body: StepRequest):
    action = body.action.upper().strip()

    if action not in {"BUY", "HOLD", "SELL"}:
        raise HTTPException(status_code=400, detail="Invalid action")

    quantity = int(body.quantity or 0)
    if quantity < 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")

    try:
        return step_multiturn_session(scenario_id, action, quantity)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
