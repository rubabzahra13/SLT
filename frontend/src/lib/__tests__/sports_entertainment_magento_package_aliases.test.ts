import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSportsEntertainmentOrderPricing,
  canonicalizeSportsEntertainmentPackage,
  lookupSportsEntertainmentRateCardEntry,
  SPORTS_ENTERTAINMENT_RATE_CARD,
} from "../pricing-engine";
import { normalizeOrder } from "../order-form";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "../../components/mtd/PackageTypeField";

const MAGENTO_QUARTER_REMIXED =
  "Quarter Break/Timeout Mix up to 1:15 - REMIXED PACKAGE $150.00 - 1-3 songs TOTALLY remixed - jazzed up with stops and tweaks!";
const MAGENTO_QUARTER_BASIC =
  "Quarter Break/Timeout Mix up to 1:15 - BASIC package $50.00 - A single song, simple edit. No frills - no sound effects, no backbeating.";
const MAGENTO_PREGAME_REMIXED =
  "Pre-Game Mix/Halftime Mix up to 2:30 - REMIXED PACKAGE $250.00 - 2-5 songs TOTALLY remixed - jazzed up with stops and tweaks!";

describe("Sports Entertainment Magento SoftSelect package compatibility", () => {
  it("rate card is Remixed packages + OTHER only (no BASIC)", () => {
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

  it("canonicalizes Magento Form 10 SoftSelect long labels without fuzzy matching", () => {
    assert.equal(
      canonicalizeSportsEntertainmentPackage(MAGENTO_QUARTER_REMIXED),
      "QUARTER BREAK / TIMEOUT REMIXED"
    );
    assert.equal(
      canonicalizeSportsEntertainmentPackage(MAGENTO_PREGAME_REMIXED),
      "PRE-GAME / HALFTIME REMIXED"
    );
    assert.equal(
      canonicalizeSportsEntertainmentPackage("Other (specify in notes section)"),
      "OTHER (mixes longer than 2:30)"
    );
  });

  it("maps packageTierOnly-truncated SoftSelect prefixes back to Remixed", () => {
    assert.equal(
      canonicalizeSportsEntertainmentPackage("Quarter Break/Timeout Mix up to"),
      "QUARTER BREAK / TIMEOUT REMIXED"
    );
    assert.equal(
      canonicalizeSportsEntertainmentPackage("Pre-Game Mix/Halftime Mix up to"),
      "PRE-GAME / HALFTIME REMIXED"
    );
  });

  it("normalizeOrder keeps full Magento SoftSelect text (does not cut at 1:15/2:30)", () => {
    const quarter = normalizeOrder({
      id: "se-q",
      formType: "sports-entertainment",
      packageType: MAGENTO_QUARTER_REMIXED,
      package: MAGENTO_QUARTER_REMIXED,
    } as never);
    assert.equal(quarter.packageType, MAGENTO_QUARTER_REMIXED);
    assert.equal(quarter.package, MAGENTO_QUARTER_REMIXED);

    const pre = normalizeOrder({
      id: "se-p",
      formType: "sports-entertainment",
      packageType: MAGENTO_PREGAME_REMIXED,
      package: MAGENTO_PREGAME_REMIXED,
    } as never);
    assert.equal(pre.packageType, MAGENTO_PREGAME_REMIXED);
    assert.equal(
      magentoPackageBoardLabel("sports-entertainment", pre.packageType || ""),
      "Pre-Game/Halftime Remixed Package"
    );
  });

  it("board label + display use short Magento SoftSelect names", () => {
    assert.equal(
      packageTypeDisplayValue(MAGENTO_QUARTER_REMIXED),
      "QUARTER BREAK / TIMEOUT REMIXED"
    );
    assert.equal(
      magentoPackageBoardLabel("sports-entertainment", MAGENTO_QUARTER_REMIXED),
      "Quarter Break/Timeout Remixed Package"
    );
    assert.equal(
      magentoPackageBoardLabel("sports-entertainment", MAGENTO_PREGAME_REMIXED),
      "Pre-Game/Halftime Remixed Package"
    );
  });

  it("Pre-Game Remixed SoftSelect (contains 2:30) prices at $250, not OTHER Needs Quote", () => {
    const entry = lookupSportsEntertainmentRateCardEntry(MAGENTO_PREGAME_REMIXED);
    assert.ok(entry);
    assert.equal(entry?.isUnpriced, undefined);
    assert.equal(entry?.customer, 250);

    const priced = calculateSportsEntertainmentOrderPricing({
      packageType: MAGENTO_PREGAME_REMIXED,
      isRushOrder: "no",
    });
    assert.equal(priced.needsManualQuote, false);
    assert.equal(priced.customerFacingPrice, 250);
  });

  it("Quarter Remixed SoftSelect prices at $150", () => {
    const priced = calculateSportsEntertainmentOrderPricing({
      packageType: MAGENTO_QUARTER_REMIXED,
      isRushOrder: "no",
    });
    assert.equal(priced.customerFacingPrice, 150);
    assert.equal(priced.needsManualQuote, false);
  });

  it("retired BASIC SoftSelect does not match Remixed rate card", () => {
    assert.equal(lookupSportsEntertainmentRateCardEntry(MAGENTO_QUARTER_BASIC), null);
    const priced = calculateSportsEntertainmentOrderPricing({
      packageType: MAGENTO_QUARTER_BASIC,
      isRushOrder: "no",
    });
    assert.equal(priced.matchedEntry, null);
    assert.equal(priced.customerFacingPrice, 0);
  });

  it("Pricing Reference SoftSelect short labels still match", () => {
    assert.equal(
      lookupSportsEntertainmentRateCardEntry(
        "Quarter Break/Timeout Remixed Package"
      )?.customer,
      150
    );
    assert.equal(
      lookupSportsEntertainmentRateCardEntry(
        "Pre-Game/Halftime Remixed Package"
      )?.customer,
      250
    );
  });
});
