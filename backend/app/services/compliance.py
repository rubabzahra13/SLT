"""
compliance.py — Resolves order.music_affiliate against the per-subtype
music_affiliate_options catalog (Pricing Reference), with fallback to the
legacy global compliant_affiliates table.
"""
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.models.compliant_affiliate import CompliantAffiliate
from app.models.music_affiliate_option import MusicAffiliateOption

_VIROC_SUBTYPES = {"school-cheer-viroc-yes", "school-cheer-viroc-no"}


@dataclass
class ComplianceResult:
    # "compliant" | "non-compliant" | "needs_manual_review"
    status: str
    reason: str
    # The canonical affiliate name if matched, else None
    canonical_affiliate: Optional[str]


def _canonicalize_subtype(
    form_type: Optional[str],
    subtype_id: Optional[str],
) -> Optional[str]:
    if not form_type:
        return None
    raw = (subtype_id or "").strip()
    if form_type == "school-all-star-cheer":
        if raw in _VIROC_SUBTYPES:
            return "school-cheer"
        return raw or None
    if form_type == "school-all-star-dance":
        return raw or None
    return ""


def _compact(value: str) -> str:
    return "".join(ch for ch in value.upper() if ch.isalnum())


def resolve_compliance(
    db: Session,
    music_affiliate: Optional[str],
    form_type: Optional[str] = None,
    subtype_id: Optional[str] = None,
) -> ComplianceResult:
    """
    Normalise music_affiliate and check it against the affiliate catalog.

    Prefer music_affiliate_options for the order's form_type + subtype when
    present; otherwise fall back to the global compliant_affiliates table.

    Rules (in order):
    1. Empty / None → needs_manual_review
    2. Match an enabled compliant option label (case/spacing tolerant) → compliant
    3. Match an enabled non-compliant option (e.g. "Non compliant") → non-compliant
    4. Non-empty but no match → non-compliant
    """
    if not music_affiliate or not music_affiliate.strip():
        return ComplianceResult(
            status="needs_manual_review",
            reason="No music affiliate on file – please verify before finalizing pricing.",
            canonical_affiliate=None,
        )

    query_val = music_affiliate.strip()
    query_lower = query_val.lower()
    query_compact = _compact(query_val)

    subtype = _canonicalize_subtype(form_type, subtype_id)
    catalog_rows: list[MusicAffiliateOption] = []
    if form_type and subtype is not None:
        catalog_rows = (
            db.query(MusicAffiliateOption)
            .filter(
                MusicAffiliateOption.form_type == form_type,
                MusicAffiliateOption.subtype_id == subtype,
                MusicAffiliateOption.enabled.is_(True),
            )
            .all()
        )

    if catalog_rows:
        for aff in catalog_rows:
            label = (aff.label or "").strip()
            if not label:
                continue
            if label.lower() == query_lower or _compact(label) == query_compact:
                if aff.is_compliant and aff.option_key != "non-compliant":
                    return ComplianceResult(
                        status="compliant",
                        reason=(
                            f"'{query_val}' matches compliant affiliate "
                            f"'{label}' for {form_type}/{subtype or '—'}."
                        ),
                        canonical_affiliate=label,
                    )
                return ComplianceResult(
                    status="non-compliant",
                    reason=(
                        f"'{query_val}' matches non-compliant affiliate "
                        f"'{label}' for {form_type}/{subtype or '—'}."
                    ),
                    canonical_affiliate=label,
                )

        return ComplianceResult(
            status="non-compliant",
            reason=(
                f"'{query_val}' is not a recognised compliant affiliate for "
                f"{form_type}/{subtype or '—'}. Non-compliant payroll rates apply."
            ),
            canonical_affiliate=None,
        )

    # Legacy global table fallback (pre-catalog rows / non-cheer forms).
    affiliates = db.query(CompliantAffiliate).all()
    for aff in affiliates:
        if aff.name.lower() == query_lower:
            return ComplianceResult(
                status="compliant",
                reason=f"'{query_val}' is a compliant affiliate.",
                canonical_affiliate=aff.name,
            )
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

    return ComplianceResult(
        status="non-compliant",
        reason=(
            f"'{query_val}' is not a recognised compliant affiliate. "
            "Non-compliant payroll rates apply. Verify the affiliate name if this looks wrong."
        ),
        canonical_affiliate=None,
    )
