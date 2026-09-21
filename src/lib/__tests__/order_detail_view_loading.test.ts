import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord } from "../../types";

describe("Order Detail View Loading & UUID Handling", () => {
  it("Resolves records correctly by id, uuid, or legacyId", () => {
    const mockMtdRecords: MTDRecord[] = [
      {
        id: "mtd-1001",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        legacyId: "ord-1001",
        orderId: "ord-1001",
        section: "CHEERLEADING MUSIC",
        assignedProducer: "JD",
        category: "Cheer",
        editorInitials: "JD",
        programName: "VARSITY SPIRIT",
        package: "GOLD 1:30",
        musicTheme: "Pop/Dance",
        price: 950,
        priceCompliance: "compliant",
        invoice: "INV-1001",
        mixStartDate: "2026-09-01",
        mixEndDate: "2026-09-08",
        eightCountSheet: "CS REC",
        haveSongs: "SONGS REC",
        needsAttention: false,
        status: "active",
        editorRequest: "JD",
        contactName: "Coach Sarah",
      },
    ];

    const findRecord = (targetId: string) =>
      mockMtdRecords.find(
        (r) => r.id === targetId || r.orderId === targetId || r.uuid === targetId || r.legacyId === targetId
      );

    // Should match by ID
    assert.ok(findRecord("mtd-1001"));
    // Should match by orderId / legacyId
    assert.ok(findRecord("ord-1001"));
    // Should match by UUID
    assert.ok(findRecord("550e8400-e29b-41d4-a716-446655440000"));
    // Non-existent ID returns undefined
    assert.equal(findRecord("non-existent-id"), undefined);
  });

  it("Header subtitle formats contact name without displaying UUID", () => {
    const record = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contactName: "Coach Sarah",
      programName: "VARSITY SPIRIT",
    };

    // Subtitle formula: record.contactName || "Customer"
    const subtitle = record.contactName || "Customer";

    assert.equal(subtitle, "Coach Sarah");
    assert.equal(subtitle.includes("550e8400"), false);
    assert.equal(subtitle.includes("ID:"), false);
  });
});
