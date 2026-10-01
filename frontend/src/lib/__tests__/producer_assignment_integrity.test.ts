/**
 * Comprehensive Unit and Regression Tests for Producer Roster Specializations,
 * Assignment Eligibility, Requested Editor Data Preservation, and Demo Seeding Correctness.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import data from "../../data/mock-data.json";
import { CHEER_DEMO_ORDERS, CHEER_DEMO_MTD_RECORDS } from "../../data/cheer-demo-orders";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import {
  NEW_CATEGORIES_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
  MARCHING_BAND_DEMO_MTD_RECORDS,
  SCHOOL_ANTHEMS_DEMO_MTD_RECORDS,
} from "../../data/new-categories-demo-orders";
import {
  findProducerByAssignmentKey,
  getProducersForCategory,
  getSuggestedEditors,
  orderCategoryToProducerCategory,
  producerSupportsCategory,
  resolveSeederAssignment,
  resolveValidProducerAssignment,
  seedAssignedProducerForOrder,
} from "../editor-assignment";
import type { Producer } from "../../types";

import { normalizeProducer } from "../producers";

const producers = (data.producers as unknown as Producer[]).map((p) =>
  normalizeProducer(p)
);

describe("Producer Roster Multi-Category Specializations (BUG 1)", () => {
  it("normalizes legacy single-category or specialty producer records to full canonical array", () => {
    const caseyLegacy = normalizeProducer({
      id: "prod-1",
      name: "Casey",
      initials: "CM",
      categories: ["Cheer"],
      specialty: "Cheer",
    });
    assert.deepEqual(caseyLegacy.categories, [
      "Pom",
      "School Cheer",
      "All-Star Cheer",
      "Youth Rec Cheer",
    ]);
  });
  it("verifies every producer in the roster has the exact canonical specializations", () => {
    const expectedMap: Record<string, string[]> = {
      CM: ["Pom", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
      MS: ["School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
      NC: ["School Cheer", "Youth Rec Cheer"],
      MM: ["Pom", "Team Performance / Variety", "School Cheer", "All-Star Cheer", "Youth Rec Cheer"],
      BV: ["Marching Band"],
      SS: ["Pom", "Team Performance / Variety", "Jazz / Kick", "Gameday", "Sports Entertainment", "Youth Rec Cheer"],
      AJ: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
      LV: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday"],
      RF: ["Pom", "Jazz / Kick", "Team Performance / Variety", "Gameday", "Hip Hop"],
      JM: ["Pom", "Gameday"],
      JOP: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
      GP: ["Pom", "Gameday"],
      JD: ["Pom", "Gameday", "School Cheer", "Youth Rec Cheer"],
      JP: ["Pom", "Gameday", "Jazz / Kick", "Team Performance / Variety"],
      MT: ["Hip Hop", "Gameday", "Sports Entertainment"],
      CC: ["Hip Hop", "Gameday", "Sports Entertainment"],
      JB: ["Hip Hop", "Gameday", "Sports Entertainment"],
    };

    for (const [initials, expectedCats] of Object.entries(expectedMap)) {
      const p = findProducerByAssignmentKey(initials, producers);
      assert.ok(p, `Producer with initials ${initials} must exist in roster`);
      assert.deepEqual(
        p.categories,
        expectedCats,
        `Producer ${p.name} (${initials}) categories mismatch`
      );
    }
  });

  it("verifies multi-category assignment eligibility filtering", () => {
    // Hip Hop: Rory (RF), Max (MT), Chris (CC), Joe (JB)
    const hipHopProducers = getProducersForCategory(producers, "Hip Hop").map((p) => p.initials);
    assert.ok(hipHopProducers.includes("RF"));
    assert.ok(hipHopProducers.includes("MT"));
    assert.ok(hipHopProducers.includes("CC"));
    assert.ok(hipHopProducers.includes("JB"));
    assert.ok(!hipHopProducers.includes("CM"), "Casey should not be in Hip Hop");

    // All-Star Cheer: Casey (CM), Matt (MS), Mark (MM), Riley (R)
    const cheerProducers = getProducersForCategory(producers, "All-Star Cheer").map((p) => p.initials);
    assert.ok(cheerProducers.includes("CM"));
    assert.ok(cheerProducers.includes("MS"));
    assert.ok(cheerProducers.includes("MM"));
    assert.ok(!cheerProducers.includes("BV"), "Brent should not be in Cheer");
  });
});

describe("Demo MTD Editor Assignments & Requested Editor Separation (BUG 2)", () => {
  it("preserves Requested Editor values and does not globally set them to FA", () => {
    // Specific requested producers in demo orders should be preserved
    const specificRequests = CHEER_DEMO_ORDERS.filter(
      (o) => o.requestedProducer && o.requestedProducer !== "FA"
    );
    assert.ok(
      specificRequests.length > 0,
      "Seeded demo orders must contain specific requested producers (not all FA)"
    );

    const caOrder = CHEER_DEMO_ORDERS.find((o) => o.id === "ord-demo-cheer-01");
    assert.equal(caOrder?.requestedProducer, "CASEY");
    assert.equal(caOrder?.editorRequest, "CM");
  });

  it("populates actual Editor assignments with a realistic distribution of valid producers", () => {
    const allDemoMtdRecords = [
      ...CHEER_DEMO_MTD_RECORDS,
      ...DANCE_DEMO_MTD_RECORDS,
      ...NEW_CATEGORIES_DEMO_MTD_RECORDS,
    ];

    const assignedSet = new Set(
      allDemoMtdRecords.map((r) => r.assignedProducer).filter(Boolean)
    );

    // Verify multiple different producers are assigned across demo MTD records (not just CM!)
    assert.ok(assignedSet.size > 5, "Actual Editor assignments must be distributed across multiple producers");
    assert.ok(assignedSet.has("CM"), "CM should be among assigned editors");
    assert.ok(assignedSet.has("MS") || assignedSet.has("MM"), "MS or MM should be among assigned editors");
  });

  it("ensures getSuggestedEditors returns available editors for every category so Assign Producer modal has suggestions", () => {
    const categories = [
      "All-Star Cheer",
      "School Cheer",
      "Youth Rec Cheer",
      "Pom",
      "Hip Hop",
      "Team Performance / Variety",
      "Gameday",
      "Jazz / Kick",
      "Marching Band",
      "Sports Entertainment",
      "School Anthem",
    ];
    for (const cat of categories) {
      const suggestions = getSuggestedEditors([], producers, [], cat);
      assert.ok(
        suggestions.length > 0,
        `Category ${cat} must have at least 1 suggested available editor`
      );
    }
  });

  it("full dataset audit: 0 invalid producer assignments across all records in system", () => {
    const allRecords = [
      ...CHEER_DEMO_MTD_RECORDS,
      ...DANCE_DEMO_MTD_RECORDS,
      ...NEW_CATEGORIES_DEMO_MTD_RECORDS,
      ...data.mtdRecords,
    ];

    for (const rec of allRecords) {
      if (rec.assignedProducer !== null && rec.assignedProducer !== undefined) {
        const producer = findProducerByAssignmentKey(rec.assignedProducer, producers);
        assert.ok(
          producer,
          `Assigned editor "${rec.assignedProducer}" in MTD record ${rec.id} must resolve to a real producer`
        );
        assert.ok(
          producerSupportsCategory(producer, rec.category),
          `Producer ${producer.name} (${rec.assignedProducer}) must support category "${rec.category}" for MTD record ${rec.id}`
        );
      }
    }
  });
});
