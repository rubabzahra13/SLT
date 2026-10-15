"""CRUD for pricing_rules — MB/SE/SA + Jazz/Kick (school-all-star-dance)."""
from __future__ import annotations

from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.pricing_rule import PricingRule
from app.schemas.pricing_rules import (
    PricingRuleSchema,
    PricingRulesReplaceSchema,
)

router = APIRouter()

SUPPORTED_FORM_TYPES = frozenset(
    {
        "marching-band",
        "sports-entertainment",
        "school-anthem",
        "school-all-star-dance",
    }
)

# Dance subtypes editable via Pricing Reference today.
SUPPORTED_DANCE_SUBTYPES = frozenset({"jazz-kick"})


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    return float(value)


def _rule_to_schema(row: PricingRule) -> PricingRuleSchema:
    return PricingRuleSchema(
        id=row.id,
        form_type=row.form_type,
        subtype_id=row.subtype_id,
        package_id=row.package_id,
        package_name=row.package_name,
        customer_facing_price=_to_float(row.customer_facing_price),
        payroll_base_compliant=_to_float(row.payroll_base_compliant),
        payroll_base_non_compliant=_to_float(row.payroll_base_non_compliant),
        compliance_sensitive=bool(row.compliance_sensitive),
        note=row.note,
        updated_at=row.updated_at,
    )


def _slug_package_id(name: str) -> str:
    raw = (name or "").strip().lower()
    out = []
    prev_us = False
    for ch in raw:
        if ch.isalnum():
            out.append(ch)
            prev_us = False
        else:
            if not prev_us:
                out.append("_")
                prev_us = True
    return "".join(out).strip("_") or "package"


# Marching Band add-ons are not edited via the package table PUT.
_MB_ADDON_PACKAGE_IDS = frozenset({"sheet_music_add", "add_vocals"})


def _canonicalize_mb_package(name: str, package_id: str | None) -> tuple[str, str]:
    """Collapse renamed variants (e.g. BAND CHANT 3) onto one canonical row."""
    cleaned = " ".join((name or "").strip().split())
    upper = cleaned.upper()
    pid = (package_id or "").strip() or _slug_package_id(cleaned)

    if upper.startswith("BAND CHANT") or pid.startswith("band_chant"):
        return "BAND CHANT", "band_chant"
    if upper.startswith("DRUM CADENCE") or pid.startswith("drum_cadence"):
        return "DRUM CADENCE ORIGINAL", "drum_cadence_original"
    if upper in {"FIGHT SONG", "FIGHT SONG ORIGINAL"} or pid == "fight_song_original":
        return "FIGHT SONG ORIGINAL", "fight_song_original"
    if upper in {"ALMA MATER", "ALMA MATER ORIGINAL"} or pid == "alma_mater_original":
        return "ALMA MATER ORIGINAL", "alma_mater_original"
    if upper.startswith("FIGHT SONG PLUS") or pid == "fight_song_plus":
        return "FIGHT SONG PLUS", "fight_song_plus"
    if upper.startswith("ALMA MATER PLUS") or pid == "alma_mater_plus":
        return "ALMA MATER PLUS", "alma_mater_plus"
    return cleaned, pid


def _canonicalize_jazz_kick_package(
    name: str, package_id: str | None
) -> tuple[str, str]:
    cleaned = " ".join((name or "").strip().split())
    upper = cleaned.upper()
    pid = (package_id or "").strip() or _slug_package_id(cleaned)

    if "SIMPLE CUT" in upper or pid == "jazz_simple_cut":
        return "JAZZ SIMPLE CUT", "jazz_simple_cut"
    if "JAZZ/KICK MIX" in upper or upper == "JAZZ/KICK MIX" or pid == "jazz_kick_mix":
        return "JAZZ/KICK MIX", "jazz_kick_mix"
    if "DTU" in upper or pid in {"non_compliant_for_dtu", "non_compliant_dtu"}:
        return "NON-COMPLIANT (FOR DTU)", "non_compliant_for_dtu"
    return cleaned, pid


