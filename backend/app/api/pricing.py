"""
pricing.py — API routes for the pricing calculation engine.

Routes:
    POST /api/pricing/calculate            Stateless breakdown (no DB write)
    POST /api/orders/{id}/complete-pricing  Persist pricing on order
    POST /api/orders/{id}/finalize-payroll  Persist payroll on order
"""
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.order import Order
from app.models.mtd_record import MTDRecord
from app.schemas.pricing import (
    PricingCalculateRequest,
    PricingBreakdownResponse,
    CompletePricingRequest,
    FinalizePayrollRequest,
    OrderPricingResponse,
    AddOnLineItemResponse,
)
from app.services.pricing import (
    calculate_pricing,
    apply_modal_compliance_payroll,
    apply_sports_entertainment_payroll_rush,
    PricingBreakdown,
)
from app.services.compensation import calculate_compensation

router = APIRouter()


def _rush_flag_yes(value: Any) -> bool:
    return str(value or "").strip().lower() in {"yes", "true", "1"}


def _sports_entertainment_rush_requested(order: Order, addons: Dict[str, Any]) -> bool:
    """SE Magento rush. Explicit complete-pricing flag wins; otherwise the order."""
    if (order.form_type or "") != "sports-entertainment":
        return False
    if addons.get("sports_entertainment_rush"):
        return True
    # An explicit false from the modal means Rush Order is No.
    if "sports_entertainment_rush" in addons:
        return False
    client = order.client_requested_rush_order
    if client is not None and str(client).strip() != "":
        return _rush_flag_yes(client)
    return _rush_flag_yes(order.is_rush_order)


def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except (ValueError, TypeError):
        return False


def _find_order(db: Session, order_id: str) -> Optional[Order]:
    if is_valid_uuid(order_id):
        return db.query(Order).filter(Order.id == uuid.UUID(order_id)).first()
    return None


def _linked_mtd(db: Session, order: Order) -> Optional[MTDRecord]:
    """Resolve the 1:1 MTD row for display-cache sync (Phase 2)."""
    if order.mtd_record is not None:
        return order.mtd_record
    return (
        db.query(MTDRecord).filter(MTDRecord.order_id == order.id).first()
    )


def _mirror_pricing_display_to_mtd(db: Session, order: Order) -> None:
    """One-way Order → MTD customer-price display cache (board chips only)."""
    mtd = _linked_mtd(db, order)
    if not mtd:
        return
    if order.price is not None:
        mtd.price = order.price
    mtd.final_customer_price = order.final_customer_price
    mtd.final_customer_price_overridden = bool(
        order.final_customer_price_overridden
    )
    if order.price_compliance:
        mtd.price_compliance = order.price_compliance


def _breakdown_to_response(bd: PricingBreakdown) -> PricingBreakdownResponse:
    return PricingBreakdownResponse(
        form_type=bd.form_type,
        canonical_subtype_id=bd.canonical_subtype_id,
        package_id=bd.package_id,
        package_name=bd.package_name,
        pricing_rule_id=bd.pricing_rule_id,
        compliance_status=bd.compliance_status,
        compliance_reason=bd.compliance_reason,
        canonical_affiliate=bd.canonical_affiliate,
        base_customer_price=float(bd.base_customer_price) if bd.base_customer_price is not None else None,
        base_payroll_price=float(bd.base_payroll_price) if bd.base_payroll_price is not None else None,
        addons=[
            AddOnLineItemResponse(
                addon_id=a.addon_id,
                label=a.label,
                customer_amount=float(a.customer_amount),
                payroll_amount=float(a.payroll_amount),
                quantity=a.quantity,
                note=a.note,
            )
            for a in bd.addons
        ],
        system_calculated_customer_price=(
            float(bd.system_calculated_customer_price)
            if bd.system_calculated_customer_price is not None else None
        ),
        payroll_base_price=(
            float(bd.payroll_base_price)
            if bd.payroll_base_price is not None else None
        ),
        needs_manual_pricing=bd.needs_manual_pricing,
        needs_manual_review=bd.needs_manual_review,
        summary_line=bd.summary_line,
    )


# ---------------------------------------------------------------------------
# POST /api/pricing/calculate  — stateless
# ---------------------------------------------------------------------------

