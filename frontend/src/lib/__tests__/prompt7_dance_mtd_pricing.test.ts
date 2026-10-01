import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import { calculateDanceOrderPricing } from "../pricing-engine";
import { resolveMTDFormMeta } from "../mtd-filters";
import type { Order } from "../../types";

describe("Prompt 7 — Connect Dance Pricing to MTD", () => {
  const orderById = new Map<string, Order>(
    DANCE_DEMO_ORDERS.map((o) => [o.id, o])
  );

  it("All 50 Dance demo orders return expected customerFacingPrice & match rate card", () => {
    assert.equal(DANCE_DEMO_ORDERS.length, 50);
    assert.equal(DANCE_DEMO_MTD_RECORDS.length, 50);

    for (const record of DANCE_DEMO_MTD_RECORDS) {
      const linkedOrder = orderById.get(record.orderId!);
      assert.ok(linkedOrder, `Linked order found for MTD record ${record.id}`);

      const meta = resolveMTDFormMeta(record, orderById);
      assert.equal(meta.formType, "school-all-star-dance");

      const packageType = linkedOrder.packageType || linkedOrder.package;
      const pricing = calculateDanceOrderPricing({
        danceFormSubtype: meta.danceFormSubtype,
        packageType,
        musicAffiliate: linkedOrder.musicAffiliate,
      });

      // Price displayed in MTD must equal customerFacingPrice
      assert.equal(
        pricing.customerFacingPrice,
        linkedOrder.price,
        `MTD Price match failed for order ${linkedOrder.id}`
      );
      assert.ok(pricing.customerFacingPrice > 0);
    }
  });

  describe("Spot-Check 2 Orders Per Subtype (Customer Price & Raw Music Affiliate)", () => {
    it("POM Spot Checks (ord-demo-dance-pom-01, ord-demo-dance-pom-03)", () => {
      const o1 = orderById.get("ord-demo-dance-pom-01")!;
      const p1 = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: o1.packageType || o1.package,
        musicAffiliate: o1.musicAffiliate,
      });
      assert.equal(p1.customerFacingPrice, 475);
      assert.equal(o1.musicAffiliate, "Power Music Covers");

      const o3 = orderById.get("ord-demo-dance-pom-03")!;
      const p3 = calculateDanceOrderPricing({
        danceFormSubtype: "pom",
        packageType: o3.packageType || o3.package,
        musicAffiliate: o3.musicAffiliate,
      });
      assert.equal(p3.customerFacingPrice, 850);
      assert.equal(o3.musicAffiliate, "Custom Artist Track - Dua Lipa");
    });

    it("Hip Hop Spot Checks (ord-demo-dance-hiphop-01, ord-demo-dance-hiphop-02)", () => {
      const o1 = orderById.get("ord-demo-dance-hiphop-01")!;
      const p1 = calculateDanceOrderPricing({
        danceFormSubtype: "hip-hop",
        packageType: o1.packageType || o1.package,
        musicAffiliate: o1.musicAffiliate,
      });
      assert.equal(p1.customerFacingPrice, 475);
      assert.equal(o1.musicAffiliate, "Unleash the Beats Covers");

      const o2 = orderById.get("ord-demo-dance-hiphop-02")!;
      const p2 = calculateDanceOrderPricing({
        danceFormSubtype: "hip-hop",
        packageType: o2.packageType || o2.package,
        musicAffiliate: o2.musicAffiliate,
      });
      assert.equal(p2.customerFacingPrice, 575);
      assert.equal(o2.musicAffiliate, "Power Music Covers");
    });

    it("Team Performance & Variety Spot Checks (ord-demo-dance-tpv-01, ord-demo-dance-tpv-02)", () => {
      const o1 = orderById.get("ord-demo-dance-tpv-01")!;
      const p1 = calculateDanceOrderPricing({
        danceFormSubtype: "team-performance-variety",
        packageType: o1.packageType || o1.package,
        musicAffiliate: o1.musicAffiliate,
      });
      assert.equal(p1.customerFacingPrice, 500);
      assert.equal(o1.musicAffiliate, "Power Music Covers");

      const o2 = orderById.get("ord-demo-dance-tpv-02")!;
      const p2 = calculateDanceOrderPricing({
        danceFormSubtype: "team-performance-variety",
        packageType: o2.packageType || o2.package,
        musicAffiliate: o2.musicAffiliate,
      });
      assert.equal(p2.customerFacingPrice, 600);
      assert.equal(o2.musicAffiliate, "Unleash the Beats Covers");
    });

    it("Gameday Spot Checks (ord-demo-dance-gameday-01, ord-demo-dance-gameday-03)", () => {
      const o1 = orderById.get("ord-demo-dance-gameday-01")!;
      const p1 = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: o1.packageType || o1.package,
        musicAffiliate: o1.musicAffiliate,
      });
      assert.equal(p1.customerFacingPrice, 100);
      assert.equal(o1.musicAffiliate, "Library Music");

      const o3 = orderById.get("ord-demo-dance-gameday-03")!;
      const p3 = calculateDanceOrderPricing({
        danceFormSubtype: "gameday",
        packageType: o3.packageType || o3.package,
        musicAffiliate: o3.musicAffiliate,
      });
      assert.equal(p3.customerFacingPrice, 200);
      assert.equal(o3.musicAffiliate, "Stadium Marching Track (Unapproved)");
    });

    it("Jazz/Kick Spot Checks (ord-demo-dance-jazzkick-01, ord-demo-dance-jazzkick-02)", () => {
      const o1 = orderById.get("ord-demo-dance-jazzkick-01")!;
      const p1 = calculateDanceOrderPricing({
        danceFormSubtype: "jazz-kick",
        packageType: o1.packageType || o1.package,
        musicAffiliate: o1.musicAffiliate,
      });
      assert.equal(p1.customerFacingPrice, 200);
      assert.equal(o1.musicAffiliate, "Power Music Covers");

      const o2 = orderById.get("ord-demo-dance-jazzkick-02")!;
      const p2 = calculateDanceOrderPricing({
        danceFormSubtype: "jazz-kick",
        packageType: o2.packageType || o2.package,
        musicAffiliate: o2.musicAffiliate,
      });
      assert.equal(p2.customerFacingPrice, 100);
      assert.equal(o2.musicAffiliate, "Unleash the Beats Covers");
    });
  });
});
