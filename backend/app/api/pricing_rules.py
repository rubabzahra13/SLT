"""CRUD for pricing_rules — marching-band, sports-entertainment, school-anthem."""
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
    {"marching-band", "sports-entertainment", "school-anthem"}
)


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


@router.get("/pricing-rules", response_model=List[PricingRuleSchema])
def list_pricing_rules(
    form_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """List pricing rules. Defaults to SE + SA; optional form_type filter."""
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
    rows = query.order_by(
        PricingRule.form_type.asc(), PricingRule.package_name.asc()
    ).all()
    return [_rule_to_schema(r) for r in rows]


@router.put("/pricing-rules", response_model=List[PricingRuleSchema])
def upsert_pricing_rules(
    payload: PricingRulesReplaceSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    """
    Upsert package prices for sports-entertainment or school-anthem.
    Matches existing rows by package_id or package_name; creates if missing.
    """
    form_type = payload.form_type
    if form_type not in SUPPORTED_FORM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"form_type must be one of: {sorted(SUPPORTED_FORM_TYPES)}",
        )

    existing = (
        db.query(PricingRule)
        .filter(PricingRule.form_type == form_type, PricingRule.subtype_id.is_(None))
        .all()
    )
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
                subtype_id=None,
                package_id=package_id,
                package_name=name,
                customer_facing_price=customer,
                payroll_base_compliant=compliant,
                payroll_base_non_compliant=non_compliant,
                compliance_sensitive=False,
                note=pkg.note,
            )
            db.add(row)
        by_id[package_id] = row
        by_name[name.upper()] = row
        written_ids.add(package_id)

    # Drop renamed duplicates (e.g. band_chant_3) after canonical upsert.
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

    db.commit()

    rows = (
        db.query(PricingRule)
        .filter(PricingRule.form_type == form_type, PricingRule.subtype_id.is_(None))
        .order_by(PricingRule.package_name.asc())
        .all()
    )
    return [_rule_to_schema(r) for r in rows]
