"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
const mtd_filters_1 = require("../mtd-filters");
(0, node_test_1.describe)("Prompt 7 — Connect Dance Pricing to MTD", () => {
    const orderById = new Map(dance_demo_orders_1.DANCE_DEMO_ORDERS.map((o) => [o.id, o]));
    (0, node_test_1.it)("All 50 Dance demo orders return expected customerFacingPrice & match rate card", () => {
        strict_1.default.equal(dance_demo_orders_1.DANCE_DEMO_ORDERS.length, 50);
        strict_1.default.equal(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS.length, 50);
        for (const record of dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS) {
            const linkedOrder = orderById.get(record.orderId);
            strict_1.default.ok(linkedOrder, `Linked order found for MTD record ${record.id}`);
            const meta = (0, mtd_filters_1.resolveMTDFormMeta)(record, orderById);
            strict_1.default.equal(meta.formType, "school-all-star-dance");
            const packageType = linkedOrder.packageType || linkedOrder.package;
            const pricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: meta.danceFormSubtype,
                packageType,
                musicAffiliate: linkedOrder.musicAffiliate,
            });
            // Price displayed in MTD must equal customerFacingPrice
            strict_1.default.equal(pricing.customerFacingPrice, linkedOrder.price, `MTD Price match failed for order ${linkedOrder.id}`);
            strict_1.default.ok(pricing.customerFacingPrice > 0);
        }
    });
    (0, node_test_1.describe)("Spot-Check 2 Orders Per Subtype (Customer Price & Raw Music Affiliate)", () => {
        (0, node_test_1.it)("POM Spot Checks (ord-demo-dance-pom-01, ord-demo-dance-pom-03)", () => {
            const o1 = orderById.get("ord-demo-dance-pom-01");
            const p1 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: o1.packageType || o1.package,
                musicAffiliate: o1.musicAffiliate,
            });
            strict_1.default.equal(p1.customerFacingPrice, 475);
            strict_1.default.equal(o1.musicAffiliate, "Power Music Covers");
            const o3 = orderById.get("ord-demo-dance-pom-03");
            const p3 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: o3.packageType || o3.package,
                musicAffiliate: o3.musicAffiliate,
            });
            strict_1.default.equal(p3.customerFacingPrice, 850);
            strict_1.default.equal(o3.musicAffiliate, "Custom Artist Track - Dua Lipa");
        });
        (0, node_test_1.it)("Hip Hop Spot Checks (ord-demo-dance-hiphop-01, ord-demo-dance-hiphop-02)", () => {
            const o1 = orderById.get("ord-demo-dance-hiphop-01");
            const p1 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "hip-hop",
                packageType: o1.packageType || o1.package,
                musicAffiliate: o1.musicAffiliate,
            });
            strict_1.default.equal(p1.customerFacingPrice, 475);
            strict_1.default.equal(o1.musicAffiliate, "Unleash the Beats Covers");
            const o2 = orderById.get("ord-demo-dance-hiphop-02");
            const p2 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "hip-hop",
                packageType: o2.packageType || o2.package,
                musicAffiliate: o2.musicAffiliate,
            });
            strict_1.default.equal(p2.customerFacingPrice, 575);
            strict_1.default.equal(o2.musicAffiliate, "Power Music Covers");
        });
        (0, node_test_1.it)("Team Performance & Variety Spot Checks (ord-demo-dance-tpv-01, ord-demo-dance-tpv-02)", () => {
            const o1 = orderById.get("ord-demo-dance-tpv-01");
            const p1 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "team-performance-variety",
                packageType: o1.packageType || o1.package,
                musicAffiliate: o1.musicAffiliate,
            });
            strict_1.default.equal(p1.customerFacingPrice, 500);
            strict_1.default.equal(o1.musicAffiliate, "Power Music Covers");
            const o2 = orderById.get("ord-demo-dance-tpv-02");
            const p2 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "team-performance-variety",
                packageType: o2.packageType || o2.package,
                musicAffiliate: o2.musicAffiliate,
            });
            strict_1.default.equal(p2.customerFacingPrice, 600);
            strict_1.default.equal(o2.musicAffiliate, "Unleash the Beats Covers");
        });
        (0, node_test_1.it)("Gameday Spot Checks (ord-demo-dance-gameday-01, ord-demo-dance-gameday-03)", () => {
            const o1 = orderById.get("ord-demo-dance-gameday-01");
            const p1 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: o1.packageType || o1.package,
                musicAffiliate: o1.musicAffiliate,
            });
            strict_1.default.equal(p1.customerFacingPrice, 100);
            strict_1.default.equal(o1.musicAffiliate, "Library Music");
            const o3 = orderById.get("ord-demo-dance-gameday-03");
            const p3 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "gameday",
                packageType: o3.packageType || o3.package,
                musicAffiliate: o3.musicAffiliate,
            });
            strict_1.default.equal(p3.customerFacingPrice, 200);
            strict_1.default.equal(o3.musicAffiliate, "Stadium Marching Track (Unapproved)");
        });
        (0, node_test_1.it)("Jazz/Kick Spot Checks (ord-demo-dance-jazzkick-01, ord-demo-dance-jazzkick-02)", () => {
            const o1 = orderById.get("ord-demo-dance-jazzkick-01");
            const p1 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "jazz-kick",
                packageType: o1.packageType || o1.package,
                musicAffiliate: o1.musicAffiliate,
            });
            strict_1.default.equal(p1.customerFacingPrice, 200);
            strict_1.default.equal(o1.musicAffiliate, "Power Music Covers");
            const o2 = orderById.get("ord-demo-dance-jazzkick-02");
            const p2 = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "jazz-kick",
                packageType: o2.packageType || o2.package,
                musicAffiliate: o2.musicAffiliate,
            });
            strict_1.default.equal(p2.customerFacingPrice, 100);
            strict_1.default.equal(o2.musicAffiliate, "Unleash the Beats Covers");
        });
    });
});
