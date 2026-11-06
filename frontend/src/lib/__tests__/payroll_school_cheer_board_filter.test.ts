import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  matchesFormFilter,
  resolveMTDFormMeta,
} from "../mtd-filters";
import type { MTDRecord, Order } from "@/types";

describe("Payroll School Cheer board filter without allOrders", () => {
  it("classifies board-projected school-cheer-viroc-no when order map is empty", () => {
    const rec = {
      id: "mtd-1",
      orderId: "order-1",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "school-cheer-viroc-no",
      varsityVirocCustomer: "No",
      category: "Cheer",
      programName: "Anderson High School",
      package: "GOLD",
      contactName: "Coach",
      price: 100,
      priceCompliance: "compliant",
      invoice: "",
      status: "completed",
      inPayroll: true,
      inMTD: false,
    } as MTDRecord;

    const emptyOrders = new Map<string, Order>();
    const meta = resolveMTDFormMeta(rec, emptyOrders);
    assert.equal(meta.formType, "school-all-star-cheer");
    assert.equal(meta.cheerFormSubtype, "school-cheer-viroc-no");
    assert.equal(
      matchesFormFilter(
        rec,
        emptyOrders,
        "school-all-star-cheer",
        "school-cheer-viroc-no",
        "pom"
      ),
      true
    );
    assert.equal(
      matchesFormFilter(
        rec,
        emptyOrders,
        "school-all-star-cheer",
        "all-star-cheer",
        "pom"
      ),
      false
    );
  });
});
