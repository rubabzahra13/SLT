"""
compliance.py — Resolves order.music_affiliate against the compliant_affiliates table
(which is seeded from pricing-rules.json and includes a configurable synonym mapping).
"""
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.compliant_affiliate import CompliantAffiliate


@dataclass
class ComplianceResult:
    # "compliant" | "non-compliant" | "needs_manual_review"
    status: str
    reason: str
    # The canonical affiliate name if matched, else None
    canonical_affiliate: Optional[str]


def resolve_compliance(
    db: Session,
    music_affiliate: Optional[str],
) -> ComplianceResult:
    """
    Normalise music_affiliate and check it against the compliant_affiliates table.

    Rules (in order):
    1. Empty / None → needs_manual_review  (no data to evaluate)
    2. Exact match on canonical name → compliant
    3. Match on any synonym → compliant (with note of synonym used)
    4. Non-empty but no match → non-compliant (unknown affiliate)
    """
    if not music_affiliate or not music_affiliate.strip():
        return ComplianceResult(
            status="needs_manual_review",
            reason="No music affiliate on file – please verify before finalizing pricing.",
            canonical_affiliate=None,
        )

    query_val = music_affiliate.strip()
    query_lower = query_val.lower()

    affiliates = db.query(CompliantAffiliate).all()

    for aff in affiliates:
        # 1. Canonical exact match (case-insensitive)
        if aff.name.lower() == query_lower:
            return ComplianceResult(
                status="compliant",
                reason=f"'{query_val}' is a compliant affiliate.",
                canonical_affiliate=aff.name,
            )

        # 2. Synonym match (case-insensitive)
        synonyms = aff.synonyms or []
        for synonym in synonyms:
            if synonym.lower() == query_lower:
                return ComplianceResult(
                    status="compliant",
                    reason=(
                        f"'{query_val}' is a compliant affiliate "
                        f"(matched as synonym of '{aff.name}')."
                    ),
                    canonical_affiliate=aff.name,
                )

    # No match found
    return ComplianceResult(
        status="non-compliant",
        reason=(
            f"'{query_val}' is not a recognised compliant affiliate. "
            "Non-compliant payroll rates apply. Verify the affiliate name if this looks wrong."
        ),
        canonical_affiliate=None,
    )
