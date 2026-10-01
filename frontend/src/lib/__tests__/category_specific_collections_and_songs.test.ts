import assert from "node:assert";
import { test, describe } from "node:test";
import {
  cycleEightCsItem,
  cycleSongsItem,
  encodeEightCsState,
  encodeSongsState,
  getCollectionControlIds,
  getCollectionItemsForCategory,
  getSongsItems,
  parseEightCsState,
  parseSongsState,
} from "../mtd-checklist";
import { resolveMTDFormMeta } from "../mtd-filters";
import type { MTDRecord, Order, OrderFormType } from "../../types";

describe("Category-Specific Collections & Songs Columns Requirements", () => {
  describe("Control IDs & Item Visibility by Category / Form Type", () => {
    test("Cheer (school-all-star-cheer) includes CS, Video, and Form under Collections (no Mix)", () => {
      const ids = getCollectionControlIds("school-all-star-cheer");
      assert.deepStrictEqual(ids, ["cs", "video", "form"]);

      const state = parseEightCsState("");
      const items = getCollectionItemsForCategory("school-all-star-cheer", state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["cs", "video", "form"]);
      assert.ok(!itemIds.includes("mix"), "Cheer Collections must NOT include Mix");

      const labels = items.map((i) => i.label);
      assert.deepStrictEqual(labels, ["CS", "Video", "Form"]);
    });

    test("Dance (school-all-star-dance) includes ONLY Form and Mix under Collections", () => {
      const ids = getCollectionControlIds("school-all-star-dance");
      assert.deepStrictEqual(ids, ["form", "mix"]);

      const state = parseEightCsState("");
      const items = getCollectionItemsForCategory("school-all-star-dance", state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["form", "mix"]);
      assert.ok(!itemIds.includes("cs"), "Dance Collections must NOT include 8-Count Sheet / CS");
      assert.ok(!itemIds.includes("video"), "Dance Collections must NOT include Video");
    });

    test("Marching Band (marching-band) includes ONLY Form under Collections", () => {
      const ids = getCollectionControlIds("marching-band");
      assert.deepStrictEqual(ids, ["form"]);

      const state = parseEightCsState("");
      const items = getCollectionItemsForCategory("marching-band", state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["form"]);
      assert.ok(!itemIds.includes("cs"));
      assert.ok(!itemIds.includes("video"));
      assert.ok(!itemIds.includes("mix"));
    });

    test("Sports Entertainment (sports-entertainment) includes ONLY Form under Collections", () => {
      const ids = getCollectionControlIds("sports-entertainment");
      assert.deepStrictEqual(ids, ["form"]);

      const state = parseEightCsState("");
      const items = getCollectionItemsForCategory("sports-entertainment", state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["form"]);
      assert.ok(!itemIds.includes("cs"));
      assert.ok(!itemIds.includes("video"));
      assert.ok(!itemIds.includes("mix"));
    });

    test("School Anthem (school-anthem) includes ONLY Form under Collections", () => {
      const ids = getCollectionControlIds("school-anthem");
      assert.deepStrictEqual(ids, ["form"]);

      const state = parseEightCsState("");
      const items = getCollectionItemsForCategory("school-anthem", state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["form"]);
      assert.ok(!itemIds.includes("cs"));
      assert.ok(!itemIds.includes("video"));
      assert.ok(!itemIds.includes("mix"));
    });

    test("Unknown or arbitrary non-Cheer category defaults to Form only under Collections", () => {
      const ids = getCollectionControlIds("custom-category");
      assert.deepStrictEqual(ids, ["form"]);
    });

    test("Songs column consistently includes Songs and Notes for all categories", () => {
      const state = parseSongsState("");
      const items = getSongsItems(state);
      const itemIds = items.map((i) => i.id);
      assert.deepStrictEqual(itemIds, ["songs", "notes"]);

      const labels = items.map((i) => i.label);
      assert.deepStrictEqual(labels, ["Songs", "Notes"]);
    });
  });

  describe("Subtype & Form Resolution Integrity", () => {
    test("Cheer Subtypes (All-Star, VIROC Yes, VIROC No, Youth Rec) resolve to school-all-star-cheer", () => {
      const cheerSubtypes = [
        { category: "All-Star Cheer", expected: "school-all-star-cheer" },
        { category: "School Cheer", routineNotes: "VIROC Yes", expected: "school-all-star-cheer" },
        { category: "School Cheer", routineNotes: "VIROC No", expected: "school-all-star-cheer" },
        { category: "Youth Rec Cheer", expected: "school-all-star-cheer" },
      ];

      for (const sub of cheerSubtypes) {
        const rec: Partial<MTDRecord> = {
          id: "test-rec",
          section: "ONGOING MIXES",
          category: sub.category,
          musicTheme: sub.routineNotes || "",
        } as any;
        const meta = resolveMTDFormMeta(rec as MTDRecord, new Map());
        assert.strictEqual(meta.formType, sub.expected);
        const controlIds = getCollectionControlIds(meta.formType);
        assert.deepStrictEqual(controlIds, ["cs", "video", "form"]);
      }
    });

    test("All 5 Dance Subtypes resolve to school-all-star-dance and yield Form + Mix Collections", () => {
      const danceSubtypes = ["Pom", "Hip Hop", "Team Performance / Variety", "Gameday", "Jazz / Kick"];

      for (const cat of danceSubtypes) {
        const rec: Partial<MTDRecord> = {
          id: "test-dance-rec",
          section: "ONGOING MIXES",
          category: cat,
          division: cat,
        } as any;
        const meta = resolveMTDFormMeta(rec as MTDRecord, new Map());
        assert.strictEqual(meta.formType, "school-all-star-dance", `Category ${cat} should resolve to school-all-star-dance`);
        const controlIds = getCollectionControlIds(meta.formType);
        assert.deepStrictEqual(controlIds, ["form", "mix"], `Category ${cat} should render Form + Mix in Collections`);
      }
    });
  });

  describe("Data Immutability & Toggle Preservation", () => {
    test("Toggling a visible control (Form) on a Dance order preserves existing hidden data (CS/Video)", () => {
      const initialEightCountStr = "HAVE CS & VIDEO";
      const state = parseEightCsState(initialEightCountStr);
      assert.strictEqual(state.cs, "have");
      assert.strictEqual(state.video, "have");
      assert.strictEqual(state.form, "none");

      // User cycles Form pill to 'have'
      const nextState = cycleEightCsItem(state, "form");
      assert.strictEqual(nextState.form, "have");
      assert.strictEqual(nextState.cs, "have", "CS state must be preserved");
      assert.strictEqual(nextState.video, "have", "Video state must be preserved");

      const encoded = encodeEightCsState(nextState);
      assert.ok(encoded.includes("CS"), "Encoded string must retain CS");
      assert.ok(encoded.includes("VIDEO"), "Encoded string must retain VIDEO");
      assert.ok(encoded.includes("ORDER FORM"), "Encoded string must include ORDER FORM");
    });

    test("Songs state toggling functions as expected for Songs and Notes", () => {
      let state = parseSongsState("NEED SONGS");
      assert.strictEqual(state.songs, "need");
      assert.strictEqual(state.notes, "none");

      state = cycleSongsItem(state, "notes");
      assert.strictEqual(state.notes, "have");

      const encoded = encodeSongsState(state);
      assert.ok(encoded.includes("NEED SONGS"));
      assert.ok(encoded.includes("HAVE NOTES"));
    });
  });

  describe("Payroll UI & Pricing Display Format Requirements", () => {
    test("computeClientPayroll summary message excludes SLT cut text", () => {
      const { computeClientPayroll } = require("../pricing-display");
      const producer = { name: "Riley", initials: "R", specialty: "School Cheer", ratesByCategory: { "School Cheer": 0.6 } };
      const payroll = computeClientPayroll(producer, 470, null, 0.6, null, "school-cheer-viroc-yes", 470);
      assert.strictEqual(payroll.message, "Payout: $282.00 (60%)");
      assert.ok(!payroll.message.includes("SLT"), "Message must NOT contain SLT portion text");
    });
  });
});
