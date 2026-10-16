"""Normalize stale package labels to Magento / rate-card canonical keys.

Fixes demo rows like "Halftime Show" and "Stand Dance Package" that are not
valid Magento PACKAGE TYPE dropdown values.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import or_

from app.core.database import SessionLocal
from app.models.mtd_record import MTDRecord
from app.models.order import Order

# Exact (case-insensitive) legacy → Magento/rate-card package.
PACKAGE_REWRITES: dict[str, str] = {
    # Sports Entertainment
    "HALFTIME SHOW": "PRE-GAME / HALFTIME REMIXED",
    "PRE-GAME / HALFTIME": "PRE-GAME / HALFTIME REMIXED",
    "PREGAME / HALFTIME REMIXED": "PRE-GAME / HALFTIME REMIXED",
    "QUARTER BREAK / TIMEOUT": "QUARTER BREAK / TIMEOUT REMIXED",
    # Marching Band (legacy combined / short Magento-ish labels)
    "DRUM CADENCE": "DRUM CADENCE ORIGINAL",
    "FIGHT SONG": "FIGHT SONG ORIGINAL",
    "ALMA MATER": "ALMA MATER ORIGINAL",
    "FIGHT SONG / ALMA MATER": "FIGHT SONG ORIGINAL",
    "FIGHT SONG / ALMA MATER PLUS": "FIGHT SONG PLUS",
    "FIGHT SONG / ALMA MATER PLUS (WRITTEN & RECORDED LYRICS)": "FIGHT SONG PLUS",
    "FIGHT SONG PLUS (WRITTEN & RECORDED LYRICS)": "FIGHT SONG PLUS",
    "ALMA MATER PLUS (WRITTEN & RECORDED LYRICS)": "ALMA MATER PLUS",
}

# Form-aware rewrites when the same legacy label is invalid for that form.
FORM_PACKAGE_REWRITES: dict[str, dict[str, str]] = {
    "marching-band": {
        "HALFTIME SHOW": "BAND CHANT",
        "STAND DANCE PACKAGE": "DRUM CADENCE ORIGINAL",
        "PRE-GAME / HALFTIME REMIXED": "BAND CHANT",
        "QUARTER BREAK / TIMEOUT REMIXED": "DRUM CADENCE ORIGINAL",
        "OTHER (MIXES LONGER THAN 2:30)": "FIGHT SONG ORIGINAL",
    },
    "sports-entertainment": {
        "HALFTIME SHOW": "PRE-GAME / HALFTIME REMIXED",
        "STAND DANCE PACKAGE": "PRE-GAME / HALFTIME REMIXED",
        "TIMEOUT REMIX": "QUARTER BREAK / TIMEOUT REMIXED",
        "TIMEOUT REMIXED": "QUARTER BREAK / TIMEOUT REMIXED",
        "ARENA HYPE SUITE": "PRE-GAME / HALFTIME REMIXED",
        # Magento "Other - specify in notes…" maps to this rate-card key
        "OTHER - SPECIFY IN NOTES SECTION OF THE ORDER FORM":
            "OTHER (mixes longer than 2:30)",
        "OTHER": "OTHER (mixes longer than 2:30)",
    },
}

# Cheer tier names that landed on Dance form rows (seed bleed) → Magento SoftSelect.
DANCE_SUBTYPE_CHEER_BLEED: dict[str, dict[str, str]] = {
    "pom": {
        "BRONZE": "DANCE MIX",
        "SILVER": "DANCE MIX",
        "GOLD": "DANCE PLUS",
        "PLATINUM": "CUSTOM POM",
        "TITANIUM": "CUSTOM POM",
        "DIAMOND": "CUSTOM POM",
    },
    "hip-hop": {
        "BRONZE": "DANCE MIX",
        "SILVER": "DANCE MIX",
        "GOLD": "DANCE PLUS",
        "PLATINUM": "CUSTOM POM",
        "TITANIUM": "CUSTOM POM",
        "DIAMOND": "CUSTOM POM",
    },
    "jazz-kick": {
        "BRONZE": "JAZZ SIMPLE CUT",
        "SILVER": "JAZZ/KICK MIX",
        "GOLD": "JAZZ/KICK MIX",
        "PLATINUM": "JAZZ/KICK MIX",
        "TITANIUM": "JAZZ/KICK MIX",
        "DIAMOND": "JAZZ/KICK MIX",
    },
    "gameday": {
        "BRONZE": "PERFORMANCE MIX",
        "SILVER": "PERFORMANCE MIX",
        "GOLD": "PERFORMANCE PLUS",
        "PLATINUM": "PERFORMANCE EXTREME",
        "TITANIUM": "PERFORMANCE EXTREME",
        "DIAMOND": "PERFORMANCE EXTREME",
    },
    "team-performance-variety": {
        "BRONZE": "TP MIX",
        "SILVER": "TP MIX",
        "GOLD": "TP PLUS MIX",
        "PLATINUM": "TP PLUS MIX",
        "TITANIUM": "TP PLUS MIX",
        "DIAMOND": "TP MIX",
    },
}


def cheer_tier_key(value: str | None) -> str | None:
    key = canon(value)
    for tier in (
        "TITANIUM",
        "PLATINUM",
        "DIAMOND",
        "GOLD",
        "SILVER",
        "BRONZE",
    ):
        if key.startswith(tier) or f" {tier} " in f" {key} ":
            return tier
    return None


def canon(value: str | None) -> str:
    return " ".join(str(value or "").upper().split())


def rewrite(
    value: str | None,
    form_type: str | None = None,
    dance_subtype: str | None = None,
) -> str | None:
    if value is None:
        return None
    key = canon(value)
    form = (form_type or "").strip().lower()
    if form in FORM_PACKAGE_REWRITES and key in FORM_PACKAGE_REWRITES[form]:
        return FORM_PACKAGE_REWRITES[form][key]
    if form == "school-all-star-dance":
        tier = cheer_tier_key(value)
        sub = (dance_subtype or "").strip().lower()
        if tier and sub in DANCE_SUBTYPE_CHEER_BLEED:
            mapped = DANCE_SUBTYPE_CHEER_BLEED[sub].get(tier)
            if mapped:
                return mapped
    mapped = PACKAGE_REWRITES.get(key)
    return mapped if mapped else value


def main() -> None:
    db = SessionLocal()
    updated = 0
    try:
        rows = (
            db.query(Order)
            .filter(
                or_(
                    Order.package.isnot(None),
                    Order.package_type.isnot(None),
                )
            )
            .all()
        )
        for order in rows:
            next_pkg = rewrite(
                order.package, order.form_type, order.dance_form_subtype
            )
            next_type = rewrite(
                order.package_type, order.form_type, order.dance_form_subtype
            )
            changed = False
            if next_pkg is not None and next_pkg != order.package:
                print(
                    f"package {order.id} [{order.form_type}]: "
                    f"{order.package!r} → {next_pkg!r}"
                )
                order.package = next_pkg
                changed = True
            if next_type is not None and next_type != order.package_type:
                print(
                    f"package_type {order.id} [{order.form_type}]: "
                    f"{order.package_type!r} → {next_type!r}"
                )
                order.package_type = next_type
                changed = True
            if changed:
                updated += 1

        # Staging MTD rows can keep stale labels after order package was fixed
        # (e.g. HALFTIME SHOW on MTD while order is BAND CHANT → wrong Notes pill).
        mtd_updated = 0
        order_by_id = {o.id: o for o in rows if o.id}
        mtd_rows = db.query(MTDRecord).filter(MTDRecord.package.isnot(None)).all()
        for rec in mtd_rows:
            linked = order_by_id.get(rec.order_id) if rec.order_id else None
            form_type = (linked.form_type if linked else None) or None
            # Prefer syncing from linked Magento SoT package when present.
            if linked and linked.package and canon(rec.package) != canon(linked.package):
                print(
                    f"mtd package {rec.id} ← order {linked.id}: "
                    f"{rec.package!r} → {linked.package!r}"
                )
                rec.package = linked.package
                mtd_updated += 1
                continue
            dance_sub = linked.dance_form_subtype if linked else None
            next_pkg = rewrite(rec.package, form_type, dance_sub)
            if next_pkg is not None and next_pkg != rec.package:
                print(
                    f"mtd package {rec.id} [{form_type}]: "
                    f"{rec.package!r} → {next_pkg!r}"
                )
                rec.package = next_pkg
                mtd_updated += 1

        db.commit()
        print(f"updated {updated} order(s), {mtd_updated} mtd row(s)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
