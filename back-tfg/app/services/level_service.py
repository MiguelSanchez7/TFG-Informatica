from typing import Any, Dict, List
from supabase_client import supabase


def normalize_xp(value: Any) -> int:
    try:
        xp = int(value or 0)
    except (TypeError, ValueError):
        xp = 0
    return max(0, xp)


def get_levels() -> List[Dict[str, Any]]:
    response = (
        supabase.table("levels")
        .select("level, name, min_xp")
        .order("min_xp")
        .execute()
    )

    levels = response.data or []
    if not levels:
        raise RuntimeError("No hay niveles configurados en la tabla levels")

    return levels


def get_level_progression(xp_value: Any) -> Dict[str, Any]:
    xp = normalize_xp(xp_value)
    levels = get_levels()

    current = levels[0]
    next_level = None

    for index, level in enumerate(levels):
        if xp >= int(level["min_xp"]):
            current = level
            next_level = levels[index + 1] if index + 1 < len(levels) else None
        else:
            break

    level_min_xp = int(current["min_xp"])
    next_level_xp = int(next_level["min_xp"]) if next_level else None

    xp_in_level = xp - level_min_xp
    xp_for_next_level = (
        next_level_xp - level_min_xp if next_level_xp is not None else 0
    )
    xp_to_next_level = (
        max(0, next_level_xp - xp) if next_level_xp is not None else 0
    )

    level_progress = (
        100
        if next_level_xp is None
        else round((xp_in_level / xp_for_next_level) * 100)
    )

    return {
        "xp": xp,
        "level": int(current["level"]),
        "level_name": current["name"],
        "level_min_xp": level_min_xp,
        "next_level_xp": next_level_xp,
        "next_level": int(next_level["level"]) if next_level else None,
        "xp_in_level": xp_in_level,
        "xp_for_next_level": xp_for_next_level,
        "xp_to_next_level": xp_to_next_level,
        "level_progress": min(100, max(0, level_progress)),
        "xpTarget": next_level_xp if next_level_xp is not None else xp,
    }


def enrich_user_progression(user: Dict[str, Any]) -> Dict[str, Any]:
    enriched = dict(user)
    progression = get_level_progression(enriched.get("xp"))
    enriched.update(progression)
    return enriched
