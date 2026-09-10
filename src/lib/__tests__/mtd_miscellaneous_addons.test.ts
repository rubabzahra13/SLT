import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDanceOrderPricing,
  calculateCheerOrderPricing,
  calculateMiscellaneousPayrollAddons,
} from "../pricing-engine";
import type { MTDRecord } from "@/types";

describe("MTD Miscellaneous Payroll Items & Add-On Pricing", () => {
  const baseDanceRecord: Partial<MTDRecord> = {
    id: "rec-dance-1",
    package: "DANCE MIX",
    danceVoiceover: null,
    hasTraditionalVoiceover: false,
    hasThemedVoiceover: false,
    rushFeeOption: "none",
    extraSongsQuantity: 0,
    extraSongEditingTimeQuantity: 0,
    price: 475,
  };

  const baseCheerRecord: Partial<MTDRecord> = {
    id: "rec-cheer-1",
    package: "GOLD 1:30",
    cheerVoiceover20: false,
    cheerVoiceover40: false,
    rushFeeOption: "none",
    extraSongsQuantity: 0,
    extraSongEditingTimeQuantity: 0,
    price: 850,
  };

  describe("1. Dance Voiceover Removal from MTD Pricing", () => {
    it("Default unselected voiceover has $0 payroll impact in MTD", () => {
      const res = calculateMiscellaneousPayrollAddons(baseDanceRecord);
      assert.equal(res.totalPayrollAddOns, 0);
      assert.equal(res.items.length, 0);
    });

    it("Voiceover options have $0 impact in MTD (Voiceover is internal to Payroll)", () => {
      const rec25 = { ...baseDanceRecord, danceVoiceover: "25" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(rec25).totalPayrollAddOns, 0);

      const rec75 = { ...baseDanceRecord, danceVoiceover: "75" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(rec75).totalPayrollAddOns, 0);

      const rec100 = { ...baseDanceRecord, danceVoiceover: "100" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(rec100).totalPayrollAddOns, 0);
    });
  });

  describe("2. Cheer Voiceover Removal from MTD Pricing", () => {
    it("Cheer voiceover options have $0 impact in MTD (Voiceover is internal to Payroll)", () => {
      const rec20 = { ...baseCheerRecord, cheerVoiceover20: true };
      assert.equal(calculateMiscellaneousPayrollAddons(rec20).totalPayrollAddOns, 0);

      const rec40 = { ...baseCheerRecord, cheerVoiceover40: true };
      assert.equal(calculateMiscellaneousPayrollAddons(rec40).totalPayrollAddOns, 0);

      const recBoth = { ...baseCheerRecord, cheerVoiceover20: true, cheerVoiceover40: true };
      assert.equal(calculateMiscellaneousPayrollAddons(recBoth).totalPayrollAddOns, 0);
    });
  });

  describe("3. Rush Fee State & Mutually Exclusive Pricing", () => {
    it("None rush fee = $0", () => {
      const rec = { ...baseDanceRecord, rushFeeOption: "none" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 0);
    });

    it("Single Rush fee = $150", () => {
      const rec = { ...baseDanceRecord, rushFeeOption: "single" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 150);
      assert.equal(res.items[0].payrollAmount, 150);
      assert.equal(res.items[0].id, "rush_fee");
    });

    it("Double Rush fee = $300", () => {
      const rec = { ...baseDanceRecord, rushFeeOption: "double" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 300);
      assert.equal(res.items[0].payrollAmount, 300);
      assert.equal(res.items[0].id, "rush_fee");
    });

    it("Switching from Single to Double replaces $150 with $300 (no accumulation)", () => {
      const recSingle = { ...baseDanceRecord, rushFeeOption: "single" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(recSingle).totalPayrollAddOns, 150);

      const recDouble = { ...baseDanceRecord, rushFeeOption: "double" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(recDouble).totalPayrollAddOns, 300);

      const recNone = { ...baseDanceRecord, rushFeeOption: "none" as const };
      assert.equal(calculateMiscellaneousPayrollAddons(recNone).totalPayrollAddOns, 0);
    });
  });

  describe("4. Extra Songs & Extra Song Editing Time (Independently Controllable)", () => {
    it("Extra Songs quantity 3 = 3 * $15 = $45", () => {
      const rec = { ...baseDanceRecord, extraSongsQuantity: 3 };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 45);
      assert.equal(res.items[0].payrollAmount, 45);
      assert.equal(res.items[0].id, "extra_songs");
    });

    it("Extra Song Editing Time quantity 3 = 3 * $30 = $90", () => {
      const rec = { ...baseDanceRecord, extraSongEditingTimeQuantity: 3 };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 90);
      assert.equal(res.items[0].payrollAmount, 90);
      assert.equal(res.items[0].id, "extra_song_editing_time");
    });

    it("Extra Songs (qty 2) and Extra Song Time (qty 3) are calculated independently", () => {
      const rec = {
        ...baseDanceRecord,
        extraSongsQuantity: 2,
        extraSongEditingTimeQuantity: 3,
      };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 30 + 90);
    });
  });

  describe("5. Combined Payroll Calculation", () => {
    it("Calculates correct total payroll price with all active add-ons", () => {
      const fullRecord: Partial<MTDRecord> = {
        package: "DANCE MIX",
        danceVoiceover: "75",
        rushFeeOption: "single",
        hasProcessing8ctSheetsAddon: true,
        hasExtend8ctAddon: true,
        extraSongsQuantity: 3,
        extraSongEditingTimeQuantity: 3,
      };

      const res = calculateMiscellaneousPayrollAddons(fullRecord);
      // 150 (Rush) + 50 (8-CS) + 25 (Extend) + 45 (3 Songs) + 90 (3 Editing Time) = 360
      assert.equal(res.totalPayrollAddOns, 360);
    });
  });

  describe("6. NON-NEGOTIABLE INVARIANT: Package Price / Customer Price Must NEVER Change", () => {
    it("Dance order Package Price remains unchanged when all add-ons are applied", () => {
      const basePricing = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
      });

      const addOnPricing = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
        musicAffiliate: "Power Music",
        danceVoiceover: "75",
        rushFeeOption: "double",
        extraSongsQuantity: 4,
        extraSongEditingTimeQuantity: 4,
      });

      // Customer Facing Price MUST be identical!
      assert.equal(addOnPricing.customerFacingPrice, basePricing.customerFacingPrice);

      // Payroll Base Price MUST reflect MTD add-ons (300 rush + 60 songs + 120 editing time)!
      assert.equal(
        addOnPricing.payrollBasePrice,
        basePricing.payrollBasePrice + 300 + 60 + 120
      );
    });

    it("Cheer order Package Price remains unchanged when all add-ons are applied", () => {
      const basePricing = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 1:30",
        musicAffiliate: "Power Music",
      });

      const addOnPricing = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 1:30",
        musicAffiliate: "Power Music",
        cheerVoiceover20: true,
        cheerVoiceover40: true,
        rushFeeOption: "single",
        extraSongsQuantity: 2,
        extraSongEditingTimeQuantity: 2,
      });

      // Customer Facing Price MUST be identical!
      assert.equal(addOnPricing.customerFacingPrice, basePricing.customerFacingPrice);

      // Payroll Base Price MUST reflect MTD add-ons (150 rush fee; extra songs are removed from Cheer)!
      assert.equal(
        addOnPricing.payrollBasePrice,
        basePricing.payrollBasePrice + 150
      );
    });

    it("Gameday PERFORMANCE MIX with Themed VO (+75), 6 Extra Songs (+90), 4 Extra Editing Time (+120) yields $295 MTD Payroll Base Price and $100 Package Price", () => {
      const res = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: "PERFORMANCE MIX",
        musicAffiliate: "Library Music",
        danceVoiceover: "75",
        extraSongsQuantity: 6,
        extraSongEditingTimeQuantity: 4,
      });

      // Base customer price = 100
      assert.equal(res.customerFacingPrice, 100);
      // Base compliant payroll price (85) + 90 + 120 = 295
      assert.equal(res.payrollBasePrice, 295);
    });
  });
});
