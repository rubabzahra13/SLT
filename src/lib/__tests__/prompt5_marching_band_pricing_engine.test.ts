import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarchingBandOrderPricing,
  lookupMarchingBandRateCardEntry,
  MARCHING_BAND_RATE_CARD,
} from "../pricing-engine";

describe("Prompt 5 — Marching Band Pricing Engine Unit Tests", () => {
  it("Rate Card completeness: contains all 4 Marching Band packages", () => {
    assert.equal(MARCHING_BAND_RATE_CARD.length, 4);
    assert.deepEqual(
      MARCHING_BAND_RATE_CARD.map((e) => e.package),
      [
        "BAND CHANT",
        "DRUM CADENCE ORIGINAL",
        "FIGHT SONG / ALMA MATER",
        "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)",
      ]
    );
  });

  it("BAND CHANT alone: customerFacingPrice = 600, compliance = unknown-no-affiliate-field", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
    });

    assert.notEqual(res.matchedEntry, null);
    assert.equal(res.customerFacingPrice, 600);
    assert.equal(res.complianceStatus, "unknown-no-affiliate-field");
    assert.equal(res.payrollBasePrice, 600);
  });

  it("BAND CHANT + Sheet Music Add + Add Vocals: customerFacingPrice = 725 ($600 + $50 + $75)", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });

    assert.equal(res.customerFacingPrice, 725);
    assert.equal(res.payrollBasePrice, 725);
    assert.equal(res.complianceStatus, "unknown-no-affiliate-field");
  });

  it("DRUM CADENCE ORIGINAL alone: customerFacingPrice = 350, compliance = unknown-no-affiliate-field", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "DRUM CADENCE ORIGINAL",
    });

    assert.equal(res.customerFacingPrice, 350);
    assert.equal(res.payrollBasePrice, 350);
    assert.equal(res.complianceStatus, "unknown-no-affiliate-field");
  });

  it("FIGHT SONG / ALMA MATER alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG / ALMA MATER",
    });

    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.payrollBasePrice, 1100);
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("FIGHT SONG / ALMA MATER PLUS alone: customerFacingPrice = 2250, payrollBasePrice = 2250 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG / ALMA MATER PLUS (Written & Recorded Lyrics)",
    });

    assert.equal(res.customerFacingPrice, 2250);
    assert.equal(res.payrollBasePrice, 2250);
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("FIGHT SONG / ALMA MATER PLUS with short name lookup & both add-ons: customerFacingPrice = 2375 ($2250 + $50 + $75)", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG / ALMA MATER PLUS",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });

    assert.equal(res.customerFacingPrice, 2375);
    assert.equal(res.payrollBasePrice, 2375);
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
