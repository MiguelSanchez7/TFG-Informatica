import os
from typing import Dict, List

from app.services.concept_service import get_concepts


DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
MAX_QUESTION_LENGTH = 800


def _build_learning_context() -> str:
    concepts = get_concepts()
    lessons = concepts.get("lessons", [])
    glossary = concepts.get("glossary", [])

    lesson_lines = [
        f"- [{lesson['level']}] {lesson['title']}: {lesson['summary']}"
        for lesson in lessons[:18]
    ]
    glossary_lines = [
        f"- {item['term']}: {item['definition']}"
        for item in glossary[:10]
    ]

    return (
        "Contexto educativo disponible en la app:\n"
        "Lecciones:\n"
        + "\n".join(lesson_lines)
        + "\nGlosario:\n"
        + "\n".join(glossary_lines)
    )


def _get_groq_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("Falta configurar la variable GROQ_API_KEY en el backend")

    try:
        from groq import Groq
    except ImportError as exc:
        raise RuntimeError(
            "La libreria groq no esta instalada. Ejecuta pip install -r requirements.txt"
        ) from exc

    return Groq(api_key=api_key)


def ask_finance_tutor(question: str, history: List[Dict[str, str]] | None = None) -> Dict[str, str]:
    clean_question = (question or "").strip()
    if not clean_question:
        raise ValueError("La pregunta no puede estar vacia")
    if len(clean_question) > MAX_QUESTION_LENGTH:
        raise ValueError("La pregunta es demasiado larga")

    client = _get_groq_client()
    learning_context = _build_learning_context()

    messages = [
        {
            "role": "system",
            "content": (
                "Eres un tutor educativo de una app para aprender inversion. "
                "Tu objetivo es resolver dudas cortas de forma clara, didactica y prudente. "
                "No des asesoramiento financiero personalizado ni instrucciones para apostar dinero real. "
                "No recomiendes comprar o vender activos concretos como consejo personal. "
                "Si la pregunta pide una recomendacion personalizada, redirige la respuesta hacia educacion general, "
                "gestion del riesgo y conceptos. "
                "Responde en espanol, con tono claro y breve. Usa parrafos cortos y, si ayuda, una lista simple. "
                "Cuando sea posible, conecta la respuesta con conceptos de la plataforma.\n\n"
                f"{learning_context}"
            ),
        }
    ]

    for item in (history or [])[-4:]:
        role = item.get("role", "").strip()
        content = item.get("content", "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content[:1000]})

    messages.append({"role": "user", "content": clean_question})

    try:
        completion = client.chat.completions.create(
            model=DEFAULT_GROQ_MODEL,
            messages=messages,
            temperature=0.4,
            max_completion_tokens=500,
        )
    except Exception as exc:
        raise RuntimeError(f"Error consultando Groq: {exc}") from exc

    answer = completion.choices[0].message.content if completion.choices else ""
    if not answer:
        raise RuntimeError("Groq no devolvio respuesta")

    return {
        "answer": answer.strip(),
        "model": getattr(completion, "model", DEFAULT_GROQ_MODEL),
    }