@router.post("/pricing/calculate", response_model=PricingBreakdownResponse)
def pricing_calculate(
    payload: PricingCalculateRequest,
    db: Session = Depends(get_db),
) -> PricingBreakdownResponse:
    """
    Given order classification fields + selected add-ons + music affiliate,
    return the full pricing breakdown. Does NOT write anything to the database.
    """
    addons_dict = payload.addons.model_dump() if payload.addons else {}

    breakdown = calculate_pricing(
        db=db,
        form_type=payload.form_type,
        cheer_subtype=payload.cheer_form_subtype,
        dance_subtype=payload.dance_form_subtype,
        package_name=payload.package_name,
        music_affiliate=payload.music_affiliate,
        addons_input=addons_dict,
    )
    return _breakdown_to_response(breakdown)


# ---------------------------------------------------------------------------
# POST /api/orders/{id}/complete-pricing  — persist
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/complete-pricing", response_model=OrderPricingResponse)
def complete_pricing(
    order_id: str,
    payload: CompletePricingRequest,
    db: Session = Depends(get_db),
) -> OrderPricingResponse:
    """
    Run the pricing engine against the order's persisted fields, persist the
    result on the order, and return the full breakdown.

    The order's existing form_type, cheer_form_subtype, dance_form_subtype,
    package, and music_affiliate fields are used as classification inputs
    (the request body can override music_affiliate / subtype if needed).
    """
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    addons_dict = payload.addons.model_dump() if payload.addons else {}

    breakdown = calculate_pricing(
        db=db,
        form_type=order.form_type or "school-all-star-cheer",
        cheer_subtype=payload.cheer_form_subtype or order.cheer_form_subtype,
        dance_subtype=payload.dance_form_subtype or order.dance_form_subtype,
        package_name=order.package,
        music_affiliate=payload.music_affiliate or order.music_affiliate,
        addons_input=addons_dict,
    )

    # Cheer rush_standard ($150) is a different add-on. SE rush is +$100 on
    # payroll only, and the customer package (Pre-Game $250) stays put.
    if _sports_entertainment_rush_requested(order, addons_dict):
        breakdown = apply_sports_entertainment_payroll_rush(breakdown)

    # Modal already resolved compliant vs non-compliant payroll. Keep that
    # base so finalize and the Payroll view do not fall back to the full package.
    if (
        payload.base_payroll_price is not None
        or payload.payroll_base_price is not None
        or payload.compliance_status
    ):
        breakdown = apply_modal_compliance_payroll(
            breakdown,
            base_payroll_price=(
                Decimal(str(payload.base_payroll_price))
                if payload.base_payroll_price is not None
                else None
            ),
            payroll_base_price=(
                Decimal(str(payload.payroll_base_price))
                if payload.payroll_base_price is not None
                else None
            ),
            compliance_status=payload.compliance_status,
        )

    # Persist
    sys_price = breakdown.system_calculated_customer_price
    override = payload.final_customer_price_override
    final_price = Decimal(str(override)) if override is not None else sys_price
    is_overridden = override is not None

    order.system_calculated_customer_price = sys_price
    order.final_customer_price = final_price
    order.final_customer_price_overridden = is_overridden
    # Keep package/board price aligned with the finalized customer amount.
    if final_price is not None:
        order.price = final_price
    order.price_compliance = breakdown.compliance_status if breakdown.compliance_status != "needs_manual_review" else order.price_compliance
    order.pricing_breakdown = breakdown.to_dict()

    # Phase 2: Orders SoT — push display cache to linked MTD only.
    _mirror_pricing_display_to_mtd(db, order)

    db.commit()
    db.refresh(order)

    return OrderPricingResponse(
        order_id=str(order.id),
        system_calculated_customer_price=float(sys_price) if sys_price is not None else None,
        final_customer_price=float(final_price) if final_price is not None else None,
        final_customer_price_overridden=is_overridden,
        price_compliance=order.price_compliance,
        pricing_breakdown=order.pricing_breakdown,
    )


