import assert from "node:assert";
import { test, describe } from "node:test";
import { DANCE_DEMO_ORDERS, DANCE_DEMO_MTD_RECORDS } from "../../data/dance-demo-orders";
import { countMTDByDanceSubtype, filterMTDRecords } from "../mtd-filters";
import { getOrderDetailSections } from "../order-detail-sections";
import type { DanceFormSubtype, Order } from "../../types";

describe("Prompt 4 — Dance Subtype Filtering & Dynamic Detail View", () => {
  const demoOrders = DANCE_DEMO_ORDERS;
  const demoRecords = DANCE_DEMO_MTD_RECORDS;
  const orderById = new Map<string, Order>();
  for (const o of demoOrders) {
    if (o.id) orderById.set(o.id, o);
  }

  test("Dance Subtype Counts: All Dance = 50, Subtypes = 10 each (10/10/10/10/10/50)", () => {
    const counts = countMTDByDanceSubtype(demoRecords, orderById);
    assert.strictEqual(counts.all, 50, "All Dance count should be 50");
    assert.strictEqual(counts.pom, 10, "POM count should be 10");
    assert.strictEqual(counts["hip-hop"], 10, "Hip Hop count should be 10");
    assert.strictEqual(counts["team-performance-variety"], 10, "TPV count should be 10");
    assert.strictEqual(counts.gameday, 10, "Gameday count should be 10");
    assert.strictEqual(counts["jazz-kick"], 10, "Jazz/Kick count should be 10");
  });

  test("Filter MTD records by Dance Subtypes: Row counts match (50 for All, 10 for each subtype)", () => {
    const allDanceRows = filterMTDRecords(demoRecords, {
      form: "school-all-star-dance",
      danceSubtype: "all",
      orderById,
    });
    assert.strictEqual(allDanceRows.length, 50, "Filtering by All Dance should return 50 rows");

    const subtypes: DanceFormSubtype[] = [
      "pom",
      "hip-hop",
      "team-performance-variety",
      "gameday",
      "jazz-kick",
    ];

    for (const sub of subtypes) {
      const rows = filterMTDRecords(demoRecords, {
        form: "school-all-star-dance",
        danceSubtype: sub,
        orderById,
      });
      assert.strictEqual(rows.length, 10, `Filtering by ${sub} should return 10 rows`);
    }
  });

  test("Detail View Field Verification: POM order includes Division of Team, excludes Gameday style & Licensing", () => {
    const pomOrder = demoOrders.find((o) => o.id === "ord-demo-dance-pom-01");
    assert.ok(pomOrder, "POM order must exist");

    const sections = getOrderDetailSections(pomOrder!);
    const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));

    assert.ok(allFieldKeys.includes("divisionOfTeam"), "POM detail view must include divisionOfTeam");
    assert.ok(!allFieldKeys.includes("styleOfGamedayMix"), "POM detail view must NOT include styleOfGamedayMix");
    assert.ok(!allFieldKeys.includes("licensingRequired"), "POM detail view must NOT include licensingRequired");

    // Value accuracy check against underlying demo record
    const schoolProgField = sections.flatMap((s) => s.fields).find((f) => f.key === "schoolProgramName");
    assert.strictEqual(schoolProgField?.value, "Westlake High Dance Team");
  });

  test("Detail View Field Verification: Hip Hop order EXCLUDES Division of Team, Style, Gameday Style & Licensing", () => {
    const hipHopOrder = demoOrders.find((o) => o.id === "ord-demo-dance-hiphop-01");
    assert.ok(hipHopOrder, "Hip Hop order must exist");

    const sections = getOrderDetailSections(hipHopOrder!);
    const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));

    assert.ok(!allFieldKeys.includes("divisionOfTeam"), "Hip Hop detail view must NOT include divisionOfTeam");
    assert.ok(!allFieldKeys.includes("style"), "Hip Hop detail view must NOT include generic style");
    assert.ok(!allFieldKeys.includes("styleOfGamedayMix"), "Hip Hop detail view must NOT include styleOfGamedayMix");
    assert.ok(!allFieldKeys.includes("licensingRequired"), "Hip Hop detail view must NOT include licensingRequired");
  });

  test("Detail View Field Verification: Team Performance & Variety includes Division of Team (in Mix Info) & Style", () => {
    const tpvOrder = demoOrders.find((o) => o.id === "ord-demo-dance-tpv-01");
    assert.ok(tpvOrder, "TPV order must exist");

    const sections = getOrderDetailSections(tpvOrder!);
    const mixSection = sections.find((s) => s.title === "Mix & Routine information");
    assert.ok(mixSection, "Mix & Routine information section must exist");

    const mixKeys = mixSection!.fields.map((f) => f.key);
    assert.ok(mixKeys.includes("divisionOfTeam"), "TPV must place divisionOfTeam in Mix & Routine information");
    assert.ok(mixKeys.includes("style"), "TPV must place generic style in Mix & Routine information");

    const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
    assert.ok(!allKeys.includes("styleOfGamedayMix"), "TPV detail view must NOT include styleOfGamedayMix");
    assert.ok(!allKeys.includes("licensingRequired"), "TPV detail view must NOT include licensingRequired");
  });

  test("Detail View Field Verification: Gameday EXCLUDES Division of Team & generic Style, INCLUDES styleOfGamedayMix", () => {
    const gamedayOrder = demoOrders.find((o) => o.id === "ord-demo-dance-gameday-01");
    assert.ok(gamedayOrder, "Gameday order must exist");

    const sections = getOrderDetailSections(gamedayOrder!);
    const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));

    assert.ok(!allFieldKeys.includes("divisionOfTeam"), "Gameday detail view must NOT include divisionOfTeam");
    assert.ok(!allFieldKeys.includes("style"), "Gameday detail view must NOT include generic style");
    assert.ok(allFieldKeys.includes("styleOfGamedayMix"), "Gameday detail view MUST include styleOfGamedayMix");
    assert.ok(!allFieldKeys.includes("licensingRequired"), "Gameday detail view must NOT include licensingRequired");
  });

  test("Detail View Field Verification: Jazz/Kick INCLUDES Division of Team, generic Style, and Licensing Question", () => {
    const jazzOrder = demoOrders.find((o) => o.id === "ord-demo-dance-jazzkick-01");
    assert.ok(jazzOrder, "Jazz/Kick order must exist");

    const sections = getOrderDetailSections(jazzOrder!);
    const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));

    assert.ok(allFieldKeys.includes("divisionOfTeam"), "Jazz/Kick detail view MUST include divisionOfTeam");
    assert.ok(allFieldKeys.includes("style"), "Jazz/Kick detail view MUST include generic style");
    assert.ok(allFieldKeys.includes("licensingRequired"), "Jazz/Kick detail view MUST include licensingRequired");
    assert.ok(!allFieldKeys.includes("styleOfGamedayMix"), "Jazz/Kick detail view must NOT include styleOfGamedayMix");

    const licenseField = sections.flatMap((s) => s.fields).find((f) => f.key === "licensingRequired");
    assert.strictEqual(licenseField?.label, "Do you attend any event where you are required to show proper licensing?");
    assert.strictEqual(licenseField?.value, "yes");
  });
});
