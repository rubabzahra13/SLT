import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import { CHEER_DEMO_ORDERS, CHEER_DEMO_MTD_RECORDS } from "../../data/cheer-demo-orders";
import { filterMTDRecords, resolveMTDFormMeta } from "../mtd-filters";
import { getOrderDetailSections } from "../order-detail-sections";
import { calculateDanceOrderPricing, calculateCheerOrderPricing } from "../pricing-engine";
import { computeClientPayroll } from "../pricing-display";
import { evaluateCouponCode } from "../discount-codes";
import type { Order, MTDRecord, Producer, DiscountCode } from "../../types";

describe("Prompt 11 — Full Dance Pricing QA and Regression Audit", () => {
  const danceOrderById = new Map<string, Order>(
    DANCE_DEMO_ORDERS.map((o) => [o.id, o])
  );

  const cheerOrderById = new Map<string, Order>(
    CHEER_DEMO_ORDERS.map((o) => [o.id, o])
  );

  const caseyProducer: Producer = {
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

  const discountCodes: DiscountCode[] = [
    {
      id: "code-austin",
      code: "AUSTIN2026",
      discountType: "percentage",
      discountValue: 10,
    },
  ];

  describe("Subtype 1: POM Full End-to-End Run", () => {
    it("POM: Subtype Filter → 10 orders (All Dance = 50)", () => {
      const pomFiltered = filterMTDRecords(DANCE_DEMO_MTD_RECORDS, {
        form: "school-all-star-dance",
        danceSubtype: "pom",
        orderById: danceOrderById,
      });
      assert.equal(pomFiltered.length, 10);
    });

    it("POM: Detail View Fields → INCLUDES divisionOfTeam, EXCLUDES style, styleOfGamedayMix, licensingRequired", () => {
      const pomOrder = danceOrderById.get("ord-demo-dance-pom-01")!;
      const sections = getOrderDetailSections(pomOrder);

      const sectionTitles = sections.map((s: any) => s.title);
      assert.ok(sectionTitles.includes("School / Program information"));
      assert.ok(sectionTitles.includes("Mix & Routine information"));

      const allKeys = sections.flatMap((s: any) => s.fields.map((f: any) => f.key));
      assert.ok(allKeys.includes("divisionOfTeam"), "divisionOfTeam must be rendered on POM");
      assert.ok(!allKeys.includes("style"), "generic style must NOT render on POM");
      assert.ok(!allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix must NOT render on POM");
      assert.ok(!allKeys.includes("licensingRequired"), "licensingRequired must NOT render on POM");
    });

    it("POM: VO Toggles Math → $475 Package Price (base), Payroll Base $375 / $400 / $450 / $475", () => {
      const base = calculateDanceOrderPricing({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers" });
      assert.equal(base.customerFacingPrice, 475);
      assert.equal(base.payrollBasePrice, 375);

      const trad = calculateDanceOrderPricing({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasTraditionalVoiceover: true });
      assert.equal(trad.customerFacingPrice, 475);
      assert.equal(trad.payrollBasePrice, 400);

      const themed = calculateDanceOrderPricing({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasThemedVoiceover: true });
      assert.equal(themed.customerFacingPrice, 475);
      assert.equal(themed.payrollBasePrice, 450);

      const both = calculateDanceOrderPricing({ danceFormSubtype: "pom", packageType: "DANCE MIX", musicAffiliate: "Power Music Covers", hasTraditionalVoiceover: true, hasThemedVoiceover: true });
      assert.equal(both.customerFacingPrice, 475);
      assert.equal(both.payrollBasePrice, 475);
    });

    it("POM: Completion Breakdown & Coupon + Payroll Integration", () => {
      const couponEval = evaluateCouponCode("AUSTIN2026", discountCodes);
      assert.equal(couponEval.status, "valid");

      const pricing = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "CUSTOM POM",
        musicAffiliate: "Power Music Covers",
        hasTraditionalVoiceover: true,
        hasThemedVoiceover: true,
      });

      const discount = Math.round(pricing.payrollBasePrice * 0.10); // 830 * 10% = 83
      const finalPayroll = pricing.payrollBasePrice - discount; // 830 - 83 = 747

      const payrollCalc = computeClientPayroll(caseyProducer, pricing.customerFacingPrice - discount, {
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

      assert.equal(payrollCalc.producerPayout, Math.round(747 * 0.70 * 100) / 100);
    });
  });

  describe("Subtype 2: Hip Hop Full End-to-End Run", () => {
    it("Hip Hop: Subtype Filter → 10 orders", () => {
      const filtered = filterMTDRecords(DANCE_DEMO_MTD_RECORDS, {
        form: "school-all-star-dance",
        danceSubtype: "hip-hop",
        orderById: danceOrderById,
      });
      assert.equal(filtered.length, 10);
    });

    it("Hip Hop: Detail View Fields → EXCLUDES divisionOfTeam, style, styleOfGamedayMix, licensingRequired", () => {
      const order = danceOrderById.get("ord-demo-dance-hiphop-01")!;
      const sections = getOrderDetailSections(order);
      const allKeys = sections.flatMap((s: any) => s.fields.map((f: any) => f.key));

      assert.ok(!allKeys.includes("divisionOfTeam"), "divisionOfTeam must NOT render on Hip Hop");
      assert.ok(!allKeys.includes("style"), "generic style must NOT render on Hip Hop");
      assert.ok(!allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix must NOT render on Hip Hop");
      assert.ok(!allKeys.includes("licensingRequired"), "licensingRequired must NOT render on Hip Hop");
    });

    it("Hip Hop: Package Name Conflict #3 Audit → CUSTOM POM package name used on Hip Hop rate card ($850)", () => {
      const pricing = calculateDanceOrderPricing({
        danceFormSubtype: "hip-hop",
        packageType: "CUSTOM POM",
        musicAffiliate: "Unleash the Beats Covers",
      });
      assert.equal(pricing.customerFacingPrice, 850);
      assert.equal(pricing.payrollBasePrice, 730);
    });
  });

  describe("Subtype 3: Team Performance & Variety Full End-to-End Run", () => {
    it("Team Performance & Variety: Subtype Filter → 10 orders", () => {
      const filtered = filterMTDRecords(DANCE_DEMO_MTD_RECORDS, {
        form: "school-all-star-dance",
        danceSubtype: "team-performance-variety",
        orderById: danceOrderById,
      });
      assert.equal(filtered.length, 10);
    });

    it("Team Performance & Variety: Detail View Fields → INCLUDES divisionOfTeam and style", () => {
      const order = danceOrderById.get("ord-demo-dance-tpv-01")!;
      const sections = getOrderDetailSections(order);
      const allKeys = sections.flatMap((s: any) => s.fields.map((f: any) => f.key));

      assert.ok(allKeys.includes("divisionOfTeam"), "divisionOfTeam must render on Team Performance & Variety");
      assert.ok(allKeys.includes("style"), "style must render on Team Performance & Variety");
    });
  });

  describe("Subtype 4: Gameday Full End-to-End Run", () => {
    it("Gameday: Subtype Filter → 10 orders", () => {
      const filtered = filterMTDRecords(DANCE_DEMO_MTD_RECORDS, {
        form: "school-all-star-dance",
        danceSubtype: "gameday",
        orderById: danceOrderById,
      });
      assert.equal(filtered.length, 10);
    });

    it("Gameday: Detail View Fields → EXCLUDES divisionOfTeam & generic style, INCLUDES styleOfGamedayMix", () => {
      const order = danceOrderById.get("ord-demo-dance-gameday-01")!;
      const sections = getOrderDetailSections(order);
      const allKeys = sections.flatMap((s: any) => s.fields.map((f: any) => f.key));

      assert.ok(!allKeys.includes("divisionOfTeam"), "divisionOfTeam must NOT render on Gameday");
      assert.ok(!allKeys.includes("style"), "generic style must NOT render on Gameday");
      assert.ok(allKeys.includes("styleOfGamedayMix"), "styleOfGamedayMix MUST render on Gameday");
    });
  });

  describe("Subtype 5: Jazz/Kick Full End-to-End Run", () => {
    it("Jazz/Kick: Subtype Filter → 10 orders", () => {
      const filtered = filterMTDRecords(DANCE_DEMO_MTD_RECORDS, {
        form: "school-all-star-dance",
        danceSubtype: "jazz-kick",
        orderById: danceOrderById,
      });
      assert.equal(filtered.length, 10);
    });

    it("Jazz/Kick: Detail View Fields → INCLUDES divisionOfTeam, generic style, and licensingRequired", () => {
      const order = danceOrderById.get("ord-demo-dance-jazzkick-01")!;
      const sections = getOrderDetailSections(order);
      const allKeys = sections.flatMap((s: any) => s.fields.map((f: any) => f.key));

      assert.ok(allKeys.includes("divisionOfTeam"));
      assert.ok(allKeys.includes("style"));
      assert.ok(allKeys.includes("licensingRequired"), "licensingRequired MUST render on Jazz/Kick");
    });
  });

  describe("Category Isolation & Scope Leakage Audit", () => {
    it("Voice Over add-on toggles apply strictly to Dance, never to Cheer", () => {
      const cheerPricing = calculateCheerOrderPricing({
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 1:30",
        musicAffiliate: "Power Music",
      });
      assert.equal((cheerPricing as any).hasTraditionalVoiceover, undefined);
    });

    it("Rally Mix applies strictly to School Cheer, never to Dance or All-Star Cheer", () => {
      const dancePricing = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: "DANCE MIX",
      });
      assert.equal((dancePricing as any).hasRallyMix, undefined);
    });
  });
});
