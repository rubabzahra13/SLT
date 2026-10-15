import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import type { Order } from "../../types";

function anthemOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "anthem-1",
    customerName: "Coach",
    contactName: "Coach",
    programName: "Lake Travis",
    category: "School Anthem",
    package: "SCHOOL ANTHEMS",
    musicTheme: "",
    editorRequest: "",
    requestedProducer: "",
    price: 1250,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: true,
    formType: "school-anthem",
    schoolOrganizationName: "Lake Travis High School",
    schoolBillingAddress: "3322 Ranch Rd 620 S",
    city: "Austin",
    stateProvince: "TX",
    zipPostalCode: "78738",
    country: "United States",
    musicContactName: "Alma Mater Committee",
    musicContactPhone: "512-555-0822",
    musicContactEmail: "anthem@laketravisisd.org",
    billingPersonName: "District Finance",
    billingPersonEmail: "ap@laketravisisd.org",
    mascot: "Cavaliers",
    schoolProgramColors: "Red, Black, and White",
    nicknames: "LT Cavs",
    vocalsPreference: "Full Choir + Soloist",
    instrumentationNotes: "Orchestral Brass & Strings",
    lyricalNotes: "Hail to the Cavaliers",
    ...overrides,
  } as Order;
}

describe("School Anthem MTD gate", () => {
  it("blocks unmatched manual School Anthem even when Magento fields are filled", () => {
    const manual = anthemOrder({ isManualEntry: true, couponCode: "" });
    const gaps = getOrderFormFieldsBlockingMtd(manual);
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0]?.key, "mergedFormOrderId");
  });

  it("allows matched Magento School Anthem when required fields are filled; coupon optional", () => {
    const matched = anthemOrder({
      isManualEntry: true,
      mergedFormOrderId: "form-anthem-1",
      couponCode: "",
    });
    assert.deepEqual(getOrderFormFieldsBlockingMtd(matched), []);
  });

  it("blocks matched School Anthem when Magento fields other than coupon are empty", () => {
    const matched = anthemOrder({
      isManualEntry: true,
      mergedFormOrderId: "form-anthem-1",
      mascot: "",
      nicknames: "",
      couponCode: "",
    });
    const gaps = getOrderFormFieldsBlockingMtd(matched);
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("mascot"));
    assert.ok(keys.includes("nicknames"));
    assert.ok(!keys.includes("couponCode"));
  });

  it("treats coupon as optional and School Anthem song/team fields as required", () => {
    const anthem = { formType: "school-anthem" as const };
    assert.equal(isOptionalOrderFormField("couponCode", anthem), true);
    assert.equal(isOptionalOrderFormField("mascot", anthem), false);
    assert.equal(isOptionalOrderFormField("lyricalNotes", anthem), false);
    assert.equal(isOptionalOrderFormField("instrumentationNotes", anthem), false);
    assert.equal(
      isOptionalOrderFormField("instrumentationNotes", {
        formType: "marching-band",
      }),
      true
    );
  });
});
