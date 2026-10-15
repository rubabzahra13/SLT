"""Single source of truth helpers for order form identity + category."""

from __future__ import annotations

from typing import Any


def category_from_form_type(form_type: str | None) -> str:
    mapping = {
        "school-all-star-dance": "Dance",
        "marching-band": "Marching Band",
        "sports-entertainment": "Sports Entertainment",
        "school-anthem": "School Anthem",
        "school-all-star-cheer": "Cheer",
    }
    return mapping.get(form_type or "", "Cheer")


def order_identity_name(order: Any) -> str:
    """Form identity name — always school_gym_name.

    UI may label it Gym Name, School Name, Program Name, School/Program Name,
    or Organization (same column; like POM School/Gym Address).
    school_name / gym_name are API aliases of the same stored column.
    """
    return (getattr(order, "school_gym_name", None) or "").strip()