@router.get("/pricing-rules", response_model=List[PricingRuleSchema])
def list_pricing_rules(
    form_type: Optional[str] = Query(None),
    subtype_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List DB-backed pricing rules (MB/SE/SA + Jazz/Kick)."""
    query = db.query(PricingRule).filter(
        PricingRule.form_type.in_(SUPPORTED_FORM_TYPES)
    )
    if form_type:
        if form_type not in SUPPORTED_FORM_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"form_type must be one of: {sorted(SUPPORTED_FORM_TYPES)}",
            )
        query = query.filter(PricingRule.form_type == form_type)
    if subtype_id is not None:
        query = query.filter(PricingRule.subtype_id == subtype_id)
    # Default list: no-subtype forms + Jazz/Kick (other dance subtypes stay seed-only for now).
    if form_type is None and subtype_id is None:
        query = query.filter(
            (PricingRule.subtype_id.is_(None))
            | (
                (PricingRule.form_type == "school-all-star-dance")
                & (PricingRule.subtype_id.in_(SUPPORTED_DANCE_SUBTYPES))
            )
        )
    rows = query.order_by(
        PricingRule.form_type.asc(),
        PricingRule.subtype_id.asc().nullsfirst(),
        PricingRule.package_name.asc(),
    ).all()
    return [_rule_to_schema(r) for r in rows]


@router.put("/pricing-rules", response_model=List[PricingRuleSchema])
def upsert_pricing_rules(
    payload: PricingRulesReplaceSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    """
    Upsert package prices for a supported form type.
    For school-all-star-dance, subtype_id is required (currently jazz-kick).
    """
    form_type = payload.form_type
    if form_type not in SUPPORTED_FORM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"form_type must be one of: {sorted(SUPPORTED_FORM_TYPES)}",
        )

    subtype_id = (payload.subtype_id or "").strip() or None
    if form_type == "school-all-star-dance":
        if subtype_id not in SUPPORTED_DANCE_SUBTYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "school-all-star-dance requires subtype_id "
                    f"in {sorted(SUPPORTED_DANCE_SUBTYPES)}"
                ),
            )
    elif subtype_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"form_type '{form_type}' does not use subtype_id",
        )

    existing_q = db.query(PricingRule).filter(PricingRule.form_type == form_type)
    if subtype_id is None:
        existing_q = existing_q.filter(PricingRule.subtype_id.is_(None))
    else:
        existing_q = existing_q.filter(PricingRule.subtype_id == subtype_id)
    existing = existing_q.all()

    by_id = {r.package_id: r for r in existing}
    by_name = {r.package_name.strip().upper(): r for r in existing}
    written_ids: set[str] = set()

    for pkg in payload.packages:
        name = (pkg.package_name or "").strip()
        if not name:
            continue
        package_id = (pkg.package_id or "").strip() or _slug_package_id(name)
        if form_type == "marching-band":
            name, package_id = _canonicalize_mb_package(name, package_id)
        elif form_type == "school-all-star-dance" and subtype_id == "jazz-kick":
            name, package_id = _canonicalize_jazz_kick_package(name, package_id)

        row = by_id.get(package_id) or by_name.get(name.upper())

        customer = (
            Decimal(str(pkg.customer_facing_price))
            if pkg.customer_facing_price is not None
            else None
        )
        compliant = (
            Decimal(str(pkg.payroll_base_compliant))
            if pkg.payroll_base_compliant is not None
            else customer
        )
        non_compliant = (
            Decimal(str(pkg.payroll_base_non_compliant))
            if pkg.payroll_base_non_compliant is not None
            else compliant
        )

        if row:
            row.package_id = package_id
            row.package_name = name
            row.customer_facing_price = customer
            row.payroll_base_compliant = compliant
            row.payroll_base_non_compliant = non_compliant
            if pkg.note is not None:
                row.note = pkg.note
        else:
            row = PricingRule(
                form_type=form_type,
                subtype_id=subtype_id,
                package_id=package_id,
                package_name=name,
                customer_facing_price=customer,
                payroll_base_compliant=compliant,
                payroll_base_non_compliant=non_compliant,
                compliance_sensitive=subtype_id == "jazz-kick"
                and package_id == "jazz_kick_mix",
                note=pkg.note,
            )
            db.add(row)
        by_id[package_id] = row
        by_name[name.upper()] = row
        written_ids.add(package_id)

    # Drop renamed duplicates after canonical upsert.
    if form_type == "marching-band" and written_ids:
        for row in (
            db.query(PricingRule)
            .filter(
                PricingRule.form_type == form_type,
                PricingRule.subtype_id.is_(None),
            )
            .all()
        ):
            if row.package_id in _MB_ADDON_PACKAGE_IDS:
                continue
            canon_name, canon_id = _canonicalize_mb_package(
                row.package_name, row.package_id
            )
            if canon_id in written_ids and row.package_id != canon_id:
                db.delete(row)

    if form_type == "school-all-star-dance" and subtype_id == "jazz-kick" and written_ids:
        for row in (
            db.query(PricingRule)
            .filter(
                PricingRule.form_type == form_type,
                PricingRule.subtype_id == subtype_id,
            )
            .all()
        ):
            canon_name, canon_id = _canonicalize_jazz_kick_package(
                row.package_name, row.package_id
            )
            if canon_id in written_ids and row.package_id != canon_id:
                db.delete(row)

    db.commit()

    rows_q = db.query(PricingRule).filter(PricingRule.form_type == form_type)
    if subtype_id is None:
        rows_q = rows_q.filter(PricingRule.subtype_id.is_(None))
    else:
        rows_q = rows_q.filter(PricingRule.subtype_id == subtype_id)
    rows = rows_q.order_by(PricingRule.package_name.asc()).all()
    return [_rule_to_schema(r) for r in rows]
