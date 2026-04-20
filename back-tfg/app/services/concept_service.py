from typing import Any, Dict, List

from supabase_client import supabase


def _normalize_lesson(lesson: Dict[str, Any]) -> Dict[str, Any]:
    key_ideas = lesson.get("key_ideas") or []
    if not isinstance(key_ideas, list):
        key_ideas = []

    return {
        "id": lesson.get("slug") or lesson.get("id"),
        "slug": lesson.get("slug"),
        "level": lesson.get("level"),
        "title": lesson.get("title"),
        "summary": lesson.get("summary"),
        "whyItMatters": lesson.get("why_it_matters"),
        "keyIdeas": key_ideas,
        "example": lesson.get("example"),
        "checkQuestion": lesson.get("check_question"),
        "checkAnswer": lesson.get("check_answer"),
        "orderIndex": lesson.get("order_index"),
    }


def _normalize_glossary_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": item.get("id"),
        "term": item.get("term"),
        "definition": item.get("definition"),
        "orderIndex": item.get("order_index"),
    }


def get_concept_lessons() -> List[Dict[str, Any]]:
    response = (
        supabase.table("concept_lessons")
        .select(
            "id, slug, level, title, summary, why_it_matters, key_ideas, "
            "example, check_question, check_answer, order_index"
        )
        .eq("is_published", True)
        .order("order_index")
        .execute()
    )

    return [_normalize_lesson(lesson) for lesson in response.data or []]


def get_concept_glossary() -> List[Dict[str, Any]]:
    response = (
        supabase.table("concept_glossary")
        .select("id, term, definition, order_index")
        .order("order_index")
        .execute()
    )

    return [_normalize_glossary_item(item) for item in response.data or []]


def get_concepts() -> Dict[str, Any]:
    return {
        "lessons": get_concept_lessons(),
        "glossary": get_concept_glossary(),
    }
