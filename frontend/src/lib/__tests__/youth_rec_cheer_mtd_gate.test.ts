import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function youthRec(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "yr-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "youth-rec-cheer",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

describe("Youth Rec Cheer Move-to-MTD form gate", () => {
  it("matches required vs optional keys for Youth Rec", () => {
    const order = youthRec();
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
    assert.equal(isOptionalOrderFormField("billingPersonEmail", order), true);
    assert.equal(isOptionalOrderFormField("howDidYouFindOut", order), true);
    assert.equal(isOptionalOrderFormField("youthRecColors", order), false);
    assert.equal(isOptionalOrderFormField("coachPhone", order), false);
    assert.equal(isOptionalOrderFormField("splitOrNoSplit", order), false);
  });

  it("blocks on empty Colors; not on empty howDidYouFindOut, Email Address, or coupon", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      youthRec({
        schoolProgramName: "Rec Stars",
        teamName: "Tiny",
        youthRecColors: "",
        youthRecBillingAddress: "1 Rec Way",
        city: "Austin",
        stateProvince: "TX",
        zipPostalCode: "78701",
        country: "United States",
        coachContactFullName: "Pat Coach",
        coachEmailAddress: "pat@rec.com",
        coachPhone: "555-0100",
        billingPersonEmail: "",
        packageType: "GOLD",
        timeLengthOfMix: "2:00",
        splitOrNoSplit: "Split",
        numberOfCopies: "2",
        sendingEightCountSheets: "Yes",
        songListSuggestions: "Song A",
        routineNotes: "Notes",
        couponCode: "",
        howDidYouFindOut: "",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("youthRecColors"), "Colors must block");
    assert.ok(
      !keys.includes("howDidYouFindOut"),
      "howDidYouFindOut optional"
    );
    assert.ok(!keys.includes("billingPersonEmail"), "Email Address optional");
    assert.ok(!keys.includes("couponCode"), "coupon optional");
  });
});
