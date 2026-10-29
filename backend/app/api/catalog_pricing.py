"""Catalog pricing: secret_menu_pricing (reference-only).

Package rate cards live in pricing_rules; this module only serves Secret Menu.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.secret_menu_pricing import SecretMenuPricing
from app.schemas.catalog_pricing import SecretMenuPricingUpdateSchema

router = APIRouter()

_DEFAULT_SECRET_MENU: Dict[str, Any] = {
    "package_name": "Semi-Custom Plus Package",
    "menu_title": "Semi-Custom Hip Hop & Custom POM Package Secret Menu",
    "base_price": Decimal("850"),
    "extra_song_tiers": [
        {"extraSongs": 1, "extraCost": 15, "editingMinutes": 30},
        {"extraSongs": 2, "extraCost": 30, "editingMinutes": 60},
        {"extraSongs": 3, "extraCost": 45, "editingMinutes": 90},
        {"extraSongs": 4, "extraCost": 60, "editingMinutes": 120},
        {"extraSongs": 5, "extraCost": 75, "editingMinutes": 150},
        {"extraSongs": 6, "extraCost": 90, "editingMinutes": 180},
    ],
}


def ensure_default_secret_menu(db: Session) -> SecretMenuPricing:
    row = db.query(SecretMenuPricing).order_by(SecretMenuPricing.created_at.asc()).first()
    if row:
        return row
    row = SecretMenuPricing(
        package_name=_DEFAULT_SECRET_MENU["package_name"],
        menu_title=_DEFAULT_SECRET_MENU["menu_title"],
        base_price=_DEFAULT_SECRET_MENU["base_price"],
        extra_song_tiers=_DEFAULT_SECRET_MENU["extra_song_tiers"],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def secret_menu_to_schema(row: SecretMenuPricing) -> Dict[str, Any]:
    return {
        "id": str(row.id),
        "packageName": row.package_name,
        "menuTitle": row.menu_title,
        "basePrice": float(row.base_price),
        "extraSongTiers": row.extra_song_tiers or [],
    }


@router.get("/secret-menu-pricing")
def get_secret_menu_pricing(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return secret_menu_to_schema(ensure_default_secret_menu(db))


@router.put("/secret-menu-pricing")
def update_secret_menu_pricing(
    payload: SecretMenuPricingUpdateSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
) -> Dict[str, Any]:
    row = ensure_default_secret_menu(db)
    data = payload.model_dump(by_alias=False, exclude_unset=True)
    if "package_name" in data and data["package_name"] is not None:
        row.package_name = data["package_name"]
    if "menu_title" in data and data["menu_title"] is not None:
        row.menu_title = data["menu_title"]
    if "base_price" in data and data["base_price"] is not None:
        row.base_price = Decimal(str(data["base_price"]))
    if "extra_song_tiers" in data and data["extra_song_tiers"] is not None:
        row.extra_song_tiers = data["extra_song_tiers"]
    db.commit()
    db.refresh(row)
    return secret_menu_to_schema(row)
