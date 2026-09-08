import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findLinkedOrder } from "../editor-assignment";
import { resolveMTDFormMeta } from "../mtd-filters";
import { calculateCheerOrderPricing } from "../pricing-engine";
import type { MTDRecord, Order } from "../../types";

describe("Order Resolution & Link Fix Unit Tests", () => {
  it("findLinkedOrder resolves order by legacy_id when order.id is a UUID", () => {
    const record = {
      id: "mtd-demo-cheer-19",
      orderId: "ord-demo-cheer-19",
      section: "CHEERLEADING MUSIC",
      assignedProducer: "NATE",
      category: "Cheer",
      editorRequest: "NC",
      contactName: "Andrew Jackson",
      programName: "SOUTHLAKE CARROLL HIGH SCHOOL",
      package: "TITANIUM 1:45 SPLIT",
      musicTheme: "Beyoncé - ENERGY (Original)",
      price: 2000,
      priceCompliance: "non-compliant",
      invoice: "25119",
      hasRallyMix: true,
      hasExtend8ctAddon: false,
      hasProcessing8ctSheetsAddon: false,
      needsAttention: false,
      status: "active",
      editorInitials: "NATE",
      mixStartDate: "2026-09-08",
      eightCountSheet: "Yes",
      haveSongs: "Have",
    } as unknown as MTDRecord;

    const orders = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        legacyId: "ord-demo-cheer-19",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        varsityVirocCustomer: "Yes",
        customerName: "Andrew Jackson",
        contactName: "Andrew Jackson",
        programName: "SOUTHLAKE CARROLL HIGH SCHOOL",
        category: "Cheer",
        packageType: "Titanium 1:45",
        timeLengthOfMix: "1:45",
        splitOrNoSplit: "Split",
        musicAffiliate: "Beyoncé - ENERGY (Original)",
        package: "TITANIUM 1:45 SPLIT",
        price: 2000,
        status: "new",
        musicTheme: "Beyoncé - ENERGY (Original)",
        editorRequest: "NC",
        requestedProducer: "NATE",
        createdAt: "2026-09-04T11:25:00Z",
      },
    ] as unknown as Order[];

    const matched = findLinkedOrder(record, orders);
    assert.ok(matched);
    assert.equal(matched.legacyId, "ord-demo-cheer-19");
    assert.equal(matched.cheerFormSubtype, "school-cheer-viroc-yes");

    const orderById = new Map<string, Order>();
    for (const o of orders) {
      if (o.id) orderById.set(o.id, o);
      if (o.legacyId) orderById.set(o.legacyId, o);
      if (o.uuid) orderById.set(o.uuid, o);
    }

    const meta = resolveMTDFormMeta(record, orderById);
    assert.equal(meta.cheerFormSubtype, "school-cheer-viroc-yes");

    const pricing = calculateCheerOrderPricing({
      cheerFormSubtype: meta.cheerFormSubtype,
      packageType: matched.packageType || record.package,
      timeLengthOfMix: matched.timeLengthOfMix,
      musicAffiliate: matched.musicAffiliate,
      hasRallyMix: record.hasRallyMix,
    });

    assert.equal(pricing.customerFacingPrice, 2000); // $2000 base package price (Rally Mix is separate add-on)
    assert.equal(pricing.payrollBasePrice, 2350); // $2000 + $350 Rally Mix
    assert.equal(pricing.complianceStatus, "non-compliant");
    assert.equal(pricing.packageName, "TITANIUM");
    assert.equal(pricing.timeLengthOfMix, "1:45");
  });

  it("findLinkedOrder resolves order when order.mtdId matches record.id", () => {
    const record = {
      id: "mtd-101",
      section: "CHEERLEADING MUSIC",
      assignedProducer: "CASEY",
      category: "Cheer",
      editorRequest: "CM",
      contactName: "Sarah Jenkins",
      programName: "LAKE HIGHLANDS HS",
      package: "GOLD 2:00 NO SPLIT",
      musicTheme: "Power Music",
      price: 950,
      priceCompliance: "compliant",
      hasRallyMix: false,
      needsAttention: false,
      status: "active",
      editorInitials: "CASEY",
      mixStartDate: "2026-09-08",
      eightCountSheet: "Yes",
      haveSongs: "Have",
    } as unknown as MTDRecord;

    const orders = [
      {
        id: "order-uuid-101",
        mtdId: "mtd-101",
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        customerName: "Sarah Jenkins",
        contactName: "Sarah Jenkins",
        programName: "LAKE HIGHLANDS HS",
        category: "Cheer",
        packageType: "Gold 2:00",
        timeLengthOfMix: "2:00",
        musicAffiliate: "Power Music",
        package: "GOLD 2:00 NO SPLIT",
        price: 950,
        status: "new",
        musicTheme: "Power Music",
        editorRequest: "CM",
        requestedProducer: "CASEY",
        createdAt: "2026-09-04T11:25:00Z",
      },
    ] as unknown as Order[];

    const matched = findLinkedOrder(record, orders);
    assert.ok(matched);
    assert.equal(matched.cheerFormSubtype, "school-cheer-viroc-no");
  });
});
