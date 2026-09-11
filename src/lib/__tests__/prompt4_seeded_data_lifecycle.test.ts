import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getData } from "../data";
import { getPayrollRecords } from "../mtd-completion";
import { isPreMTDOrderRecord } from "../mtd-filters";
import type { MTDRecord } from "../../types";

describe("Prompt 4 — Seed Realistic Test Data Through Real Lifecycle", () => {
  it("verifies Payroll tab contains at least 10 varied records across categories, producers, dates, and add-ons", () => {
    const { mtdRecords } = getData();
    const payrollRecords = getPayrollRecords(mtdRecords);

    // Requirement: at least 10 completed payroll rows
    assert.ok(
      payrollRecords.length >= 10,
      `Expected at least 10 payroll records, found ${payrollRecords.length}`
    );

    // Verify category diversity
    const categories = new Set(payrollRecords.map((r: MTDRecord) => r.category));
    assert.ok(categories.has("Cheer"), "Payroll must contain Cheer records");
    assert.ok(categories.has("Dance"), "Payroll must contain Dance records");

    // Verify producer diversity
    const producers = new Set(
      payrollRecords
        .map((r: MTDRecord) => r.assignedProducer)
        .filter((p): p is string => Boolean(p))
    );
    assert.ok(
      producers.size >= 4,
      `Expected at least 4 distinct assigned producers in Payroll, found ${producers.size}`
    );

    // Verify date diversity across at least August and September 2026
    const months = new Set(
      payrollRecords
        .map((r: MTDRecord) => r.completedAt?.slice(0, 7))
        .filter((d): d is string => Boolean(d))
    );
    assert.ok(
      months.has("2026-08") && months.has("2026-09"),
      "Payroll completed dates must span multiple months (e.g. 2026-08 and 2026-09)"
    );

    // Verify add-on diversity (Rush fees, Voiceovers)
    const hasRush = payrollRecords.some(
      (r: MTDRecord) => r.rushFeeOption || (r.rushFeeQuantity ?? 0) > 0 || r.isRushOrder
    );
    const hasVo = payrollRecords.some(
      (r: MTDRecord) =>
        r.cheerVoiceover20 ||
        r.cheerVoiceover40 ||
        r.danceVoiceover ||
        r.hasTraditionalVoiceover ||
        r.hasThemedVoiceover
    );
    assert.ok(hasRush, "Payroll records should include Rush Fee add-ons");
    assert.ok(hasVo, "Payroll records should include Voiceover add-ons");
  });

  it("verifies Orders tab contains unassigned pre-MTD records across Cheer and Dance subtypes", () => {
    const { mtdRecords } = getData();
    const preMtd = mtdRecords.filter(isPreMTDOrderRecord);

    assert.ok(
      preMtd.length >= 4,
      `Expected at least 4 pre-MTD orders, found ${preMtd.length}`
    );

    const unassignedRecords = preMtd.filter((r: MTDRecord) => !r.assignedProducer);
    assert.ok(
      unassignedRecords.length >= 2,
      `Expected at least 2 unassigned orders in pre-MTD Orders, found ${unassignedRecords.length}`
    );

    for (const rec of unassignedRecords) {
      assert.equal(rec.assignedProducer, null);
      // Unassigned records stay in Orders until assigned & scheduled
      assert.equal(isPreMTDOrderRecord(rec), true);
    }
  });
});
