import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMissingDataMailFieldGroups } from "../forward-order-mail";
import { buildCollectionEmailDraft } from "../collection-email";
import { getOrderRequirements } from "../order-requirements";
import type { MTDRecord, Order } from "../../types";

function baseRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "mtd-1",
    orderId: "ord-1",
    section: "CHEERLEADING MUSIC",
    assignedProducer: null,
    category: "Cheer",
    editorRequest: "FA",
    contactName: "Coach",
    editorInitials: "FA",
    programName: "Test Gym",
    package: "Gold 2:00",
    musicTheme: "",
    price: 100,
    priceCompliance: "compliant",
    invoice: "",
    mixStartDate: "",
    eightCountSheet: "",
    haveSongs: "",
    needsAttention: true,
    status: "active",
    timeLengthOfMix: "",
    songListSuggestions: "",
    ...overrides,
  } as MTDRecord;
}

function missingLabels(record: MTDRecord, linked?: Order | null): string[] {
  return buildMissingDataMailFieldGroups(record, linked).flatMap((g) =>
    g.fields.map((f) => f.label)
  );
}

describe("Missing-data Form checklist", () => {
  it("includes COMPLETED ORDER FORM only for unmatched manual orders", () => {
    const manual = baseRecord({
      isManualScheduleEntry: true,
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
    });
    const labels = missingLabels(manual, {
      id: "ord-1",
      isManualEntry: true,
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      customerSongs: "",
      additionalNotes: "",
    } as Order);

    assert.ok(labels.includes("COMPLETED ORDER FORM"));
    assert.ok(
      getOrderRequirements(manual).collections.some((r) => r.id === "form")
    );
  });

  it("omits COMPLETED ORDER FORM for normal Magento form orders", () => {
    const magento = baseRecord({
      isManualScheduleEntry: false,
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      songListSuggestions: "",
    });
    const linked = {
      id: "ord-1",
      isManualEntry: false,
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      customerSongs: "",
      additionalNotes: "",
    } as Order;

    const labels = missingLabels(magento, linked);
    assert.ok(!labels.includes("COMPLETED ORDER FORM"));
    assert.ok(
      !getOrderRequirements(magento).collections.some((r) => r.id === "form")
    );
    // Other missing items can still appear.
    assert.ok(labels.includes("TIME OF MIX") || labels.includes("A LIST OF SONGS"));
  });

  it("omits COMPLETED ORDER FORM for matched / overwritten manuals", () => {
    const matched = baseRecord({
      isManualScheduleEntry: true,
      mergedFormOrderId: "form-99",
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
    });
    const linked = {
      id: "ord-1",
      isManualEntry: false,
      mergedFormOrderId: "form-99",
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "",
      customerSongs: "",
      additionalNotes: "",
    } as Order;

    assert.ok(!missingLabels(matched, linked).includes("COMPLETED ORDER FORM"));
    assert.ok(
      !getOrderRequirements(
        { ...matched, mergedFormOrderId: "form-99" } as MTDRecord
      ).collections.some((r) => r.id === "form")
    );
  });

  it("collection email draft includes Form wording only for unmatched manuals", () => {
    const manual = baseRecord({
      isManualScheduleEntry: true,
      formType: "sports-entertainment",
      category: "Sports Entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
    });
    const manualDraft = buildCollectionEmailDraft(
      manual,
      { id: "ord-1", isManualEntry: true } as Order,
      "coach@example.com"
    );
    assert.ok(
      manualDraft.missingItems.some((line) =>
        line.startsWith("COMPLETED ORDER FORM")
      )
    );

    const magentoDraft = buildCollectionEmailDraft(
      baseRecord({
        isManualScheduleEntry: false,
        formType: "sports-entertainment",
        category: "Sports Entertainment",
        package: "PRE-GAME / HALFTIME REMIXED",
        timeLengthOfMix: "",
      }),
      { id: "ord-1", isManualEntry: false } as Order,
      "coach@example.com"
    );
    assert.ok(
      !magentoDraft.missingItems.some((line) =>
        line.startsWith("COMPLETED ORDER FORM")
      )
    );
  });
});
