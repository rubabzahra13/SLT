import { describe, it } from "node:test";
import assert from "node:assert";
import { getOrderRequirements } from "../order-requirements";
import type { MTDRecord } from "../../types";

describe("Manual Schedule Entry (No Order) Workflow Tests", () => {
  it("creates a valid manual schedule entry with orderId = null and isManualScheduleEntry = true", () => {
    const record: MTDRecord = {
      id: "mtd-manual-1",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Dance",
      package: "Hip Hop",
      mixStartDate: "2026-09-28",
      mixEndDate: "2026-10-02",
      assignedProducer: "Casey",
      section: "All Star Dance",
      editorRequest: "NA",
      contactName: "",
      editorInitials: "",
      programName: "",
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
      songListSuggestions: "",
      routineNotes: "",
    };

    assert.strictEqual(record.orderId, null);
    assert.strictEqual(record.isManualScheduleEntry, true);
    assert.strictEqual(record.category, "All Star Dance");
    assert.strictEqual(record.package, "Hip Hop");
    assert.strictEqual(record.assignedProducer, "Casey");
    assert.strictEqual(record.mixStartDate, "2026-09-28");
    assert.strictEqual(record.mixEndDate, "2026-10-02");
  });

  it("getOrderRequirements returns 0 missing fields and neutral white status for manual schedule entries", () => {
    const record: MTDRecord = {
      id: "mtd-manual-2",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Cheer",
      package: "VIROC",
      mixStartDate: "2026-09-28",
      mixEndDate: "2026-10-02",
      assignedProducer: "Producer A",
      section: "All Star Cheer",
      editorRequest: "NA",
      contactName: "",
      editorInitials: "",
      programName: "",
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
      songListSuggestions: "",
      routineNotes: "",
    };

    const reqs = getOrderRequirements(record);

    assert.strictEqual(reqs.missingCount, 0, "Manual schedule entries must have missingCount = 0");
    assert.strictEqual(reqs.allMet, true, "Manual schedule entries must be allMet = true");

    // Check that all requirement badges display neutral "white" status and NOT red/yellow
    reqs.all.forEach((item) => {
      assert.strictEqual(
        item.status,
        "white",
        `Requirement item ${item.id} should have neutral 'white' status`
      );
    });
  });

  it("classifies manual schedule entry into 'Need to be Scheduled' and excludes it from 'Waiting for Data'", () => {
    const record: MTDRecord = {
      id: "mtd-manual-3",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Dance",
      package: "POM",
      mixStartDate: "2026-10-05",
      mixEndDate: "2026-10-09",
      assignedProducer: "Casey",
      section: "All Star Dance",
      editorRequest: "NA",
      contactName: "",
      editorInitials: "",
      programName: "",
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
    };

    const reqs = getOrderRequirements(record);

    // Filters check
    const isWaitingForData = !record.isReassigned && reqs.missingCount > 0;
    const isNeedToBeScheduled = !record.isReassigned && reqs.missingCount === 0;

    assert.strictEqual(isWaitingForData, false, "Manual schedule entry must NOT be Waiting for Data");
    assert.strictEqual(isNeedToBeScheduled, true, "Manual schedule entry MUST be Need to be Scheduled");
  });

  it("preserves optional order fields on manual schedule entry when supplied", () => {
    const recordWithOptionals: MTDRecord = {
      id: "mtd-manual-4",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Dance",
      package: "Hip Hop",
      mixStartDate: "2026-10-12",
      mixEndDate: "2026-10-16",
      assignedProducer: "Casey",
      contactName: "Megan Smith",
      programName: "Elite Dance Academy",
      routineNotes: "Include high energy intro",
      songListSuggestions: "Upbeat hip-hop track 1, Track 2",
      section: "All Star Dance",
      editorRequest: "NA",
      editorInitials: "",
      musicTheme: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
    };

    const reqs = getOrderRequirements(recordWithOptionals);
    assert.strictEqual(reqs.missingCount, 0);
    assert.strictEqual(recordWithOptionals.contactName, "Megan Smith");
    assert.strictEqual(recordWithOptionals.programName, "Elite Dance Academy");
    assert.strictEqual(recordWithOptionals.routineNotes, "Include high energy intro");
  });
});
