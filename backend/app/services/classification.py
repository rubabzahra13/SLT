"""
classification.py — Resolves an order's (form_type, cheer/dance subtype, package_name)
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

    # Package exists but has no price (TBD via email — Sports Entertainment OTHER)
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
            f"— '{matched.package_name}'."
        ),
    )
