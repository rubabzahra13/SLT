import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NEW_CATEGORIES_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
} from "../../data/new-categories-demo-orders";
import {
  calculateCheerOrderPricing,
  calculateDanceOrderPricing,
  calculateMarchingBandOrderPricing,
  calculateSportsEntertainmentOrderPricing,
  calculateSchoolAnthemOrderPricing,
} from "../pricing-engine";
import { evaluateCouponCode } from "../discount-codes";
import { filterMTDRecords, countMTDByForm } from "../mtd-filters";
import { getPayrollRecords } from "../mtd-completion";
import type { DiscountCode, MTDRecord, Order } from "../../types";

const mockDiscountCodes: DiscountCode[] = [
  { id: "1", code: "SAVE50", discountType: "fixed", discountValue: 50, description: "$50 Off" },
  { id: "2", code: "PROMO10", discountType: "percentage", discountValue: 10, description: "10% Off" },
];

describe("Prompt 11 — Full End-to-End QA and Regression Audit", () => {
  const orderMap = new Map<string, Order>();
  for (const o of NEW_CATEGORIES_DEMO_ORDERS) {
    if (o.id) orderMap.set(o.id, o);
  }

  describe("Part 1: End-to-End QA for Marching Band", () => {
    it("1.1 Filtering: returns only Marching Band orders when form = marching-band", () => {
      const mbRecords = filterMTDRecords(NEW_CATEGORIES_DEMO_MTD_RECORDS, {
        form: "marching-band",
        orderById: orderMap,
      });
      assert.equal(mbRecords.length, 10);
      for (const rec of mbRecords) {
        assert.equal(rec.category, "Marching Band");
      }
    });

    it("1.2 MTD Pricing & Add-on Math: BAND CHANT ($600) + Sheet Music ($50) + Vocals ($75) = $600 Package Price / $725 Payroll Base", () => {
      const result = calculateMarchingBandOrderPricing({
        packageType: "BAND CHANT",
        hasSheetMusicAdd: true,
        hasAddVocals: true,
      });
      assert.equal(result.customerFacingPrice, 600);
      assert.equal(result.payrollBasePrice, 725); // $600 non-compliant base (no affiliate) + $125 add-ons
    });

    it("1.3 Compliance: Surfaces unknown-no-affiliate-field state plainly for Band Chant & Drum Cadence", () => {
      const bc = calculateMarchingBandOrderPricing({ packageType: "BAND CHANT" });
      assert.equal(bc.complianceStatus, "unknown-no-affiliate-field");

      const dc = calculateMarchingBandOrderPricing({ packageType: "DRUM CADENCE ORIGINAL" });
      assert.equal(dc.complianceStatus, "unknown-no-affiliate-field");
    });

    it("1.4 Completion Modal & Coupon: Applies SAVE50 ($50 off) to $600 -> $550 final customer price", () => {
      const result = calculateMarchingBandOrderPricing({
        packageType: "BAND CHANT",
        hasSheetMusicAdd: true,
        hasAddVocals: true,
      });
      const couponEval = evaluateCouponCode("SAVE50", mockDiscountCodes);
      assert.equal(couponEval.status, "valid");

      const discount = couponEval.match?.discountValue || 0;
      const finalPrice = result.customerFacingPrice - discount;
      assert.equal(finalPrice, 550);
    });

    it("1.5 Payroll Transition: Moves to Payroll with $550 customer price", () => {
      const completedRec: MTDRecord = {
        ...NEW_CATEGORIES_DEMO_MTD_RECORDS[0],
        inPayroll: true,
        status: "completed",
        finalCustomerPrice: 550,
        producerPayout: 270,
      };

      const payrollRecords = getPayrollRecords([completedRec]);
      assert.equal(payrollRecords.length, 1);
      assert.equal(payrollRecords[0].finalCustomerPrice, 550);
    });
  });

  describe("Part 2: End-to-End QA for Sports Entertainment", () => {
    it("2.1 Filtering: returns only Sports Entertainment orders when form = sports-entertainment", () => {
      const seRecords = filterMTDRecords(NEW_CATEGORIES_DEMO_MTD_RECORDS, {
        form: "sports-entertainment",
        orderById: orderMap,
      });
      assert.equal(seRecords.length, 10);
      for (const rec of seRecords) {
        assert.equal(rec.category, "Sports Entertainment");
      }
    });

    it("2.2 MTD Pricing & Rush Toggle: PRE-GAME / HALFTIME REMIXED ($250) + Rush ($150) = $250 Package Price / $400 Payroll Base", () => {
      const result = calculateSportsEntertainmentOrderPricing({
        packageType: "PRE-GAME / HALFTIME REMIXED",
        isRushOrder: "yes",
      });
      assert.equal(result.customerFacingPrice, 250);
      assert.equal(result.payrollBasePrice, 400);
      assert.equal(result.hasRushFee, true);
    });

    it("2.3 OTHER TBD Package: blocks automatic pricing, returns isUnpriced = true and null customer price", () => {
      const result = calculateSportsEntertainmentOrderPricing({
        packageType: "OTHER (mixes longer than 2:30)",
      });
      assert.equal(result.isUnpriced, true);
      assert.equal(result.needsManualQuote, true);
      assert.equal(result.customerFacingPrice, null);
      assert.equal(result.payrollBasePrice, null);
    });

    it("2.4 OTHER Manual Quote Completion & Payroll Move: quoted at $450 -> moves to Payroll showing $450", () => {
      const manualQuote = 450;
      const completedRec: MTDRecord = {
        ...NEW_CATEGORIES_DEMO_MTD_RECORDS[9], // OTHER order
        inPayroll: true,
        status: "completed",
        finalCustomerPrice: manualQuote,
        producerPayout: 315,
      };

      const payrollRecords = getPayrollRecords([completedRec]);
      assert.equal(payrollRecords.length, 1);
      assert.equal(payrollRecords[0].finalCustomerPrice, 450);
      assert.notEqual(payrollRecords[0].finalCustomerPrice, 0);
    });
  });

  describe("Part 3: End-to-End QA for School Anthems", () => {
    it("3.1 Filtering: returns only School Anthems orders when form = school-anthem", () => {
      const saRecords = filterMTDRecords(NEW_CATEGORIES_DEMO_MTD_RECORDS, {
        form: "school-anthem",
        orderById: orderMap,
      });
      assert.equal(saRecords.length, 10);
      for (const rec of saRecords) {
        assert.equal(rec.category, "School Anthem");
      }
    });

    it("3.2 Flat Price: returns $1,250 unconditionally across all packages", () => {
      const result = calculateSchoolAnthemOrderPricing({
        packageType: "SCHOOL ANTHEMS",
      });
      assert.equal(result.customerFacingPrice, 1250);
      assert.equal(result.payrollBasePrice, 1250);
    });

    it("3.3 Coupon Integration: applies PROMO10 (10% off $1,250) -> $1,125 final customer price", () => {
      const result = calculateSchoolAnthemOrderPricing({
        packageType: "SCHOOL ANTHEMS",
      });
      const couponEval = evaluateCouponCode("PROMO10", mockDiscountCodes);
      assert.equal(couponEval.status, "valid");

      const discountPct = couponEval.match?.discountValue || 0;
      const discount = Math.round(result.payrollBasePrice * (discountPct / 100));
      assert.equal(discount, 125);
      assert.equal(result.customerFacingPrice - discount, 1125);
    });
  });

  describe("Part 4: Cheer and Dance Regression Pass", () => {
    it("4.1 Cheer Pricing Engine: Rally Mix is priced as a standalone package ($350 Package Price, $350 Payroll Base)", () => {
      const cheerResult = calculateCheerOrderPricing({
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "Rally Mix",
        musicAffiliate: "Power Music",
      });
      assert.equal(cheerResult.customerFacingPrice, 350); // $350 package price
      assert.equal(cheerResult.payrollBasePrice, 350); // $350 payroll base
      assert.equal(cheerResult.complianceStatus, "compliant");
    });

    it("4.2 Dance Pricing Engine: POM CUSTOM ($850) + Traditional VO ($25) + Themed VO ($75) = $850 Package Price, $730 Payroll Base (VO no longer in MTD)", () => {
      const danceResult = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "CUSTOM POM",
        musicAffiliate: "Power Music Covers",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });
      assert.equal(danceResult.customerFacingPrice, 850); // $850 base package price
      assert.equal(danceResult.payrollBasePrice, 730); // $730 base (VO is internal payroll item)
      assert.equal(danceResult.complianceStatus, "compliant");
    });

    it("4.3 Form Counts: counts records by formType without cross-category interference", () => {
      const counts = countMTDByForm(NEW_CATEGORIES_DEMO_MTD_RECORDS, orderMap);
      assert.equal(counts["marching-band"], 10);
      assert.equal(counts["sports-entertainment"], 10);
      assert.equal(counts["school-anthem"], 10);
      assert.equal(counts["school-all-star-cheer"], 0);
      assert.equal(counts["school-all-star-dance"], 0);
    });
  });
});
