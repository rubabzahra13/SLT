import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARCHING_BAND_DEMO_ORDERS,
  SCHOOL_ANTHEMS_DEMO_ORDERS,
  SPORTS_ENTERTAINMENT_DEMO_ORDERS,
  NEW_CATEGORIES_DEMO_MTD_RECORDS,
} from "../../data/new-categories-demo-orders";
import { matchesFormFilter, countMTDByForm } from "../mtd-filters";
import { getOrderDetailSections } from "../order-detail-sections";
import type { Order } from "../../types";

describe("Prompt 4 — MTD Category-Level Filtering (No Subtype) + Dynamic Order Detail View", () => {
  const orderMap = new Map<string, Order>([
    ...MARCHING_BAND_DEMO_ORDERS.map((o) => [o.id, o] as [string, Order]),
    ...SPORTS_ENTERTAINMENT_DEMO_ORDERS.map((o) => [o.id, o] as [string, Order]),
    ...SCHOOL_ANTHEMS_DEMO_ORDERS.map((o) => [o.id, o] as [string, Order]),
  ]);

  it("Top-level Category Filtering: returns exactly 10 demo records per category", () => {
    const mbRecords = NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) =>
      matchesFormFilter(rec, orderMap, "marching-band", "all", "all")
    );
    assert.equal(mbRecords.length, 10);

    const seRecords = NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) =>
      matchesFormFilter(rec, orderMap, "sports-entertainment", "all", "all")
    );
    assert.equal(seRecords.length, 10);

    const saRecords = NEW_CATEGORIES_DEMO_MTD_RECORDS.filter((rec) =>
      matchesFormFilter(rec, orderMap, "school-anthem", "all", "all")
    );
    assert.equal(saRecords.length, 10);
  });

  it("countMTDByForm accurately tallies Marching Band, Sports Entertainment, and School Anthems", () => {
    const counts = countMTDByForm(NEW_CATEGORIES_DEMO_MTD_RECORDS, orderMap);
    assert.equal(counts["marching-band"], 10);
    assert.equal(counts["sports-entertainment"], 10);
    assert.equal(counts["school-anthem"], 10);
  });

  it("Marching Band Detail View: renders exact fields from Prompt 2 schema", () => {
    const mbOrder = MARCHING_BAND_DEMO_ORDERS[0];
    const sections = getOrderDetailSections(mbOrder);

    const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
    assert.ok(allKeys.includes("schoolProgramName"));
    assert.ok(allKeys.includes("schoolGymAddress"));
    assert.ok(allKeys.includes("coachName"));
    assert.ok(allKeys.includes("billingPersonName"));
    assert.ok(allKeys.includes("packageType"));
    assert.ok(allKeys.includes("timeLengthOfMix"));
    assert.ok(allKeys.includes("instrumentationNotes"));
    assert.ok(allKeys.includes("lyricalNotes"));

    // Must NOT contain Cheer/Dance or Music Affiliate fields
    assert.ok(!allKeys.includes("musicAffiliate"));
    assert.ok(!allKeys.includes("customVoiceovers"));
    assert.ok(!allKeys.includes("splitOrNoSplit"));
  });

  it("Sports Entertainment Detail View: renders exact fields from Prompt 2 schema", () => {
    const seOrder = SPORTS_ENTERTAINMENT_DEMO_ORDERS[1];
    const sections = getOrderDetailSections(seOrder);

    const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
    assert.ok(allKeys.includes("organizationName"));
    assert.ok(allKeys.includes("billingAddress"));
    assert.ok(allKeys.includes("musicContactName"));
    assert.ok(allKeys.includes("billingContactName"));
    assert.ok(allKeys.includes("packageType"));
    assert.ok(allKeys.includes("isRushOrder"));
    assert.ok(allKeys.includes("timeLengthOfMix"));
    assert.ok(allKeys.includes("customerSongs"));
    assert.ok(allKeys.includes("additionalNotes"));

    // Must NOT contain Cheer/Dance or Music Affiliate fields
    assert.ok(!allKeys.includes("musicAffiliate"));
    assert.ok(!allKeys.includes("couponCode"));
  });

  it("School Anthems Detail View: renders exact fields from Prompt 2 schema including couponCode", () => {
    const saOrder = SCHOOL_ANTHEMS_DEMO_ORDERS[0];
    const sections = getOrderDetailSections(saOrder);

    const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
    assert.ok(allKeys.includes("schoolOrganizationName"));
    assert.ok(allKeys.includes("schoolBillingAddress"));
    assert.ok(allKeys.includes("musicContactName"));
    assert.ok(allKeys.includes("billingPersonName"));
    assert.ok(allKeys.includes("mascot"));
    assert.ok(allKeys.includes("schoolProgramColors"));
    assert.ok(allKeys.includes("nicknames"));
    assert.ok(allKeys.includes("vocalsPreference"));
    assert.ok(allKeys.includes("instrumentalStylePreference"));
    assert.ok(allKeys.includes("lyricalNotes"));
    assert.ok(allKeys.includes("couponCode"));

    // Must NOT contain Cheer/Dance or Music Affiliate fields
    assert.ok(!allKeys.includes("musicAffiliate"));
    assert.ok(!allKeys.includes("customVoiceovers"));
  });
});
