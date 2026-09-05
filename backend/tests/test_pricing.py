"""
test_pricing.py — Unit tests for the SLT CRM pricing and compensation engine.

Required test cases (all 8 from spec):
  1. Compliant vs non-compliant same package → different payroll_base_price, identical customer_facing_price
  2. school-cheer-viroc-yes vs school-cheer-viroc-no → identical prices
  3. compliance_sensitive=False package → identical payroll amounts regardless of affiliate
  4. Sports Entertainment OTHER → needs_manual_pricing = True
  5. Riley → CompensationResult.status == "needs_manual_review"
  6. Mark jazz-kick → 72%; Mark all-star-cheer → 60%
  7. "Power Music Covers" → compliant (synonym matching)
  8. Missing affiliate → needs_manual_review compliance status
"""
from decimal import Decimal

import pytest

from app.services.classification import classify_order
from app.services.compliance import resolve_compliance
from app.services.pricing import calculate_pricing
from app.services.compensation import calculate_compensation


# ---------------------------------------------------------------------------
# Test 1: Compliant vs non-compliant — same package, same customer price,
#         different payroll base price
# ---------------------------------------------------------------------------

class TestComplianceEffect:
    """Package GOLD 1:30 (all-star-cheer): customer=$700, compliant=$600, non_compliant=$700"""

    def test_compliant_customer_price(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.system_calculated_customer_price == Decimal("700")

    def test_non_compliant_customer_price(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Unknown Affiliate XYZ",
        )
        assert bd.needs_manual_pricing is False
        assert bd.system_calculated_customer_price == Decimal("700")

    def test_compliant_payroll_base(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        assert bd.payroll_base_price == Decimal("600")
        assert bd.compliance_status == "compliant"

    def test_non_compliant_payroll_base(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Unknown Affiliate XYZ",
        )
        assert bd.payroll_base_price == Decimal("700")
        assert bd.compliance_status == "non-compliant"

    def test_customer_prices_are_equal_despite_compliance_difference(self, db):
        bd_compliant = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        bd_non_compliant = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Unknown Affiliate XYZ",
        )
        assert bd_compliant.system_calculated_customer_price == bd_non_compliant.system_calculated_customer_price
        assert bd_compliant.payroll_base_price != bd_non_compliant.payroll_base_price


# ---------------------------------------------------------------------------
# Test 2: school-cheer viroc-yes vs viroc-no → identical prices
# ---------------------------------------------------------------------------

class TestVirocNormalization:
    """SILVER 1:00 school-cheer: customer=$450, compliant=$350"""

    def test_viroc_yes_price(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="school-cheer-viroc-yes",
            dance_subtype=None,
            package_name="SILVER 1:00",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.canonical_subtype_id == "school-cheer"
        assert bd.system_calculated_customer_price == Decimal("450")
        assert bd.payroll_base_price == Decimal("350")

    def test_viroc_no_price(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="school-cheer-viroc-no",
            dance_subtype=None,
            package_name="SILVER 1:00",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.canonical_subtype_id == "school-cheer"
        assert bd.system_calculated_customer_price == Decimal("450")
        assert bd.payroll_base_price == Decimal("350")

    def test_viroc_yes_and_no_are_identical(self, db):
        bd_yes = calculate_pricing(
            db=db, form_type="school-all-star-cheer",
            cheer_subtype="school-cheer-viroc-yes", dance_subtype=None,
            package_name="SILVER 1:00", music_affiliate="Power Music",
        )
        bd_no = calculate_pricing(
            db=db, form_type="school-all-star-cheer",
            cheer_subtype="school-cheer-viroc-no", dance_subtype=None,
            package_name="SILVER 1:00", music_affiliate="Power Music",
        )
        assert bd_yes.system_calculated_customer_price == bd_no.system_calculated_customer_price
        assert bd_yes.payroll_base_price == bd_no.payroll_base_price
        assert bd_yes.package_id == bd_no.package_id


# ---------------------------------------------------------------------------
# Test 3: compliance_sensitive=False → identical payroll regardless of affiliate
# ---------------------------------------------------------------------------

class TestComplianceInsensitivePackage:
    """TITANIUM 1:30 (all-star-cheer): customer=$1800, payroll=$1800 both ways"""

    def test_titanium_compliant_payroll(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="TITANIUM 1:30",
            music_affiliate="Power Music",
        )
        assert bd.payroll_base_price == Decimal("1800")

    def test_titanium_non_compliant_payroll_is_same(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="TITANIUM 1:30",
            music_affiliate="Completely Unknown",
        )
        assert bd.payroll_base_price == Decimal("1800")

    def test_titanium_compliance_insensitive_equal_payroll(self, db):
        bd_comp = calculate_pricing(
            db=db, form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer", dance_subtype=None,
            package_name="TITANIUM 1:30", music_affiliate="Power Music",
        )
        bd_non = calculate_pricing(
            db=db, form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer", dance_subtype=None,
            package_name="TITANIUM 1:30", music_affiliate="Completely Unknown",
        )
        assert bd_comp.payroll_base_price == bd_non.payroll_base_price


# ---------------------------------------------------------------------------
# Test 4: Sports Entertainment OTHER → needs_manual_pricing = True
# ---------------------------------------------------------------------------

class TestManualPricingPackage:

    def test_sports_entertainment_other_needs_manual(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="sports-entertainment",
            cheer_subtype=None,
            dance_subtype=None,
            package_name="OTHER (mixes longer than 2:30)",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is True
        assert bd.system_calculated_customer_price is None

    def test_sports_entertainment_known_package_calculates(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="sports-entertainment",
            cheer_subtype=None,
            dance_subtype=None,
            package_name="QUARTER BREAK / TIMEOUT REMIXED",
            music_affiliate=None,
        )
        assert bd.needs_manual_pricing is False
        assert bd.system_calculated_customer_price == Decimal("150")

    def test_unrecognised_package_needs_manual(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="NONEXISTENT PACKAGE TIER",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is True


# ---------------------------------------------------------------------------
# Test 5: Riley → CompensationResult.status == "needs_manual_review"
# ---------------------------------------------------------------------------

class TestRileyCompensation:

    def _make_breakdown(self, db):
        return calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )

    def test_riley_needs_manual_review(self, db):
        bd = self._make_breakdown(db)
        comp = calculate_compensation(
            db=db,
            producer_initials="R",
            pricing_breakdown=bd,
            final_customer_price=Decimal("700"),
        )
        assert comp.status == "needs_manual_review"
        assert comp.producer_payout is None
        assert comp.slt_portion is None

    def test_riley_unknown_producer_also_needs_manual(self, db):
        bd = self._make_breakdown(db)
        comp = calculate_compensation(
            db=db,
            producer_initials="ZZ",  # does not exist
            pricing_breakdown=bd,
            final_customer_price=Decimal("700"),
        )
        assert comp.status == "needs_manual_review"


# ---------------------------------------------------------------------------
# Test 6: Mark jazz-kick → 72%; Mark all-star-cheer → 60%
# ---------------------------------------------------------------------------

class TestMarkCategoryRates:
    """Mark (MM) has rates_by_category: jazz-kick=0.72, all-star-cheer=0.60"""

    def test_mark_jazz_kick_rate(self, db):
        # jazz-kick subtype, payroll_base=600 (POM GOLD 1:30 eq.)
        # Use a real jazz-kick package to drive payroll_base
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-dance",
            cheer_subtype=None,
            dance_subtype="jazz-kick",
            package_name="JAZZ SIMPLE CUT",
            music_affiliate="Power Music",
        )
        assert not bd.needs_manual_pricing
        payroll_base = bd.payroll_base_price

        comp = calculate_compensation(
            db=db,
            producer_initials="MM",
            pricing_breakdown=bd,
            final_customer_price=bd.system_calculated_customer_price,
        )
        assert comp.status == "computed"
        assert comp.rate_used == Decimal("0.72")
        assert comp.rate_source == "rates_by_category[jazz-kick]"
        expected = (payroll_base * Decimal("0.72")).quantize(Decimal("0.01"))
        assert comp.producer_payout == expected

    def test_mark_all_star_cheer_rate(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        assert not bd.needs_manual_pricing
        payroll_base = bd.payroll_base_price  # 600

        comp = calculate_compensation(
            db=db,
            producer_initials="MM",
            pricing_breakdown=bd,
            final_customer_price=bd.system_calculated_customer_price,
        )
        assert comp.status == "computed"
        assert comp.rate_used == Decimal("0.60")
        assert comp.rate_source == "rates_by_category[all-star-cheer]"
        expected = (payroll_base * Decimal("0.60")).quantize(Decimal("0.01"))
        assert comp.producer_payout == expected

    def test_mark_rates_differ_between_categories(self, db):
        bd_dance = calculate_pricing(
            db=db, form_type="school-all-star-dance",
            cheer_subtype=None, dance_subtype="jazz-kick",
            package_name="JAZZ SIMPLE CUT", music_affiliate="Power Music",
        )
        bd_cheer = calculate_pricing(
            db=db, form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer", dance_subtype=None,
            package_name="GOLD 1:30", music_affiliate="Power Music",
        )
        comp_dance = calculate_compensation(
            db=db, producer_initials="MM",
            pricing_breakdown=bd_dance, final_customer_price=bd_dance.system_calculated_customer_price,
        )
        comp_cheer = calculate_compensation(
            db=db, producer_initials="MM",
            pricing_breakdown=bd_cheer, final_customer_price=bd_cheer.system_calculated_customer_price,
        )
        assert comp_dance.rate_used != comp_cheer.rate_used


# ---------------------------------------------------------------------------
# Test 7: "Power Music Covers" → compliant via synonym matching
# ---------------------------------------------------------------------------

class TestSynonymMatching:

    def test_power_music_covers_resolves_as_compliant(self, db):
        result = resolve_compliance(db, "Power Music Covers")
        assert result.status == "compliant"
        assert result.canonical_affiliate == "Power Music"
        assert "Power Music" in result.reason

    def test_exact_canonical_name_resolves(self, db):
        result = resolve_compliance(db, "Power Music")
        assert result.status == "compliant"

    def test_case_insensitive_synonym(self, db):
        result = resolve_compliance(db, "power music covers")
        assert result.status == "compliant"

    def test_synonym_used_in_full_pricing(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music Covers",
        )
        assert bd.compliance_status == "compliant"
        assert bd.payroll_base_price == Decimal("600")   # compliant rate


# ---------------------------------------------------------------------------
# Test 8: Missing affiliate → needs_manual_review
# ---------------------------------------------------------------------------

class TestMissingAffiliate:

    def test_none_affiliate_needs_manual_review(self, db):
        result = resolve_compliance(db, None)
        assert result.status == "needs_manual_review"
        assert result.canonical_affiliate is None

    def test_empty_string_affiliate_needs_manual_review(self, db):
        result = resolve_compliance(db, "")
        assert result.status == "needs_manual_review"

    def test_whitespace_affiliate_needs_manual_review(self, db):
        result = resolve_compliance(db, "   ")
        assert result.status == "needs_manual_review"

    def test_pricing_with_missing_affiliate_flags_manual_review(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate=None,
        )
        assert bd.needs_manual_review is True
        assert bd.compliance_status == "needs_manual_review"
        # Pricing should still calculate (not blocked) but flag the review need
        assert bd.system_calculated_customer_price is not None


# ---------------------------------------------------------------------------
# Bonus: Casey old/new pricing ambiguity flag
# ---------------------------------------------------------------------------

class TestCaseyAmbiguity:

    def test_casey_returns_both_rates(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        comp = calculate_compensation(
            db=db,
            producer_initials="CM",
            pricing_breakdown=bd,
            final_customer_price=bd.system_calculated_customer_price,
        )
        assert comp.old_new_trigger_unconfirmed is True
        assert comp.old_pricing_payout is not None
        assert comp.new_pricing_payout is not None
        assert comp.old_pricing_payout != comp.new_pricing_payout
        # producer_payout should be None until Megan selects
        assert comp.producer_payout is None

    def test_casey_override_rate_bypasses_ambiguity(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )
        comp = calculate_compensation(
            db=db,
            producer_initials="CM",
            pricing_breakdown=bd,
            final_customer_price=bd.system_calculated_customer_price,
            overridden_rate=Decimal("0.70"),
        )
        assert comp.status == "computed"
        assert comp.rate_used == Decimal("0.70")
        assert comp.rate_source == "manual_override"
        assert comp.producer_payout is not None


# ---------------------------------------------------------------------------
# Bonus: hourly_manual and not_paid_for_mixing
# ---------------------------------------------------------------------------

class TestSpecialCompensationModels:

    def _bd(self, db):
        return calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30",
            music_affiliate="Power Music",
        )

    def test_griffin_hourly_manual(self, db):
        comp = calculate_compensation(
            db=db, producer_initials="G",
            pricing_breakdown=self._bd(db), final_customer_price=Decimal("700"),
        )
        assert comp.status == "hourly_manual"
        assert comp.producer_payout is None

    def test_steve_not_paid_for_mixing(self, db):
        comp = calculate_compensation(
            db=db, producer_initials="SS",
            pricing_breakdown=self._bd(db), final_customer_price=Decimal("700"),
        )
        assert comp.status == "not_paid_for_mixing"
        assert comp.producer_payout == Decimal("0.00")
        assert comp.slt_portion == Decimal("700")


# ---------------------------------------------------------------------------
# Bonus: split-flag normalization
# ---------------------------------------------------------------------------

class TestSplitFlagNormalization:

    def test_gold_1_30_no_split_matches(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30 NO SPLIT",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.package_id == "gold_1_30"

    def test_gold_1_30_split_matches(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30 SPLIT",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.package_id == "gold_1_30"

    def test_gold_1_30_tbd_matches(self, db):
        bd = calculate_pricing(
            db=db,
            form_type="school-all-star-cheer",
            cheer_subtype="all-star-cheer",
            dance_subtype=None,
            package_name="GOLD 1:30 TBD",
            music_affiliate="Power Music",
        )
        assert bd.needs_manual_pricing is False
        assert bd.package_id == "gold_1_30"
