"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const dance_demo_orders_1 = require("../../data/dance-demo-orders");
const cheer_demo_orders_1 = require("../../data/cheer-demo-orders");
const mtd_filters_1 = require("../mtd-filters");
const order_detail_sections_1 = require("../order-detail-sections");
const pricing_engine_1 = require("../pricing-engine");
const pricing_display_1 = require("../pricing-display");
const discount_codes_1 = require("../discount-codes");
(0, node_test_1.describe)("Prompt 11 — Full Dance Pricing QA and Regression Audit", () => {
    const danceOrderById = new Map(dance_demo_orders_1.DANCE_DEMO_ORDERS.map((o) => [o.id, o]));
    const cheerOrderById = new Map(cheer_demo_orders_1.CHEER_DEMO_ORDERS.map((o) => [o.id, o]));
    const caseyProducer = {
        id: "prod-casey",
        name: "Casey Marlow",
        initials: "CM",
        email: "casey@soundslikethat.com",
        specialty: "Producer",
        avatar: "/avatars/casey.png",
        mixesThisWeek: 2,
        nextAvailable: "Tomorrow",
        status: "available",
        workDays: ["mon", "tue", "wed", "thu", "fri"],
        timeOff: [],
        maxMixesPerDay: null,
        maxProducerCostPerDay: null,
        categories: ["Pom", "All-Star Cheer"],
        overtimeDays: [],
        compensationModel: "percentage_of_payroll_base",
        defaultRate: 0.70,
        rateOverrides: { old_pricing: 0.72, new_pricing: 0.70 },
    };
    const discountCodes = [
        {
            id: "code-austin",
            code: "AUSTIN2026",
            discountType: "percentage",
            discountValue: 10,
        },
    ];
    (0, node_test_1.describe)("Subtype 1: POM Full End-to-End Run", () => {
        (0, node_test_1.it)("POM: Subtype Filter → 10 orders (All Dance = 50)", () => {
            const pomFiltered = (0, mtd_filters_1.filterMTDRecords)(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS, {
                form: "school-all-star-dance",
                danceSubtype: "pom",
                orderById: danceOrderById,
            });
            strict_1.default.equal(pomFiltered.length, 10);
        });
        (0, node_test_1.it)("POM: Detail View Fields → INCLUDES divisionOfTeam, EXCLUDES style, styleOfGamedayMix, licensingRequired", () => {
            const pomOrder = danceOrderById.get("ord-demo-dance-pom-01");
            const sections = (0, order_detail_sections_1.getOrderDetailSections)(pomOrder);
            const sectionTitles = sections.map((s) => s.title);
            strict_1.default.ok(sectionTitles.includes("School / Program information"));
            strict_1.default.ok(sectionTitles.includes("Mix & Routine information"));
            const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
            strict_1.default.ok(allKeys.includes("divisionOfTeam"), "divisionOfTeam must be rendered on POM");
            strict_1.default.ok(!allKeys.includes("style"), "generic style must NOT render on POM");
            strict_1.default.ok(!allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix must NOT render on POM");
            strict_1.default.ok(!allKeys.includes("licensingRequired"), "licensingRequired must NOT render on POM");
        });
        (0, node_test_1.it)("POM: VO Toggles Math → $475 Package Price (base), Payroll Base $375 / $400 / $450 / $475", () => {
            const base = (0, pricing_engine_1.calculateDanceOrderPricing)({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers" });
            strict_1.default.equal(base.customerFacingPrice, 475);
            strict_1.default.equal(base.payrollBasePrice, 375);
            const trad = (0, pricing_engine_1.calculateDanceOrderPricing)({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasTraditionalVoiceover: true });
            strict_1.default.equal(trad.customerFacingPrice, 475);
            strict_1.default.equal(trad.payrollBasePrice, 400);
            const themed = (0, pricing_engine_1.calculateDanceOrderPricing)({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasThemedVoiceover: true });
            strict_1.default.equal(themed.customerFacingPrice, 475);
            strict_1.default.equal(themed.payrollBasePrice, 450);
            const both = (0, pricing_engine_1.calculateDanceOrderPricing)({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasTraditionalVoiceover: true, hasThemedVoiceover: true });
            strict_1.default.equal(both.customerFacingPrice, 475);
            strict_1.default.equal(both.payrollBasePrice, 475);
        });
        (0, node_test_1.it)("POM: Completion Breakdown & Coupon + Payroll Integration", () => {
            const couponEval = (0, discount_codes_1.evaluateCouponCode)("AUSTIN2026", discountCodes);
            strict_1.default.equal(couponEval.status, "valid");
            const pricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "CUSTOM POM",
                musicAffiliate: "Power Music Covers",
                hasTraditionalVoiceover: true,
                hasThemedVoiceover: true,
            });
            const discount = Math.round(pricing.payrollBasePrice * 0.10); // 830 * 10% = 83
            const finalPayroll = pricing.payrollBasePrice - discount; // 830 - 83 = 747
            const payrollCalc = (0, pricing_display_1.computeClientPayroll)(caseyProducer, pricing.customerFacingPrice - discount, {
                form_type: "school-all-star-dance",
                canonical_subtype_id: "pom",
                package_id: "CUSTOM POM",
                package_name: "CUSTOM POM",
                pricing_rule_id: null,
                compliance_status: "compliant",
                compliance_reason: "Verified",
                canonical_affiliate: "Power Music Covers",
                base_customer_price: 850,
                base_payroll_price: 730,
                addons: [],
                system_calculated_customer_price: 950,
                payroll_base_price: finalPayroll,
                needs_manual_pricing: false,
                needs_manual_review: false,
                summary_line: "Summary",
            }, 0.70, null, "pom");
            strict_1.default.equal(payrollCalc.producerPayout, Math.round(747 * 0.70 * 100) / 100);
        });
    });
    (0, node_test_1.describe)("Subtype 2: Hip Hop Full End-to-End Run", () => {
        (0, node_test_1.it)("Hip Hop: Subtype Filter → 10 orders", () => {
            const filtered = (0, mtd_filters_1.filterMTDRecords)(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS, {
                form: "school-all-star-dance",
                danceSubtype: "hip-hop",
                orderById: danceOrderById,
            });
            strict_1.default.equal(filtered.length, 10);
        });
        (0, node_test_1.it)("Hip Hop: Detail View Fields → EXCLUDES divisionOfTeam, style, styleOfGamedayMix, licensingRequired", () => {
            const order = danceOrderById.get("ord-demo-dance-hiphop-01");
            const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
            const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
            strict_1.default.ok(!allKeys.includes("divisionOfTeam"), "divisionOfTeam must NOT render on Hip Hop");
            strict_1.default.ok(!allKeys.includes("style"), "generic style must NOT render on Hip Hop");
            strict_1.default.ok(!allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix must NOT render on Hip Hop");
            strict_1.default.ok(!allKeys.includes("licensingRequired"), "licensingRequired must NOT render on Hip Hop");
        });
        (0, node_test_1.it)("Hip Hop: Package Name Conflict #3 Audit → CUSTOM POM package name used on Hip Hop rate card ($850)", () => {
            const pricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "hip-hop",
                packageType: "CUSTOM POM",
                musicAffiliate: "Unleash the Beats Covers",
            });
            strict_1.default.equal(pricing.customerFacingPrice, 850);
            strict_1.default.equal(pricing.payrollBasePrice, 730);
        });
    });
    (0, node_test_1.describe)("Subtype 3: Team Performance & Variety Full End-to-End Run", () => {
        (0, node_test_1.it)("Team Performance & Variety: Subtype Filter → 10 orders", () => {
            const filtered = (0, mtd_filters_1.filterMTDRecords)(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS, {
                form: "school-all-star-dance",
                danceSubtype: "team-performance-variety",
                orderById: danceOrderById,
            });
            strict_1.default.equal(filtered.length, 10);
        });
        (0, node_test_1.it)("Team Performance & Variety: Detail View Fields → INCLUDES divisionOfTeam and style", () => {
            const order = danceOrderById.get("ord-demo-dance-tpv-01");
            const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
            const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
            strict_1.default.ok(allKeys.includes("divisionOfTeam"), "divisionOfTeam must render on Team Performance & Variety");
            strict_1.default.ok(allKeys.includes("style"), "style must render on Team Performance & Variety");
        });
    });
    (0, node_test_1.describe)("Subtype 4: Gameday Full End-to-End Run", () => {
        (0, node_test_1.it)("Gameday: Subtype Filter → 10 orders", () => {
            const filtered = (0, mtd_filters_1.filterMTDRecords)(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS, {
                form: "school-all-star-dance",
                danceSubtype: "gameday",
                orderById: danceOrderById,
            });
            strict_1.default.equal(filtered.length, 10);
        });
        (0, node_test_1.it)("Gameday: Detail View Fields → EXCLUDES divisionOfTeam & generic style, INCLUDES styleOfGamedayMix", () => {
            const order = danceOrderById.get("ord-demo-dance-gameday-01");
            const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
            const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
            strict_1.default.ok(!allKeys.includes("divisionOfTeam"), "divisionOfTeam must NOT render on Gameday");
            strict_1.default.ok(!allKeys.includes("style"), "generic style must NOT render on Gameday");
            strict_1.default.ok(allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix MUST render on Gameday");
        });
    });
    (0, node_test_1.describe)("Subtype 5: Jazz/Kick Full End-to-End Run", () => {
        (0, node_test_1.it)("Jazz/Kick: Subtype Filter → 10 orders", () => {
            const filtered = (0, mtd_filters_1.filterMTDRecords)(dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS, {
                form: "school-all-star-dance",
                danceSubtype: "jazz-kick",
                orderById: danceOrderById,
            });
            strict_1.default.equal(filtered.length, 10);
        });
        (0, node_test_1.it)("Jazz/Kick: Detail View Fields → INCLUDES divisionOfTeam, generic style, and licensingRequired", () => {
            const order = danceOrderById.get("ord-demo-dance-jazzkick-01");
            const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
            const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
            strict_1.default.ok(allKeys.includes("divisionOfTeam"));
            strict_1.default.ok(allKeys.includes("style"));
            strict_1.default.ok(allKeys.includes("licensingRequired"), "licensingRequired MUST render on Jazz/Kick");
        });
    });
    (0, node_test_1.describe)("Category Isolation & Scope Leakage Audit", () => {
        (0, node_test_1.it)("Voice Over add-on toggles apply strictly to Dance, never to Cheer", () => {
            const cheerPricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
                cheerFormSubtype: "all-star-cheer",
                packageType: "GOLD 1:30",
                musicAffiliate: "Power Music",
            });
            strict_1.default.equal(cheerPricing.hasTraditionalVoiceover, undefined);
        });
        (0, node_test_1.it)("Rally Mix applies strictly to School Cheer, never to Dance or All-Star Cheer", () => {
            const dancePricing = (0, pricing_engine_1.calculateDanceOrderPricing)({
                danceFormSubtype: "pom",
                packageType: "DANCE MIX",
            });
            strict_1.default.equal(dancePricing.hasRallyMix, undefined);
        });
    });
});
