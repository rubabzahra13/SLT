import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMTDRecord, isPreMTDOrderRecord, isOrderScheduledAndAssigned } from "../mtd-filters";
import { getOrderDetailSections } from "../order-detail-sections";
import type { MTDRecord, Order } from "../../types";

function makeRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "ord-test-101",
    section: "CHEERLEADING MUSIC",
    assignedProducer: null,
    category: "Cheer",
    editorInitials: "JD",
    programName: "SPIRIT XTREME AS MIGHTY MINI",
    package: "PLATINUM 2:30 NO SPLIT",
    musicTheme: "Power Music Covers",
    price: 1400,
    priceCompliance: "compliant",
    invoice: "",
    mixStartDate: "",
    mixEndDate: "",
    eightCountSheet: "NEED CS",
    haveSongs: "NEED SONGS",
    needsAttention: true,
    status: "active",
    editorRequest: "FA",
    contactName: "Walter Smith",
    ...overrides,
  };
}

describe("Orders Tab & Workflow Separation", () => {
  it("Unassigned and/or unscheduled orders are partitioned into the Orders tab (isPreMTDOrderRecord)", () => {
    const unassignedOrder = makeRecord({ assignedProducer: null, mixStartDate: "", mixEndDate: "" });
    assert.equal(isPreMTDOrderRecord(unassignedOrder), true);
    assert.equal(isMTDRecord(unassignedOrder), false);

    const unscheduledOrder = makeRecord({ assignedProducer: "CM", mixStartDate: "2026-09-10", mixEndDate: "" });
    assert.equal(isPreMTDOrderRecord(unscheduledOrder), true);
    assert.equal(isMTDRecord(unscheduledOrder), false);
  });

  it("Assigned and fully scheduled orders belong in the MTD tab (isMTDRecord)", () => {
    const mtdOrder = makeRecord({
      assignedProducer: "CM",
      mixStartDate: "2026-09-10",
      mixEndDate: "2026-09-17",
    });
    assert.equal(isMTDRecord(mtdOrder), true);
    assert.equal(isPreMTDOrderRecord(mtdOrder), false);
  });

  it("Move to MTD transition: validates assigned editor & dates, updating state without changing order ID", () => {
    const record = makeRecord({
      id: "ord-test-555",
      assignedProducer: null,
      mixStartDate: "",
      mixEndDate: "",
    });

    // Unassigned + unscheduled -> not ready
    assert.equal(isOrderScheduledAndAssigned(record), false);

    // Admin assigns editor & sets dates
    const scheduledRecord: MTDRecord = {
      ...record,
      assignedProducer: "JD",
      mixStartDate: "2026-09-15",
      mixEndDate: "2026-09-22",
    };

    assert.equal(isOrderScheduledAndAssigned(scheduledRecord), true);

    // Admin clicks Move to MTD
    const movedRecord: MTDRecord = {
      ...scheduledRecord,
      inMTD: true,
    };

    // Verify same order ID and state transition
    assert.equal(movedRecord.id, "ord-test-555");
    assert.equal(isMTDRecord(movedRecord), true);
    assert.equal(isPreMTDOrderRecord(movedRecord), false);
    assert.equal(movedRecord.assignedProducer, "JD");
    assert.equal(movedRecord.mixStartDate, "2026-09-15");
    assert.equal(movedRecord.mixEndDate, "2026-09-22");
  });

  it("Orders Detail View contains ONLY customer order form fields, excluding MTD spreadsheet operational fields", () => {
    const orderObj: Order = {
      id: "ord-test-777",
      customerName: "Jane Coach",
      contactName: "Jane Coach",
      programName: "Thunder All-Stars",
      category: "Cheer",
      formType: "school-all-star-cheer",
      package: "GOLD 1:30",
      price: 950,
      status: "new",
      createdAt: "2026-09-01",
      requestedProducer: "FA",
      editorRequest: "FA",
      musicTheme: "Power Music Covers",
      needsAttention: false,
      attentionReason: null,
    };

    const sections = getOrderDetailSections(orderObj);
    assert.ok(sections.length > 0);

    const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
    
    // Order form fields MUST be present
    assert.ok(allFieldKeys.includes("contactName") || allFieldKeys.includes("customerName") || allFieldKeys.includes("gymName"));

    // MTD Operational Spreadsheet fields MUST NOT be present in order form sections
    assert.equal(allFieldKeys.includes("invoiceNumber"), false);
    assert.equal(allFieldKeys.includes("eightCountSheet"), false);
    assert.equal(allFieldKeys.includes("haveSongs"), false);
    assert.equal(allFieldKeys.includes("danceVoiceover"), false);
    assert.equal(allFieldKeys.includes("extraSongsQuantity"), false);
  });
});
