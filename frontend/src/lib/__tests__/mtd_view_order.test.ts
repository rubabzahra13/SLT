import { describe, it } from "node:test";
import assert from "node:assert";
import {
  sortMTDRecordsBySortKey,
  sortMTDRecordsByViewOrder,
} from "../mtd-filters";
import { resolveOrderPackageDisplayPrice } from "../order-package-price";
import type { MTDRecord, Order, Producer } from "../../types";

function rec(
  id: string,
  assignedProducer: string | null,
  programName = id,
  extras: Partial<MTDRecord> = {}
): MTDRecord {
  return {
    id,
    orderId: id,
    category: "Cheer",
    package: "GOLD 2:00",
    formType: "school-all-star-cheer",
    mixStartDate: "",
    mixEndDate: "",
    assignedProducer,
    section: "",
    editorRequest: "FA",
    contactName: id,
    editorInitials: "",
    programName,
    musicTheme: "",
    price: 0,
    priceCompliance: "compliant",
    invoice: "",
    eightCountSheet: "",
    haveSongs: "",
    needsAttention: false,
    status: "active",
    ...extras,
  };
}

describe("MTD view order", () => {
  const producers = [
    {
      id: "p1",
      name: "Casey Park",
      initials: "CP",
      email: "",
      category: "Cheer",
      categories: ["Cheer"],
      status: "active",
    },
    {
      id: "p2",
      name: "Anne Miller",
      initials: "AM",
      email: "",
      category: "Cheer",
      categories: ["Cheer"],
      status: "active",
    },
  ] as unknown as Producer[];

  it("sequence preserves input order", () => {
    const rows = [rec("1", "CP"), rec("2", "AM"), rec("3", null)];
    const out = sortMTDRecordsByViewOrder(rows, "sequence", producers);
    assert.deepEqual(
      out.map((r) => r.id),
      ["1", "2", "3"]
    );
  });

  it("by_producer clusters by first-seen order and keeps unassigned last", () => {
    const rows = [
      rec("1", "CP"),
      rec("2", null),
      rec("3", "AM"),
      rec("4", "CP"),
      rec("5", "AM"),
    ];
    const out = sortMTDRecordsByViewOrder(rows, "by_producer", producers);
    // CP appears first in input, then AM: not A-Z by producer name.
    assert.deepEqual(
      out.map((r) => r.id),
      ["1", "4", "3", "5", "2"]
    );
  });
});

describe("MTD sort by", () => {
  it("sorts A-Z / Z-A by program name", () => {
    const rows = [
      rec("1", null, "Zebra"),
      rec("2", null, "Alpha"),
      rec("3", null, "Mango"),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "name_az").map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "name_za").map((r) => r.id),
      ["1", "3", "2"]
    );
  });

  it("sorts package price high / low by the price column", () => {
    const rows = [
      rec("1", null, "a", { price: 100, package: "" }),
      rec("2", null, "b", { price: 300, package: "NOT_A_PACKAGE" }),
      rec("3", null, "c", { price: 200, package: "" }),
    ];
    const shown = (row: MTDRecord) =>
      resolveOrderPackageDisplayPrice(row, null);
    const high = sortMTDRecordsBySortKey(rows, "price_high");
    const low = sortMTDRecordsBySortKey(rows, "price_low");
    const highPrices = high.map(shown);
    const lowPrices = low.map(shown);
    assert.ok(highPrices[0] >= highPrices[1] && highPrices[1] >= highPrices[2]);
    assert.ok(lowPrices[0] <= lowPrices[1] && lowPrices[1] <= lowPrices[2]);
    assert.deepEqual(
      high.map((r) => r.id),
      [...low].reverse().map((r) => r.id)
    );
  });

  it("sorts payroll package price by the stored column amount", () => {
    const rows = [
      rec("1", null, "a", { price: 100, finalCustomerPrice: 100 }),
      rec("2", null, "b", { price: 300, finalCustomerPrice: 300 }),
      rec("3", null, "c", { price: 200, finalCustomerPrice: 200 }),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "price_high", [], null, {
        packagePrice: "stored",
      }).map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "price_low", [], null, {
        packagePrice: "stored",
      }).map((r) => r.id),
      ["1", "3", "2"]
    );
  });

  it("sorts start / end earliest and oldest", () => {
    const rows = [
      rec("1", null, "a", {
        mixStartDate: "2026-03-10",
        mixEndDate: "2026-03-20",
      }),
      rec("2", null, "b", {
        mixStartDate: "2026-01-05",
        mixEndDate: "2026-01-15",
      }),
      rec("3", null, "c", {
        mixStartDate: "2026-02-01",
        mixEndDate: "2026-02-28",
      }),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "start_earliest").map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "start_oldest").map((r) => r.id),
      ["1", "3", "2"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "end_earliest").map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "end_oldest").map((r) => r.id),
      ["1", "3", "2"]
    );
    const withBlank = [
      ...rows,
      rec("4", null, "d", { mixStartDate: "", mixEndDate: "" }),
    ];
    assert.equal(
      sortMTDRecordsBySortKey(withBlank, "start_earliest").at(-1)?.id,
      "4"
    );
    assert.equal(
      sortMTDRecordsBySortKey(withBlank, "start_oldest").at(-1)?.id,
      "4"
    );
    assert.equal(
      sortMTDRecordsBySortKey(withBlank, "end_earliest").at(-1)?.id,
      "4"
    );
    assert.equal(
      sortMTDRecordsBySortKey(withBlank, "end_oldest").at(-1)?.id,
      "4"
    );
  });

  it("sorts newest by the timestamp, not the mix start date", () => {
    const rows = [
      rec("1", null, "a", {
        createdAt: "2026-01-01T00:00:00Z",
        mixStartDate: "2026-12-01",
      }),
      rec("2", null, "b", {
        createdAt: "2026-06-01T00:00:00Z",
        mixStartDate: "2026-01-01",
      }),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "newest").map((r) => r.id),
      ["2", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "oldest").map((r) => r.id),
      ["1", "2"]
    );
  });

  it("sorts oldest / newest by order createdAt", () => {
    const rows = [
      rec("1", null, "a"),
      rec("2", null, "b"),
      rec("3", null, "c"),
    ];
    const orderById = new Map<string, Order>([
      ["1", { id: "1", createdAt: "2026-03-01T00:00:00Z" } as Order],
      ["2", { id: "2", createdAt: "2026-01-01T00:00:00Z" } as Order],
      ["3", { id: "3", createdAt: "2026-02-01T00:00:00Z" } as Order],
    ]);
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "oldest", [], orderById).map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "newest", [], orderById).map((r) => r.id),
      ["1", "3", "2"]
    );
  });

  it("sorts days booked more / less by calendar span without producer", () => {
    const rows = [
      rec("1", null, "a", {
        mixStartDate: "2026-01-01",
        mixEndDate: "2026-01-03",
      }),
      rec("2", null, "b", {
        mixStartDate: "2026-01-01",
        mixEndDate: "2026-01-10",
      }),
      rec("3", null, "c", {
        mixStartDate: "2026-01-01",
        mixEndDate: "2026-01-05",
      }),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "days_more").map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "days_less").map((r) => r.id),
      ["1", "3", "2"]
    );
  });
});
