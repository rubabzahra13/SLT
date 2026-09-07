"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
const mtd_filters_1 = require("../mtd-filters");
const order_detail_sections_1 = require("../order-detail-sections");
(0, node_test_1.describe)("Prompt 4 — MTD Category-Level Filtering (No Subtype) + Dynamic Order Detail View", () => {
    const orderMap = new Map([
        ...new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.map((o) => [o.id, o]),
        ...new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.map((o) => [o.id, o]),
        ...new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS.map((o) => [o.id, o]),
    ]);
    (0, node_test_1.it)("Top-level Category Filtering: returns exactly 10 demo records per category", () => {
        const mbRecords = new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) => (0, mtd_filters_1.matchesFormFilter)(rec, orderMap, "marching-band", "all", "all"));
        strict_1.default.equal(mbRecords.length, 10);
        const seRecords = new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) => (0, mtd_filters_1.matchesFormFilter)(rec, orderMap, "sports-entertainment", "all", "all"));
        strict_1.default.equal(seRecords.length, 10);
        const saRecords = new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) => (0, mtd_filters_1.matchesFormFilter)(rec, orderMap, "school-anthem", "all", "all"));
        strict_1.default.equal(saRecords.length, 10);
    });
    (0, node_test_1.it)("countMTDByForm accurately tallies Marching Band, Sports Entertainment, and School Anthems", () => {
        const counts = (0, mtd_filters_1.countMTDByForm)(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS, orderMap);
        strict_1.default.equal(counts["marching-band"], 10);
        strict_1.default.equal(counts["sports-entertainment"], 10);
        strict_1.default.equal(counts["school-anthem"], 10);
    });
    (0, node_test_1.it)("Marching Band Detail View: renders exact fields from Prompt 2 schema", () => {
        const mbOrder = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS[0];
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(mbOrder);
        const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        strict_1.default.ok(allKeys.includes("schoolProgramName"));
        strict_1.default.ok(allKeys.includes("schoolGymAddress"));
        strict_1.default.ok(allKeys.includes("coachName"));
        strict_1.default.ok(allKeys.includes("billingPersonName"));
        strict_1.default.ok(allKeys.includes("packageType"));
        strict_1.default.ok(allKeys.includes("timeLengthOfMix"));
        strict_1.default.ok(allKeys.includes("instrumentationNotes"));
        strict_1.default.ok(allKeys.includes("lyricalNotes"));
        // Must NOT contain Cheer/Dance or Music Affiliate fields
        strict_1.default.ok(!allKeys.includes("musicAffiliate"));
        strict_1.default.ok(!allKeys.includes("customVoiceovers"));
        strict_1.default.ok(!allKeys.includes("splitOrNoSplit"));
    });
    (0, node_test_1.it)("Sports Entertainment Detail View: renders exact fields from Prompt 2 schema", () => {
        const seOrder = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS[1];
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(seOrder);
        const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        strict_1.default.ok(allKeys.includes("organizationName"));
        strict_1.default.ok(allKeys.includes("billingAddress"));
        strict_1.default.ok(allKeys.includes("musicContactName"));
        strict_1.default.ok(allKeys.includes("billingContactName"));
        strict_1.default.ok(allKeys.includes("packageType"));
        strict_1.default.ok(allKeys.includes("isRushOrder"));
        strict_1.default.ok(allKeys.includes("timeLengthOfMix"));
        strict_1.default.ok(allKeys.includes("customerSongs"));
        strict_1.default.ok(allKeys.includes("additionalNotes"));
        // Must NOT contain Cheer/Dance or Music Affiliate fields
        strict_1.default.ok(!allKeys.includes("musicAffiliate"));
        strict_1.default.ok(!allKeys.includes("couponCode"));
    });
    (0, node_test_1.it)("School Anthems Detail View: renders exact fields from Prompt 2 schema including couponCode", () => {
        const saOrder = new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS[0];
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(saOrder);
        const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        strict_1.default.ok(allKeys.includes("schoolOrganizationName"));
        strict_1.default.ok(allKeys.includes("schoolBillingAddress"));
        strict_1.default.ok(allKeys.includes("musicContactName"));
        strict_1.default.ok(allKeys.includes("billingPersonName"));
        strict_1.default.ok(allKeys.includes("mascot"));
        strict_1.default.ok(allKeys.includes("schoolProgramColors"));
        strict_1.default.ok(allKeys.includes("nicknames"));
        strict_1.default.ok(allKeys.includes("vocalsPreference"));
        strict_1.default.ok(allKeys.includes("instrumentalStylePreference"));
        strict_1.default.ok(allKeys.includes("lyricalNotes"));
        strict_1.default.ok(allKeys.includes("couponCode"));
        // Must NOT contain Cheer/Dance or Music Affiliate fields
        strict_1.default.ok(!allKeys.includes("musicAffiliate"));
        strict_1.default.ok(!allKeys.includes("customVoiceovers"));
    });
});
