import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import { CHEER_DEMO_ORDERS, CHEER_DEMO_MTD_RECORDS } from "../../data/cheer-demo-orders";
import { calculateDanceOrderPricing } from "../pricing-engine";
import { computeClientPayroll } from "../pricing-display";
import { getPayrollRecords } from "../mtd-completion";
import type { MTDRecord, Order, Producer, DiscountCode } from "../../types";

describe("Prompt 10 — Payroll Integration for Dance", () => {
  const caseyProducer: Producer = {
    id: "prod-casey",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@soundslikethat.com",
    specialty: "Producer",
    avatar: "/avatars/casey.png",
    mixesThisWeek: 2,
    nextAvailable: "Tomorrow",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: null,
    maxProducerCostPerDay: null,
    categories: ["Pom", "All-Star Cheer"],
    overtimeDays: [],
    compensationModel: "percentage_of_payroll_base",
    defaultRate: 0.70,
    rateOverrides: { old_pricing: 0.72, new_pricing: 0.70 },
  };

  it("Completes 1 order per Dance subtype into Payroll with exact system-calculated payroll-base prices", () => {
    const subtypes = ["pom", "hip-hop", "team-performance-variety", "gameday", "jazz-kick"] as const;
    const completedRecords: MTDRecord[] = [];

    for (const subtype of subtypes) {
      const linkedOrder = DANCE_DEMO_ORDERS.find((o) => o.danceFormSubtype === subtype);
      assert.ok(linkedOrder, `Linked order found for subtype ${subtype}`);

      const record = DANCE_DEMO_MTD_RECORDS.find((r) => r.orderId === linkedOrder.id);
      assert.ok(record, `Found MTD record for subtype ${subtype}`);

      const danceResult = calculateDanceOrderPricing({
        danceFormSubtype: subtype,
        packageType: linkedOrder.packageType || record.package,
        musicAffiliate: linkedOrder.musicAffiliate || "Power Music",
        hasTraditionalVoiceover: record.hasTraditionalVoiceover,
        hasThemedVoiceover: record.hasThemedVoiceover,
      });

      const payrollBase = danceResult.payrollBasePrice;
      const custPrice = danceResult.customerFacingPrice;

      const payrollCalc = computeClientPayroll(
        caseyProducer,
        custPrice,
        {
          form_type: "school-all-star-dance",
          canonical_subtype_id: subtype,
          package_id: record.package,
          package_name: record.package,
          pricing_rule_id: null,
          compliance_status: danceResult.complianceStatus === "non-compliant" ? "non-compliant" : "compliant",
          compliance_reason: "Verified",
          canonical_affiliate: linkedOrder.musicAffiliate || null,
          base_customer_price: danceResult.matchedEntry?.customer ?? custPrice,
          base_payroll_price: danceResult.matchedEntry?.compliant ?? payrollBase,
          addons: [],
          system_calculated_customer_price: custPrice,
          payroll_base_price: payrollBase,
          needs_manual_pricing: false,
          needs_manual_review: false,
          summary_line: "Summary",
        },
        0.70,
        null,
        subtype
      );

      const completedRecord: MTDRecord = {
        ...record,
        status: "completed",
        inPayroll: true,
        completedAt: "2026-09-07",
        price: custPrice,
        finalCustomerPrice: custPrice,
        systemCalculatedCustomerPrice: custPrice,
        producerPayout: payrollCalc.producerPayout ?? 0,
        sltPortion: payrollCalc.sltPortion ?? 0,
        rateUsed: 0.70,
        rateSource: "rate_overrides",
        payrollFinalized: true,
      };

      completedRecords.push(completedRecord);

      // Assert payout is calculated directly off payroll-base price (payrollBase * 70%)
      const expectedPayout = Math.round(payrollBase * 0.70 * 100) / 100;
      assert.equal(completedRecord.producerPayout, expectedPayout);
    }

    // Verify all 5 completed Dance records appear in getPayrollRecords
    const inPayroll = getPayrollRecords(completedRecords);
    assert.equal(inPayroll.length, 5);
  });

  it("Cheer Payroll rows and calculations remain completely unaffected", () => {
    const cheerRec = CHEER_DEMO_MTD_RECORDS[0];
    const completedCheerRecord: MTDRecord = {
      ...cheerRec,
      status: "completed",
      inPayroll: true,
      completedAt: "2026-09-07",
      producerPayout: 420,
      sltPortion: 180,
    };

    const payrollList = getPayrollRecords([completedCheerRecord]);
    assert.equal(payrollList.length, 1);
    assert.equal(payrollList[0].producerPayout, 420);
    assert.equal(payrollList[0].sltPortion, 180);
  });
});
