import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCheerOrderPricing } from "../pricing-engine";

describe("Central Pricing Engine — Core Rules Unit Tests (Prompt 8)", () => {
  it("All-Star Cheer GOLD 1:30 with Power Music (compliant affiliate)", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "GOLD 1:30",
      musicAffiliate: "Power Music",
    });

    assert.equal(result.customerFacingPrice, 700);
    assert.equal(result.payrollBasePrice, 600);
    assert.equal(result.complianceStatus, "compliant");
  });

  it("All-Star Cheer GOLD 1:30 with non-compliant music affiliate", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "GOLD 1:30",
      musicAffiliate: "Some Random Song Artist",
    });

    assert.equal(result.customerFacingPrice, 700);
    assert.equal(result.payrollBasePrice, 700);
    assert.equal(result.complianceStatus, "non-compliant");
  });

  it("All-Star Cheer TITANIUM 2:30 — payroll base is $2800 regardless of compliance", () => {
    const compliantResult = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "TITANIUM 2:30",
      musicAffiliate: "Library Music",
    });

    assert.equal(compliantResult.customerFacingPrice, 2800);
    assert.equal(compliantResult.payrollBasePrice, 2800);
    assert.equal(compliantResult.complianceStatus, "compliant");
    assert.equal(compliantResult.isTitanium, true);

    const nonCompliantResult = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "TITANIUM 2:30",
      musicAffiliate: "Some Non-Compliant Artist",
    });

    assert.equal(nonCompliantResult.customerFacingPrice, 2800);
    assert.equal(nonCompliantResult.payrollBasePrice, 2800);
    assert.equal(nonCompliantResult.complianceStatus, "non-compliant");
    assert.equal(nonCompliantResult.isTitanium, true);
  });

  it("School Cheer VIROC Yes SILVER 1:45 with Unleash the Beats (compliant)", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-yes",
      packageType: "SILVER 1:45",
      musicAffiliate: "Unleash the Beats",
    });

    assert.equal(result.customerFacingPrice, 650);
    assert.equal(result.payrollBasePrice, 550);
    assert.equal(result.complianceStatus, "compliant");
  });

  it("School Cheer VIROC No PLATINUM 2:15 with a non-compliant affiliate", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "school-cheer-viroc-no",
      packageType: "PLATINUM 2:15",
      musicAffiliate: "Artist Cover Remix",
    });

    assert.equal(result.customerFacingPrice, 1600);
    assert.equal(result.payrollBasePrice, 1600);
    assert.equal(result.complianceStatus, "non-compliant");
  });

  it("Youth Rec Cheer BRONZE 1:30 with Power Music Covers (compliant affiliate)", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "youth-rec-cheer",
      packageType: "BRONZE 1:30",
      musicAffiliate: "Power Music Covers",
    });

    assert.equal(result.customerFacingPrice, 570);
    assert.equal(result.payrollBasePrice, 470);
    assert.equal(result.complianceStatus, "compliant");
  });

  it("Youth Rec Cheer BRONZE 2:00 with no musicAffiliate field present", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "youth-rec-cheer",
      packageType: "BRONZE 2:00",
      musicAffiliate: undefined,
    });

    assert.equal(result.customerFacingPrice, 750);
    assert.equal(result.complianceStatus, "unknown-no-affiliate-field");
    assert.notEqual(result.complianceStatus, "compliant");
    assert.notEqual(result.complianceStatus, "non-compliant");
  });

  it("Invalid / Unrecognized package name returns explicit invalid flag and zero price", () => {
    const result = calculateCheerOrderPricing({
      cheerFormSubtype: "all-star-cheer",
      packageType: "EMERALD 1:30",
      musicAffiliate: "Power Music",
    });

    assert.equal(result.customerFacingPrice, 0);
    assert.equal(result.payrollBasePrice, 0);
    assert.equal(result.matchedEntry, null);
  });

  describe("Subtype-Specific MTD Controls Add-On Rules (Prompt 10)", () => {
    it("School Cheer GOLD 2:00 with Rally Mix active adds $350 on top of package price for both customer and payroll", () => {
      const baseResult = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:00",
        musicAffiliate: "Power Music",
        hasRallyMix: false,
      });
      assert.equal(baseResult.customerFacingPrice, 950);
      assert.equal(baseResult.payrollBasePrice, 850);

      const rallyResult = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:00",
        musicAffiliate: "Power Music",
        hasRallyMix: true,
      });
      assert.equal(rallyResult.customerFacingPrice, 1300); // 950 + 350
      assert.equal(rallyResult.payrollBasePrice, 1200); // 850 + 350

      // Live 2-way toggle off returns to base
      const toggledOff = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:00",
        musicAffiliate: "Power Music",
        hasRallyMix: false,
      });
      assert.equal(toggledOff.customerFacingPrice, 950);
      assert.equal(toggledOff.payrollBasePrice, 850);
    });

    it("Rally Mix is ignored on All-Star Cheer and Youth Rec Cheer", () => {
      const allStar = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 2:00",
        musicAffiliate: "Power Music",
        hasRallyMix: true,
      });
      assert.equal(allStar.customerFacingPrice, 950);

      const youthRec = calculateCheerOrderPricing({
        cheerFormSubtype: "youth-rec-cheer",
        packageType: "BRONZE 2:00",
        hasRallyMix: true,
      });
      assert.equal(youthRec.customerFacingPrice, 750);
    });

    it("Youth Rec Cheer BRONZE 2:00 with Extend-8ct ($25) and Processing-8ct-Sheets ($50)", () => {
      const extendOnly = calculateCheerOrderPricing({
        cheerFormSubtype: "youth-rec-cheer",
        packageType: "BRONZE 2:00",
        hasExtend8ctAddon: true,
      });
      assert.equal(extendOnly.customerFacingPrice, 775); // 750 + 25
      assert.equal(extendOnly.payrollBasePrice, 675); // 650 + 25

      const processOnly = calculateCheerOrderPricing({
        cheerFormSubtype: "youth-rec-cheer",
        packageType: "BRONZE 2:00",
        hasProcessing8ctSheetsAddon: true,
      });
      assert.equal(processOnly.customerFacingPrice, 800); // 750 + 50
      assert.equal(processOnly.payrollBasePrice, 700); // 650 + 50

      const bothAddons = calculateCheerOrderPricing({
        cheerFormSubtype: "youth-rec-cheer",
        packageType: "BRONZE 2:00",
        hasExtend8ctAddon: true,
        hasProcessing8ctSheetsAddon: true,
      });
      assert.equal(bothAddons.customerFacingPrice, 825); // 750 + 25 + 50
      assert.equal(bothAddons.payrollBasePrice, 725); // 650 + 25 + 50
    });

    it("Youth Rec Cheer add-ons are ignored on School Cheer and All-Star Cheer", () => {
      const schoolCheer = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:00",
        hasExtend8ctAddon: true,
        hasProcessing8ctSheetsAddon: true,
      });
      assert.equal(schoolCheer.customerFacingPrice, 950);
    });
  });
});