# ---------------------------------------------------------------------------
# POST /api/orders/{id}/finalize-payroll  — persist
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/finalize-payroll", response_model=OrderPricingResponse)
def finalize_payroll(
    order_id: str,
    payload: FinalizePayrollRequest,
    db: Session = Depends(get_db),
) -> OrderPricingResponse:
    """
    Given an assigned producer, compute and persist producer payout + SLT portion.
    Requires that complete-pricing has already been run (pricing_breakdown must exist).
    """
    order = _find_order(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if not order.pricing_breakdown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Pricing has not been completed for this order. Run /complete-pricing first.",
        )

    # Reconstruct PricingBreakdown from persisted dict (lightweight — only fields needed for compensation)
    bd_dict: Dict[str, Any] = order.pricing_breakdown

    # Create a minimal PricingBreakdown from the stored dict
    from app.services.pricing import PricingBreakdown, AddOnLineItem
    addons = [
        AddOnLineItem(
            addon_id=a["addon_id"],
            label=a["label"],
            customer_amount=Decimal(str(a["customer_amount"])),
            payroll_amount=Decimal(str(a["payroll_amount"])),
            quantity=a.get("quantity", 1),
            note=a.get("note"),
        )
        for a in bd_dict.get("addons", [])
    ]

    breakdown = PricingBreakdown(
        form_type=bd_dict.get("form_type", ""),
        canonical_subtype_id=bd_dict.get("canonical_subtype_id"),
        package_id=bd_dict.get("package_id"),
        package_name=bd_dict.get("package_name"),
        pricing_rule_id=bd_dict.get("pricing_rule_id"),
        compliance_status=bd_dict.get("compliance_status", "needs_manual_review"),
        compliance_reason=bd_dict.get("compliance_reason", ""),
        canonical_affiliate=bd_dict.get("canonical_affiliate"),
        base_customer_price=Decimal(str(bd_dict["base_customer_price"])) if bd_dict.get("base_customer_price") is not None else None,
        base_payroll_price=Decimal(str(bd_dict["base_payroll_price"])) if bd_dict.get("base_payroll_price") is not None else None,
        addons=addons,
        system_calculated_customer_price=Decimal(str(bd_dict["system_calculated_customer_price"])) if bd_dict.get("system_calculated_customer_price") is not None else None,
        payroll_base_price=Decimal(str(bd_dict["payroll_base_price"])) if bd_dict.get("payroll_base_price") is not None else None,
        needs_manual_pricing=bd_dict.get("needs_manual_pricing", False),
        needs_manual_review=bd_dict.get("needs_manual_review", False),
        summary_line=bd_dict.get("summary_line", ""),
    )

    # Determine the final_customer_price for SLT calculation
    fcp = payload.final_customer_price
    final_customer_price = (
        Decimal(str(fcp)) if fcp is not None
        else (order.final_customer_price or breakdown.system_calculated_customer_price or Decimal("0"))
    )

    overridden_rate = (
        Decimal(str(payload.overridden_rate))
        if payload.overridden_rate is not None else None
    )

    comp = calculate_compensation(
        db=db,
        producer_initials=payload.producer_initials,
        pricing_breakdown=breakdown,
        final_customer_price=final_customer_price,
        overridden_rate=overridden_rate,
    )

    # Persist payout SoT on Orders only (Phase 1 dropped unused audit blobs).
    order.rate_used = comp.rate_used
    order.rate_source = comp.rate_source
    order.producer_payout = comp.producer_payout

    # Keep board customer-price cache in sync (not payout — that stays on Orders).
    _mirror_pricing_display_to_mtd(db, order)

    db.commit()
    db.refresh(order)

    return OrderPricingResponse(
        order_id=str(order.id),
        system_calculated_customer_price=float(order.system_calculated_customer_price) if order.system_calculated_customer_price is not None else None,
        final_customer_price=float(order.final_customer_price) if order.final_customer_price is not None else None,
        final_customer_price_overridden=order.final_customer_price_overridden,
        price_compliance=order.price_compliance,
        pricing_breakdown=order.pricing_breakdown,
        rate_used=float(order.rate_used) if order.rate_used is not None else None,
        rate_source=order.rate_source,
        producer_payout=float(order.producer_payout) if order.producer_payout is not None else None,
        slt_portion=float(comp.slt_portion) if comp.slt_portion is not None else None,
        payroll_finalized=(comp.status == "computed" and comp.producer_payout is not None),
        payroll_breakdown=comp.to_dict(),
    )
