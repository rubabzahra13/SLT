import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDanceOrderPricing } from "../pricing-engine";

describe("Prompt 8 — Traditional/Themed Voice Over Toggles (All 5 Subtypes)", () => {
  describe("POM Subtype Math Verification (DANCE MIX = $475 base)", () => {
    it("Neither toggle active → $475 customerFacingPrice, $375 payrollBasePrice (compliant)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: false,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 375);
    });

    it("Traditional VO only (+25) → $475 customerFacingPrice (base), $400 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: false,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 400);
    });

    it("Themed VO only (+75) → $475 customerFacingPrice (base), $450 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 450);
    });

    it("Both toggles active (+100) → $475 customerFacingPrice (base), $475 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 475);
    });
  });

  describe("Gameday Subtype Math Verification (PERFORMANCE MIX = $100 base)", () => {
    it("Neither toggle active → $100 customerFacingPrice, $85 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: false,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 85);
    });

    it("Traditional VO only (+25) → $100 customerFacingPrice (base), $110 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: false,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 110);
    });

    it("Themed VO only (+75) → $100 customerFacingPrice (base), $160 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 160);
    });

    it("Both toggles active (+100) → $100 customerFacingPrice (base), $185 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 185);
    });
  });

  describe("Jazz/Kick Subtype Math Verification (JAZZ SIMPLE CUT = $100 base fixed)", () => {
    it("Both toggles active (+100) → $100 customerFacingPrice (base), $200 payrollBasePrice (always fixed payroll)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "jazz-kick",
        packageType: "JAZZ SIMPLE CUT",
        musicAffiliate: "Non-Compliant Song",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 200);
      assert.equal(res.alwaysFixedPayroll, true);
    });
  });
});
