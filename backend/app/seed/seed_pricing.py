"""
seed_pricing.py — Seeds pricing_rules, addon_rules, and compliant_affiliates
tables from pricing-rules.json. Idempotent: upserts by (form_type, subtype_id, package_id).
"""
import os
import json
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.pricing_rule import PricingRule
from app.models.addon_rule import AddonRule
from app.models.compliant_affiliate import CompliantAffiliate

PRICING_RULES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../pricing-rules.json")
)

# ---------------------------------------------------------------------------
# Synonym table: maps alternate spellings → canonical affiliate name.
# Add more entries here as new edge-cases are discovered; never do ad-hoc
# string comparison elsewhere in the codebase.
# ---------------------------------------------------------------------------
AFFILIATE_SYNONYMS: Dict[str, str] = {
    "power music covers": "Power Music",
    "powermusic": "Power Music",
    "power music covers (pmci)": "Power Music",
    "unleash the beats": "Unleash the Beats",
    "utb": "Unleash the Beats",
    "library music": "Library Music",
    "power music + unleash the beats": "Power Music + Unleash the Beats",
    "power music & unleash the beats": "Power Music + Unleash the Beats",
}


def _decimal_or_none(val: Any) -> Optional[Decimal]:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def _upsert_pricing_rule(
    db: Session,
    form_type: str,
    subtype_id: Optional[str],
    pkg: Dict[str, Any],
) -> None:
    package_id = pkg["id"]
    existing = (
        db.query(PricingRule)
        .filter(
            PricingRule.form_type == form_type,
            PricingRule.subtype_id == subtype_id,
            PricingRule.package_id == package_id,
        )
        .first()
    )

    payroll = pkg.get("payroll_base_price", {}) or {}
    customer_price = _decimal_or_none(pkg.get("customer_facing_price"))
    payroll_compliant = _decimal_or_none(payroll.get("compliant"))
    payroll_non_compliant = _decimal_or_none(payroll.get("non_compliant"))
    compliance_sensitive = bool(pkg.get("compliance_sensitive", True))
    note = pkg.get("note")

    if existing:
        existing.package_name = pkg["name"]
        existing.customer_facing_price = customer_price
        existing.payroll_base_compliant = payroll_compliant
        existing.payroll_base_non_compliant = payroll_non_compliant
        existing.compliance_sensitive = compliance_sensitive
        existing.note = note
    else:
        db.add(PricingRule(
            form_type=form_type,
            subtype_id=subtype_id,
            package_id=package_id,
            package_name=pkg["name"],
            customer_facing_price=customer_price,
            payroll_base_compliant=payroll_compliant,
            payroll_base_non_compliant=payroll_non_compliant,
            compliance_sensitive=compliance_sensitive,
            note=note,
        ))


def _upsert_addon_rule(
    db: Session,
    addon_id: str,
    label: str,
    amount: Optional[Decimal],
    unit_amount: Optional[Decimal],
    input_type: str,
    scope: str = "global",
    note: Optional[str] = None,
) -> None:
    existing = db.query(AddonRule).filter(AddonRule.addon_id == addon_id).first()
    if existing:
        existing.label = label
        existing.amount = amount
        existing.unit_amount = unit_amount
        existing.input_type = input_type
        existing.scope = scope
        existing.note = note
    else:
        db.add(AddonRule(
            addon_id=addon_id,
            label=label,
            amount=amount,
            unit_amount=unit_amount,
            input_type=input_type,
            scope=scope,
            note=note,
        ))


