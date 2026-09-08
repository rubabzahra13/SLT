/**
 * Tests for multi-category producer support, capacity limits (mix count + cost),
 * and assignment eligibility.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  orderCategoryToProducerCategory,
  producerSupportsCategory,
  getProducersForCategory,
} from "../editor-assignment";
import {
  countProducerMixesOnDay,
  countProducerDailyCost,
  isProducerUnderDailyCapacity,
  isProducerUnderDailyCostCapacity,
  isProducerAtDailyCapacity,
} from "../producer-availability";
import type { MTDRecord, Producer } from "../../types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "p1",
    name: "Test Producer",
    initials: "TP",
    email: "test@test.com",
    categories: ["All-Star Cheer"],
    specialty: "All-Star Cheer",
    avatar: "",
    mixesThisWeek: 0,
    nextAvailable: "TBD",
    status: "available",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: null,
    maxProducerCostPerDay: null,
    overtimeDays: [],
    compensationModel: null,
    defaultRate: null,
    ratesByCategory: null,
    rateOverrides: null,
    manualInputFields: null,
    notes: null,
    ...overrides,
  };
}

function makeRecord(
  id: string,
  assignedProducer: string,
  producerPayout: number = 0,
  startDate = "2026-09-10",
  endDate = "2026-09-14"
): MTDRecord {
  return {
    id,
    section: "ACTIVE MIXES",
    assignedProducer,
    category: "Cheer",
    editorRequest: "FA",
    contactName: "Test",
    editorInitials: "TP",
    programName: `Mix ${id}`,
    package: "GOLD",
    musicTheme: "",
    price: 500,
    priceCompliance: "compliant",
    invoice: "",
    mixStartDate: startDate,
    mixEndDate: endDate,
    eightCountSheet: "HAVE CS",
    haveSongs: "HAVE",
    needsAttention: false,
    status: "active",
    producerPayout,
  };
}

// ---------------------------------------------------------------------------
// 1. orderCategoryToProducerCategory — form/subtype mapping
// ---------------------------------------------------------------------------

describe("orderCategoryToProducerCategory", () => {
  it("all-star-cheer subtype → All-Star Cheer", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-cheer", "all-star-cheer"), "All-Star Cheer");
  });

  it("school-cheer-viroc-yes → School Cheer", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-cheer", "school-cheer-viroc-yes"), "School Cheer");
  });

  it("school-cheer-viroc-no → School Cheer", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-cheer", "school-cheer-viroc-no"), "School Cheer");
  });

  it("youth-rec-cheer → Youth Rec Cheer", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-cheer", "youth-rec-cheer"), "Youth Rec Cheer");
  });

  it("pom → Pom", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-dance", "pom"), "Pom");
  });

  it("hip-hop → Hip Hop", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-dance", "hip-hop"), "Hip Hop");
  });

  it("team-performance-variety → Team Performance / Variety", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-dance", "team-performance-variety"), "Team Performance / Variety");
  });

  it("gameday → Gameday", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-dance", "gameday"), "Gameday");
  });

  it("jazz-kick → Jazz / Kick", () => {
    assert.equal(orderCategoryToProducerCategory("school-all-star-dance", "jazz-kick"), "Jazz / Kick");
  });

  it("marching-band form → Marching Band", () => {
    assert.equal(orderCategoryToProducerCategory("marching-band", undefined), "Marching Band");
  });

  it("sports-entertainment form → Sports Entertainment", () => {
    assert.equal(orderCategoryToProducerCategory("sports-entertainment", undefined), "Sports Entertainment");
  });

  it("school-anthem form → School Anthem", () => {
    assert.equal(orderCategoryToProducerCategory("school-anthem", undefined), "School Anthem");
  });

  it("legacy 'Cheer' → All-Star Cheer", () => {
    assert.equal(orderCategoryToProducerCategory(undefined, undefined, "Cheer"), "All-Star Cheer");
  });

  it("legacy 'Dance' → Pom", () => {
    assert.equal(orderCategoryToProducerCategory(undefined, undefined, "Dance"), "Pom");
  });
});

// ---------------------------------------------------------------------------
// 2. producerSupportsCategory
// ---------------------------------------------------------------------------

describe("producerSupportsCategory", () => {
  it("returns true when producer has the required category", () => {
    const p = makeProducer({ categories: ["All-Star Cheer", "School Cheer"] });
    assert.equal(producerSupportsCategory(p, "All-Star Cheer"), true);
    assert.equal(producerSupportsCategory(p, "School Cheer"), true);
  });

  it("returns false when producer does not have the required category", () => {
    const p = makeProducer({ categories: ["Pom", "Gameday"] });
    assert.equal(producerSupportsCategory(p, "Hip Hop"), false);
    assert.equal(producerSupportsCategory(p, "Marching Band"), false);
  });

  it("returns true when requiredCategory is empty", () => {
    const p = makeProducer({ categories: ["Pom"] });
    assert.equal(producerSupportsCategory(p, ""), true);
    assert.equal(producerSupportsCategory(p, "all"), true);
  });

  it("falls back to specialty when categories array is empty", () => {
    const p = makeProducer({ categories: [], specialty: "Marching Band" });
    assert.equal(producerSupportsCategory(p, "Marching Band"), true);
    assert.equal(producerSupportsCategory(p, "Pom"), false);
  });

  it("Hip Hop producer is not eligible for All-Star Cheer", () => {
    const p = makeProducer({ categories: ["Hip Hop", "Gameday", "Sports Entertainment"] });
    assert.equal(producerSupportsCategory(p, "All-Star Cheer"), false);
    assert.equal(producerSupportsCategory(p, "Hip Hop"), true);
    assert.equal(producerSupportsCategory(p, "Gameday"), true);
  });
});

// ---------------------------------------------------------------------------
// 3. getProducersForCategory
// ---------------------------------------------------------------------------

describe("getProducersForCategory", () => {
  const producers: Producer[] = [
    makeProducer({ id: "p1", name: "Casey", initials: "CM", categories: ["Pom", "All-Star Cheer", "School Cheer", "Youth Rec Cheer"] }),
    makeProducer({ id: "p2", name: "Brent", initials: "BV", categories: ["Marching Band"] }),
    makeProducer({ id: "p3", name: "Max", initials: "MT", categories: ["Hip Hop", "Gameday", "Sports Entertainment"] }),
    makeProducer({ id: "p4", name: "Rory", initials: "RF", categories: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday", "Hip Hop"] }),
  ];

  it("Hip Hop returns only producers who support Hip Hop", () => {
    const result = getProducersForCategory(producers, "Hip Hop");
    const initials = result.map((p) => p.initials).sort();
    assert.deepEqual(initials, ["MT", "RF"]);
  });

  it("Marching Band returns only Brent", () => {
    assert.equal(getProducersForCategory(producers, "Marching Band").length, 1);
    assert.equal(getProducersForCategory(producers, "Marching Band")[0].initials, "BV");
  });

  it("Pom returns Casey and Rory but not Brent", () => {
    const result = getProducersForCategory(producers, "Pom");
    const initials = result.map((p) => p.initials);
    assert.ok(initials.includes("CM"));
    assert.ok(initials.includes("RF"));
    assert.ok(!initials.includes("BV"));
  });

  it("legacy 'Cheer' string maps to All-Star Cheer and returns Casey", () => {
    const result = getProducersForCategory(producers, "Cheer");
    assert.ok(result.some((p) => p.initials === "CM"));
  });
});

// ---------------------------------------------------------------------------
// 4. Mix count capacity
// ---------------------------------------------------------------------------

describe("Mix count capacity", () => {
  const today = new Date(2026, 8, 10); // Sep 10

  it("no limit → always under capacity", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: null });
    const records = [makeRecord("r1", "TP", 200)];
    assert.equal(isProducerUnderDailyCapacity(p, today, records), true);
  });

  it("under limit → under capacity", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 4 });
    const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
    assert.equal(isProducerUnderDailyCapacity(p, today, records), true);
  });

  it("at limit → over capacity", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 2 });
    const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
    assert.equal(isProducerUnderDailyCapacity(p, today, records), false);
  });

  it("excludeRecordId is respected", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 2 });
    const records = [makeRecord("r1", "TP", 200), makeRecord("r2", "TP", 200)];
    assert.equal(isProducerUnderDailyCapacity(p, today, records, "r2"), true);
  });
});

// ---------------------------------------------------------------------------
// 5. Cost capacity
// ---------------------------------------------------------------------------

describe("Cost capacity", () => {
  const today = new Date(2026, 8, 10);

  it("no limit → always under capacity", () => {
    const p = makeProducer({ initials: "TP", maxProducerCostPerDay: null });
    const records = [makeRecord("r1", "TP", 9999)];
    assert.equal(isProducerUnderDailyCostCapacity(p, today, records), true);
  });

  it("countProducerDailyCost sums payout for covering records", () => {
    const p = makeProducer({ initials: "TP" });
    const records = [makeRecord("r1", "TP", 400), makeRecord("r2", "TP", 600)];
    assert.equal(countProducerDailyCost(p, today, records), 1000);
  });

  it("under limit → under capacity", () => {
    const p = makeProducer({ initials: "TP", maxProducerCostPerDay: 2000 });
    const records = [makeRecord("r1", "TP", 500)];
    assert.equal(isProducerUnderDailyCostCapacity(p, today, records), true);
  });

  it("at limit → over capacity", () => {
    const p = makeProducer({ initials: "TP", maxProducerCostPerDay: 1000 });
    const records = [makeRecord("r1", "TP", 500), makeRecord("r2", "TP", 500)];
    assert.equal(isProducerUnderDailyCostCapacity(p, today, records), false);
  });
});

// ---------------------------------------------------------------------------
// 6. isProducerAtDailyCapacity — combined
// ---------------------------------------------------------------------------

describe("isProducerAtDailyCapacity", () => {
  const today = new Date(2026, 8, 10);

  it("returns false when no limits configured", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: null, maxProducerCostPerDay: null });
    const records = [makeRecord("r1", "TP", 999)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), false);
  });

  it("returns true when mix count limit reached", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 1, maxProducerCostPerDay: null });
    const records = [makeRecord("r1", "TP", 100)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), true);
  });

  it("returns true when cost limit reached", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: null, maxProducerCostPerDay: 500 });
    const records = [makeRecord("r1", "TP", 500)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), true);
  });

  it("returns true when cost reached before mix count limit", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 6, maxProducerCostPerDay: 1000 });
    // 2 mixes but cost already $1000
    const records = [makeRecord("r1", "TP", 500), makeRecord("r2", "TP", 500)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), true);
  });

  it("returns true when mix count reached before cost limit", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 2, maxProducerCostPerDay: 10000 });
    // 2 mixes = at mix limit, cost only $200
    const records = [makeRecord("r1", "TP", 100), makeRecord("r2", "TP", 100)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), true);
  });

  it("returns false when both limits set but neither reached", () => {
    const p = makeProducer({ initials: "TP", maxMixesPerDay: 4, maxProducerCostPerDay: 2000 });
    const records = [makeRecord("r1", "TP", 400)];
    assert.equal(isProducerAtDailyCapacity(p, today, records), false);
  });
});
