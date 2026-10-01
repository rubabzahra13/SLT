import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARCHING_BAND_DEMO_ORDERS,
  SPORTS_ENTERTAINMENT_DEMO_ORDERS,
  SCHOOL_ANTHEMS_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
} from "../../data/new-categories-demo-orders";

describe("Prompt 3 — Demo Data Generation (10 per category)", () => {
  it("Generates exactly 30 total demo orders and 30 MTD records (10 per category)", () => {
    assert.equal(MARCHING_BAND_DEMO_ORDERS.length, 10, "Marching Band demo orders must equal 10");
    assert.equal(SPORTS_ENTERTAINMENT_DEMO_ORDERS.length, 10, "Sports Entertainment demo orders must equal 10");
    assert.equal(SCHOOL_ANTHEMS_DEMO_ORDERS.length, 10, "School Anthems demo orders must equal 10");
    assert.equal(NEW_CATEGORIES_DEMO_ORDERS.length, 30);
    assert.equal(NEW_CATEGORIES_DEMO_MTD_RECORDS.length, 30);
  });

  it("Marching Band Spot-Checks: Prices match package rate card + add-ons exactly", () => {
    const mb1 = MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-01")!;
    assert.equal(mb1.packageType, "BAND CHANT");
    assert.equal(mb1.price, 600, "BAND CHANT with no add-ons = $600");

    const mb2 = MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-02")!;
    assert.equal(mb2.price, 650, "BAND CHANT ($600) + Sheet Music ($50) = $650");

    const mb4 = MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-04")!;
    assert.equal(mb4.price, 425, "DRUM CADENCE ORIGINAL ($350) + Add Vocals ($75) = $425");

    const mb7 = MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-07")!;
    assert.equal(mb7.price, 1225, "FIGHT SONG ($1100) + Sheet Music ($50) + Add Vocals ($75) = $1225");

    const mb10 = MARCHING_BAND_DEMO_ORDERS.find((o) => o.id === "ord-demo-mb-10")!;
    assert.equal(mb10.price, 2375, "FIGHT SONG PLUS ($2250) + Sheet Music ($50) + Add Vocals ($75) = $2375");

    const sheetMusicCount = MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasSheetMusicAdd).length;
    const addVocalsCount = MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasAddVocals).length;
    const bothCount = MARCHING_BAND_DEMO_ORDERS.filter((o) => o.hasSheetMusicAdd && o.hasAddVocals).length;

    assert.ok(sheetMusicCount >= 3, `Expected at least 3 orders with Sheet Music Add (found ${sheetMusicCount})`);
    assert.ok(addVocalsCount >= 3, `Expected at least 3 orders with Add Vocals (found ${addVocalsCount})`);
    assert.ok(bothCount >= 2, `Expected at least 1-2 orders with both add-ons (found ${bothCount})`);
  });

  it("Sports Entertainment Spot-Checks: Prices match rate card + rush fee, 10th order is TBD ($0)", () => {
    const se1 = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-01")!;
    assert.equal(se1.packageType, "QUARTER BREAK / TIMEOUT REMIXED");
    assert.equal(se1.isRushOrder, "no");
    assert.equal(se1.price, 150, "QUARTER BREAK no rush = $150");

    const se2 = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-02")!;
    assert.equal(se2.isRushOrder, "yes");
    assert.equal(se2.price, 250, "QUARTER BREAK ($150) + Rush ($100) = $250");

    const se5 = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-05")!;
    assert.equal(se5.packageType, "PRE-GAME / HALFTIME REMIXED");
    assert.equal(se5.price, 250, "PRE-GAME no rush = $250");

    const se6 = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-06")!;
    assert.equal(se6.price, 350, "PRE-GAME ($250) + Rush ($100) = $350");

    const se10 = SPORTS_ENTERTAINMENT_DEMO_ORDERS.find((o) => o.id === "ord-demo-se-10")!;
    assert.equal(se10.packageType, "OTHER (mixes longer than 2:30)");
    assert.equal(se10.price, 0, "OTHER (mixes > 2:30) must have NO assigned price ($0)");
    assert.equal(se10.needsAttention, true, "TBD order must flag needsAttention = true");
  });

  it("School Anthems Spot-Checks: All 10 orders use SCHOOL ANTHEMS package at $1,250", () => {
    for (const sa of SCHOOL_ANTHEMS_DEMO_ORDERS) {
      assert.equal(sa.packageType, "SCHOOL ANTHEMS");
      assert.equal(sa.price, 1250, "SCHOOL ANTHEMS price must always be $1,250");
    }
  });

  it("Schema Isolation: No Music Affiliate field present on any of the 30 demo orders or MTD records", () => {
    for (const order of NEW_CATEGORIES_DEMO_ORDERS) {
      assert.equal((order as any).musicAffiliate, undefined, `Order ${order.id} must NOT have musicAffiliate`);
    }
    for (const record of NEW_CATEGORIES_DEMO_MTD_RECORDS) {
      assert.equal((record as any).musicAffiliate, undefined, `Record ${record.id} must NOT have musicAffiliate`);
    }
  });
});
