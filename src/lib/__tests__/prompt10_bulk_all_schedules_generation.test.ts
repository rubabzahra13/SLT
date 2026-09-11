import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getData } from "../data";
import { generateScheduleCsv, isEligibleProducerScheduleRecord } from "../export-csv";
import { findProducerByAssignmentKey } from "../editor-assignment";

describe("Prompt 10 — Bulk All Schedules Generation Tests", () => {
  const { mtdRecords, orders: allOrders, producers } = getData();

  it("1. Bulk generation produces one distinct schedule file per producer with scheduled mixes", () => {
    const distinctProducers = Array.from(
      new Set(
        mtdRecords
          .filter(isEligibleProducerScheduleRecord)
          .map((r) => {
            if (!r.assignedProducer) return null;
            const p = findProducerByAssignmentKey(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
          })
          .filter(Boolean) as string[]
      )
    );

    assert.ok(distinctProducers.length >= 3, "Expected at least 3 producers with scheduled mixes in seed data");

    const generatedFiles: Record<string, string> = {};

    // Simulate bulk generation loop (reusing Prompt 9's generateScheduleCsv)
    distinctProducers.forEach((targetName) => {
      const csv = generateScheduleCsv(
        mtdRecords,
        allOrders,
        producers,
        targetName
      );
      generatedFiles[targetName] = csv;
    });

    // Verify each generated file count and content
    assert.strictEqual(
      Object.keys(generatedFiles).length,
      distinctProducers.length,
      "One file generated per producer"
    );

    distinctProducers.forEach((prodName) => {
      const fileCsv = generatedFiles[prodName];
      assert.ok(fileCsv, `File for ${prodName} must exist`);

      const lines = fileCsv.trim().split("\n");
      assert.ok(lines.length > 1, `File for ${prodName} must contain header and rows`);

      // Verify zero cross-producer contamination in rows
      const otherProducers = distinctProducers.filter((p) => p !== prodName);
      const rowLines = lines.slice(1);

      rowLines.forEach((row) => {
        // Must belong to target producer
        assert.ok(
          row.includes(prodName),
          `Row in ${prodName}'s file must belong to ${prodName}: ${row}`
        );

        // Must not contain any other producer's name
        otherProducers.forEach((otherName) => {
          assert.strictEqual(
            row.includes(`"${otherName}"`),
            false,
            `File for ${prodName} must not contain ${otherName}'s schedule row`
          );
        });
      });
    });
  });

  it("2. Verifies at least 3 specific generated producer files for strict isolation", () => {
    const testProducers = ["Nick", "Andrea", "Megan"];
    const generatedFiles: Record<string, string> = {};

    testProducers.forEach((producerName) => {
      const csv = generateScheduleCsv(mtdRecords, allOrders, producers, producerName);
      generatedFiles[producerName] = csv;
    });

    testProducers.forEach((targetName) => {
      const csv = generatedFiles[targetName];
      assert.ok(csv.length > 0, `CSV for ${targetName} must not be empty`);

      const otherNames = testProducers.filter((name) => name !== targetName);
      const rows = csv.trim().split("\n").slice(1);

      rows.forEach((row) => {
        otherNames.forEach((otherName) => {
          assert.strictEqual(
            row.includes(otherName),
            false,
            `Schedule file for ${targetName} contains unexpected data from ${otherName}`
          );
        });
      });
    });
  });
});
