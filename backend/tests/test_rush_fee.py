from decimal import Decimal

import pytest

from app.services.rush_fee import (
    RushFeeValidationError,
    apply_rush_fee_fields,
    normalize_compensation_rate,
    rush_compensation,
    rush_customer_total,
)


def test_customer_total_is_unit_times_quantity():
    assert rush_customer_total(Decimal("150"), 1) == Decimal("150.00")
    assert rush_customer_total(Decimal("150"), 2) == Decimal("300.00")
    assert rush_customer_total(Decimal("150"), 3) == Decimal("450.00")


def test_compensation_uses_producer_fraction_once():
    # $150 × 2 × 0.93 = $279. Package price is not part of this figure.
    assert rush_compensation(Decimal("150"), 2, Decimal("0.93")) == Decimal("279.00")


def test_percent_style_rate_is_not_applied_twice():
    assert normalize_compensation_rate(Decimal("93")) == Decimal("0.9300")
    assert normalize_compensation_rate(Decimal("0.93")) == Decimal("0.9300")
    assert rush_compensation(Decimal("150"), 2, Decimal("93")) == Decimal("279.00")


def test_missing_rate_does_not_become_one_hundred_percent():
    assert rush_compensation(Decimal("150"), 1, None) == Decimal("0.00")


def test_negative_quantity_is_rejected():
    with pytest.raises(RushFeeValidationError):
        rush_customer_total(Decimal("150"), -1)


def test_override_is_stored_separately_from_the_customer_total():
    stored = apply_rush_fee_fields(
        addon_type="rush_fee",
        amount=None,
        quantity=2,
        unit_amount=Decimal("150"),
        compensation_rate=Decimal("0.72"),
        compensation_overridden=True,
    )
    assert stored["amount"] == Decimal("300.00")
    assert stored["quantity"] == 2
    assert stored["unit_amount"] == Decimal("150")
    assert stored["compensation_rate"] == Decimal("0.7200")
    assert stored["compensation_overridden"] is True


def test_clearing_the_override_drops_the_saved_rate():
    stored = apply_rush_fee_fields(
        addon_type="rush_fee",
        amount=Decimal("150"),
        quantity=1,
        unit_amount=Decimal("150"),
        compensation_rate=Decimal("0.72"),
        compensation_overridden=False,
    )
    assert stored["compensation_rate"] is None
    assert stored["compensation_overridden"] is False


def test_legacy_amount_only_rows_keep_their_unit():
    standard = apply_rush_fee_fields(
        addon_type="rush_fee",
        amount=Decimal("300"),
        quantity=None,
        unit_amount=None,
        compensation_rate=None,
        compensation_overridden=False,
    )
    assert standard["quantity"] == 2
    assert standard["unit_amount"] == Decimal("150.00")

    custom = apply_rush_fee_fields(
        addon_type="rush_fee",
        amount=Decimal("200"),
        quantity=None,
        unit_amount=None,
        compensation_rate=None,
        compensation_overridden=False,
    )
    assert custom["quantity"] == 1
    assert custom["unit_amount"] == Decimal("200.00")
    assert custom["amount"] == Decimal("200.00")


def test_misc_adjustment_allows_signed_amounts():
    added = apply_rush_fee_fields(
        addon_type="misc_adjustment",
        amount=Decimal("20"),
        quantity=None,
        unit_amount=None,
        compensation_rate=None,
        compensation_overridden=False,
    )
    assert added["amount"] == Decimal("20.00")
    assert added["quantity"] is None

    deducted = apply_rush_fee_fields(
        addon_type="misc_adjustment",
        amount=Decimal("-10"),
        quantity=None,
        unit_amount=None,
        compensation_rate=None,
        compensation_overridden=False,
    )
    assert deducted["amount"] == Decimal("-10.00")

    with pytest.raises(RushFeeValidationError):
        apply_rush_fee_fields(
            addon_type="misc_adjustment",
            amount=Decimal("0"),
            quantity=None,
            unit_amount=None,
            compensation_rate=None,
            compensation_overridden=False,
        )