def seed_pricing(db: Session) -> None:
    if not os.path.exists(PRICING_RULES_PATH):
        raise FileNotFoundError(f"pricing-rules.json not found at {PRICING_RULES_PATH}")

    with open(PRICING_RULES_PATH, "r", encoding="utf-8") as f:
        rules: Dict[str, Any] = json.load(f)

    # -----------------------------------------------------------------------
    # 1. Seed pricing_rules from order_form_types
    # -----------------------------------------------------------------------
    form_types = rules.get("order_form_types", [])
    pricing_count = 0

    for form_def in form_types:
        form_type = form_def["form_type"]
        subtypes = form_def.get("subtypes")

        if subtypes:
            # Forms with subtypes: cheer (3) and dance (5)
            for subtype in subtypes:
                subtype_id = subtype["subtype_id"]
                for pkg in subtype.get("packages", []):
                    _upsert_pricing_rule(db, form_type, subtype_id, pkg)
                    pricing_count += 1
                # Sub-type level line-item addons (e.g. youth-rec-cheer, pom, etc.)
                for addon in subtype.get("line_item_addons", []):
                    scope = subtype_id
                    _upsert_addon_rule(
                        db,
                        addon_id=f"{subtype_id}__{addon['id']}",
                        label=addon["name"],
                        amount=_decimal_or_none(
                            (addon.get("payroll_base_price") or {}).get("compliant")
                        ),
                        unit_amount=None,
                        input_type="dropdown_single_select",
                        scope=scope,
                        note=addon.get("note"),
                    )
        else:
            # Forms without subtypes: marching-band, sports-entertainment, school-anthem
            for pkg in form_def.get("packages", []):
                _upsert_pricing_rule(db, form_type, None, pkg)
                pricing_count += 1

    db.flush()
    print(f"  Seeded {pricing_count} pricing rules.")

    # -----------------------------------------------------------------------
    # 2. Seed addon_rules from global_addons
    # -----------------------------------------------------------------------
    global_addons = rules.get("global_addons", {})

    # Voiceovers
    vo = global_addons.get("voiceovers", {})
    dance_vo = vo.get("dance_voiceover", {})
    for amt in dance_vo.get("options", []):
        _upsert_addon_rule(
            db,
            addon_id=f"dance_voiceover_{amt}",
            label=f"Dance Voiceover (${amt})",
            amount=Decimal(str(amt)),
            unit_amount=None,
            input_type="dropdown_single_select",
            scope="dance",
            note=dance_vo.get("note"),
        )

    cheer_vo = vo.get("cheer_voiceover", {})
    for amt in cheer_vo.get("options", []):
        _upsert_addon_rule(
            db,
            addon_id=f"cheer_voiceover_{amt}",
            label=f"Cheer Voiceover (${amt})",
            amount=Decimal(str(amt)),
            unit_amount=None,
            input_type="dropdown_single_select",
            scope="cheer",
            note=cheer_vo.get("note"),
        )

    # Rush fees
    rush = global_addons.get("rush_fee", {})
    for opt in rush.get("options", []):
        _upsert_addon_rule(
            db,
            addon_id=opt["id"],
            label=opt["label"],
            amount=Decimal(str(opt["amount"])),
            unit_amount=None,
            input_type="dropdown_single_select",
            scope="global",
            note=rush.get("note"),
        )

    # 8-count sheets (flat $50)
    eight_ct = global_addons.get("eight_count_sheets", {})
    for amt in eight_ct.get("options", []):
        _upsert_addon_rule(
            db,
            addon_id="eight_count_sheets",
            label="8-Count Sheets",
            amount=Decimal(str(amt)),
            unit_amount=None,
            input_type="dropdown_single_select",
            scope="global",
            note=eight_ct.get("note"),
        )

    # Extra song (quantity × $15)
    extra_song = global_addons.get("extra_song", {})
    _upsert_addon_rule(
        db,
        addon_id="extra_song",
        label="Extra Song",
        amount=None,
        unit_amount=Decimal(str(extra_song.get("unit_amount", 15))),
        input_type="quantity",
        scope="global",
        note=extra_song.get("note"),
    )

    # Extra song added-time fee (quantity × $30)
    extra_song_time = global_addons.get("extra_song_added_time_fee", {})
    _upsert_addon_rule(
        db,
        addon_id="extra_song_added_time_fee",
        label="Extra Song Added-Time Fee",
        amount=None,
        unit_amount=Decimal(str(extra_song_time.get("unit_amount", 30))),
        input_type="quantity",
        scope="global",
        note=extra_song_time.get("note"),
    )

    db.flush()
    print(f"  Seeded addon rules.")

    # -----------------------------------------------------------------------
    # 3. Seed compliant_affiliates with synonym mappings
    # -----------------------------------------------------------------------
    canonical_names = rules.get("compliance_rules", {}).get("compliant_affiliates", [])

    # Build reverse map: canonical → list of known synonyms
    synonym_map: Dict[str, list] = {name: [] for name in canonical_names}
    for synonym_lower, canonical in AFFILIATE_SYNONYMS.items():
        if canonical in synonym_map:
            # Store synonyms in their original-ish casing (title case)
            synonym_map[canonical].append(
                synonym_lower.title().replace("Pmci", "PMCI").replace("Utb", "UTB")
            )

    for canonical_name in canonical_names:
        synonyms = synonym_map.get(canonical_name, [])
        existing = (
            db.query(CompliantAffiliate)
            .filter(CompliantAffiliate.name == canonical_name)
            .first()
        )
        if existing:
            existing.synonyms = synonyms
        else:
            db.add(CompliantAffiliate(name=canonical_name, synonyms=synonyms))

    db.flush()
    print(f"  Seeded {len(canonical_names)} compliant affiliates.")

    db.commit()
    print("Pricing rules seeding completed.")
