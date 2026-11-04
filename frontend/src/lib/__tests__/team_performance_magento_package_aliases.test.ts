import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDanceOrderPricing,
  canonicalizeTeamPerformancePackage,
  lookupDanceRateCardEntry,
} from "../pricing-engine";
import {
  magentoPackageBoardLabel,
  packageTypeDisplayValue,
} from "../../components/mtd/PackageTypeField";

const MAGENTO_TP_MIX = "TP Mix (up to 5 songs)";
const MAGENTO_TP_PLUS = "TP Plus (6-8 songs)";
const MAGENTO_TP_MIX_PRICED = "TP Mix (up to 5 songs) $475";
const MAGENTO_TP_PLUS_PRICED = "TP Plus (6-8 songs) $570";

describe("Team Performance Magento SoftSelect package compatibility", () => {
  it("canonicalizes Form 6 SoftSelect labels onto rate-card keys", () => {
    assert.equal(canonicalizeTeamPerformancePackage(MAGENTO_TP_MIX), "TP MIX");
    assert.equal(
      canonicalizeTeamPerformancePackage(MAGENTO_TP_PLUS),
      "TP PLUS MIX"
    );
    assert.equal(
      canonicalizeTeamPerformancePackage(MAGENTO_TP_MIX_PRICED),
      "TP MIX"
    );
    assert.equal(
      canonicalizeTeamPerformancePackage(MAGENTO_TP_PLUS_PRICED),
      "TP PLUS MIX"
    );
  });

  it("TP Mix SoftSelect prices at $500 (compliant payroll $400)", () => {
    const entry = lookupDanceRateCardEntry(
      "team-performance-variety",
      MAGENTO_TP_MIX
    );
    assert.equal(entry?.package, "TP MIX");
    assert.equal(entry?.customer, 500);

    const priced = calculateDanceOrderPricing({
      danceFormSubtype: "team-performance-variety",
      packageType: MAGENTO_TP_MIX,
      musicAffiliate: "Power Music Covers",
    });
    assert.equal(priced.customerFacingPrice, 500);
    assert.equal(priced.payrollBasePrice, 400);
  });

  it("TP Plus SoftSelect prices at $600 (not $0) — SoftSelect lacks MIX suffix", () => {
    const entry = lookupDanceRateCardEntry(
      "team-performance-variety",
      MAGENTO_TP_PLUS
    );
    assert.equal(entry?.package, "TP PLUS MIX");
    assert.equal(entry?.customer, 600);

    const priced = calculateDanceOrderPricing({
      danceFormSubtype: "team-performance-variety",
      packageType: MAGENTO_TP_PLUS,
      musicAffiliate: "Unleash the Beats Covers",
    });
    assert.equal(priced.customerFacingPrice, 600);
    assert.equal(priced.payrollBasePrice, 475);
  });

  it("legacy SoftSelect labels with dollar amounts still match", () => {
    assert.equal(
      lookupDanceRateCardEntry(
        "team-performance-variety",
        MAGENTO_TP_MIX_PRICED
      )?.customer,
      500
    );
    assert.equal(
      lookupDanceRateCardEntry(
        "team-performance-variety",
        MAGENTO_TP_PLUS_PRICED
      )?.customer,
      600
    );
  });

  it("board label uses Magento SoftSelect wording", () => {
    assert.equal(packageTypeDisplayValue(MAGENTO_TP_PLUS), "TP PLUS MIX");
    assert.equal(
      magentoPackageBoardLabel(
        "school-all-star-dance",
        MAGENTO_TP_PLUS,
        "team-performance-variety"
      ),
      "TP Plus (6-8 songs)"
    );
    assert.equal(
      magentoPackageBoardLabel(
        "school-all-star-dance",
        MAGENTO_TP_MIX,
        "team-performance-variety"
      ),
      "TP Mix (up to 5 songs)"
    );
  });
});
