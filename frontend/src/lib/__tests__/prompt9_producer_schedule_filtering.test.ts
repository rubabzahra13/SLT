import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getData } from "../data";
import { doDateRangesOverlap } from "../dates";
import { generateScheduleCsv } from "../export-csv";
import { findProducerByAssignmentKey } from "../editor-assignment";

describe("Prompt 9 — Producer Schedule Filtering & Individual Download Tests", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();

  it("1. Generating schedule CSV for 'All Editors' returns records across assigned producers", () => {
    const csv = generateScheduleCsv(mtdRecords, allOrders, producers, "all");
    assert.ok(csv.length > 0, "Schedule CSV should be non-empty");

    const lines = csv.trim().split("\n");
    assert.ok(lines.length > 1, "Should contain header + rows");
    assert.ok(lines[0].includes("Mix Start Date"));
    assert.ok(lines[0].includes("Producer"));
  });

  it("2. Generating schedule CSV for Producer 1 (Nick) contains only Nick's mixes", () => {
    const targetProducer = "Nick";
    const csv = generateScheduleCsv(mtdRecords, allOrders, producers, targetProducer);
    assert.ok(csv.length > 0);

    const lines = csv.trim().split("\n");
    const header = lines[0];
    const rowLines = lines.slice(1);

    assert.ok(header.includes("Mix Start Date"));

    rowLines.forEach((row) => {
      // Producer column is column index 2
      assert.ok(row.includes("Nick"), `Row must belong to Nick: ${row}`);
      assert.strictEqual(row.includes("Andrea"), false, `Row must not contain Andrea's schedule`);
    });
  });

  it("3. Generating schedule CSV for Producer 2 (Andrea) contains only Andrea's mixes", () => {
    const targetProducer = "Andrea";
    const csv = generateScheduleCsv(mtdRecords, allOrders, producers, targetProducer);
    assert.ok(csv.length > 0);

    const lines = csv.trim().split("\n");
    const rowLines = lines.slice(1);

    rowLines.forEach((row) => {
      assert.ok(row.includes("Andrea"), `Row must belong to Andrea: ${row}`);
      assert.strictEqual(row.includes("Nick"), false, `Row must not contain Nick's schedule`);
    });
  });

  it("4. Multi-day mix range overlap filtering correctly includes overlapping mixes", () => {
    // Test date window spanning Sept 10 to Sept 20, 2026
    const filterPeriod = { start: "2026-09-10", end: "2026-09-20" };

    const csv = generateScheduleCsv(mtdRecords, allOrders, producers, "all", filterPeriod);
    const lines = csv.trim().split("\n");
    const rowLines = lines.slice(1);

    rowLines.forEach((row) => {
      // Verify dates in row overlap filterPeriod
      const columns = row.split(",");
      const startDate = columns[0].replace(/"/g, "");
      const endDate = columns[1].replace(/"/g, "");

      const overlaps = doDateRangesOverlap(
        { start: startDate, end: endDate },
        filterPeriod
      );
      assert.ok(
        overlaps,
        `Mix range ${startDate} - ${endDate} must overlap filter period 2026-09-10 - 2026-09-20`
      );
    });
  });
});
