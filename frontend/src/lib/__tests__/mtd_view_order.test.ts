import { describe, it } from "node:test";
import assert from "node:assert";
import {
  sortMTDRecordsBySortKey,
  sortMTDRecordsByViewOrder,
} from "../mtd-filters";
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
    // CP appears first in input, then AM — not A–Z by producer name.
    assert.deepEqual(
      out.map((r) => r.id),
      ["1", "4", "3", "5", "2"]
    );
  });
});

describe("MTD sort by", () => {
  it("sorts A–Z / Z–A by program name", () => {
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

  it("sorts package price high / low", () => {
    const rows = [
      rec("1", null, "a", { price: 100 }),
      rec("2", null, "b", { price: 300 }),
      rec("3", null, "c", { finalCustomerPrice: 200 }),
    ];
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "price_high").map((r) => r.id),
      ["2", "3", "1"]
    );
    assert.deepEqual(
      sortMTDRecordsBySortKey(rows, "price_low").map((r) => r.id),
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
