"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const mtd_checklist_1 = require("../mtd-checklist");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Category-Specific Collections & Songs Columns Requirements", () => {
    (0, node_test_1.describe)("Control IDs & Item Visibility by Category / Form Type", () => {
        (0, node_test_1.test)("Cheer (school-all-star-cheer) includes CS, Video, Form, and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("school-all-star-cheer");
            node_assert_1.default.deepStrictEqual(ids, ["cs", "video", "form", "mix"]);
            const state = (0, mtd_checklist_1.parseEightCsState)("");
            const items = (0, mtd_checklist_1.getCollectionItemsForCategory)("school-all-star-cheer", state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["cs", "video", "form", "mix"]);
            const labels = items.map((i) => i.label);
            node_assert_1.default.deepStrictEqual(labels, ["CS", "Video", "Form", "Mix"]);
        });
        (0, node_test_1.test)("Dance (school-all-star-dance) includes ONLY Form and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("school-all-star-dance");
            node_assert_1.default.deepStrictEqual(ids, ["form", "mix"]);
            const state = (0, mtd_checklist_1.parseEightCsState)("");
            const items = (0, mtd_checklist_1.getCollectionItemsForCategory)("school-all-star-dance", state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["form", "mix"]);
            node_assert_1.default.ok(!itemIds.includes("cs"), "Dance Collections must NOT include 8-Count Sheet / CS");
            node_assert_1.default.ok(!itemIds.includes("video"), "Dance Collections must NOT include Video");
        });
        (0, node_test_1.test)("Marching Band (marching-band) includes ONLY Form and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("marching-band");
            node_assert_1.default.deepStrictEqual(ids, ["form", "mix"]);
            const state = (0, mtd_checklist_1.parseEightCsState)("");
            const items = (0, mtd_checklist_1.getCollectionItemsForCategory)("marching-band", state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["form", "mix"]);
            node_assert_1.default.ok(!itemIds.includes("cs"));
            node_assert_1.default.ok(!itemIds.includes("video"));
        });
        (0, node_test_1.test)("Sports Entertainment (sports-entertainment) includes ONLY Form and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("sports-entertainment");
            node_assert_1.default.deepStrictEqual(ids, ["form", "mix"]);
            const state = (0, mtd_checklist_1.parseEightCsState)("");
            const items = (0, mtd_checklist_1.getCollectionItemsForCategory)("sports-entertainment", state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["form", "mix"]);
            node_assert_1.default.ok(!itemIds.includes("cs"));
            node_assert_1.default.ok(!itemIds.includes("video"));
        });
        (0, node_test_1.test)("School Anthem (school-anthem) includes ONLY Form and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("school-anthem");
            node_assert_1.default.deepStrictEqual(ids, ["form", "mix"]);
            const state = (0, mtd_checklist_1.parseEightCsState)("");
            const items = (0, mtd_checklist_1.getCollectionItemsForCategory)("school-anthem", state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["form", "mix"]);
            node_assert_1.default.ok(!itemIds.includes("cs"));
            node_assert_1.default.ok(!itemIds.includes("video"));
        });
        (0, node_test_1.test)("Unknown or arbitrary non-Cheer category defaults to Form and Mix under Collections", () => {
            const ids = (0, mtd_checklist_1.getCollectionControlIds)("custom-category");
            node_assert_1.default.deepStrictEqual(ids, ["form", "mix"]);
        });
        (0, node_test_1.test)("Songs column consistently includes Songs and Notes for all categories", () => {
            const state = (0, mtd_checklist_1.parseSongsState)("");
            const items = (0, mtd_checklist_1.getSongsItems)(state);
            const itemIds = items.map((i) => i.id);
            node_assert_1.default.deepStrictEqual(itemIds, ["songs", "notes"]);
            const labels = items.map((i) => i.label);
            node_assert_1.default.deepStrictEqual(labels, ["Songs", "Notes"]);
        });
    });
    (0, node_test_1.describe)("Subtype & Form Resolution Integrity", () => {
        (0, node_test_1.test)("Cheer Subtypes (All-Star, VIROC Yes, VIROC No, Youth Rec) resolve to school-all-star-cheer", () => {
            const cheerSubtypes = [
                { category: "All-Star Cheer", expected: "school-all-star-cheer" },
                { category: "School Cheer", routineNotes: "VIROC Yes", expected: "school-all-star-cheer" },
                { category: "School Cheer", routineNotes: "VIROC No", expected: "school-all-star-cheer" },
                { category: "Youth Rec Cheer", expected: "school-all-star-cheer" },
            ];
            for (const sub of cheerSubtypes) {
                const rec = {
                    id: "test-rec",
                    section: "ONGOING MIXES",
                    category: sub.category,
                    musicTheme: sub.routineNotes || "",
                };
                const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, new Map());
                node_assert_1.default.strictEqual(meta.formType, sub.expected);
                const controlIds = (0, mtd_checklist_1.getCollectionControlIds)(meta.formType);
                node_assert_1.default.deepStrictEqual(controlIds, ["cs", "video", "form", "mix"]);
            }
        });
        (0, node_test_1.test)("All 5 Dance Subtypes resolve to school-all-star-dance and yield Form + Mix Collections", () => {
            const danceSubtypes = ["Pom", "Hip Hop", "Team Performance / Variety", "Gameday", "Jazz / Kick"];
            for (const cat of danceSubtypes) {
                const rec = {
                    id: "test-dance-rec",
                    section: "ONGOING MIXES",
                    category: cat,
                    division: cat,
                };
                const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, new Map());
                node_assert_1.default.strictEqual(meta.formType, "school-all-star-dance", `Category ${cat} should resolve to school-all-star-dance`);
                const controlIds = (0, mtd_checklist_1.getCollectionControlIds)(meta.formType);
                node_assert_1.default.deepStrictEqual(controlIds, ["form", "mix"], `Category ${cat} should render Form + Mix in Collections`);
            }
        });
    });
    (0, node_test_1.describe)("Data Immutability & Toggle Preservation", () => {
        (0, node_test_1.test)("Toggling a visible control (Form) on a Dance order preserves existing hidden data (CS/Video)", () => {
            const initialEightCountStr = "HAVE CS & VIDEO";
            const state = (0, mtd_checklist_1.parseEightCsState)(initialEightCountStr);
            node_assert_1.default.strictEqual(state.cs, "have");
            node_assert_1.default.strictEqual(state.video, "have");
            node_assert_1.default.strictEqual(state.form, "none");
            // User cycles Form pill to 'have'
            const nextState = (0, mtd_checklist_1.cycleEightCsItem)(state, "form");
            node_assert_1.default.strictEqual(nextState.form, "have");
            node_assert_1.default.strictEqual(nextState.cs, "have", "CS state must be preserved");
            node_assert_1.default.strictEqual(nextState.video, "have", "Video state must be preserved");
            const encoded = (0, mtd_checklist_1.encodeEightCsState)(nextState);
            node_assert_1.default.ok(encoded.includes("CS"), "Encoded string must retain CS");
            node_assert_1.default.ok(encoded.includes("VIDEO"), "Encoded string must retain VIDEO");
            node_assert_1.default.ok(encoded.includes("ORDER FORM"), "Encoded string must include ORDER FORM");
        });
        (0, node_test_1.test)("Songs state toggling functions as expected for Songs and Notes", () => {
            let state = (0, mtd_checklist_1.parseSongsState)("NEED SONGS");
            node_assert_1.default.strictEqual(state.songs, "need");
            node_assert_1.default.strictEqual(state.notes, "none");
            state = (0, mtd_checklist_1.cycleSongsItem)(state, "notes");
            node_assert_1.default.strictEqual(state.notes, "have");
            const encoded = (0, mtd_checklist_1.encodeSongsState)(state);
            node_assert_1.default.ok(encoded.includes("NEED SONGS"));
            node_assert_1.default.ok(encoded.includes("HAVE NOTES"));
        });
    });
    (0, node_test_1.describe)("Payroll UI & Pricing Display Format Requirements", () => {
        (0, node_test_1.test)("computeClientPayroll summary message excludes SLT cut text", () => {
            const { computeClientPayroll } = require("../pricing-display");
            const producer = { name: "Riley", initials: "R", specialty: "School Cheer", ratesByCategory: { "School Cheer": 0.6 } };
            const payroll = computeClientPayroll(producer, 470, null, 0.6, null, "school-cheer-viroc-yes", 470);
            node_assert_1.default.strictEqual(payroll.message, "Payout: $282.00 (60%)");
            node_assert_1.default.ok(!payroll.message.includes("SLT"), "Message must NOT contain SLT portion text");
        });
    });
});
