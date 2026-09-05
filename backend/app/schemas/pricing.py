"""Pydantic schemas for the pricing calculation API endpoints."""
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class AddonsInput(BaseModel):
    rush: bool = False
    double_rush: bool = False
    # Dance voiceover amount: 25, 75, or 100 (confirm with Megan on $100 tier)
    dance_voiceover_amount: Optional[int] = None
    # Cheer voiceover amount: 20 or 40
    cheer_voiceover_amount: Optional[int] = None
    eight_count_sheets: bool = False
    extra_songs: int = 0
    extra_song_added_time: int = 0


class PricingCalculateRequest(BaseModel):
    form_type: str
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    package_name: str
    music_affiliate: Optional[str] = None
    addons: Optional[AddonsInput] = None


class CompletePricingRequest(BaseModel):
    """Body for POST /orders/{id}/complete-pricing"""
    # If not provided, calculated from classification
    cheer_form_subtype: Optional[str] = None
    dance_form_subtype: Optional[str] = None
    music_affiliate: Optional[str] = None
    addons: Optional[AddonsInput] = None
    # Optional: Megan's price override (if she sets a different customer-facing price)
    final_customer_price_override: Optional[float] = None


class FinalizePayrollRequest(BaseModel):
    """Body for POST /orders/{id}/finalize-payroll"""
    producer_initials: str
    # Optional: override the auto-calculated final_customer_price for SLT portion
    final_customer_price: Optional[float] = None
    # Optional: override the auto-calculated rate (e.g. Megan selects old vs new for Casey)
    overridden_rate: Optional[float] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class AddOnLineItemResponse(BaseModel):
    addon_id: str
    label: str
    customer_amount: float
    payroll_amount: float
    quantity: int
    note: Optional[str] = None


class PricingBreakdownResponse(BaseModel):
    form_type: str
    canonical_subtype_id: Optional[str]
    package_id: Optional[str]
    package_name: Optional[str]
    pricing_rule_id: Optional[str]

    compliance_status: str
    compliance_reason: str
    canonical_affiliate: Optional[str]

    base_customer_price: Optional[float]
    base_payroll_price: Optional[float]

    addons: List[AddOnLineItemResponse] = []

    system_calculated_customer_price: Optional[float]
    payroll_base_price: Optional[float]

    needs_manual_pricing: bool
    needs_manual_review: bool
    summary_line: str


class CompensationResultResponse(BaseModel):
    status: str
    producer_payout: Optional[float]
    rate_used: Optional[float]
    rate_source: str
    old_pricing_payout: Optional[float] = None
    new_pricing_payout: Optional[float] = None
    old_new_trigger_unconfirmed: bool = False
    manual_input_fields: List[Dict[str, Any]] = []
    slt_portion: Optional[float]
    final_customer_price: Optional[float]
    flag: str


class OrderPricingResponse(BaseModel):
    """Returned by complete-pricing and finalize-payroll endpoints."""
    order_id: str
    # Pricing fields
    system_calculated_customer_price: Optional[float]
    final_customer_price: Optional[float]
    final_customer_price_overridden: bool
    price_compliance: Optional[str]
    pricing_breakdown: Optional[Dict[str, Any]]
    # Payroll fields (only set after finalize-payroll)
    rate_used: Optional[float] = None
    rate_source: Optional[str] = None
    producer_payout: Optional[float] = None
    slt_portion: Optional[float] = None
    payroll_finalized: bool = False
    payroll_breakdown: Optional[Dict[str, Any]] = None
