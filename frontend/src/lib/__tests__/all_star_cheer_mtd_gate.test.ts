import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function allStarCheer(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "asc-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

function schoolCheer(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "sc-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "school-cheer-viroc-no",
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

describe("All-Star Cheer Move-to-MTD form gate", () => {
  it("coupon and howDidYouFindOut are optional", () => {
    const order = allStarCheer();
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
    assert.equal(isOptionalOrderFormField("howDidYouFindOut", order), true);
  });

  it("does not block MTD when howDidYouFindOut is empty", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      allStarCheer({
        gymName: "Spirit Athletics",
        gymBillingAddress: "1 Gym Way",
        city: "Dallas",
        stateProvince: "TX",
        zipPostalCode: "75001",
        country: "United States",
        teamName: "Open",
        division: "Level 5",
        teamCoedAllGirl: "All Girl",
        teamColors: "Black / Red",
        numberOfCopies: "3",
        coachName: "Pat Coach",
        coachPhone: "555-0100",
        coachEmail: "pat@gym.com",
        billingPersonName: "Alex Bill",
        billingPersonEmail: "alex@gym.com",
        requestedEditor: "First Available",
        packageType: "GOLD",
        timeLengthOfMix: "2:30",
        musicAffiliate: "None",
        sendingEightCountSheets: "Yes",
        songListSuggestions: "Song A",
        routineNotes: "Notes",
        couponCode: "",
        howDidYouFindOut: "",
      })
    );
    assert.ok(
      !gaps.some((g) => g.key === "howDidYouFindOut"),
      "empty howDidYouFindOut must not block All-Star Cheer MTD"
    );
    assert.ok(
      !gaps.some((g) => g.key === "couponCode"),
      "empty coupon must not block"
    );
  });

  it("School Cheer still treats howDidYouFindOut as optional", () => {
    const order = schoolCheer();
    assert.equal(isOptionalOrderFormField("howDidYouFindOut", order), true);
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
  });
});
