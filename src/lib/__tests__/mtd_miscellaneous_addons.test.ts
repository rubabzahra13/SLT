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

  describe("1. Dance Voiceover Pricing & State", () => {
    it("Default unselected voiceover has $0 payroll impact", () => {
      const res = calculateMiscellaneousPayrollAddons(baseDanceRecord);
      assert.equal(res.totalPayrollAddOns, 0);
      assert.equal(res.items.length, 0);
    });

    it("Traditional (+$25) voiceover adds $25 to payroll", () => {
      const rec = { ...baseDanceRecord, danceVoiceover: "25" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 25);
      assert.equal(res.items[0].payrollAmount, 25);
      assert.equal(res.items[0].id, "dance_vo_25");
    });

    it("Themed (+$75) voiceover adds $75 to payroll", () => {
      const rec = { ...baseDanceRecord, danceVoiceover: "75" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 75);
      assert.equal(res.items[0].payrollAmount, 75);
      assert.equal(res.items[0].id, "dance_vo_75");
    });

    it("Both (+$100) voiceover adds $100 to payroll", () => {
      const rec = { ...baseDanceRecord, danceVoiceover: "100" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 100);
      assert.equal(res.items[0].payrollAmount, 100);
      assert.equal(res.items[0].id, "dance_vo_100");
    });
  });

  describe("2. Cheer Voiceover Pricing & Independent Selection", () => {
    it("No cheer voiceover selected", () => {
      const res = calculateMiscellaneousPayrollAddons(baseCheerRecord);
      assert.equal(res.totalPayrollAddOns, 0);
    });

    it("$20 Cheer Voiceover option selected", () => {
      const rec = { ...baseCheerRecord, cheerVoiceover20: true };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 20);
      assert.equal(res.items[0].payrollAmount, 20);
      assert.equal(res.items[0].id, "cheer_vo_20");
    });

    it("$40 Cheer Voiceover option selected", () => {
      const rec = { ...baseCheerRecord, cheerVoiceover40: true };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 40);
      assert.equal(res.items[0].payrollAmount, 40);
      assert.equal(res.items[0].id, "cheer_vo_40");
    });

    it("Both $20 and $40 Cheer Voiceover options selected for $60 total", () => {
      const rec = { ...baseCheerRecord, cheerVoiceover20: true, cheerVoiceover40: true };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 60);
      assert.equal(res.items.length, 2);
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
      assert.equal(res.items[0].id, "rush_fee_single");
    });

    it("Double Rush fee = $300", () => {
      const rec = { ...baseDanceRecord, rushFeeOption: "double" as const };
      const res = calculateMiscellaneousPayrollAddons(rec);
      assert.equal(res.totalPayrollAddOns, 300);
      assert.equal(res.items[0].payrollAmount, 300);
      assert.equal(res.items[0].id, "rush_fee_double");
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
      // 75 (VO) + 150 (Rush) + 50 (8-CS) + 25 (Extend) + 45 (3 Songs) + 90 (3 Editing Time) = 435
      assert.equal(res.totalPayrollAddOns, 435);
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

      // Payroll Base Price MUST reflect add-ons!
      assert.equal(
        addOnPricing.payrollBasePrice,
        basePricing.payrollBasePrice + 75 + 300 + 60 + 120
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

      // Payroll Base Price MUST reflect add-ons! (20 + 40 + 150 + 30 + 60 = 300)
      assert.equal(
        addOnPricing.payrollBasePrice,
        basePricing.payrollBasePrice + 300
      );
    });

    it("Gameday PERFORMANCE MIX with Themed VO (+75), 6 Extra Songs (+90), 4 Extra Editing Time (+120) yields $370 Payroll Price and $100 Package Price", () => {
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
      // Base compliant payroll price (85) + 75 + 90 + 120 = 370
      assert.equal(res.payrollBasePrice, 370);
    });
  });
});
