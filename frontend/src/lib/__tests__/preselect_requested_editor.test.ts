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
    specialty: "All-Star Cheer",
    categories: ["All-Star Cheer"],
    status: "available",
    nextAvailable: "Today",
    mixesThisWeek: 0,
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    overtimeDays: [],
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

describe("Preselect Requested Editor (BUG 3)", () => {
  const cm = createMockTodayProducer("CM", "Casey Marlow");
  const ns = createMockProducer({ initials: "NS", name: "Nabiha Shafiq", maxMixesPerDay: 1 });
  const producers = [cm, ns];

  it("Default selection prioritizes specific requested editor NS even if NS is booked until a future date", () => {
    // NS is booked on an active mix from Sep 21 to Sep 24
    const activeMixes: MTDRecord[] = [
      {
        id: "rec-ns-1",
        orderId: "ord-ns-1",
        section: "CHEERLEADING MUSIC",
        editorRequest: "NS",
        musicTheme: "Pop",
        programName: "Cheer Athletics",
        category: "All-Star Cheer",
        package: "Platinum",
        assignedProducer: "NS",
        mixStartDate: "2026-09-21",
        mixEndDate: "2026-09-24",
        status: "active",
        recordStatus: "Ongoing",
        eightCountSheet: "CS REC",
        haveSongs: "SONGS REC",
        needsAttention: false,
        price: 1000,
        priceCompliance: "compliant",
        invoice: "INV-1",
        editorInitials: "NS",
        contactName: "Coach",
      },
    ];

    // New unassigned record with requested editor NS
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

    const pick = pickDefaultEditor(newRecord, producers, activeMixes, []);
    assert.equal(pick.editor, "NS", "pickDefaultEditor must select requested editor NS by default");
    assert.equal(pick.reason, "requested_busy");
  });

  it("Default selection uses first available editor (CM) when editorRequest is FA", () => {
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
    assert.equal(pick.editor, "CM", "pickDefaultEditor must return first available editor CM for FA request");
    assert.equal(pick.reason, "first_available");
  });
});
