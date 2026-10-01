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

describe("Bug Fix Verification: Persistence & Compliancy Collection Logic", () => {
  describe("Bug 1: Toggle Persistence & Status Transitions", () => {
    test("collectionStates and orderStatus transform correctly from backend to frontend Order", () => {
      const backendOrder: BackendOrder = {
        id: "order-uuid-1",
        legacy_id: "order-1",
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
        collection_states: { video: false },
        order_status: "Waiting for Data",
      };

      const order = transformOrder(backendOrder);
      assert.deepStrictEqual(order.collectionStates, { video: false });
      assert.strictEqual(order.orderStatus, "Waiting for Data");

      const syntheticRecord = stagingRecordFromOrder(order);
      assert.deepStrictEqual(syntheticRecord.collectionStates, { video: false });

      const reqs = getOrderRequirements(order);
      assert.strictEqual(reqs.isWaitingForData, true);
      assert.strictEqual(reqs.status, "Waiting for Data");
    });

    test("Toggling a field from GREEN to RED updates status to Waiting for Data", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-2",
        customerName: "Test Gym",
        contactName: "Coach",
        programName: "Cheer Team",
        category: "Cheer",
        package: "PLATINUM",
        price: 800,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-cheer",
        songListSuggestions: "Song 1, Song 2",
        sendingEightCountSheets: "Yes",
        routineNotes: "Video link attached: http://video.com",
        collectionStates: { video: false }, // User toggled video to RED
      };

      const reqs = getOrderRequirements(order);
      const videoItem = reqs.collections.find((i) => i.id === "video");
      assert.ok(videoItem, "Video requirement item must exist");
      assert.strictEqual(videoItem.state, "red");
      assert.strictEqual(reqs.status, "Waiting for Data");
    });

    test("Toggling all fields to GREEN updates status to Need to be Scheduled", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-3",
        customerName: "Test Gym",
        contactName: "Coach",
        programName: "Cheer Team",
        category: "Cheer",
        package: "PLATINUM",
        price: 800,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-cheer",
        songListSuggestions: "Song 1, Song 2",
        sendingEightCountSheets: "Yes",
        routineNotes: "http://video.com",
        collectionStates: { video: true, songs: true, cs: true },
      };

      const reqs = getOrderRequirements(order);
      assert.strictEqual(reqs.status, "Need to be Scheduled");
      assert.strictEqual(reqs.missingCount, 0);
    });
  });

  describe("Bug 2: Music Affiliate → Compliancy Collection Logic", () => {
    test("When Music Affiliate is populated ('ASCAP'), Compliancy is NOT missing in email", () => {
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
        musicAffiliate: "ASCAP",
        timeLengthOfMix: "2:00",
        songListSuggestions: "Song A, Song B",
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
        "Compliancy must NOT appear in email when Music Affiliate is populated with 'ASCAP'"
      );
    });

    test("When Music Affiliate is populated ('BMI'), Compliancy is NOT missing in email", () => {
      const order: Order = {
        ...baseOrderProps,
        id: "order-dance-2",
        customerName: "Dance Studio 2",
        contactName: "Coach Mary",
        programName: "Dance Team 2",
        category: "Dance",
        package: "DANCE CUSTOM POM",
        price: 600,
        status: "active",
        createdAt: new Date().toISOString(),
        needsAttention: false,
        formType: "school-all-star-dance",
        musicAffiliate: "BMI",
        timeLengthOfMix: "2:00",
        songListSuggestions: "Song X, Song Y",
        coachEmail: "coach2@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach2@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        false,
        "Compliancy must NOT appear in email when Music Affiliate is populated with 'BMI'"
      );
    });

    test("When Music Affiliate is empty (''), Compliancy IS requested in email", () => {
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
        musicAffiliate: "",
        timeLengthOfMix: "2:00",
        songListSuggestions: "Song X, Song Y",
        coachEmail: "coach3@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach3@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        true,
        "Compliancy MUST appear in email when Music Affiliate is empty"
      );
    });

    test("When Music Affiliate is whitespace-only ('  '), Compliancy IS requested in email", () => {
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
        musicAffiliate: "   ",
        timeLengthOfMix: "2:00",
        songListSuggestions: "Song X, Song Y",
        coachEmail: "coach4@dancestudio.com",
      };

      const record = stagingRecordFromOrder(order);
      const draft = buildCollectionEmailDraft(record, order, "coach4@dancestudio.com");

      const hasCompliancyInEmail = draft.missingItems.some((item) =>
        item.includes("COMPLIANCY")
      );
      assert.strictEqual(
        hasCompliancyInEmail,
        true,
        "Compliancy MUST appear in email when Music Affiliate is whitespace-only"
      );
    });
  });
});
