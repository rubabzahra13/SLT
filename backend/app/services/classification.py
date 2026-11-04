"""
classification.py: Resolves an order's (form_type, cheer/dance subtype, package_name)
to the exact PricingRule row in the database.
"""
import re
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.models.pricing_rule import PricingRule


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

# Strip the split-flag suffix that Megan appends to cheer package names.
# e.g. "GOLD 1:30 NO SPLIT"  →  "GOLD 1:30"
#      "PLATINUM 2:30 SPLIT" →  "PLATINUM 2:30"
#      "GOLD 2:00 TBD"       →  "GOLD 2:00"
_SPLIT_FLAG_RE = re.compile(r"\s+(NO\s+SPLIT|SPLIT|TBD)\s*$", re.IGNORECASE)


def _strip_split_flag(package_name: str) -> str:
    return _SPLIT_FLAG_RE.sub("", package_name).strip()


# school-cheer viroc variants → canonical subtype
_VIROC_SUBTYPES = {"school-cheer-viroc-yes", "school-cheer-viroc-no"}

# Magento Form 10 SoftSelect labels → pricing_rules.package_name.
# Stored order.package_type is left unchanged; classification only remaps.
_SPORTS_ENTERTAINMENT_PACKAGE_ALIASES: dict[str, str] = {
    "QUARTER BREAK/TIMEOUT REMIXED PACKAGE": "QUARTER BREAK / TIMEOUT REMIXED",
    "PRE-GAME/HALFTIME REMIXED PACKAGE": "PRE-GAME / HALFTIME REMIXED",
    "OTHER - SPECIFY IN NOTES SECTION OF THE ORDER FORM":
        "OTHER (mixes longer than 2:30)",
    "OTHER (SPECIFY IN NOTES SECTION)": "OTHER (mixes longer than 2:30)",
    "QUARTER BREAK/TIMEOUT MIX UP TO 1:15 - REMIXED PACKAGE $150.00 - 1-3 SONGS TOTALLY REMIXED - JAZZED UP WITH STOPS AND TWEAKS!":
        "QUARTER BREAK / TIMEOUT REMIXED",
    "PRE-GAME MIX/HALFTIME MIX UP TO 2:30 - REMIXED PACKAGE $250.00 - 2-5 SONGS TOTALLY REMIXED - JAZZED UP WITH STOPS AND TWEAKS!":
        "PRE-GAME / HALFTIME REMIXED",
    # Truncated by cheer-style packageTierOnly (cuts at embedded 1:15 / 2:30)
    "QUARTER BREAK/TIMEOUT MIX UP TO": "QUARTER BREAK / TIMEOUT REMIXED",
    "QUARTER BREAK/TIMEOUT MIX UP TO 1:15": "QUARTER BREAK / TIMEOUT REMIXED",
    "PRE-GAME MIX/HALFTIME MIX UP TO": "PRE-GAME / HALFTIME REMIXED",
    "PRE-GAME MIX/HALFTIME MIX UP TO 2:30": "PRE-GAME / HALFTIME REMIXED",
    "TIMEOUT REMIX": "QUARTER BREAK / TIMEOUT REMIXED",
    "TIMEOUT REMIXED": "QUARTER BREAK / TIMEOUT REMIXED",
    "HALFTIME SHOW": "PRE-GAME / HALFTIME REMIXED",
    "ARENA HYPE SUITE": "PRE-GAME / HALFTIME REMIXED",
}


# Magento Form 6 SoftSelect → pricing_rules.package_name for Team Performance.
_TEAM_PERFORMANCE_PACKAGE_ALIASES: dict[str, str] = {
    "TP MIX": "TP MIX",
    "TP MIX (UP TO 5 SONGS)": "TP MIX",
    "TP MIX (UP TO 5 SONGS) $475": "TP MIX",
    "TP PLUS MIX": "TP PLUS MIX",
    "TP PLUS": "TP PLUS MIX",
    "TP PLUS (6-8 SONGS)": "TP PLUS MIX",
    "TP PLUS (6-8 SONGS) $570": "TP PLUS MIX",
}


def canonicalize_team_performance_package(package_name: str) -> str:
    """Map Magento SoftSelect TPV wording onto pricing_rules keys (lookup only)."""
    cleaned = " ".join(str(package_name or "").split())
    upper = cleaned.upper()
    if not upper:
        return cleaned

    without_price = re.sub(r"\s*\$[\d,]+(?:\.\d{2})?\s*$", "", upper).strip()
    aliased = _TEAM_PERFORMANCE_PACKAGE_ALIASES.get(upper) or (
        _TEAM_PERFORMANCE_PACKAGE_ALIASES.get(without_price)
    )
    if aliased:
        return aliased

    if re.search(r"\bTP\s+PLUS\b", upper):
        return "TP PLUS MIX"
    if re.search(r"\bTP\s+MIX\b", upper):
        return "TP MIX"
    return cleaned


