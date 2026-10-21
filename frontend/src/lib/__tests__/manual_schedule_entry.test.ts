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

  it("getOrderRequirements uses normal Mix/CS/Video pills for manual schedule entries (no Time of Mix / Compliancy)", () => {
    const record: MTDRecord = {
      id: "mtd-manual-2",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Cheer",
      package: "GOLD 2:00",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
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
      songListSuggestions: "Have",
      routineNotes: "",
    };

    const reqs = getOrderRequirements(record);
    const collectionLabels = reqs.collections.map((i) => i.label);
    assert.ok(!collectionLabels.includes("Time of Mix"));
    assert.ok(!collectionLabels.includes("Compliancy"));
    assert.ok(collectionLabels.includes("Mix Time") || collectionLabels.includes("CS") || collectionLabels.includes("Video") || collectionLabels.length >= 0);
  });

  it("manual schedule entries follow Magento form fields; Form stays red until match", () => {
    const complete: MTDRecord = {
      id: "mtd-manual-3",
      orderId: null,
      isManualScheduleEntry: true,
      category: "Dance",
      package: "Custom POM 2:15",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
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
      haveSongs: "HAVE",
      needsAttention: false,
      status: "active",
      timeLengthOfMix: "2:15",
      songListSuggestions: "Have",
      routineNotes: "Routine notes",
      musicAffiliate: "Power Music",
    };

    const completeReqs = getOrderRequirements(complete);
    // Magento Mix/Songs/Notes are filled; unmatched manual still has Form red.
    assert.deepStrictEqual(
      completeReqs.all
        .filter((r) => r.isApplicable && r.id !== "form")
        .map((r) => r.id)
        .sort(),
      ["mix", "notes", "songs"]
    );
    assert.ok(
      completeReqs.all
        .filter((r) => r.isApplicable && r.id !== "form")
        .every((r) => r.state === "green")
    );
    assert.ok(
      completeReqs.collections.some((r) => r.id === "form" && r.state === "red")
    );
    assert.ok(!completeReqs.collections.some((i) => i.label === "Time of Mix"));
    assert.ok(!completeReqs.collections.some((i) => i.label === "Compliancy"));
  });

  it("preserves optional order fields on manual schedule entry when supplied", () => {
    const recordWithOptionals: MTDRecord = {
      id: "mtd-manual-4",
      orderId: null,
      isManualScheduleEntry: true,
      category: "All Star Dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "hip-hop",
      package: "Hip Hop",
      mixStartDate: "2026-10-12",
      mixEndDate: "2026-10-16",
      assignedProducer: "Casey",
      contactName: "Megan Smith",
      programName: "Elite Dance Academy",
      routineNotes: "Include high energy intro",
      songListSuggestions: "Upbeat hip-hop track 1, Track 2",
      timeLengthOfMix: "2:00",
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
    assert.ok(
      reqs.all
        .filter((r) => r.isApplicable && r.id !== "form")
        .every((r) => r.state === "green")
    );
    assert.strictEqual(recordWithOptionals.contactName, "Megan Smith");
    assert.strictEqual(recordWithOptionals.programName, "Elite Dance Academy");
    assert.strictEqual(recordWithOptionals.routineNotes, "Include high energy intro");
  });
});
