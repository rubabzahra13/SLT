import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSportsEntertainmentOrderPricing,
  lookupSportsEntertainmentRateCardEntry,
  SPORTS_ENTERTAINMENT_RATE_CARD,
} from "../pricing-engine";

describe("Prompt 6 — Sports Entertainment Pricing Engine Unit Tests", () => {
  it("Rate Card completeness: contains all 3 Sports Entertainment packages", () => {
    assert.equal(SPORTS_ENTERTAINMENT_RATE_CARD.length, 3);
    assert.deepEqual(
      SPORTS_ENTERTAINMENT_RATE_CARD.map((e) => e.package),
      [
        "QUARTER BREAK / TIMEOUT REMIXED",
        "PRE-GAME / HALFTIME REMIXED",
        "OTHER (mixes longer than 2:30)",
      ]
    );
  });

  it("QUARTER BREAK / TIMEOUT REMIXED with rush = no: customerFacingPrice = 150, payrollBasePrice = 150", () => {
    const res = calculateSportsEntertainmentOrderPricing({
      packageType: "QUARTER BREAK / TIMEOUT REMIXED",
      isRushOrder: "no",
    });

    assert.equal(res.isUnpriced, false);
    assert.equal(res.needsManualQuote, false);
    assert.equal(res.customerFacingPrice, 150);
    assert.equal(res.payrollBasePrice, 150);
    assert.equal(res.hasRushFee, false);
    assert.equal(res.rushFeeAmount, 0);
  });

  it("QUARTER BREAK / TIMEOUT REMIXED with rush = yes: customerFacingPrice = 150 (base), payrollBasePrice = 300 ($150 + $150)", () => {
    const res = calculateSportsEntertainmentOrderPricing({
      packageType: "QUARTER BREAK / TIMEOUT REMIXED",
      isRushOrder: "yes",
    });

    assert.equal(res.customerFacingPrice, 150);
    assert.equal(res.payrollBasePrice, 300);
    assert.equal(res.hasRushFee, true);
    assert.equal(res.rushFeeAmount, 150);
  });

  it("PRE-GAME / HALFTIME REMIXED with rush = no: customerFacingPrice = 250", () => {
    const res = calculateSportsEntertainmentOrderPricing({
      packageType: "PRE-GAME / HALFTIME REMIXED",
      isRushOrder: "no",
    });

    assert.equal(res.customerFacingPrice, 250);
    assert.equal(res.payrollBasePrice, 250);
    assert.equal(res.hasRushFee, false);
  });

  it("PRE-GAME / HALFTIME REMIXED with rush = yes: customerFacingPrice = 250 (base), payrollBasePrice = 400 ($250 + $150)", () => {
    const res = calculateSportsEntertainmentOrderPricing({
      packageType: "PRE-GAME / HALFTIME REMIXED",
      isRushOrder: "yes",
    });

    assert.equal(res.customerFacingPrice, 250);
    assert.equal(res.payrollBasePrice, 400);
    assert.equal(res.hasRushFee, true);
    assert.equal(res.rushFeeAmount, 150);
  });

  it("OTHER (mixes longer than 2:30): returns explicit unpriced state (customerFacingPrice = null)", () => {
    const res = calculateSportsEntertainmentOrderPricing({
      packageType: "OTHER (mixes longer than 2:30)",
      isRushOrder: "no",
    });

    assert.equal(res.isUnpriced, true);
    assert.equal(res.needsManualQuote, true);
    assert.equal(res.customerFacingPrice, null);
    assert.equal(res.payrollBasePrice, null);
    assert.notEqual(res.matchedEntry, null);

    // Verify calling code trying to format or check numeric price safe-guards
    const priceDisplay = res.isUnpriced ? "TBD (Manual Quote)" : `$${res.customerFacingPrice}`;
    assert.equal(priceDisplay, "TBD (Manual Quote)");
  });

  it("Rush fee handles string 'yes', boolean true, and uppercase 'YES'", () => {
    const resBool = calculateSportsEntertainmentOrderPricing({
      packageType: "PRE-GAME / HALFTIME REMIXED",
      isRushOrder: true,
    });
    assert.equal(resBool.customerFacingPrice, 250);
    assert.equal(resBool.payrollBasePrice, 400);

    const resUpper = calculateSportsEntertainmentOrderPricing({
      packageType: "PRE-GAME / HALFTIME REMIXED",
      isRushOrder: "YES",
    });
    assert.equal(resUpper.customerFacingPrice, 250);
    assert.equal(resUpper.payrollBasePrice, 400);
  });
});
