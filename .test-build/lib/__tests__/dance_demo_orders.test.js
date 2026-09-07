"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = require("node:test");
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
(0, node_test_1.describe)("Prompt 3 — Dance Demo Data Audit (50 Orders, 10 per Subtype)", () => {
    (0, node_test_1.test)("Total order and MTD record count check (50 orders, 50 MTD records)", () => {
        node_assert_1.default.strictEqual(dance_demo_orders_1.DANCE_DEMO_ORDERS.length, 50, "Should have exactly 50 dance demo orders");
        node_assert_1.default.strictEqual(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS.length, 50, "Should have exactly 50 dance demo MTD records");
    });
    (0, node_test_1.test)("Distribution check: exactly 10 orders per dance subtype", () => {
        const subtypes = [
            "pom",
            "hip-hop",
            "team-performance-variety",
            "gameday",
            "jazz-kick",
        ];
        for (const sub of subtypes) {
            const matching = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === sub);
            node_assert_1.default.strictEqual(matching.length, 10, `Subtype ${sub} must have exactly 10 demo orders`);
        }
    });
    (0, node_test_1.test)("Voiceover distribution check per subtype (2+ Traditional, 2+ Themed, 1+ Both)", () => {
        const subtypes = [
            "pom",
            "hip-hop",
            "team-performance-variety",
            "gameday",
            "jazz-kick",
        ];
        for (const sub of subtypes) {
            const orders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === sub);
            const tradCount = orders.filter((o) => o.hasTraditionalVoiceover).length;
            const themedCount = orders.filter((o) => o.hasThemedVoiceover).length;
            const bothCount = orders.filter((o) => o.hasTraditionalVoiceover && o.hasThemedVoiceover).length;
            node_assert_1.default.ok(tradCount >= 2, `${sub} should have at least 2 traditional voiceover orders`);
            node_assert_1.default.ok(themedCount >= 2, `${sub} should have at least 2 themed voiceover orders`);
            node_assert_1.default.ok(bothCount >= 1, `${sub} should have at least 1 order with BOTH voiceovers active`);
        }
    });
    (0, node_test_1.test)("Spot check 2 POM orders against pricing table ($475, $575, $850)", () => {
        const pomOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "pom");
        // Order 1: DANCE MIX = $475
        const ord1 = pomOrders[0];
        node_assert_1.default.strictEqual(ord1.package, "DANCE MIX");
        node_assert_1.default.strictEqual(ord1.price, 475);
        node_assert_1.default.strictEqual(ord1.divisionOfTeam, "Varsity Large");
        // Order 3: CUSTOM POM = $850
        const ord3 = pomOrders[2];
        node_assert_1.default.strictEqual(ord3.package, "CUSTOM POM");
        node_assert_1.default.strictEqual(ord3.price, 850);
    });
    (0, node_test_1.test)("Spot check 2 Hip Hop orders against pricing table & schema (CUSTOM POM = $850, NO divisionOfTeam)", () => {
        const hiphopOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "hip-hop");
        // Order 1: DANCE MIX = $475
        const ord1 = hiphopOrders[0];
        node_assert_1.default.strictEqual(ord1.package, "DANCE MIX");
        node_assert_1.default.strictEqual(ord1.price, 475);
        node_assert_1.default.strictEqual(ord1.divisionOfTeam, undefined, "Hip Hop must NOT have divisionOfTeam");
        // Order 3: CUSTOM POM = $850 (Literal name preserved!)
        const ord3 = hiphopOrders[2];
        node_assert_1.default.strictEqual(ord3.package, "CUSTOM POM", "Hip Hop must preserve literal package name CUSTOM POM");
        node_assert_1.default.strictEqual(ord3.price, 850);
        node_assert_1.default.strictEqual(ord3.divisionOfTeam, undefined, "Hip Hop must NOT have divisionOfTeam");
    });
    (0, node_test_1.test)("Spot check 2 Team Performance & Variety orders against pricing table ($500, $600)", () => {
        const tpvOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "team-performance-variety");
        // Order 1: TP MIX = $500
        const ord1 = tpvOrders[0];
        node_assert_1.default.strictEqual(ord1.package, "TP MIX");
        node_assert_1.default.strictEqual(ord1.price, 500);
        node_assert_1.default.ok(ord1.style, "TPV should have style field");
        // Order 2: TP PLUS MIX = $600
        const ord2 = tpvOrders[1];
        node_assert_1.default.strictEqual(ord2.package, "TP PLUS MIX");
        node_assert_1.default.strictEqual(ord2.price, 600);
    });
    (0, node_test_1.test)("Spot check 2 Gameday orders against pricing table ($100, $150, $200)", () => {
        const gamedayOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "gameday");
        // Order 1: PERFORMANCE MIX = $100
        const ord1 = gamedayOrders[0];
        node_assert_1.default.strictEqual(ord1.package, "PERFORMANCE MIX");
        node_assert_1.default.strictEqual(ord1.price, 100);
        node_assert_1.default.strictEqual(ord1.divisionOfTeam, undefined, "Gameday must NOT have divisionOfTeam");
        node_assert_1.default.strictEqual(ord1.style, undefined, "Gameday must NOT have generic style field");
        node_assert_1.default.ok(ord1.styleOfGamedayMix, "Gameday must have styleOfGamedayMix field");
        // Order 3: PERFORMANCE EXTREME = $200
        const ord3 = gamedayOrders[2];
        node_assert_1.default.strictEqual(ord3.package, "PERFORMANCE EXTREME");
        node_assert_1.default.strictEqual(ord3.price, 200);
    });
    (0, node_test_1.test)("Spot check 2 Jazz/Kick orders against pricing table ($200, $100) & licensing field", () => {
        const jazzOrders = dance_demo_orders_1.DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "jazz-kick");
        // Order 1: JAZZ/KICK MIX = $200
        const ord1 = jazzOrders[0];
        node_assert_1.default.strictEqual(ord1.package, "JAZZ/KICK MIX");
        node_assert_1.default.strictEqual(ord1.price, 200);
        node_assert_1.default.strictEqual(ord1.licensingRequired, "yes");
        // Order 2: JAZZ SIMPLE CUT = $100
        const ord2 = jazzOrders[1];
        node_assert_1.default.strictEqual(ord2.package, "JAZZ SIMPLE CUT");
        node_assert_1.default.strictEqual(ord2.price, 100);
    });
});
