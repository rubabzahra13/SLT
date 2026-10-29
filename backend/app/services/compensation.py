"""
compensation.py: Calculates producer payout from a PricingBreakdown.

Supports compensation_model variants:
  - percentage_of_payroll_base  (most producers)
  - hourly_manual
  - not_paid_for_mixing
  - null / None                 → needs_manual_review

Category rates come from rates_by_category.
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.producer import Producer
from app.services.pricing import PricingBreakdown


@dataclass
class CompensationResult:
    # "computed" | "needs_manual_review" | "hourly_manual" | "not_paid_for_mixing"
    status: str

    producer_payout: Optional[Decimal]
    rate_used: Optional[Decimal]
    rate_source: str

    old_pricing_payout: Optional[Decimal] = None
    new_pricing_payout: Optional[Decimal] = None
    old_new_trigger_unconfirmed: bool = False

    # Kept empty for API shape compatibility with older clients.
    manual_input_fields: List[Dict[str, Any]] = field(default_factory=list)

    slt_portion: Optional[Decimal] = None
    final_customer_price: Optional[Decimal] = None

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


def _decimal(val: Any) -> Optional[Decimal]:
    if val is None:
        return None
    try:
        return Decimal(str(val))
    except Exception:
        return None


def _fraction_rate(val: Any) -> Optional[Decimal]:
    """Coerce percent-style rates (50) to fractions (0.5) before payout math."""
    rate = _decimal(val)
    if rate is None:
        return None
    if rate > 1:
        return rate / Decimal("100")
    return rate


def _payout(payroll_base: Decimal, rate: Decimal) -> Decimal:
    return (payroll_base * rate).quantize(Decimal("0.01"))


def _determine_rate_for_subtype(
    producer: Producer, subtype_id: Optional[str]
) -> tuple[Optional[Decimal], str]:
    """Look up rates_by_category for the order subtype/category."""
    if subtype_id and producer.rates_by_category:
        cat_rate = producer.rates_by_category.get(subtype_id)
        if cat_rate is not None:
            return _fraction_rate(cat_rate), f"rates_by_category[{subtype_id}]"

    return None, "no_rate_configured"


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

    if model is None:
        return CompensationResult(
            status="needs_manual_review",
            producer_payout=None,
            rate_used=None,
            rate_source="no_compensation_rule",
            slt_portion=None,
            final_customer_price=final_customer_price,
            flag=(
                f"No compensation rule on file for {producer.name}. "
                "Confirm with Megan before enabling payroll."
            ),
        )

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

    if overridden_rate is not None:
        rate = _fraction_rate(overridden_rate) or overridden_rate
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
        )

    # Category % from rates_by_category. Voiceover/rush addon % are applied
    # separately by the payroll UI (dance_voiceover_rate / cheer_voiceover_rate /
    # rush_fee_rate): not as a substitute for the package rate here.
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
    )
