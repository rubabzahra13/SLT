"""
compensation.py — Calculates producer payout from a PricingBreakdown.

Supports all compensation_model variants from pricing-rules.json:
  - percentage_of_payroll_base  (most producers)
  - hourly_manual               (Griffin, Josh, Joe Bell)
  - not_paid_for_mixing         (Steve)
  - null / None                 (Riley — needs_manual_review)

Casey-specific:
  - rate_overrides["old_pricing"] vs ["new_pricing"]: both returned, trigger unconfirmed
  - rate_overrides["dance_voiceover"] / ["cheer_voiceover"] override on those add-on lines
  - manual_input_fields: passed through as-is for the UI to render
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.producer import Producer
from app.services.pricing import PricingBreakdown


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class CompensationResult:
    # "computed" | "needs_manual_review" | "hourly_manual" | "not_paid_for_mixing"
    status: str

    # Populated when status == "computed"
    producer_payout: Optional[Decimal]
    rate_used: Optional[Decimal]
    rate_source: str   # e.g. "default_rate", "rates_by_category[jazz-kick]", "rate_overrides[old_pricing]"

    # Casey old/new pricing ambiguity
    old_pricing_payout: Optional[Decimal] = None
    new_pricing_payout: Optional[Decimal] = None
    old_new_trigger_unconfirmed: bool = False

    # Casey manual input fields (labels + rates, no computed amount)
    manual_input_fields: List[Dict[str, Any]] = field(default_factory=list)

    slt_portion: Optional[Decimal] = None
    final_customer_price: Optional[Decimal] = None

    # Human note for the UI — always present
    flag: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "producer_payout": float(self.producer_payout) if self.producer_payout is not None else None,
            "rate_used": float(self.rate_used) if self.rate_used is not None else None,
            "rate_source": self.rate_source,
            "old_pricing_payout": float(self.old_pricing_payout) if self.old_pricing_payout is not None else None,
            "new_pricing_payout": float(self.new_pricing_payout) if self.new_pricing_payout is not None else None,
            "old_new_trigger_unconfirmed": self.old_new_trigger_unconfirmed,
            "manual_input_fields": self.manual_input_fields,
            "slt_portion": float(self.slt_portion) if self.slt_portion is not None else None,
            "final_customer_price": float(self.final_customer_price) if self.final_customer_price is not None else None,
            "flag": self.flag,
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decimal(val: Any) -> Optional[Decimal]:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def _payout(payroll_base: Decimal, rate: Decimal) -> Decimal:
    return (payroll_base * rate).quantize(Decimal("0.01"))


def _determine_rate_for_subtype(producer: Producer, subtype_id: Optional[str]) -> tuple[Optional[Decimal], str]:
    """
    Returns (rate, rate_source) for percentage_of_payroll_base producers.
    Looks up rates_by_category first, then falls back to default_rate.
    """
    if subtype_id and producer.rates_by_category:
        cat_rate = producer.rates_by_category.get(subtype_id)
        if cat_rate is not None:
            return _decimal(cat_rate), f"rates_by_category[{subtype_id}]"

    if producer.default_rate is not None:
        return _decimal(producer.default_rate), "default_rate"

    return None, "no_rate_configured"


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def calculate_compensation(
    db: Session,
    producer_initials: str,
    pricing_breakdown: PricingBreakdown,
    final_customer_price: Decimal,
    overridden_rate: Optional[Decimal] = None,
) -> CompensationResult:
    """
    Calculate producer compensation from a completed PricingBreakdown.
    Does not write to the database.
    """
    producer: Optional[Producer] = (
        db.query(Producer).filter(Producer.initials == producer_initials.strip()).first()
    )

    if producer is None:
        return CompensationResult(
            status="needs_manual_review",
            producer_payout=None,
            rate_used=None,
            rate_source="producer_not_found",
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=(
                f"Producer with initials '{producer_initials}' not found. "
                "Cannot compute compensation."
            ),
        )

    model = producer.compensation_model

    # --- No rule at all (e.g. Riley) ---------------------------------------
    if model is None:
        return CompensationResult(
            status="needs_manual_review",
            producer_payout=None,
            rate_used=None,
            rate_source="no_compensation_rule",
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=producer.notes or (
                f"No compensation rule on file for {producer.name}. "
                "Confirm with Megan before enabling payroll."
            ),
        )

    # --- not_paid_for_mixing (Steve) ----------------------------------------
    if model == "not_paid_for_mixing":
        return CompensationResult(
            status="not_paid_for_mixing",
            producer_payout=Decimal("0.00"),
            rate_used=Decimal("0"),
            rate_source="not_paid_for_mixing",
            slt_portion=final_customer_price,
            final_customer_price=final_customer_price,
            flag=(
                f"{producer.name} does not receive mixing compensation. "
                "Payout = $0. SLT retains the full amount."
            ),
        )

    # --- hourly_manual (Griffin, Josh, Joe Bell) ----------------------------
    if model == "hourly_manual":
        return CompensationResult(
            status="hourly_manual",
            producer_payout=None,
            rate_used=None,
            rate_source="hourly_manual",
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=(
                f"{producer.name} is an hourly employee. "
                "Enter payout manually from the pay sheet."
            ),
        )

    # --- percentage_of_payroll_base -----------------------------------------
    if model != "percentage_of_payroll_base":
        return CompensationResult(
            status="needs_manual_review",
            producer_payout=None,
            rate_used=None,
            rate_source="unknown_model",
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=f"Unknown compensation_model '{model}' for {producer.name}.",
        )

    payroll_base = pricing_breakdown.payroll_base_price or Decimal("0")
    subtype_id = pricing_breakdown.canonical_subtype_id

    # If an override rate was explicitly provided (from finalize-payroll endpoint)
    if overridden_rate is not None:
        rate = overridden_rate
        rate_source = "manual_override"
        payout = _payout(payroll_base, rate)
        slt = (final_customer_price - payout).quantize(Decimal("0.01"))
        return CompensationResult(
            status="computed",
            producer_payout=payout,
            rate_used=rate,
            rate_source=rate_source,
            slt_portion=slt,
            final_customer_price=final_customer_price,
            flag=f"Rate manually overridden to {float(rate)*100:.1f}%.",
            manual_input_fields=producer.manual_input_fields or [],
        )

    # Casey-specific: rate_overrides with old/new pricing ambiguity
    rate_overrides: Dict = producer.rate_overrides or {}
    is_casey = bool(rate_overrides.get("old_pricing") is not None and rate_overrides.get("new_pricing") is not None)

    # Check if a voiceover add-on drives the rate
    addon_ids = {a.addon_id for a in pricing_breakdown.addons}
    has_dance_vo = any("dance_voiceover" in aid for aid in addon_ids)
    has_cheer_vo = any("cheer_voiceover" in aid for aid in addon_ids)

    if has_dance_vo and "dance_voiceover" in rate_overrides:
        rate = _decimal(rate_overrides["dance_voiceover"])
        rate_source = "rate_overrides[dance_voiceover]"
        payout = _payout(payroll_base, rate)
        slt = (final_customer_price - payout).quantize(Decimal("0.01"))
        return CompensationResult(
            status="computed",
            producer_payout=payout,
            rate_used=rate,
            rate_source=rate_source,
            slt_portion=slt,
            final_customer_price=final_customer_price,
            flag=f"Dance voiceover rate applied: {float(rate)*100:.0f}%.",
            manual_input_fields=producer.manual_input_fields or [],
        )

    if has_cheer_vo and "cheer_voiceover" in rate_overrides:
        rate = _decimal(rate_overrides["cheer_voiceover"])
        rate_source = "rate_overrides[cheer_voiceover]"
        payout = _payout(payroll_base, rate)
        slt = (final_customer_price - payout).quantize(Decimal("0.01"))
        return CompensationResult(
            status="computed",
            producer_payout=payout,
            rate_used=rate,
            rate_source=rate_source,
            slt_portion=slt,
            final_customer_price=final_customer_price,
            flag=f"Cheer voiceover rate applied: {float(rate)*100:.0f}%.",
            manual_input_fields=producer.manual_input_fields or [],
        )

    # Casey old/new pricing: return BOTH, flag as unconfirmed
    if is_casey:
        old_rate = _decimal(rate_overrides["old_pricing"])
        new_rate = _decimal(rate_overrides["new_pricing"])
        old_payout = _payout(payroll_base, old_rate)
        new_payout = _payout(payroll_base, new_rate)
        return CompensationResult(
            status="computed",
            producer_payout=None,   # Megan must choose; neither auto-applied
            rate_used=None,
            rate_source="rate_overrides[old_pricing|new_pricing]",
            old_pricing_payout=old_payout,
            new_pricing_payout=new_payout,
            old_new_trigger_unconfirmed=True,
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=(
                f"Casey has two rates: Old pricing ({float(old_rate)*100:.0f}%)"
                f" = ${old_payout:.2f}; New pricing ({float(new_rate)*100:.0f}%)"
                f" = ${new_payout:.2f}. "
                "The trigger rule is not confirmed — select the correct one manually."
            ),
            manual_input_fields=producer.manual_input_fields or [],
        )

    # Standard percentage: look up rate by subtype or default
    rate, rate_source = _determine_rate_for_subtype(producer, subtype_id)

    if rate is None:
        return CompensationResult(
            status="needs_manual_review",
            producer_payout=None,
            rate_used=None,
            rate_source=rate_source,
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=(
                f"No rate found for {producer.name} "
                f"(subtype: {subtype_id}). Confirm with Megan."
            ),
            manual_input_fields=producer.manual_input_fields or [],
        )

    payout = _payout(payroll_base, rate)
    slt = (final_customer_price - payout).quantize(Decimal("0.01"))

    return CompensationResult(
        status="computed",
        producer_payout=payout,
        rate_used=rate,
        rate_source=rate_source,
        slt_portion=slt,
        final_customer_price=final_customer_price,
        flag=f"Rate: {float(rate)*100:.1f}% ({rate_source}). Payout: ${payout:.2f}. SLT: ${slt:.2f}.",
        manual_input_fields=producer.manual_input_fields or [],
    )
