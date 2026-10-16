"""CRUD for music_affiliate_options — SoftSelect + compliance catalogs."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.music_affiliate_option import MusicAffiliateOption
from app.schemas.music_affiliates import (
    MusicAffiliateOptionSchema,
    MusicAffiliatesReplaceSchema,
)

router = APIRouter()

SUPPORTED_FORM_TYPES = frozenset(
    {
        "marching-band",
        "sports-entertainment",
        "school-anthem",
        "school-all-star-dance",
        "school-all-star-cheer",
    }
)

SUPPORTED_CHEER_SUBTYPES = frozenset(
    {"all-star-cheer", "school-cheer", "youth-rec-cheer"}
)

SUPPORTED_DANCE_SUBTYPES = frozenset(
    {
        "pom",
        "hip-hop",
        "team-performance-variety",
        "gameday",
        "jazz-kick",
    }
)


def _normalize_subtype(form_type: str, subtype_id: Optional[str]) -> str:
    raw = (subtype_id or "").strip()
    if form_type in {"school-all-star-dance", "school-all-star-cheer"}:
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"form_type '{form_type}' requires subtype_id",
            )
        # V!ROC Yes/No share the School Cheer Magento affiliate catalog.
        if raw in {"school-cheer-viroc-yes", "school-cheer-viroc-no"}:
            raw = "school-cheer"
        allowed = (
            SUPPORTED_DANCE_SUBTYPES
            if form_type == "school-all-star-dance"
            else SUPPORTED_CHEER_SUBTYPES
        )
        if raw not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"subtype_id must be one of: {sorted(allowed)}",
            )
        return raw
    if raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"form_type '{form_type}' does not use subtype_id",
        )
    return ""


def _to_schema(row: MusicAffiliateOption) -> MusicAffiliateOptionSchema:
    return MusicAffiliateOptionSchema(
        id=row.id,
        form_type=row.form_type,
        subtype_id=row.subtype_id or None,
        option_key=row.option_key,
        label=row.label,
        is_compliant=bool(row.is_compliant),
        enabled=bool(row.enabled),
        sort_order=int(row.sort_order or 0),
        updated_at=row.updated_at,
    )


@router.get("/music-affiliates", response_model=List[MusicAffiliateOptionSchema])
def list_music_affiliates(
    form_type: Optional[str] = Query(None),
    subtype_id: Optional[str] = Query(None),
    enabled_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    """List SoftSelect / compliance affiliate options."""
    query = db.query(MusicAffiliateOption).filter(
        MusicAffiliateOption.form_type.in_(SUPPORTED_FORM_TYPES)
    )
    if form_type:
        if form_type not in SUPPORTED_FORM_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"form_type must be one of: {sorted(SUPPORTED_FORM_TYPES)}",
            )
        query = query.filter(MusicAffiliateOption.form_type == form_type)
        if subtype_id is not None:
            normalized = _normalize_subtype(form_type, subtype_id)
            query = query.filter(MusicAffiliateOption.subtype_id == normalized)
    if enabled_only:
        query = query.filter(MusicAffiliateOption.enabled.is_(True))

    rows = query.order_by(
        MusicAffiliateOption.form_type.asc(),
        MusicAffiliateOption.subtype_id.asc(),
        MusicAffiliateOption.sort_order.asc(),
        MusicAffiliateOption.label.asc(),
    ).all()
    return [_to_schema(r) for r in rows]


@router.put("/music-affiliates", response_model=List[MusicAffiliateOptionSchema])
def replace_music_affiliates(
    payload: MusicAffiliatesReplaceSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    """
    Replace the affiliate catalog for one form type (+ subtype).

    Send only options that should remain in SoftSelect (enabled). Empty-label
    removals from the admin UI are omitted from this payload.
    """
    form_type = payload.form_type
    if form_type not in SUPPORTED_FORM_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"form_type must be one of: {sorted(SUPPORTED_FORM_TYPES)}",
        )

    subtype = _normalize_subtype(form_type, payload.subtype_id)

    seen_keys: set[str] = set()
    cleaned = []
    for idx, opt in enumerate(payload.options):
        key = opt.option_key.strip()
        label = opt.label.strip()
        if not key or not label:
            continue
        if key in seen_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate option_key '{key}'",
            )
        seen_keys.add(key)
        cleaned.append(
            {
                "option_key": key,
                "label": label,
                "is_compliant": bool(opt.is_compliant) and key != "non-compliant",
                "enabled": bool(opt.enabled),
                "sort_order": int(opt.sort_order if opt.sort_order is not None else idx),
            }
        )

    existing = (
        db.query(MusicAffiliateOption)
        .filter(
            MusicAffiliateOption.form_type == form_type,
            MusicAffiliateOption.subtype_id == subtype,
        )
        .all()
    )
    by_key = {r.option_key: r for r in existing}
    keep_keys = {c["option_key"] for c in cleaned}

    for row in existing:
        if row.option_key not in keep_keys:
            db.delete(row)

    for item in cleaned:
        row = by_key.get(item["option_key"])
        if row is None:
            db.add(
                MusicAffiliateOption(
                    form_type=form_type,
                    subtype_id=subtype,
                    option_key=item["option_key"],
                    label=item["label"],
                    is_compliant=item["is_compliant"],
                    enabled=item["enabled"],
                    sort_order=item["sort_order"],
                )
            )
        else:
            row.label = item["label"]
            row.is_compliant = item["is_compliant"]
            row.enabled = item["enabled"]
            row.sort_order = item["sort_order"]

    db.commit()

    rows = (
        db.query(MusicAffiliateOption)
        .filter(
            MusicAffiliateOption.form_type == form_type,
            MusicAffiliateOption.subtype_id == subtype,
        )
        .order_by(
            MusicAffiliateOption.sort_order.asc(),
            MusicAffiliateOption.label.asc(),
        )
        .all()
    )
    return [_to_schema(r) for r in rows]
