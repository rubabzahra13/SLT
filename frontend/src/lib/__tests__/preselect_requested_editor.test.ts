import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Producer } from "../../types";
import { pickDefaultEditor } from "../editor-assignment";

function createMockProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "prod-ns",
    name: "Nabiha Shafiq",
    initials: "NS",
    email: "ns@example.com",
    avatar: "",
    color: "#000000",
    categories: ["All-Star Cheer"],
    status: "available",
    nextAvailable: "Today",
    mixesThisWeek: 0,
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    extraDays: [],
    timeOff: [],
    maxMixesPerDay: 1,
    maxProducerCostPerDay: 5000,
    notes: "",
    ...overrides,
  } as Producer;
}

function createMockTodayProducer(initials: string, name: string): Producer {
  return createMockProducer({
    id: `prod-${initials.toLowerCase()}`,
    name,
    initials,
    maxMixesPerDay: 5,
  });
}

describe("Requested editor is suggestion only (no auto-assign)", () => {
  const cm = createMockTodayProducer("CM", "Casey Marlow");
  const ns = createMockProducer({ initials: "NS", name: "Nabiha Shafiq", maxMixesPerDay: 1 });
  const producers = [cm, ns];

  it("Does not auto-select a specific requested editor", () => {
    const newRecord: MTDRecord = {
      id: "rec-new-1",
      orderId: "ord-new-1",
      section: "CHEERLEADING MUSIC",
      editorRequest: "NS",
      musicTheme: "Pop",
      programName: "Varsity Spirit",
      category: "All-Star Cheer",
      package: "Platinum",
      assignedProducer: null,
      mixStartDate: "2026-09-21",
      mixEndDate: "2026-09-28",
      status: "active",
      recordStatus: "Ongoing",
      eightCountSheet: "CS REC",
      haveSongs: "SONGS REC",
      needsAttention: false,
      price: 1000,
      priceCompliance: "compliant",
      invoice: "INV-2",
      editorInitials: "Coach",
      contactName: "Coach",
    };

    const pick = pickDefaultEditor(newRecord, producers, [], []);
    assert.equal(pick.editor, "");
    assert.equal(pick.requestedEditor, "NS");
    assert.equal(pick.reason, "first_available");
  });

  it("Does not auto-select when editorRequest is FA", () => {
    const faRecord: MTDRecord = {
      id: "rec-fa-1",
      orderId: "ord-fa-1",
      section: "CHEERLEADING MUSIC",
      editorRequest: "FA",
      musicTheme: "Pop",
      programName: "Varsity Spirit",
      category: "All-Star Cheer",
      package: "Platinum",
      assignedProducer: null,
      mixStartDate: "2026-09-21",
      mixEndDate: "2026-09-28",
      status: "active",
      recordStatus: "Ongoing",
      eightCountSheet: "CS REC",
      haveSongs: "SONGS REC",
      needsAttention: false,
      price: 1000,
      priceCompliance: "compliant",
      invoice: "INV-3",
      editorInitials: "Coach",
      contactName: "Coach",
    };

    const pick = pickDefaultEditor(faRecord, producers, [], []);
    assert.equal(pick.editor, "");
    assert.equal(pick.reason, "first_available");
  });

  it("Keeps an already-assigned producer", () => {
    const assigned: MTDRecord = {
      id: "rec-a-1",
      orderId: "ord-a-1",
      section: "CHEERLEADING MUSIC",
      editorRequest: "NS",
      musicTheme: "Pop",
      programName: "Varsity Spirit",
      category: "All-Star Cheer",
      package: "Platinum",
      assignedProducer: "CM",
      mixStartDate: "2026-09-21",
      mixEndDate: "2026-09-28",
      status: "active",
      recordStatus: "Ongoing",
      eightCountSheet: "CS REC",
      haveSongs: "SONGS REC",
      needsAttention: false,
      price: 1000,
      priceCompliance: "compliant",
      invoice: "INV-4",
      editorInitials: "CM",
      contactName: "Coach",
    };

    const pick = pickDefaultEditor(assigned, producers, [], []);
    assert.equal(pick.editor, "CM");
    assert.equal(pick.reason, "assigned");
  });
});
