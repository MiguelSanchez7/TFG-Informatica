from collections import defaultdict
from typing import Any, Dict, List

from supabase_client import supabase


VALID_LEVELS = {"base", "intermedio", "avanzado"}


def _normalize_lesson(lesson: Dict[str, Any]) -> Dict[str, Any]:
    key_ideas = lesson.get("key_ideas") or []
    if not isinstance(key_ideas, list):
        key_ideas = []

    slug = str(lesson.get("slug") or "").strip()
    level = str(lesson.get("level") or "").strip()

    if not slug:
        raise RuntimeError("Cada leccion debe tener un slug")
    if level not in VALID_LEVELS:
        raise RuntimeError(f"La leccion {slug} tiene un nivel invalido: {level}")

    return {
        "id": str(lesson.get("id") or slug),
        "slug": slug,
        "level": level,
        "title": str(lesson.get("title") or "").strip(),
        "summary": str(lesson.get("summary") or "").strip(),
        "whyItMatters": str(lesson.get("why_it_matters") or "").strip(),
        "keyIdeas": [str(idea).strip() for idea in key_ideas if str(idea).strip()],
        "example": str(lesson.get("example") or "").strip(),
        "checkQuestion": str(lesson.get("check_question") or "").strip(),
        "checkAnswer": str(lesson.get("check_answer") or "").strip(),
        "orderIndex": int(lesson.get("order_index") or 0),
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
        "orderIndex": int(item.get("order_index") or 0),
    }


def _normalize_quiz_question(
    question: Dict[str, Any],
    options_by_question: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    question_id = str(question.get("id") or "").strip()
    prompt = str(question.get("question") or "").strip()
    correct_option_id = str(question.get("correct_option_id") or "").strip()
    explanation = str(question.get("explanation") or "").strip()
    options = [
        {
            "id": str(option.get("id") or "").strip(),
            "label": str(option.get("label") or "").strip(),
        }
        for option in options_by_question.get(question_id, [])
    ]

    if not question_id:
        raise RuntimeError("Cada pregunta del quiz debe tener id")
    if not prompt:
        raise RuntimeError(f"La pregunta {question_id} no tiene enunciado")
    if len(options) < 2:
        raise RuntimeError(f"La pregunta {question_id} debe tener al menos dos opciones")

    option_ids = {option["id"] for option in options}
    if not all(option["id"] and option["label"] for option in options):
        raise RuntimeError(f"La pregunta {question_id} tiene una opcion invalida")
    if correct_option_id not in option_ids:
        raise RuntimeError(
            f"La pregunta {question_id} tiene un correctOptionId que no existe"
        )

    return {
        "id": question_id,
        "question": prompt,
        "options": options,
        "correctOptionId": correct_option_id,
        "explanation": explanation,
    }


def _normalize_quiz(
    quiz: Dict[str, Any],
    questions_by_level: Dict[str, List[Dict[str, Any]]],
    options_by_question: Dict[str, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    level = str(quiz.get("level") or "").strip()
    if level not in VALID_LEVELS:
        raise RuntimeError(f"Quiz con nivel invalido: {level}")

    questions = questions_by_level.get(level, [])
    if not questions:
        raise RuntimeError(f"El quiz del nivel {level} debe tener preguntas")

    return {
        "level": level,
        "title": str(quiz.get("title") or "").strip(),
        "description": str(quiz.get("description") or "").strip(),
        "xpRewardPerCorrect": int(quiz.get("xp_reward_per_correct") or 0),
        "xpPenaltyPerWrong": int(quiz.get("xp_penalty_per_wrong") or 0),
        "questions": [
            _normalize_quiz_question(question, options_by_question)
            for question in questions
        ],
    }


def get_concept_lessons() -> List[Dict[str, Any]]:
    response = (
        supabase.table("concept_lessons")
        .select(
            "id, slug, level, title, summary, why_it_matters, key_ideas, "
            "example, check_question, check_answer, order_index"
        )
        .order("order_index")
        .execute()
    )
    lessons = [_normalize_lesson(lesson) for lesson in response.data or []]
    return sorted(lessons, key=lambda lesson: (lesson["orderIndex"], lesson["title"]))


def get_concept_glossary() -> List[Dict[str, Any]]:
    response = (
        supabase.table("concept_glossary")
        .select("id, term, definition, order_index")
        .order("order_index")
        .execute()
    )
    glossary = [_normalize_glossary_item(item) for item in response.data or []]
    return sorted(glossary, key=lambda item: (item["orderIndex"], item["term"]))


def get_concept_quizzes() -> List[Dict[str, Any]]:
    quizzes_response = (
        supabase.table("concept_quizzes")
        .select(
            "level, title, description, xp_reward_per_correct, "
            "xp_penalty_per_wrong"
        )
        .order("level")
        .execute()
    )
    questions_response = (
        supabase.table("concept_quiz_questions")
        .select("id, quiz_level, question, correct_option_id, explanation, order_index")
        .order("order_index")
        .execute()
    )
    options_response = (
        supabase.table("concept_quiz_options")
        .select("id, question_id, label, order_index")
        .order("order_index")
        .execute()
    )

    questions_by_level = defaultdict(list)
    for question in questions_response.data or []:
        questions_by_level[str(question.get("quiz_level") or "")].append(question)

    options_by_question = defaultdict(list)
    for option in options_response.data or []:
        options_by_question[str(option.get("question_id") or "")].append(option)

    quizzes = [
        _normalize_quiz(quiz, questions_by_level, options_by_question)
        for quiz in quizzes_response.data or []
    ]
    return sorted(quizzes, key=lambda quiz: quiz["level"])


def get_concepts() -> Dict[str, Any]:
    return {
        "lessons": get_concept_lessons(),
        "glossary": get_concept_glossary(),
        "quizzes": get_concept_quizzes(),
    }
