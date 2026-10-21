import assert from "node:assert";
import { test, describe } from "node:test";
import { getOrderRequirements } from "../order-requirements";
import { buildCollectionEmailDraft } from "../collection-email";
import { stagingRecordFromOrder } from "../order-staging";
import { transformOrder, type BackendOrder } from "../api/orders";
import type { Order } from "../../types";

const baseOrderProps = {
  musicTheme: "",
  editorRequest: "FA",
  requestedProducer: "",
  attentionReason: null,
};

describe("Bug Fix Verification: Persistence & Magento Collections", () => {
  describe("Bug 1: Toggle Persistence & Status Transitions", () => {
    test("collectionStates and orderStatus transform correctly from backend to frontend Order", () => {
      const backendOrder: BackendOrder = {
        id: "order-uuid-1",
        customer_name: "Test Customer",
        contact_name: "Test Contact",
        program_name: "Test Program",
        category: "Cheer",
        package: "SILVER",
        price: 500,
        status: "active",
        created_at: new Date().toISOString(),
        needs_attention: false,
        is_past_order: false,
        collection_states: { cs: false },
        order_status: "Waiting for Data",
      };

      const order = transformOrder(backendOrder);
      assert.deepStrictEqual(order.collectionStates, { cs: false });
      assert.strictEqual(order.orderStatus, "Waiting for Data");

      const syntheticRecord = stagingRecordFromOrder(order);
      assert.deepStrictEqual(syntheticRecord.collectionStates, { cs: false });

      const reqs = getOrderRequirements(order);
      assert.strictEqual(reqs.isWaitingForData, true);
      assert.strictEqual(reqs.status, "Missing Data");
    });

    test("Toggling CS from GREEN to RED updates status to Missing Data", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-2",
        customerName: "Test Gym",
        contactName: "Coach",
        programName: "Cheer Team",
        category: "Cheer",
        package: "PLATINUM 2:30",
        price: 800,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        songListSuggestions: "Song 1, Song 2",
        sendingEightCountSheets: "Yes",
        routineNotes: "Routine notes",
        collectionStates: { cs: false },
      };

      const reqs = getOrderRequirements(order);
      const csItem = reqs.collections.find((i) => i.id === "cs");
      assert.ok(csItem, "CS requirement item must exist when form says Yes");
      assert.strictEqual(csItem.state, "red");
      assert.strictEqual(reqs.status, "Missing Data");
      assert.ok(
        !reqs.collections.some((i) => i.id === "video" && i.isApplicable),
        "Video is never a Magento board pill"
      );
    });

    test("All Magento fields filled updates status to Complete data", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-3",
        customerName: "Test Gym",
        contactName: "Coach",
        programName: "Cheer Team",
        category: "Cheer",
        package: "PLATINUM 2:30",
        price: 800,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        timeLengthOfMix: "2:30",
        songListSuggestions: "Song 1, Song 2",
        sendingEightCountSheets: "Yes",
        routineNotes: "Routine notes",
        eightCountSheet: "HAVE CS",
        collectionStates: { cs: true },
      };

      const reqs = getOrderRequirements(order);
      assert.strictEqual(reqs.status, "Complete data");
      assert.strictEqual(reqs.missingCount, 0);
    });
  });

  describe("Bug 2: Music Affiliate is form data, not a Compliancy board pill", () => {
    test("When Music Affiliate is populated, Compliancy is NOT in missing-data email", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-dance-1",
        customerName: "Dance Studio",
        contactName: "Coach Jane",
        programName: "Dance Team",
        category: "Dance",
        package: "DANCE CUSTOM POM",
        price: 600,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        musicAffiliate: "ASCAP",
        timeLengthOfMix: "2:00",
        powerMusicCovers: "Song A, Song B",
        routineNotes: "Notes",
        coachEmail: "coach@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        false,
        "Compliancy must NOT appear — Magento has no Compliancy board pill"
      );
    });

    test("When Music Affiliate is empty, Compliancy still is NOT a board collection item", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-dance-3",
        customerName: "Dance Studio 3",
        contactName: "Coach Bob",
        programName: "Dance Team 3",
        category: "Dance",
        package: "DANCE CUSTOM POM",
        price: 600,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        musicAffiliate: "",
        timeLengthOfMix: "2:00",
        powerMusicCovers: "Song X, Song Y",
        routineNotes: "Notes",
        coachEmail: "coach3@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach3@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        false,
        "Empty Music Affiliate must not invent a Compliancy board pill"
      );
    });

    test("When Music Affiliate is whitespace-only, Compliancy still is NOT requested", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-dance-4",
        customerName: "Dance Studio 4",
        contactName: "Coach Alice",
        programName: "Dance Team 4",
        category: "Dance",
        package: "DANCE CUSTOM POM",
        price: 600,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        musicAffiliate: "   ",
        timeLengthOfMix: "2:00",
        powerMusicCovers: "Song X, Song Y",
        routineNotes: "Notes",
        coachEmail: "coach4@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach4@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        false,
        "Whitespace Music Affiliate must not invent a Compliancy board pill"
      );
    });
  });
});
