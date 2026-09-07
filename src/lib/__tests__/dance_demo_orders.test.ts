import assert from "node:assert";
import { test, describe } from "node:test";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import type { DanceFormSubtype } from "../../types";

describe("Prompt 3 — Dance Demo Data Audit (50 Orders, 10 per Subtype)", () => {
  test("Total order and MTD record count check (50 orders, 50 MTD records)", () => {
    assert.strictEqual(DANCE_DEMO_ORDERS.length, 50, "Should have exactly 50 dance demo orders");
    assert.strictEqual(DANCE_DEMO_MTD_RECORDS.length, 50, "Should have exactly 50 dance demo MTD records");
  });

  test("Distribution check: exactly 10 orders per dance subtype", () => {
    const subtypes: DanceFormSubtype[] = [
      "pom",
      "hip-hop",
      "team-performance-variety",
      "gameday",
      "jazz-kick",
    ];

    for (const sub of subtypes) {
      const matching = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === sub);
      assert.strictEqual(
        matching.length,
        10,
        `Subtype ${sub} must have exactly 10 demo orders`
      );
    }
  });

  test("Voiceover distribution check per subtype (2+ Traditional, 2+ Themed, 1+ Both)", () => {
    const subtypes: DanceFormSubtype[] = [
      "pom",
      "hip-hop",
      "team-performance-variety",
      "gameday",
      "jazz-kick",
    ];

    for (const sub of subtypes) {
      const orders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === sub);
      const tradCount = orders.filter((o) => o.hasTraditionalVoiceover).length;
      const themedCount = orders.filter((o) => o.hasThemedVoiceover).length;
      const bothCount = orders.filter((o) => o.hasTraditionalVoiceover && o.hasThemedVoiceover).length;

      assert.ok(tradCount >= 2, `${sub} should have at least 2 traditional voiceover orders`);
      assert.ok(themedCount >= 2, `${sub} should have at least 2 themed voiceover orders`);
      assert.ok(bothCount >= 1, `${sub} should have at least 1 order with BOTH voiceovers active`);
    }
  });

  test("Spot check 2 POM orders against pricing table ($475, $575, $850)", () => {
    const pomOrders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "pom");
    
    // Order 1: DANCE MIX = $475
    const ord1 = pomOrders[0];
    assert.strictEqual(ord1.package, "DANCE MIX");
    assert.strictEqual(ord1.price, 475);
    assert.strictEqual(ord1.divisionOfTeam, "Varsity Large");

    // Order 3: CUSTOM POM = $850
    const ord3 = pomOrders[2];
    assert.strictEqual(ord3.package, "CUSTOM POM");
    assert.strictEqual(ord3.price, 850);
  });

  test("Spot check 2 Hip Hop orders against pricing table & schema (CUSTOM POM = $850, NO divisionOfTeam)", () => {
    const hiphopOrders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "hip-hop");

    // Order 1: DANCE MIX = $475
    const ord1 = hiphopOrders[0];
    assert.strictEqual(ord1.package, "DANCE MIX");
    assert.strictEqual(ord1.price, 475);
    assert.strictEqual((ord1 as any).divisionOfTeam, undefined, "Hip Hop must NOT have divisionOfTeam");

    // Order 3: CUSTOM POM = $850 (Literal name preserved!)
    const ord3 = hiphopOrders[2];
    assert.strictEqual(ord3.package, "CUSTOM POM", "Hip Hop must preserve literal package name CUSTOM POM");
    assert.strictEqual(ord3.price, 850);
    assert.strictEqual((ord3 as any).divisionOfTeam, undefined, "Hip Hop must NOT have divisionOfTeam");
  });

  test("Spot check 2 Team Performance & Variety orders against pricing table ($500, $600)", () => {
    const tpvOrders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "team-performance-variety");

    // Order 1: TP MIX = $500
    const ord1 = tpvOrders[0];
    assert.strictEqual(ord1.package, "TP MIX");
    assert.strictEqual(ord1.price, 500);
    assert.ok(ord1.style, "TPV should have style field");

    // Order 2: TP PLUS MIX = $600
    const ord2 = tpvOrders[1];
    assert.strictEqual(ord2.package, "TP PLUS MIX");
    assert.strictEqual(ord2.price, 600);
  });

  test("Spot check 2 Gameday orders against pricing table ($100, $150, $200)", () => {
    const gamedayOrders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "gameday");

    // Order 1: PERFORMANCE MIX = $100
    const ord1 = gamedayOrders[0];
    assert.strictEqual(ord1.package, "PERFORMANCE MIX");
    assert.strictEqual(ord1.price, 100);
    assert.strictEqual((ord1 as any).divisionOfTeam, undefined, "Gameday must NOT have divisionOfTeam");
    assert.strictEqual((ord1 as any).style, undefined, "Gameday must NOT have generic style field");
    assert.ok(ord1.styleOfGamedayMix, "Gameday must have styleOfGamedayMix field");

    // Order 3: PERFORMANCE EXTREME = $200
    const ord3 = gamedayOrders[2];
    assert.strictEqual(ord3.package, "PERFORMANCE EXTREME");
    assert.strictEqual(ord3.price, 200);
  });

  test("Spot check 2 Jazz/Kick orders against pricing table ($200, $100) & licensing field", () => {
    const jazzOrders = DANCE_DEMO_ORDERS.filter((o) => o.danceFormSubtype === "jazz-kick");

    // Order 1: JAZZ/KICK MIX = $200
    const ord1 = jazzOrders[0];
    assert.strictEqual(ord1.package, "JAZZ/KICK MIX");
    assert.strictEqual(ord1.price, 200);
    assert.strictEqual(ord1.licensingRequired, "yes");

    // Order 2: JAZZ SIMPLE CUT = $100
    const ord2 = jazzOrders[1];
    assert.strictEqual(ord2.package, "JAZZ SIMPLE CUT");
    assert.strictEqual(ord2.price, 100);
  });
});
