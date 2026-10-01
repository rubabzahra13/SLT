import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDanceOrderPricing,
  normalizeMusicAffiliate,
  determineComplianceStatus,
} from "../pricing-engine";

describe("Prompt 6 — Dance Pricing Engine Unit Tests", () => {
  it("1. POM DANCE MIX with musicAffiliate = 'Power Music Covers' → customerFacingPrice = 475, payrollBasePrice = 375, compliant", () => {
    const res = calculateDanceOrderPricing({
      danceFormSubtype: "pom",
      packageType: "DANCE MIX",
      musicAffiliate: "Power Music Covers",
    });
    assert.equal(res.customerFacingPrice, 475);
    assert.equal(res.payrollBasePrice, 375);
    assert.equal(res.complianceStatus, "compliant");
  });

  it("2. Hip Hop CUSTOM POM with a non-compliant affiliate → customerFacingPrice = 850, payrollBasePrice = 850", () => {
    const res = calculateDanceOrderPricing({
      danceFormSubtype: "hip-hop",
      packageType: "CUSTOM POM",
      musicAffiliate: "Some Random Unapproved Artist",
    });
    assert.equal(res.customerFacingPrice, 850);
    assert.equal(res.payrollBasePrice, 850);
    assert.equal(res.complianceStatus, "non-compliant");
  });

  it("3. Team Performance & Variety TP PLUS MIX with musicAffiliate = 'Unleash the Beats Covers' → customerFacingPrice = 600, payrollBasePrice = 475, compliant", () => {
    const res = calculateDanceOrderPricing({
      danceFormSubtype: "team-performance-variety",
      packageType: "TP PLUS MIX",
      musicAffiliate: "Unleash the Beats Covers",
    });
    assert.equal(res.customerFacingPrice, 600);
    assert.equal(res.payrollBasePrice, 475);
    assert.equal(res.complianceStatus, "compliant");
  });

  it("4. Gameday PERFORMANCE EXTREME with a non-compliant affiliate → customerFacingPrice = 200, payrollBasePrice = 200", () => {
    const res = calculateDanceOrderPricing({
      danceFormSubtype: "gameday",
      packageType: "PERFORMANCE EXTREME",
      musicAffiliate: "Non-Compliant Track",
    });
    assert.equal(res.customerFacingPrice, 200);
    assert.equal(res.payrollBasePrice, 200);
    assert.equal(res.complianceStatus, "non-compliant");
  });

  it("5. Jazz/Kick JAZZ SIMPLE CUT: payrollBasePrice = 100 for compliant AND non-compliant affiliates", () => {
    const compliantRes = calculateDanceOrderPricing({
      danceFormSubtype: "jazz-kick",
      packageType: "JAZZ SIMPLE CUT",
      musicAffiliate: "Power Music",
    });
    assert.equal(compliantRes.customerFacingPrice, 100);
    assert.equal(compliantRes.payrollBasePrice, 100);
    assert.equal(compliantRes.alwaysFixedPayroll, true);

    const nonCompliantRes = calculateDanceOrderPricing({
      danceFormSubtype: "jazz-kick",
      packageType: "JAZZ SIMPLE CUT",
      musicAffiliate: "Non-Compliant Bootleg Audio",
    });
    assert.equal(nonCompliantRes.customerFacingPrice, 100);
    assert.equal(nonCompliantRes.payrollBasePrice, 100);
    assert.equal(nonCompliantRes.alwaysFixedPayroll, true);
  });

  it("6. Jazz/Kick JAZZ/KICK MIX: compliant → payrollBasePrice = 150; non-compliant → payrollBasePrice = 200", () => {
    const compliantRes = calculateDanceOrderPricing({
      danceFormSubtype: "jazz-kick",
      packageType: "JAZZ/KICK MIX",
      musicAffiliate: "Power Music",
    });
    assert.equal(compliantRes.customerFacingPrice, 200);
    assert.equal(compliantRes.payrollBasePrice, 150);
    assert.equal(compliantRes.complianceStatus, "compliant");

    const nonCompliantRes = calculateDanceOrderPricing({
      danceFormSubtype: "jazz-kick",
      packageType: "JAZZ/KICK MIX",
      musicAffiliate: "Unlicensed Artist Track",
    });
    assert.equal(nonCompliantRes.customerFacingPrice, 200);
    assert.equal(nonCompliantRes.payrollBasePrice, 200);
    assert.equal(nonCompliantRes.complianceStatus, "non-compliant");
  });

  it("7. Invalid / Unrecognized package name (e.g. 'DANCE SUPREME' for POM) → returns 0 price and null entry", () => {
    const res = calculateDanceOrderPricing({
      danceFormSubtype: "pom",
      packageType: "DANCE SUPREME",
      musicAffiliate: "Power Music",
    });
    assert.equal(res.customerFacingPrice, 0);
    assert.equal(res.payrollBasePrice, 0);
    assert.equal(res.matchedEntry, null);
  });
});
