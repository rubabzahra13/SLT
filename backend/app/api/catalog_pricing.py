"""Catalog pricing — package_prices + secret_menu_pricing.

These tables existed but had no API; the admin UI kept prices in React memory only.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import require_full_access
from app.core.database import get_db
from app.models.package_price import PackagePrice
from app.models.secret_menu_pricing import SecretMenuPricing
from app.schemas.catalog_pricing import (
    PackagePriceSchema,
    PackagePricesReplaceSchema,
    SecretMenuPricingSchema,
    SecretMenuPricingUpdateSchema,
)

router = APIRouter()

# Mirrors src/lib/pricing.ts defaults so an empty DB seeds correctly.
_DEFAULT_PACKAGE_PRICES: List[Dict[str, Any]] = [
    {"package_key": "BRONZE 1:30 NO SPLIT", "name": "Bronze 1:30 No Split", "category": "Cheer", "price": 350},
    {"package_key": "SILVER 1:30 NO SPLIT", "name": "Silver 1:30 No Split", "category": "Cheer", "price": 470},
    {"package_key": "GOLD 1:30 NO SPLIT", "name": "Gold 1:30 No Split", "category": "Cheer", "price": 600},
    {"package_key": "GOLD 1:30 TBD", "name": "Gold 1:30 TBD", "category": "Cheer", "price": 600},
    {"package_key": "GOLD 1:45 NO SPLIT", "name": "Gold 1:45 No Split", "category": "Cheer", "price": 750},
    {"package_key": "GOLD 1:45 SPLIT", "name": "Gold 1:45 Split", "category": "Cheer", "price": 800},
    {"package_key": "GOLD 2:00 NO SPLIT", "name": "Gold 2:00 No Split", "category": "Cheer", "price": 850},
    {"package_key": "GOLD 2:30 NO SPLIT", "name": "Gold 2:30 No Split", "category": "Cheer", "price": 1000},
    {"package_key": "PLATINUM 1:30 NO SPLIT", "name": "Platinum 1:30 No Split", "category": "Cheer", "price": 850},
    {"package_key": "PLATINUM 1:30 TBD", "name": "Platinum 1:30 TBD", "category": "Cheer", "price": 850},
    {"package_key": "PLATINUM 1:45 NO SPLIT", "name": "Platinum 1:45 No Split", "category": "Cheer", "price": 1000},
    {"package_key": "PLATINUM 1:45 SPLIT", "name": "Platinum 1:45 Split", "category": "Cheer", "price": 1000},
    {"package_key": "PLATINUM 1:45 TBD", "name": "Platinum 1:45 TBD", "category": "Cheer", "price": 1000},
    {"package_key": "PLATINUM 2:00 NO SPLIT", "name": "Platinum 2:00 No Split", "category": "Cheer", "price": 1150},
    {"package_key": "PLATINUM 2:30 NO SPLIT", "name": "Platinum 2:30 No Split", "category": "Cheer", "price": 1400},
    {"package_key": "TITANIUM 2:30 NO SPLIT", "name": "Titanium 2:30 No Split", "category": "Cheer", "price": 1400},
    {"package_key": "HOMECOMING MIX TBD", "name": "Homecoming Mix TBD", "category": "School", "price": 450},
    {"package_key": "BAND CHANT :30", "name": "Band Chant :30", "category": "Marching Band", "price": 200},
]

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


def ensure_default_package_prices(db: Session) -> List[PackagePrice]:
    rows = db.query(PackagePrice).order_by(PackagePrice.package_key.asc()).all()
    if rows:
        return rows
    for item in _DEFAULT_PACKAGE_PRICES:
        db.add(
            PackagePrice(
                package_key=item["package_key"],
                name=item["name"],
                category=item["category"],
                price=Decimal(str(item["price"])),
            )
        )
    db.commit()
    return db.query(PackagePrice).order_by(PackagePrice.package_key.asc()).all()


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


@router.get("/package-prices", response_model=List[PackagePriceSchema])
def get_package_prices(db: Session = Depends(get_db)):
    return ensure_default_package_prices(db)


@router.put("/package-prices", response_model=List[PackagePriceSchema])
def replace_package_prices(
    payload: PackagePricesReplaceSchema,
    db: Session = Depends(get_db),
    _: None = Depends(require_full_access),
):
    """Upsert the full catalog. Keys not in the payload are left alone."""
    existing = {
        row.package_key: row for row in db.query(PackagePrice).all()
    }
    for item in payload.prices:
        key = item.package_key.strip().upper()
        row = existing.get(key)
        if row:
            row.name = item.name
            row.category = item.category
            row.price = Decimal(str(item.price))
        else:
            db.add(
                PackagePrice(
                    package_key=key,
                    name=item.name,
                    category=item.category,
                    price=Decimal(str(item.price)),
                )
            )
    db.commit()
    return ensure_default_package_prices(db)


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
