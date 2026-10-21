"""Rush-fee add-on math shared by the payroll API.

Customer rush fee and producer compensation stay separate:

    total = unit_amount × quantity
    compensation = total × compensation_rate

The package price is never included in this total. A missing rate is left
unset — it is not replaced with 100%.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

DEFAULT_RUSH_FEE_UNIT = Decimal("150.00")
MAX_RUSH_FEE_QUANTITY = 100


class RushFeeValidationError(ValueError):
    pass


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def normalize_compensation_rate(value: Optional[Decimal | float | str]) -> Optional[Decimal]:
    """Store rates as fractions. 0.93 and 93 both mean 93%."""
    if value is None or value == "":
        return None
    try:
        rate = Decimal(str(value))
    except Exception as exc:
        raise RushFeeValidationError("Rush fee compensation rate is not a number.") from exc
    if rate < 0:
        raise RushFeeValidationError("Rush fee compensation rate cannot be negative.")
    if rate > 1:
        if rate > 100:
            raise RushFeeValidationError("Rush fee compensation rate cannot exceed 100%.")
        rate = rate / Decimal("100")
    return rate.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def rush_customer_total(unit_amount: Decimal, quantity: int) -> Decimal:
    if quantity < 0:
        raise RushFeeValidationError("Rush fee quantity cannot be negative.")
    if quantity > MAX_RUSH_FEE_QUANTITY:
        raise RushFeeValidationError(
            f"Rush fee quantity cannot exceed {MAX_RUSH_FEE_QUANTITY}."
        )
    if unit_amount <= 0:
        raise RushFeeValidationError("Rush fee amount per unit must be greater than 0.")
    return _money(unit_amount * Decimal(quantity))


def rush_compensation(
    unit_amount: Decimal,
    quantity: int,
    rate: Optional[Decimal],
) -> Decimal:
    """Producer share of the customer rush fee. Unset rate pays $0."""
    total = rush_customer_total(unit_amount, quantity)
    if rate is None:
        return Decimal("0.00")
    normalized = normalize_compensation_rate(rate)
    if normalized is None:
        return Decimal("0.00")
    return _money(total * normalized)


def infer_rush_quantity_and_unit(
    amount: Optional[Decimal],
    quantity: Optional[int],
    unit_amount: Optional[Decimal],
) -> tuple[int, Decimal]:
    """Recover quantity and unit from older rows that only stored a dollar amount."""
    if quantity is not None and unit_amount is not None:
        if quantity < 0:
            raise RushFeeValidationError("Rush fee quantity cannot be negative.")
        if unit_amount <= 0:
            raise RushFeeValidationError("Rush fee amount per unit must be greater than 0.")
        return quantity, unit_amount

    if quantity is not None and quantity > 0 and amount is not None and amount > 0:
        unit = _money(amount / Decimal(quantity))
        return quantity, unit

    if amount is None or amount <= 0:
        return 1, DEFAULT_RUSH_FEE_UNIT

    remainder = amount % DEFAULT_RUSH_FEE_UNIT
    if remainder == 0:
        qty = int(amount / DEFAULT_RUSH_FEE_UNIT)
        if 1 <= qty <= MAX_RUSH_FEE_QUANTITY:
            return qty, DEFAULT_RUSH_FEE_UNIT

    return 1, _money(amount)


def apply_rush_fee_fields(
    *,
    addon_type: str,
    amount: Optional[Decimal],
    quantity: Optional[int],
    unit_amount: Optional[Decimal],
    compensation_rate: Optional[Decimal | float | str],
    compensation_overridden: bool,
) -> dict:
    """Normalize persisted rush-fee inputs. Voiceover / misc rows leave rush blank."""
    if addon_type == "misc_adjustment":
        if amount is None or amount == 0:
            raise RushFeeValidationError(
                "Miscellaneous adjustment amount cannot be zero."
            )
        return {
            "amount": _money(amount),
            "quantity": None,
            "unit_amount": None,
            "compensation_rate": None,
            "compensation_overridden": False,
        }

    if addon_type != "rush_fee":
        if amount is None or amount <= 0:
            raise RushFeeValidationError("Add-on amount must be greater than 0.")
        return {
            "amount": _money(amount),
            "quantity": None,
            "unit_amount": None,
            "compensation_rate": None,
            "compensation_overridden": False,
        }

    qty, unit = infer_rush_quantity_and_unit(amount, quantity, unit_amount)
    if qty < 1:
        raise RushFeeValidationError(
            "Rush fee quantity must be at least 1. Remove the add-on to clear it."
        )
    total = rush_customer_total(unit, qty)
    overridden = bool(compensation_overridden)
    rate = normalize_compensation_rate(compensation_rate) if overridden else None
    if overridden and rate is None:
        raise RushFeeValidationError(
            "A compensation percentage is required when overriding the producer rate."
        )
    return {
        "amount": total,
        "quantity": qty,
        "unit_amount": unit,
        "compensation_rate": rate,
        "compensation_overridden": overridden,
    }
