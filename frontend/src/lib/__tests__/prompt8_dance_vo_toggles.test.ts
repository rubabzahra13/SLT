import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDanceOrderPricing } from "../pricing-engine";

describe("Voiceover Isolation Verification (All 5 Subtypes)", () => {
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

    it("Traditional VO active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: false,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 375);
    });

    it("Themed VO active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: false,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 375);
    });

    it("Both toggles active → $475 customerFacingPrice, $375 payrollBasePrice (Voiceover is separate internal payroll item)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 475);
      assert.equal(res.payrollBasePrice, 375);
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

    it("Both toggles active → $100 customerFacingPrice, $85 payrollBasePrice", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 85);
    });
  });

  describe("Jazz/Kick Subtype Math Verification (JAZZ SIMPLE CUT = $100 base fixed)", () => {
    it("Both toggles active → $100 customerFacingPrice, $100 payrollBasePrice (always fixed payroll)", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "jazz-kick",
        packageType: "JAZZ SIMPLE CUT",
        musicAffiliate: "Non-Compliant Song",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(res.customerFacingPrice, 100);
      assert.equal(res.payrollBasePrice, 100);
      assert.equal(res.alwaysFixedPayroll, true);
    });
  });
});
