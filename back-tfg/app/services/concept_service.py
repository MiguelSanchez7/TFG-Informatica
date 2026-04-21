import json
from pathlib import Path
from typing import Any, Dict, List


CONTENT_DIR = Path(__file__).resolve().parents[2] / "content" / "concepts"
LESSONS_FILE = CONTENT_DIR / "lessons.json"
GLOSSARY_FILE = CONTENT_DIR / "glossary.json"
QUIZZES_FILE = CONTENT_DIR / "quizzes.json"
VALID_LEVELS = {"base", "intermedio", "avanzado"}


def _read_json_file(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError as exc:
        raise RuntimeError(f"No se encontro el archivo de contenido: {path.name}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"El archivo {path.name} no tiene un JSON valido") from exc


def _normalize_lesson(lesson: Dict[str, Any]) -> Dict[str, Any]:
    key_ideas = lesson.get("keyIdeas") or []
    if not isinstance(key_ideas, list):
        key_ideas = []

    slug = str(lesson.get("slug") or "").strip()
    level = str(lesson.get("level") or "").strip()

    if not slug:
        raise RuntimeError("Cada leccion debe tener un slug")
    if level not in VALID_LEVELS:
        raise RuntimeError(f"La leccion {slug} tiene un nivel invalido: {level}")

    return {
        "id": lesson.get("id") or slug,
        "slug": slug,
        "level": level,
        "title": str(lesson.get("title") or "").strip(),
        "summary": str(lesson.get("summary") or "").strip(),
        "whyItMatters": str(lesson.get("whyItMatters") or "").strip(),
        "keyIdeas": [str(idea).strip() for idea in key_ideas if str(idea).strip()],
        "example": str(lesson.get("example") or "").strip(),
        "checkQuestion": str(lesson.get("checkQuestion") or "").strip(),
        "checkAnswer": str(lesson.get("checkAnswer") or "").strip(),
        "orderIndex": int(lesson.get("orderIndex") or 0),
    }


def _normalize_glossary_item(item: Dict[str, Any]) -> Dict[str, Any]:
    term = str(item.get("term") or "").strip()
    if not term:
        raise RuntimeError("Cada termino del glosario debe tener term")

    item_id = item.get("id") or term.lower().replace(" ", "-")
    return {
        "id": str(item_id),
        "term": term,
        "definition": str(item.get("definition") or "").strip(),
        "orderIndex": int(item.get("orderIndex") or 0),
    }


def _normalize_quiz_question(question: Dict[str, Any]) -> Dict[str, Any]:
    question_id = str(question.get("id") or "").strip()
    prompt = str(question.get("question") or "").strip()
    options = question.get("options") or []
    correct_option_id = str(question.get("correctOptionId") or "").strip()
    explanation = str(question.get("explanation") or "").strip()

    if not question_id:
        raise RuntimeError("Cada pregunta del quiz debe tener id")
    if not prompt:
        raise RuntimeError(f"La pregunta {question_id} no tiene enunciado")
    if not isinstance(options, list) or len(options) < 2:
        raise RuntimeError(f"La pregunta {question_id} debe tener al menos dos opciones")

    normalized_options = []
    option_ids = set()
    for option in options:
        option_id = str(option.get("id") or "").strip()
        label = str(option.get("label") or "").strip()
        if not option_id or not label:
            raise RuntimeError(f"La pregunta {question_id} tiene una opcion invalida")
        normalized_options.append({"id": option_id, "label": label})
        option_ids.add(option_id)

    if correct_option_id not in option_ids:
        raise RuntimeError(
            f"La pregunta {question_id} tiene un correctOptionId que no existe"
        )

    return {
        "id": question_id,
        "question": prompt,
        "options": normalized_options,
        "correctOptionId": correct_option_id,
        "explanation": explanation,
    }


def _normalize_quiz(quiz: Dict[str, Any]) -> Dict[str, Any]:
    level = str(quiz.get("level") or "").strip()
    if level not in VALID_LEVELS:
        raise RuntimeError(f"Quiz con nivel invalido: {level}")

    questions = quiz.get("questions") or []
    if not isinstance(questions, list) or not questions:
        raise RuntimeError(f"El quiz del nivel {level} debe tener preguntas")

    return {
        "level": level,
        "title": str(quiz.get("title") or "").strip(),
        "description": str(quiz.get("description") or "").strip(),
        "xpRewardPerCorrect": int(quiz.get("xpRewardPerCorrect") or 0),
        "xpPenaltyPerWrong": int(quiz.get("xpPenaltyPerWrong") or 0),
        "questions": [_normalize_quiz_question(question) for question in questions],
    }


def get_concept_lessons() -> List[Dict[str, Any]]:
    payload = _read_json_file(LESSONS_FILE)
    if not isinstance(payload, list):
        raise RuntimeError("El archivo lessons.json debe contener una lista")

    lessons = [_normalize_lesson(lesson) for lesson in payload]
    return sorted(lessons, key=lambda lesson: (lesson["orderIndex"], lesson["title"]))


def get_concept_glossary() -> List[Dict[str, Any]]:
    payload = _read_json_file(GLOSSARY_FILE)
    if not isinstance(payload, list):
        raise RuntimeError("El archivo glossary.json debe contener una lista")

    glossary = [_normalize_glossary_item(item) for item in payload]
    return sorted(glossary, key=lambda item: (item["orderIndex"], item["term"]))


def get_concept_quizzes() -> List[Dict[str, Any]]:
    payload = _read_json_file(QUIZZES_FILE)
    if not isinstance(payload, list):
        raise RuntimeError("El archivo quizzes.json debe contener una lista")

    quizzes = [_normalize_quiz(item) for item in payload]
    return sorted(quizzes, key=lambda quiz: quiz["level"])


def get_concepts() -> Dict[str, Any]:
    return {
        "lessons": get_concept_lessons(),
        "glossary": get_concept_glossary(),
        "quizzes": get_concept_quizzes(),
    }
