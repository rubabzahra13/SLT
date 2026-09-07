"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const new_categories_demo_orders_1 = require("../../data/new-categories-demo-orders");
(0, node_test_1.describe)("Prompt 3 — Demo Data Generation (10 per category)", () => {
    (0, node_test_1.it)("Generates exactly 30 total demo orders and 30 MTD records (10 per category)", () => {
        strict_1.default.equal(new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.length, 10, "Marching Band demo orders must equal 10");
        strict_1.default.equal(new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.length, 10, "Sports Entertainment demo orders must equal 10");
        strict_1.default.equal(new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS.length, 10, "School Anthems demo orders must equal 10");
        strict_1.default.equal(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_ORDERS.length, 30);
        strict_1.default.equal(new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS.length, 30);
    });
    (0, node_test_1.it)("Marching Band Spot-Checks: Prices match package rate card + add-ons exactly", () => {
        const mb1 = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-01");
        strict_1.default.equal(mb1.packageType, "BAND CHANT");
        strict_1.default.equal(mb1.price, 600, "BAND CHANT with no add-ons = $600");
        const mb2 = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-02");
        strict_1.default.equal(mb2.price, 650, "BAND CHANT ($600) + Sheet Music ($50) = $650");
        const mb4 = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-04");
        strict_1.default.equal(mb4.price, 425, "DRUM CADENCE ORIGINAL ($350) + Add Vocals ($75) = $425");
        const mb7 = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-07");
        strict_1.default.equal(mb7.price, 1225, "FIGHT SONG ($1100) + Sheet Music ($50) + Add Vocals ($75) = $1225");
        const mb10 = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-10");
        strict_1.default.equal(mb10.price, 2375, "FIGHT SONG PLUS ($2250) + Sheet Music ($50) + Add Vocals ($75) = $2375");
        const sheetMusicCount = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasSheetMusicAdd).length;
        const addVocalsCount = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasAddVocals).length;
        const bothCount = new_categories_demo_orders_1.MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasSheetMusicAdd && o.hasAddVocals).length;
        strict_1.default.ok(sheetMusicCount >= 3, `Expected at least 3 orders with Sheet Music Add (found ${sheetMusicCount})`);
        strict_1.default.ok(addVocalsCount >= 3, `Expected at least 3 orders with Add Vocals (found ${addVocalsCount})`);
        strict_1.default.ok(bothCount >= 2, `Expected at least 1-2 orders with both add-ons (found ${bothCount})`);
    });
    (0, node_test_1.it)("Sports Entertainment Spot-Checks: Prices match rate card + rush fee, 10th order is TBD ($0)", () => {
        const se1 = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-01");
        strict_1.default.equal(se1.packageType, "QUARTER BREAK / TIMEOUT REMIXED");
        strict_1.default.equal(se1.isRushOrder, "no");
        strict_1.default.equal(se1.price, 150, "QUARTER BREAK no rush = $150");
        const se2 = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-02");
        strict_1.default.equal(se2.isRushOrder, "yes");
        strict_1.default.equal(se2.price, 250, "QUARTER BREAK ($150) + Rush ($100) = $250");
        const se5 = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-05");
        strict_1.default.equal(se5.packageType, "PRE-GAME / HALFTIME REMIXED");
        strict_1.default.equal(se5.price, 250, "PRE-GAME no rush = $250");
        const se6 = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-06");
        strict_1.default.equal(se6.price, 350, "PRE-GAME ($250) + Rush ($100) = $350");
        const se10 = new_categories_demo_orders_1.SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-10");
        strict_1.default.equal(se10.packageType, "OTHER (mixes longer than 2:30)");
        strict_1.default.equal(se10.price, 0, "OTHER (mixes > 2:30) must have NO assigned price ($0)");
        strict_1.default.equal(se10.needsAttention, true, "TBD order must flag needsAttention = true");
    });
    (0, node_test_1.it)("School Anthems Spot-Checks: All 10 orders use SCHOOL ANTHEMS package at $1,250", () => {
        for (const sa of new_categories_demo_orders_1.SCHOOL_ANTHEMS_DEMO_ORDERS) {
            strict_1.default.equal(sa.packageType, "SCHOOL ANTHEMS");
            strict_1.default.equal(sa.price, 1250, "SCHOOL ANTHEMS price must always be $1,250");
        }
    });
    (0, node_test_1.it)("Schema Isolation: No Music Affiliate field present on any of the 30 demo orders or MTD records", () => {
        for (const order of new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_ORDERS) {
            strict_1.default.equal(order.musicAffiliate, undefined, `Order ${order.id} must NOT have musicAffiliate`);
        }
        for (const record of new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS) {
            strict_1.default.equal(record.musicAffiliate, undefined, `Record ${record.id} must NOT have musicAffiliate`);
        }
    });
});
