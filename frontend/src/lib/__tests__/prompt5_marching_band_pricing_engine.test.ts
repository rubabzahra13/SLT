import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarchingBandOrderPricing,
  determineComplianceStatus,
  lookupMarchingBandRateCardEntry,
  MARCHING_BAND_RATE_CARD,
} from "../pricing-engine";

describe("Prompt 5 — Marching Band Pricing Engine Unit Tests", () => {
  it("Rate Card completeness: Fight Song and Alma Mater are separate packages", () => {
    assert.equal(MARCHING_BAND_RATE_CARD.length, 6);
    assert.deepEqual(
      MARCHING_BAND_RATE_CARD.map((e) => e.package),
      [
        "BAND CHANT",
        "DRUM CADENCE ORIGINAL",
        "FIGHT SONG ORIGINAL",
        "ALMA MATER ORIGINAL",
        "FIGHT SONG PLUS",
        "ALMA MATER PLUS",
      ]
    );
  });

  it("BAND CHANT + Power Music (compliant affiliate) → $300 payroll", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Power Music",
    });
    assert.equal(res.complianceStatus, "compliant");
    assert.equal(res.customerFacingPrice, 600);
    assert.equal(res.payrollBasePrice, 300);
    assert.equal(res.alwaysFixedPayroll, false);
  });

  it("Compliant affiliate text field matches ignoring spacing and capitalization", () => {
    for (const affiliate of [
      "power music",
      "POWER  MUSIC",
      "PowerMusic",
      "power-music",
      "Unleash   the   Beats",
      "unleashthebeats",
      "POWER music + unleash THE beats",
      "library music",
    ]) {
      assert.equal(
        determineComplianceStatus("pom", affiliate),
        "compliant",
        affiliate
      );
    }
  });

  it("Any text that is not a compliant affiliate is non-compliant", () => {
    for (const affiliate of [
      "Custom Music / Client-Provided Track",
      "Songs for Cheer — Editor's Choice",
      "whatever the client typed",
      "Spotify playlist",
    ]) {
      assert.equal(
        determineComplianceStatus("pom", affiliate),
        "non-compliant",
        affiliate
      );
    }
  });

  it("BAND CHANT + Custom Music (non-compliant affiliate) → $600 payroll", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Custom Music / Client-Provided Track",
    });
    assert.equal(res.complianceStatus, "non-compliant");
    assert.equal(res.payrollBasePrice, 600);
  });

  it("DRUM CADENCE + Unleash the Beats (compliant) → $150 payroll", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "DRUM CADENCE ORIGINAL",
      musicAffiliate: "Unleash the Beats",
    });
    assert.equal(res.complianceStatus, "compliant");
    assert.equal(res.customerFacingPrice, 350);
    assert.equal(res.payrollBasePrice, 150);
  });

  it("DRUM CADENCE + Songs for Cheer Editor's Choice (non-compliant) → $350 payroll", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "Drum Cadence",
      musicAffiliate: "Songs for Cheer — Editor's Choice",
    });
    assert.equal(res.complianceStatus, "non-compliant");
    assert.equal(res.payrollBasePrice, 350);
  });

  it("BAND CHANT with no affiliate falls back to compliant payroll column", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
    });
    assert.equal(res.complianceStatus, "unknown-no-affiliate-field");
    assert.equal(res.payrollBasePrice, 300);
  });

  it("BAND CHANT + add-ons with compliant affiliate: payroll = $300 + $50 + $75", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Power Music + Unleash the Beats",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });
    assert.equal(res.customerFacingPrice, 600);
    assert.equal(res.payrollBasePrice, 425);
    assert.equal(res.complianceStatus, "compliant");
  });

  it("Fight Song Plus must not match cheaper Fight Song Original", () => {
    const plus = lookupMarchingBandRateCardEntry("Fight Song Plus");
    const original = lookupMarchingBandRateCardEntry("Fight Song Original");
    assert.equal(plus?.package, "FIGHT SONG PLUS");
    assert.equal(plus?.customer, 2250);
    assert.equal(original?.package, "FIGHT SONG ORIGINAL");
    assert.equal(original?.customer, 1100);
  });

  it("Fight Song / Alma Mater packages ignore affiliates (always flat)", () => {
    for (const packageType of [
      "FIGHT SONG ORIGINAL",
      "ALMA MATER ORIGINAL",
      "FIGHT SONG PLUS",
      "ALMA MATER PLUS",
    ]) {
      const compliantAff = calculateMarchingBandOrderPricing({
        packageType,
        musicAffiliate: "Power Music",
      });
      const nonCompliantAff = calculateMarchingBandOrderPricing({
        packageType,
        musicAffiliate: "Custom Music / Client-Provided Track",
      });
      const expected = packageType.includes("PLUS") ? 2250 : 1100;
      assert.equal(compliantAff.alwaysFixedPayroll, true);
      assert.equal(nonCompliantAff.alwaysFixedPayroll, true);
      assert.equal(compliantAff.payrollBasePrice, expected);
      assert.equal(nonCompliantAff.payrollBasePrice, expected);
      assert.equal(compliantAff.customerFacingPrice, expected);
      assert.equal(nonCompliantAff.customerFacingPrice, expected);
    }
  });

  it("FIGHT SONG ORIGINAL alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG ORIGINAL",
    });

    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.payrollBasePrice, 1100);
    assert.equal(res.alwaysFixedPayroll, true);
    assert.equal(res.packageName, "FIGHT SONG ORIGINAL");
  });

  it("ALMA MATER ORIGINAL alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "ALMA MATER ORIGINAL",
    });

    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.payrollBasePrice, 1100);
    assert.equal(res.alwaysFixedPayroll, true);
    assert.equal(res.packageName, "ALMA MATER ORIGINAL");
  });

  it("Legacy combined label still resolves (FIGHT SONG / ALMA MATER → FIGHT SONG ORIGINAL @ $1100)", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG / ALMA MATER",
    });
    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.packageName, "FIGHT SONG ORIGINAL");
  });

  it("FIGHT SONG PLUS alone: customerFacingPrice = 2250, payrollBasePrice = 2250 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG PLUS",
    });

    assert.equal(res.customerFacingPrice, 2250);
    assert.equal(res.payrollBasePrice, 2250);
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("Legacy Plus parenthetical still resolves; add-ons apply", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "ALMA MATER PLUS (Written & Recorded Lyrics)",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });

    assert.equal(res.customerFacingPrice, 2250);
    assert.equal(res.payrollBasePrice, 2375);
    assert.equal(res.packageName, "ALMA MATER PLUS");
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("Invalid package name: engine flags / returns null matchedEntry and 0 price", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "INVALID MARCHING BAND PACKAGE",
    });

    assert.equal(res.matchedEntry, null);
    assert.equal(res.customerFacingPrice, 0);
    assert.equal(res.payrollBasePrice, 0);
  });
});
