"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
const mtd_filters_1 = require("../mtd-filters");
const order_detail_sections_1 = require("../order-detail-sections");
(0, node_test_1.describe)("Prompt 4 — Dance Subtype Filtering & Dynamic Detail View", () => {
    const demoOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS;
    const demoRecords = dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS;
    const orderById = new Map();
    for (const o of demoOrders) {
        if (o.id)
            orderById.set(o.id, o);
    }
    (0, node_test_1.test)("Dance Subtype Counts: All Dance = 50, Subtypes = 10 each (10/10/10/10/10/50)", () => {
        const counts = (0, mtd_filters_1.countMTDByDanceSubtype)(demoRecords, orderById);
        node_assert_1.default.strictEqual(counts.all, 50, "All Dance count should be 50");
        node_assert_1.default.strictEqual(counts.pom, 10, "POM count should be 10");
        node_assert_1.default.strictEqual(counts["hip-hop"], 10, "Hip Hop count should be 10");
        node_assert_1.default.strictEqual(counts["team-performance-variety"], 10, "TPV count should be 10");
        node_assert_1.default.strictEqual(counts.gameday, 10, "Gameday count should be 10");
        node_assert_1.default.strictEqual(counts["jazz-kick"], 10, "Jazz/Kick count should be 10");
    });
    (0, node_test_1.test)("Filter MTD records by Dance Subtypes: Row counts match (50 for All, 10 for each subtype)", () => {
        const allDanceRows = (0, mtd_filters_1.filterMTDRecords)(demoRecords, {
            form: "school-all-star-dance",
            danceSubtype: "all",
            orderById,
        });
        node_assert_1.default.strictEqual(allDanceRows.length, 50, "Filtering by All Dance should return 50 rows");
        const subtypes = [
            "pom",
            "hip-hop",
            "team-performance-variety",
            "gameday",
            "jazz-kick",
        ];
        for (const sub of subtypes) {
            const rows = (0, mtd_filters_1.filterMTDRecords)(demoRecords, {
                form: "school-all-star-dance",
                danceSubtype: sub,
                orderById,
            });
            node_assert_1.default.strictEqual(rows.length, 10, `Filtering by ${sub} should return 10 rows`);
        }
    });
    (0, node_test_1.test)("Detail View Field Verification: POM order includes Division of Team, excludes Gameday style & Licensing", () => {
        const pomOrder = demoOrders.find((o) => o.id === "ord-demo-dance-pom-01");
        node_assert_1.default.ok(pomOrder, "POM order must exist");
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(pomOrder);
        const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        node_assert_1.default.ok(allFieldKeys.includes("divisionOfTeam"), "POM detail view must include divisionOfTeam");
        node_assert_1.default.ok(!allFieldKeys.includes("styleOfGamedayMix"), "POM detail view must NOT include styleOfGamedayMix");
        node_assert_1.default.ok(!allFieldKeys.includes("licensingRequired"), "POM detail view must NOT include licensingRequired");
        // Value accuracy check against underlying demo record
        const schoolProgField = sections.flatMap((s) => s.fields).find((f) => f.key === "schoolProgramName");
        node_assert_1.default.strictEqual(schoolProgField?.value, "Westlake High Dance Team");
    });
    (0, node_test_1.test)("Detail View Field Verification: Hip Hop order EXCLUDES Division of Team, Style, Gameday Style & Licensing", () => {
        const hipHopOrder = demoOrders.find((o) => o.id === "ord-demo-dance-hiphop-01");
        node_assert_1.default.ok(hipHopOrder, "Hip Hop order must exist");
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(hipHopOrder);
        const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        node_assert_1.default.ok(!allFieldKeys.includes("divisionOfTeam"), "Hip Hop detail view must NOT include divisionOfTeam");
        node_assert_1.default.ok(!allFieldKeys.includes("style"), "Hip Hop detail view must NOT include generic style");
        node_assert_1.default.ok(!allFieldKeys.includes("styleOfGamedayMix"), "Hip Hop detail view must NOT include styleOfGamedayMix");
        node_assert_1.default.ok(!allFieldKeys.includes("licensingRequired"), "Hip Hop detail view must NOT include licensingRequired");
    });
    (0, node_test_1.test)("Detail View Field Verification: Team Performance & Variety includes Division of Team (in Mix Info) & Style", () => {
        const tpvOrder = demoOrders.find((o) => o.id === "ord-demo-dance-tpv-01");
        node_assert_1.default.ok(tpvOrder, "TPV order must exist");
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(tpvOrder);
        const mixSection = sections.find((s) => s.title === "Mix & Routine information");
        node_assert_1.default.ok(mixSection, "Mix & Routine information section must exist");
        const mixKeys = mixSection.fields.map((f) => f.key);
        node_assert_1.default.ok(mixKeys.includes("divisionOfTeam"), "TPV must place divisionOfTeam in Mix & Routine information");
        node_assert_1.default.ok(mixKeys.includes("style"), "TPV must place generic style in Mix & Routine information");
        const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        node_assert_1.default.ok(!allKeys.includes("styleOfGamedayMix"), "TPV detail view must NOT include styleOfGamedayMix");
        node_assert_1.default.ok(!allKeys.includes("licensingRequired"), "TPV detail view must NOT include licensingRequired");
    });
    (0, node_test_1.test)("Detail View Field Verification: Gameday EXCLUDES Division of Team & generic Style, INCLUDES styleOfGamedayMix", () => {
        const gamedayOrder = demoOrders.find((o) => o.id === "ord-demo-dance-gameday-01");
        node_assert_1.default.ok(gamedayOrder, "Gameday order must exist");
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(gamedayOrder);
        const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        node_assert_1.default.ok(!allFieldKeys.includes("divisionOfTeam"), "Gameday detail view must NOT include divisionOfTeam");
        node_assert_1.default.ok(!allFieldKeys.includes("style"), "Gameday detail view must NOT include generic style");
        node_assert_1.default.ok(allFieldKeys.includes("styleOfGamedayMix"), "Gameday detail view MUST include styleOfGamedayMix");
        node_assert_1.default.ok(!allFieldKeys.includes("licensingRequired"), "Gameday detail view must NOT include licensingRequired");
    });
    (0, node_test_1.test)("Detail View Field Verification: Jazz/Kick INCLUDES Division of Team, generic Style, and Licensing Question", () => {
        const jazzOrder = demoOrders.find((o) => o.id === "ord-demo-dance-jazzkick-01");
        node_assert_1.default.ok(jazzOrder, "Jazz/Kick order must exist");
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(jazzOrder);
        const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        node_assert_1.default.ok(allFieldKeys.includes("divisionOfTeam"), "Jazz/Kick detail view MUST include divisionOfTeam");
        node_assert_1.default.ok(allFieldKeys.includes("style"), "Jazz/Kick detail view MUST include generic style");
        node_assert_1.default.ok(allFieldKeys.includes("licensingRequired"), "Jazz/Kick detail view MUST include licensingRequired");
        node_assert_1.default.ok(!allFieldKeys.includes("styleOfGamedayMix"), "Jazz/Kick detail view must NOT include styleOfGamedayMix");
        const licenseField = sections.flatMap((s) => s.fields).find((f) => f.key === "licensingRequired");
        node_assert_1.default.strictEqual(licenseField?.label, "Do you attend any event where you are required to show proper licensing?");
        node_assert_1.default.strictEqual(licenseField?.value, "yes");
    });
});
