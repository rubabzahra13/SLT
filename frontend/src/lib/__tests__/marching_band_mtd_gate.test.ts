import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function marchingBand(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "mb-mtd-1",
    formType: "marching-band",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

describe("Marching Band Move-to-MTD form gate", () => {
  it("producer instrumentation + lyrics notes are optional", () => {
    const order = marchingBand();
    assert.equal(isOptionalOrderFormField("songListSuggestions", order), true);
    assert.equal(isOptionalOrderFormField("routineNotes", order), true);
    assert.equal(isOptionalOrderFormField("packageType", order), false);
    assert.equal(isOptionalOrderFormField("timeLengthOfMix", order), false);
    assert.equal(isOptionalOrderFormField("coachPhone", order), false);
  });

  it("does not block on empty producer notes when required fields are filled", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      marchingBand({
        schoolProgramName: "Lake Travis Band",
        schoolGymAddress: "1 Band Way",
        city: "Austin",
        stateProvince: "TX",
        zipPostalCode: "78701",
        country: "United States",
        coachName: "Pat Coach",
        coachPhone: "555-0100",
        coachEmail: "pat@school.edu",
        billingPersonName: "Alex Bill",
        billingPersonEmail: "alex@school.edu",
        packageType: "CUSTOM MARCHING BAND",
        timeLengthOfMix: "3:00",
        songListSuggestions: "",
        routineNotes: "",
        instrumentationNotes: "",
        lyricalNotes: "",
      })
    );
    assert.deepEqual(
      gaps.map((g) => g.key),
      [],
      `unexpected gaps: ${gaps.map((g) => g.key).join(", ")}`
    );
  });

  it("blocks when package or coach phone is empty", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      marchingBand({
        schoolProgramName: "Lake Travis Band",
        schoolGymAddress: "1 Band Way",
        city: "Austin",
        stateProvince: "TX",
        zipPostalCode: "78701",
        country: "United States",
        coachName: "Pat Coach",
        coachPhone: "",
        coachEmail: "pat@school.edu",
        billingPersonName: "Alex Bill",
        billingPersonEmail: "alex@school.edu",
        packageType: "",
        timeLengthOfMix: "3:00",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("coachPhone"));
    assert.ok(keys.includes("packageType"));
    assert.ok(!keys.includes("songListSuggestions"));
    assert.ok(!keys.includes("routineNotes"));
  });
});
