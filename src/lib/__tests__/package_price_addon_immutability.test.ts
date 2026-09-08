import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
} from "../pricing-engine";

describe("Add-On Pricing Invariant Tests — Package Price Must Not Change", () => {
  it("Test 1 — No Add-On: Base Package Price is $700", () => {
    const res = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 1:30",
      timeLengthOfMix: "1:30",
      musicAffiliate: "Power Music",
      hasRallyMix: false,
    });
    assert.equal(res.customerFacingPrice, 700);
    assert.equal(res.payrollBasePrice, 600);
  });

  it("Test 2 — Rally Mix: Package Price remains $700 while Payroll Price includes +$350", () => {
    const res = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 1:30",
      timeLengthOfMix: "1:30",
      musicAffiliate: "Power Music",
      hasRallyMix: true,
    });
    assert.equal(res.customerFacingPrice, 700);
    assert.equal(res.payrollBasePrice, 950); // $600 + $350
  });

  it("Test 3 — Toggle Off: Package Price remains $700", () => {
    const res = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 1:30",
      timeLengthOfMix: "1:30",
      musicAffiliate: "Power Music",
      hasRallyMix: false,
    });
    assert.equal(res.customerFacingPrice, 700);
    assert.equal(res.payrollBasePrice, 600);
  });

  it("Test 4 — Toggle Repeatedly: ON -> OFF -> ON -> OFF -> ON stays $700 every time", () => {
    let state = false;
    for (let i = 0; i < 5; i++) {
      state = !state;
      const res = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 1:30",
        timeLengthOfMix: "1:30",
        musicAffiliate: "Power Music",
        hasRallyMix: state,
      });
      assert.equal(res.customerFacingPrice, 700, `Iteration ${i + 1} state=${state} failed`);
      if (state) {
        assert.equal(res.payrollBasePrice, 950);
      } else {
        assert.equal(res.payrollBasePrice, 600);
      }
    }
  });

  it("Test 5 — Multiple Add-Ons: Base Package Price remains $450 (Youth Rec Cheer)", () => {
    const res = calculateCheerOrderPricing({
      cheerFormSubtype: "youth-rec-cheer",
      packageType: "BRONZE 1:00",
      hasExtend8ctAddon: true,
      hasProcessing8ctSheetsAddon: true,
    });
    assert.equal(res.customerFacingPrice, 450); // Base package price
    assert.equal(res.payrollBasePrice, 425); // $350 + $25 + $50
  });

  it("Test 6 — Dance & Marching Band Add-Ons: Base Package Prices remain immutable", () => {
    // Dance VO Add-ons
    const danceRes = calculateDanceOrderPricing({
      danceFormSubtype: "pom",
      packageType: "CUSTOM POM",
      musicAffiliate: "Power Music Covers",
      hasTraditionalVoiceover: true,
      hasThemedVoiceover: true,
    });
    assert.equal(danceRes.customerFacingPrice, 850);
    assert.equal(danceRes.payrollBasePrice, 830); // $730 + $100

    // Marching Band Add-ons
    const mbRes = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });
    assert.equal(mbRes.customerFacingPrice, 600);
    assert.equal(mbRes.payrollBasePrice, 725); // $600 + $125

    // Sports Entertainment Rush Fee
    const seRes = calculateSportsEntertainmentOrderPricing({
      packageType: "PRE-GAME / HALFTIME REMIXED",
      isRushOrder: "yes",
    });
    assert.equal(seRes.customerFacingPrice, 250);
    assert.equal(seRes.payrollBasePrice, 350); // $250 + $100
  });

  it("Test 7 — Compliance & Non-Compliance: Compliance affects payroll base but Package Price is immutable", () => {
    const compliantRes = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 1:30",
      timeLengthOfMix: "1:30",
      musicAffiliate: "Power Music",
      hasRallyMix: true,
    });
    assert.equal(compliantRes.customerFacingPrice, 700);
    assert.equal(compliantRes.payrollBasePrice, 950); // $600 + $350

    const nonCompliantRes = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "GOLD 1:30",
      timeLengthOfMix: "1:30",
      musicAffiliate: "Unapproved Indie Song",
      hasRallyMix: true,
    });
    assert.equal(nonCompliantRes.customerFacingPrice, 700);
    assert.equal(nonCompliantRes.payrollBasePrice, 1050); // $700 non-compliant + $350
  });
});
