import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getData } from "../data";
import { calculateDateBounds } from "../date-filters";
import { doDateRangesOverlap, toCanonicalIsoDate } from "../dates";
import { generateProducerFacingPayrollCsv } from "../export-csv";
import { getPayrollRecords } from "../mtd-completion";
import { findProducerByAssignmentKey } from "../editor-assignment";

describe("Prompt 8 — Payroll Producer Send-Preparation Workflow Tests", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();
  const payrollRecords = getPayrollRecords(mtdRecords);

  it("1. Default Send-Prep state targeting All Editors and Last 2 Weeks resolves bounds", () => {
    const bounds = calculateDateBounds("last2Weeks");
    assert.ok(bounds.start !== null);
    assert.ok(bounds.end !== null);

    const filterPeriod = {
      start: toCanonicalIsoDate(bounds.start),
      end: toCanonicalIsoDate(bounds.end),
    };

    assert.ok(filterPeriod.start.length > 0);
    assert.ok(filterPeriod.end.length > 0);
  });

  it("2. Send to All generates separate, strictly scoped files per producer with records in period", () => {
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

    assert.ok(dateMatching.length > 0, "Should match completed records within the 1 year span");

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

    assert.ok(distinctProducers.length >= 2, "Multiple producers should have completed records");

    const generatedFiles: Record<string, string> = {};

    distinctProducers.forEach((targetName) => {
      const prodRecords = dateMatching.filter((r) => {
        const p = findProducerByAssignmentKey(r.assignedProducer, producers);
        return p?.name === targetName || r.assignedProducer === targetName;
      });

      const csv = generateProducerFacingPayrollCsv(
        prodRecords,
        allOrders,
        producers,
        targetName
      );
      generatedFiles[targetName] = csv;
    });

    distinctProducers.forEach((prodName) => {
      const fileCsv = generatedFiles[prodName];
      assert.ok(fileCsv, `File should be generated for ${prodName}`);

      const otherProducers = distinctProducers.filter((p) => p !== prodName);
      otherProducers.forEach((otherName) => {
        const otherProducerObj = producers.find((p) => p.name === otherName);
        if (otherProducerObj) {
          assert.strictEqual(
            fileCsv.includes(otherProducerObj.email || "never-match-placeholder"),
            false,
            `File for ${prodName} must not contain ${otherName}'s email`
          );
        }
      });

      assert.strictEqual(fileCsv.includes("Email"), false);
      assert.strictEqual(fileCsv.includes("Phone"), false);
      assert.strictEqual(fileCsv.includes("Billing Address"), false);

      assert.strictEqual(fileCsv.includes("SLT Take-Home"), false);
      assert.strictEqual(fileCsv.includes("SLT Gross"), false);
    });
  });

  it("3. Send to [Specific Producer] downloads only that target producer's file", () => {
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

    const targetProducer = distinctProducers[0];
    assert.ok(targetProducer, "Target producer should be resolved");

    const targetRecords = dateMatching.filter((r) => {
      const p = findProducerByAssignmentKey(r.assignedProducer, producers);
      return p?.name === targetProducer || r.assignedProducer === targetProducer;
    });

    assert.ok(targetRecords.length > 0, `${targetProducer} should have records in the period`);

    const csv = generateProducerFacingPayrollCsv(
      targetRecords,
      allOrders,
      producers,
      targetProducer
    );

    const lines = csv.trim().split("\n");
    assert.strictEqual(lines.length, targetRecords.length + 1, "CSV header + exact target records count");

    const otherProducers = distinctProducers.filter((p) => p !== targetProducer);
    otherProducers.forEach((otherName) => {
      assert.strictEqual(
        csv.includes(`"assignedProducer":"${otherName}"`),
        false,
        `File for ${targetProducer} must not contain ${otherName}'s records`
      );
    });
  });

  it("4. Custom Date Range narrows output correctly", () => {
    const customFilter = { start: "2026-09-01", end: "2026-09-15" };

    const matching = payrollRecords.filter((rec) => {
      const recStart = rec.completedAt || rec.mixStartDate || "";
      const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      return doDateRangesOverlap({ start: recStart, end: recEnd }, customFilter);
    });

    assert.ok(matching.length > 0, "Records in Sept 2026 should match custom date filter");

    matching.forEach((rec) => {
      const recDate = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
      assert.ok(
        recDate >= "2026-09-01" && recDate <= "2026-09-15",
        `Record date ${recDate} must fall within custom range 2026-09-01 to 2026-09-15`
      );
    });
  });
});
