import { describe, it } from "node:test";
import assert from "node:assert";
import {
  canAssignManualDespiteMissingData,
  orderPackageIsFilled,
} from "../order-source";
import type { MTDRecord, Order } from "../../types";

function baseRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "mtd-1",
    orderId: "ord-1",
    category: "School Anthems",
    package: "",
    formType: "school-anthem",
    mixStartDate: "",
    mixEndDate: "",
    assignedProducer: "",
    section: "",
    editorRequest: "FA",
    contactName: "",
    editorInitials: "",
    programName: "Monument Valley High",
    musicTheme: "",
    price: 0,
    priceCompliance: "compliant",
    invoice: "",
    eightCountSheet: "",
    haveSongs: "",
    needsAttention: true,
    status: "active",
    isManualScheduleEntry: true,
    ...overrides,
  };
}

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    customerName: "Contact",
    contactName: "Contact",
    programName: "Monument Valley High",
    category: "School Anthems",
    package: "",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: true,
    attentionReason: "missing data",
    formType: "school-anthem",
    isManualEntry: true,
    ...overrides,
  };
}

describe("manual Assign unlock when package filled", () => {
  it("treats empty / TBD package as not filled", () => {
    assert.equal(orderPackageIsFilled(baseRecord({ package: "" })), false);
    assert.equal(orderPackageIsFilled(baseRecord({ package: "TBD" })), false);
    assert.equal(
      orderPackageIsFilled(baseRecord({ package: "" }), [
        baseOrder({ package: "TBD" }),
      ]),
      false
    );
  });

  it("treats a real package as filled (record or linked order)", () => {
    assert.equal(
      orderPackageIsFilled(baseRecord({ package: "SCHOOL ANTHEMS" })),
      true
    );
    assert.equal(
      orderPackageIsFilled(baseRecord({ package: "" }), [
        baseOrder({ packageType: "SCHOOL ANTHEMS", package: "SCHOOL ANTHEMS" }),
      ]),
      true
    );
  });

  it("allows Assign for manual + package even when collections would be missing", () => {
    const rec = baseRecord({ package: "SCHOOL ANTHEMS" });
    assert.equal(canAssignManualDespiteMissingData(rec), true);
  });

  it("does not unlock Assign for form orders with package but missing data", () => {
    const formRec = baseRecord({
      isManualScheduleEntry: false,
      package: "GOLD 2:00",
      formType: "school-all-star-cheer",
    });
    const formOrder = baseOrder({
      isManualEntry: false,
      package: "GOLD 2:00",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    assert.equal(
      canAssignManualDespiteMissingData(formRec, [formOrder]),
      false
    );
  });

  it("keeps Assign locked for manual rows until package is set", () => {
    assert.equal(
      canAssignManualDespiteMissingData(baseRecord({ package: "" }), [
        baseOrder({ package: "", packageType: "" }),
      ]),
      false
    );
  });
});