def canonicalize_sports_entertainment_package(package_name: str) -> str:
    """Map Magento SoftSelect SE wording onto pricing_rules keys (lookup only)."""
    cleaned = " ".join(str(package_name or "").split())
    upper = cleaned.upper()
    if not upper:
        return cleaned

    aliased = _SPORTS_ENTERTAINMENT_PACKAGE_ALIASES.get(upper)
    if aliased:
        return aliased

    if upper in {
        "QUARTER BREAK / TIMEOUT REMIXED",
        "PRE-GAME / HALFTIME REMIXED",
    }:
        return upper
    if upper == "OTHER (MIXES LONGER THAN 2:30)":
        return "OTHER (mixes longer than 2:30)"

    is_other = (
        upper.startswith("OTHER (MIXES LONGER")
        or "SPECIFY IN NOTES SECTION OF THE ORDER FORM" in upper
        or (
            upper.startswith("OTHER")
            and ("SPECIFY IN NOTES" in upper or "MIXES LONGER" in upper)
        )
    )
    if is_other:
        return "OTHER (mixes longer than 2:30)"

    is_quarter = "QUARTER BREAK" in upper or "TIMEOUT MIX" in upper
    is_pre_game = (
        "PRE-GAME" in upper or "PREGAME" in upper or "HALFTIME MIX" in upper
    )
    # Retired Magento BASIC SoftSelect is not a pricing_rules option.
    if is_quarter and re.search(r"\bBASIC\b", upper):
        return cleaned
    if is_quarter and (
        re.search(r"\bREMIXED\b", upper) or "MIX UP TO" in upper
    ):
        return "QUARTER BREAK / TIMEOUT REMIXED"
    if is_pre_game and (
        re.search(r"\bREMIXED\b", upper) or "MIX UP TO" in upper
    ):
        return "PRE-GAME / HALFTIME REMIXED"

    return cleaned


def _normalize_subtype(form_type: str, cheer_subtype: Optional[str], dance_subtype: Optional[str]) -> Optional[str]:
    """Return the canonical subtype_id to query against pricing_rules."""
    if form_type == "school-all-star-cheer":
        if cheer_subtype in _VIROC_SUBTYPES:
            return "school-cheer"
        return cheer_subtype
    if form_type == "school-all-star-dance":
        return dance_subtype
    # marching-band, sports-entertainment, school-anthem have no subtype dimension
    return None


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class ClassificationResult:
    status: str  # "ok" | "needs_manual_pricing"
    form_type: str
    canonical_subtype_id: Optional[str]
    package_id: Optional[str]
    pricing_rule: Optional[PricingRule]
    reason: str


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def classify_order(
    db: Session,
    form_type: str,
    cheer_subtype: Optional[str],
    dance_subtype: Optional[str],
    package_name: str,
) -> ClassificationResult:
    """
    Resolve order classification fields to the matching PricingRule row.

    Returns ClassificationResult with status="ok" when found,
    or status="needs_manual_pricing" when no match or the package is marked TBD.
    """
    canonical_subtype = _normalize_subtype(form_type, cheer_subtype, dance_subtype)
    clean_name = _strip_split_flag(package_name).upper()
    if form_type == "sports-entertainment":
        clean_name = canonicalize_sports_entertainment_package(package_name).upper()
    elif form_type == "school-all-star-dance" and (
        dance_subtype == "team-performance-variety"
        or str(dance_subtype or "").startswith("team-performance")
    ):
        clean_name = canonicalize_team_performance_package(package_name).upper()

    # Query all rules for this form_type + subtype combination
    query = db.query(PricingRule).filter(
        PricingRule.form_type == form_type,
        PricingRule.subtype_id == canonical_subtype,
    )
    candidates = query.all()

    if not candidates:
        return ClassificationResult(
            status="needs_manual_pricing",
            form_type=form_type,
            canonical_subtype_id=canonical_subtype,
            package_id=None,
            pricing_rule=None,
            reason=(
                f"No pricing rules found for form_type='{form_type}' "
                f"subtype='{canonical_subtype}'. Manual pricing required."
            ),
        )

    # Match package by name (case-insensitive)
    matched: Optional[PricingRule] = None
    for rule in candidates:
        if rule.package_name.upper().strip() == clean_name:
            matched = rule
            break

    if matched is None:
        return ClassificationResult(
            status="needs_manual_pricing",
            form_type=form_type,
            canonical_subtype_id=canonical_subtype,
            package_id=None,
            pricing_rule=None,
            reason=(
                f"Package '{package_name}' (normalized: '{clean_name}') "
                f"not found in rate card for {form_type}/{canonical_subtype}. "
                "Manual pricing required."
            ),
        )

    # Package exists but has no price (TBD via email: Sports Entertainment OTHER)
    if matched.customer_facing_price is None:
        return ClassificationResult(
            status="needs_manual_pricing",
            form_type=form_type,
            canonical_subtype_id=canonical_subtype,
            package_id=matched.package_id,
            pricing_rule=matched,
            reason=(
                f"Package '{matched.package_name}' is priced via manual email quote "
                f"(no rate-card price). Manual pricing required."
            ),
        )

    return ClassificationResult(
        status="ok",
        form_type=form_type,
        canonical_subtype_id=canonical_subtype,
        package_id=matched.package_id,
        pricing_rule=matched,
        reason=(
            f"Matched {form_type}/{canonical_subtype}/{matched.package_id} "
            f"- '{matched.package_name}'."
        ),
    )
