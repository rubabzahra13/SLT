"""
pricing.py — Calculates the full pricing breakdown for an order.

Inputs come from the classification + compliance services plus the caller-supplied
add-on selections. Nothing is persisted here; that happens in the API layer.
"""
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.services.classification import classify_order, ClassificationResult
from app.services.compliance import resolve_compliance, ComplianceResult
from app.models.addon_rule import AddonRule


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class AddOnLineItem:
    addon_id: str
    label: str
    customer_amount: Decimal   # amount added to customer-facing price
    payroll_amount: Decimal    # amount added to payroll-base (addons are NOT compliance-sensitive)
    quantity: int = 1
    note: Optional[str] = None


@dataclass
class PricingBreakdown:
    # Classification
    form_type: str
    canonical_subtype_id: Optional[str]
    package_id: Optional[str]
    package_name: Optional[str]
    pricing_rule_id: Optional[str]   # UUID str for audit trail

    # Compliance
    compliance_status: str           # "compliant" | "non-compliant" | "needs_manual_review"
    compliance_reason: str
    canonical_affiliate: Optional[str]

    # Prices
    base_customer_price: Optional[Decimal]    # package.customer_facing_price
    base_payroll_price: Optional[Decimal]     # selected based on compliance

    # Add-ons
    addons: List[AddOnLineItem] = field(default_factory=list)

    # Totals
    system_calculated_customer_price: Optional[Decimal] = None
    payroll_base_price: Optional[Decimal] = None

    # Flags
    needs_manual_pricing: bool = False
    needs_manual_review: bool = False   # compliance flag — does not block calculation

    # Human-readable one-liner for the UI
    summary_line: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to JSON-safe dict for storage in orders.pricing_breakdown."""
        return {
            "form_type": self.form_type,
            "canonical_subtype_id": self.canonical_subtype_id,
            "package_id": self.package_id,
            "package_name": self.package_name,
            "pricing_rule_id": self.pricing_rule_id,
            "compliance_status": self.compliance_status,
            "compliance_reason": self.compliance_reason,
            "canonical_affiliate": self.canonical_affiliate,
            "base_customer_price": float(self.base_customer_price) if self.base_customer_price is not None else None,
            "base_payroll_price": float(self.base_payroll_price) if self.base_payroll_price is not None else None,
            "addons": [
                {
                    "addon_id": a.addon_id,
                    "label": a.label,
                    "customer_amount": float(a.customer_amount),
                    "payroll_amount": float(a.payroll_amount),
                    "quantity": a.quantity,
                    "note": a.note,
                }
                for a in self.addons
            ],
            "system_calculated_customer_price": (
                float(self.system_calculated_customer_price)
                if self.system_calculated_customer_price is not None else None
            ),
            "payroll_base_price": (
                float(self.payroll_base_price)
                if self.payroll_base_price is not None else None
            ),
            "needs_manual_pricing": self.needs_manual_pricing,
            "needs_manual_review": self.needs_manual_review,
            "summary_line": self.summary_line,
        }


# ---------------------------------------------------------------------------
# Add-on request schema (plain dict validated by Pydantic layer above)
# ---------------------------------------------------------------------------
# Expected keys in addons_input dict:
#   rush: bool                       → rush_standard ($150)
#   double_rush: bool                → rush_double ($300)
#   dance_voiceover_amount: int|None → one of [25, 75, 100] or None
#   cheer_voiceover_amount: int|None → one of [20, 40] or None
#   eight_count_sheets: bool         → $50
#   extra_songs: int                 → quantity × $15
#   extra_song_added_time: int       → quantity × $30


def _lookup_addon(db: Session, addon_id: str) -> Optional[AddonRule]:
    return db.query(AddonRule).filter(AddonRule.addon_id == addon_id).first()


def _resolve_voiceover_addon(
    db: Session,
    scope: str,  # "dance" | "cheer"
    amount: int,
) -> Optional[AddOnLineItem]:
    addon_id = f"{scope}_voiceover_{amount}"
    rule = _lookup_addon(db, addon_id)
    if rule:
        return AddOnLineItem(
            addon_id=addon_id,
            label=rule.label,
            customer_amount=rule.amount or Decimal("0"),
            payroll_amount=rule.amount or Decimal("0"),
            quantity=1,
            note=rule.note,
        )
    # Fallback: create a synthetic line item even if not in DB (handles $100 dance VO)
    return AddOnLineItem(
        addon_id=addon_id,
        label=f"{scope.title()} Voiceover (${amount})",
        customer_amount=Decimal(str(amount)),
        payroll_amount=Decimal(str(amount)),
        quantity=1,
        note=(
            "Note: this voiceover tier has no definition in the rate card — "
            "confirm amount with Megan before finalizing."
            if amount == 100 else None
        ),
    )


# ---------------------------------------------------------------------------
# Public calculate function
# ---------------------------------------------------------------------------

def calculate_pricing(
    db: Session,
    form_type: str,
    cheer_subtype: Optional[str],
    dance_subtype: Optional[str],
    package_name: str,
    music_affiliate: Optional[str],
    addons_input: Optional[Dict[str, Any]] = None,
) -> PricingBreakdown:
    """
    Calculate the full pricing breakdown for an order.
    Pure calculation — does not write to the database.
    """
    if addons_input is None:
        addons_input = {}

    # --- 1. Classify -------------------------------------------------------
    classification: ClassificationResult = classify_order(
        db, form_type, cheer_subtype, dance_subtype, package_name
    )

    # --- 2. Compliance -----------------------------------------------------
    compliance: ComplianceResult = resolve_compliance(db, music_affiliate)

    # --- 3. Early-exit if needs manual pricing ----------------------------
    if classification.status == "needs_manual_pricing":
        return PricingBreakdown(
            form_type=form_type,
            canonical_subtype_id=classification.canonical_subtype_id,
            package_id=classification.package_id,
            package_name=package_name,
            pricing_rule_id=None,
            compliance_status=compliance.status,
            compliance_reason=compliance.reason,
            canonical_affiliate=compliance.canonical_affiliate,
            base_customer_price=None,
            base_payroll_price=None,
            needs_manual_pricing=True,
            needs_manual_review=(compliance.status == "needs_manual_review"),
            summary_line=f"Manual pricing required: {classification.reason}",
        )

    rule = classification.pricing_rule

    # --- 4. Base prices ----------------------------------------------------
    base_customer = rule.customer_facing_price  # already Decimal from DB
    is_compliant = compliance.status == "compliant"

    if rule.compliance_sensitive:
        base_payroll = (
            rule.payroll_base_compliant if is_compliant
            else rule.payroll_base_non_compliant
        )
    else:
        # compliance_sensitive=False → both amounts are equal by design
        base_payroll = rule.payroll_base_compliant  # same as non_compliant

    # --- 5. Build add-on line items ----------------------------------------
    addon_lines: List[AddOnLineItem] = []

    # Rush fee
    if addons_input.get("rush"):
        r = _lookup_addon(db, "rush_standard")
        if r:
            addon_lines.append(AddOnLineItem(
                addon_id="rush_standard", label=r.label,
                customer_amount=r.amount, payroll_amount=r.amount,
                note=r.note,
            ))

    if addons_input.get("double_rush"):
        r = _lookup_addon(db, "rush_double")
        if r:
            addon_lines.append(AddOnLineItem(
                addon_id="rush_double", label=r.label,
                customer_amount=r.amount, payroll_amount=r.amount,
                note=r.note,
            ))

    # Dance voiceover
    dance_vo_amt = addons_input.get("dance_voiceover_amount")
    if dance_vo_amt:
        addon_lines.append(
            _resolve_voiceover_addon(db, "dance", int(dance_vo_amt))
        )

    # Cheer voiceover
    cheer_vo_amt = addons_input.get("cheer_voiceover_amount")
    if cheer_vo_amt:
        addon_lines.append(
            _resolve_voiceover_addon(db, "cheer", int(cheer_vo_amt))
        )

    # 8-count sheets
    if addons_input.get("eight_count_sheets"):
        r = _lookup_addon(db, "eight_count_sheets")
        if r:
            addon_lines.append(AddOnLineItem(
                addon_id="eight_count_sheets", label=r.label,
                customer_amount=r.amount, payroll_amount=r.amount,
                note=r.note,
            ))

    # Extra songs
    extra_songs = int(addons_input.get("extra_songs", 0))
    if extra_songs > 0:
        r = _lookup_addon(db, "extra_song")
        if r:
            unit = r.unit_amount or Decimal("15")
            total = unit * extra_songs
            addon_lines.append(AddOnLineItem(
                addon_id="extra_song", label=f"Extra Song × {extra_songs}",
                customer_amount=total, payroll_amount=total,
                quantity=extra_songs, note=r.note,
            ))

    # Extra song added-time fee
    extra_time = int(addons_input.get("extra_song_added_time", 0))
    if extra_time > 0:
        r = _lookup_addon(db, "extra_song_added_time_fee")
        if r:
            unit = r.unit_amount or Decimal("30")
            total = unit * extra_time
            addon_lines.append(AddOnLineItem(
                addon_id="extra_song_added_time_fee",
                label=f"Extra Song Added-Time Fee × {extra_time}",
                customer_amount=total, payroll_amount=total,
                quantity=extra_time, note=r.note,
            ))

    # --- 6. Totals ----------------------------------------------------------
    addon_customer_total = sum(a.customer_amount * a.quantity for a in addon_lines)
    addon_payroll_total = sum(a.payroll_amount * a.quantity for a in addon_lines)

    # Avoid double-counting quantity for items where customer_amount already includes qty
    # (our AddOnLineItem stores quantity separately, customer_amount is the unit amount)
    # Recalculate correctly:
    addon_customer_total = Decimal("0")
    addon_payroll_total = Decimal("0")
    for a in addon_lines:
        # For non-quantity items quantity=1, so this is always correct
        addon_customer_total += a.customer_amount
        addon_payroll_total += a.payroll_amount

    system_customer_price = (base_customer or Decimal("0")) + addon_customer_total
    payroll_base_price = (base_payroll or Decimal("0")) + addon_payroll_total

    # --- 7. Summary line ----------------------------------------------------
    summary_parts = [
        f"Package: {rule.package_name}",
        f"Customer price: ${system_customer_price:.2f}",
        f"Payroll base: ${payroll_base_price:.2f}",
        f"Compliance: {compliance.status} — {compliance.reason}",
    ]
    if addon_lines:
        addon_desc = ", ".join(a.label for a in addon_lines)
        summary_parts.insert(2, f"Add-ons: {addon_desc}")

    return PricingBreakdown(
        form_type=form_type,
        canonical_subtype_id=classification.canonical_subtype_id,
        package_id=rule.package_id,
        package_name=rule.package_name,
        pricing_rule_id=str(rule.id),
        compliance_status=compliance.status,
        compliance_reason=compliance.reason,
        canonical_affiliate=compliance.canonical_affiliate,
        base_customer_price=base_customer,
        base_payroll_price=base_payroll,
        addons=addon_lines,
        system_calculated_customer_price=system_customer_price,
        payroll_base_price=payroll_base_price,
        needs_manual_pricing=False,
        needs_manual_review=(compliance.status == "needs_manual_review"),
        summary_line=" | ".join(summary_parts),
    )
