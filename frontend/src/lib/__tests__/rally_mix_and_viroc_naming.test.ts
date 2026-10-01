import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCheerOrderPricing, calculateDanceOrderPricing, calculateMarchingBandOrderPricing } from "../pricing-engine";
import { buildDefaultCategorySnapshot } from "../pricing-reference";
import { CHEER_FORM_SUBTABS } from "../../types";
import { getSubtypeLabel } from "../pricing-display";

describe("Rally Mix Package Pricing, Subtype Renaming & Add-On Matrix Tests", () => {
  describe("PART 1: Rally Mix Package Pricing", () => {
    it("1. Rally Mix package pricing is recognized based on Package Name", () => {
      const res = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "Rally Mix",
        musicAffiliate: "Power Music",
      });

      assert.equal(res.customerFacingPrice, 350);
      assert.equal(res.payrollBasePrice, 350);
      assert.equal(res.packageName, "RALLY MIX");
      assert.equal(res.timeLengthOfMix, "-");
    });

    it("2. Rally Mix package pricing applies identically under School Cheer subtype", () => {
      const res = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-no",
        packageType: "Rally Mix",
        musicAffiliate: "Power Music",
      });

      assert.equal(res.customerFacingPrice, 350);
      assert.equal(res.payrollBasePrice, 350);
      assert.equal(res.packageName, "RALLY MIX");
    });

    it("3. Rally Mix does not stack as an add-on on top of another package", () => {
      const res = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:00",
        musicAffiliate: "Power Music",
        // @ts-ignore - testing legacy prop if passed
        hasRallyMix: true,
      });

      assert.equal(res.customerFacingPrice, 950);
      assert.equal(res.payrollBasePrice, 850);
    });

    it("4. Pricing Reference Table includes Rally Mix as a standard package row under School Cheer", () => {
      const snapshot = buildDefaultCategorySnapshot("School Cheer");
      const rallyRow = snapshot.rows.find(
        (r) => r.kind === "tier-time" && r.tier === "RALLY MIX"
      );
      assert.ok(rallyRow, "Rally Mix must exist in School Cheer pricing reference rows");
      if (rallyRow?.kind === "tier-time") {
        assert.equal(rallyRow.customer, 350);
        assert.equal(rallyRow.compliant, 350);
        assert.equal(rallyRow.nonCompliant, 350);
      }

      const rallyAddon = snapshot.addOns.find((a) => a.name.toLowerCase().includes("rally mix"));
      assert.equal(rallyAddon, undefined, "Rally Mix must NOT appear as an add-on");
    });
  });

  describe("PART 2: Global Subtype Renaming (VIROC & School Cheer)", () => {
    it("1. CHEER_FORM_SUBTABS labels display 'VIROC' and 'School Cheer'", () => {
      const virocTab = CHEER_FORM_SUBTABS.find((t) => t.id === "school-cheer-viroc-yes");
      const schoolTab = CHEER_FORM_SUBTABS.find((t) => t.id === "school-cheer-viroc-no");

      assert.ok(virocTab);
      assert.ok(schoolTab);
      assert.equal(virocTab.label, "VIROC");
      assert.equal(schoolTab.label, "School Cheer");
    });

    it("2. getSubtypeLabel resolves 'school-cheer-viroc-yes' to 'VIROC' and 'school-cheer-viroc-no' to 'School Cheer'", () => {
      assert.equal(getSubtypeLabel("school-cheer-viroc-yes"), "VIROC");
      assert.equal(getSubtypeLabel("school-cheer-viroc-no"), "School Cheer");
    });

    it("3. Internal data IDs remain unchanged ('school-cheer-viroc-yes' / 'school-cheer-viroc-no')", () => {
      assert.equal(CHEER_FORM_SUBTABS[1].id, "school-cheer-viroc-yes");
      assert.equal(CHEER_FORM_SUBTABS[2].id, "school-cheer-viroc-no");
    });
  });

  describe("PART 3 & 4 & 5: Extra Songs & Extra Song Time Availability Matrix", () => {
    it("1. Dance Orders include Extra Songs ($15) and Extra Song Time ($30) in payroll calculations", () => {
      const danceRes = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX", // Base compliant: $375
        musicAffiliate: "Power Music",
        // @ts-ignore
        extraSongsQuantity: 2, // 2 * 15 = $30
        extraSongEditingTimeQuantity: 1, // 1 * 30 = $30
      });

      assert.equal(danceRes.customerFacingPrice, 475);
      assert.equal(danceRes.payrollBasePrice, 435); // $375 + $30 + $30
    });

    it("2. Cheer Orders ignore Extra Songs & Extra Song Time in payroll calculations", () => {
      const cheerRes = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 1:30", // Base compliant: $600
        musicAffiliate: "Power Music",
        extraSongsQuantity: 5,
        extraSongEditingTimeQuantity: 5,
      });

      assert.equal(cheerRes.customerFacingPrice, 700);
      assert.equal(cheerRes.payrollBasePrice, 600); // Extra songs ignored
    });

    it("3. Marching Band Orders ignore Extra Songs & Extra Song Time in payroll calculations", () => {
      const mbRes = calculateMarchingBandOrderPricing({
        packageType: "BAND CHANT", // Base compliant: $300
        musicAffiliate: "Power Music",
        // @ts-ignore
        extraSongsQuantity: 5,
        extraSongEditingTimeQuantity: 5,
      });

      assert.equal(mbRes.customerFacingPrice, 600);
      assert.equal(mbRes.payrollBasePrice, 300); // Extra songs ignored
    });
  });
});
