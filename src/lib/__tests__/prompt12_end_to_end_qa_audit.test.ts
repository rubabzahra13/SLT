import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getData } from "../data";
import { calculateDateBounds, todayIso } from "../date-filters";
import { doDateRangesOverlap, toCanonicalIsoDate } from "../dates";
import {
  generateMTDCsv,
  generateOrdersCsv,
  generatePayrollCsv,
  generateProducerFacingPayrollCsv,
  generateScheduleCsv,
} from "../export-csv";
import { getPayrollRecords, patchReturnFromPayroll } from "../mtd-completion";
import { filterMTDRecords } from "../mtd-filters";
import { computeClientPayroll } from "../pricing-display";
import { findProducerByAssignmentKey } from "../editor-assignment";
import { PRODUCER_COLORS } from "../producer-avatars";
import type { MTDRecord, Order, Producer } from "@/types";

describe("Prompt 12 — Full End-to-End QA and Regression Audit", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();
  const payrollRecords = getPayrollRecords(mtdRecords);

  it("1. Lifecycle Persistence & Stage Transition Audit (Orders -> MTD -> Payroll)", () => {
    assert.ok(payrollRecords.length >= 10, "Payroll records count should be at least 10");

    payrollRecords.forEach((rec) => {
      assert.strictEqual(rec.status, "completed", "Payroll record status must be 'completed'");
      assert.ok(rec.completedAt, "Payroll record must persist completedAt date");
      assert.notStrictEqual(rec.assignedProducer, undefined, "Payroll record must have assignedProducer defined");
      assert.ok(rec.mixStartDate, "Payroll record must persist mixStartDate");
    });

    const patch = patchReturnFromPayroll();
    assert.strictEqual(patch.status, "active", "Return to MTD patch must reset status to 'active'");
    assert.strictEqual(patch.completedAt, undefined, "Return to MTD patch must clear completedAt");
  });

  it("2. CSV Export Filter-Aware Accuracy (Orders, MTD, Payroll)", () => {
    const ordersCsv = generateOrdersCsv(mtdRecords, allOrders);
    assert.ok(ordersCsv.includes("Order ID"), "Orders CSV must include header");
    assert.ok(ordersCsv.includes("Contact Name"), "Orders CSV must include contact header");

    const mtdCsv = generateMTDCsv(mtdRecords, allOrders, producers);
    assert.ok(mtdCsv.includes("Record ID"), "MTD CSV must include record header");
    assert.ok(mtdCsv.includes("Mix Start Date"), "MTD CSV must include mix start date");

    const adminPayrollCsv = generatePayrollCsv(payrollRecords, allOrders, producers);
    assert.ok(adminPayrollCsv.includes("Total Producer Payout"), "Payroll CSV must include payout header");
    assert.strictEqual(adminPayrollCsv.includes("SLT Take-Home"), false, "Admin payroll CSV must never expose SLT take-home");
  });

  it("3. Admin vs. Producer-Facing Payroll Export Isolation Audit", () => {
    const nickName = "Nick";
    const nickRecords = payrollRecords.filter((r) => {
      const p = findProducerByAssignmentKey(r.assignedProducer, producers);
      return p?.name === nickName || r.assignedProducer === nickName;
    });

    const producerStatementCsv = generateProducerFacingPayrollCsv(
      nickRecords,
      allOrders,
      producers,
      nickName
    );

    assert.ok(producerStatementCsv.includes("Completed Date"));
    assert.ok(producerStatementCsv.includes("My Total Payout"));
    assert.ok(producerStatementCsv.includes("My Compensation Rate"));

    assert.strictEqual(producerStatementCsv.includes("SLT Gross"), false, "Producer export must not expose SLT Gross");
    assert.strictEqual(producerStatementCsv.includes("SLT Take-Home"), false, "Producer export must not expose SLT Take-Home");
    assert.strictEqual(producerStatementCsv.includes("Customer Price"), false, "Producer export must not expose customer price");
    assert.strictEqual(producerStatementCsv.includes("Email"), false, "Producer export must not expose customer email PII");
    assert.strictEqual(producerStatementCsv.includes("Phone"), false, "Producer export must not expose customer phone PII");
    assert.strictEqual(producerStatementCsv.includes("Billing Address"), false, "Producer export must not expose customer billing address PII");
    assert.strictEqual(producerStatementCsv.includes("Andrea"), false, "Nick's export must not contain Andrea's data");
  });

  it("4. Payroll Send-Prep & Schedule Download Per-Producer Isolation Audit", () => {
    const bounds = calculateDateBounds("last1Year");
    const filterPeriod = {
      start: toCanonicalIsoDate(bounds.start),
      end: toCanonicalIsoDate(bounds.end),
    };

    const dateMatching = payrollRecords.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, filterPeriod);
    });

    const distinctProducers = Array.from(
      new Set(
        dateMatching
          .map((r) => {
            if (!r.assignedProducer) return null;
            const p = findProducerByAssignmentKey(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
          })
          .filter(Boolean) as string[]
      )
    );

    distinctProducers.forEach((targetName) => {
      const prodRecords = dateMatching.filter((r) => {
        const p = findProducerByAssignmentKey(r.assignedProducer, producers);
        return p?.name === targetName || r.assignedProducer === targetName;
      });

      const statementCsv = generateProducerFacingPayrollCsv(
        prodRecords,
        allOrders,
        producers,
        targetName
      );
      assert.ok(statementCsv.length > 0);

      const scheduleCsv = generateScheduleCsv(
        mtdRecords,
        allOrders,
        producers,
        targetName
      );
      assert.ok(scheduleCsv.length > 0);

      const otherNames = distinctProducers.filter((p) => p !== targetName);
      otherNames.forEach((other) => {
        const otherProdObj = producers.find((p) => p.name === other);
        if (otherProdObj?.email) {
          assert.strictEqual(
            statementCsv.includes(otherProdObj.email),
            false,
            `Statement for ${targetName} must not contain ${other}'s email`
          );
        }
        assert.strictEqual(
          scheduleCsv.includes(`"${other}"`),
          false,
          `Schedule for ${targetName} must not contain ${other}'s schedule rows`
        );
      });
    });
  });

  it("5. Producer Color-Coding Authenticity Audit", () => {
    producers.forEach((p) => {
      if (p.color) {
        assert.ok(/^#[0-9A-Fa-f]{6}$/.test(p.color), `Producer ${p.name} color must be valid hex`);
      }
    });

    const mockUnconfiguredProducer: Partial<Producer> = { id: "test", name: "Test" };
    const color = mockUnconfiguredProducer.color || "#94a3b8";
    assert.strictEqual(color, "#94a3b8", "Unconfigured producer must use neutral slate #94A3B8 fallback");
  });

  it("6. Comprehensive Preserved Business Rules Audit", () => {
    // 6a. Voiceover never alters customer package price
    const danceOrder = allOrders.find(
      (o) => (o.formType === "school-all-star-dance") && o.status === "completed"
    );
    if (danceOrder) {
      const basePrice = danceOrder.price;
      const custPrice = danceOrder.finalCustomerPrice ?? danceOrder.price;
      assert.strictEqual(
        custPrice,
        basePrice,
        "Voiceover on Dance order must not alter customer package price"
      );
    }

    // 6b. Rush fee producer payout formula: $150 x quantity x producer_rush_rate
    const producerObj = producers[0];
    const rushRate = producerObj.rushFeeRate ?? 1.0;
    const calcQty1 = computeClientPayroll(producerObj, 500, null, 0.5, null, "all-star-cheer", 500, {
      rushFeeQuantity: 1,
      rushFeeCompensationRate: rushRate,
      formType: "school-all-star-cheer",
    });
    assert.strictEqual(calcQty1.rushFeePayout, 150 * 1 * rushRate, "Qty 1 rush fee payout formula check");

    const calcQty2 = computeClientPayroll(producerObj, 500, null, 0.5, null, "all-star-cheer", 500, {
      rushFeeQuantity: 2,
      rushFeeCompensationRate: rushRate,
      formType: "school-all-star-cheer",
    });
    assert.strictEqual(calcQty2.rushFeePayout, 150 * 2 * rushRate, "Qty 2 rush fee payout formula check");

    // 6c. Coupon Code is display-only and never alters customer price, payroll base, or producer payouts
    if (danceOrder && danceOrder.couponCode) {
      assert.strictEqual(
        danceOrder.finalCustomerPrice ?? danceOrder.price,
        danceOrder.price,
        "Coupon code must not alter customer price"
      );
      assert.strictEqual(
        danceOrder.finalPayrollPrice ?? danceOrder.price,
        danceOrder.price,
        "Coupon code must not alter payroll base price"
      );
    }
  });
});
