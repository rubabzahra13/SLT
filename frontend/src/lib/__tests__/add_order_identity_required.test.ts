import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAddOrderSaveBlockReason,
  getAddOrderRequiredGaps,
  orderHasAddOrderContent,
} from "../order-form-missing";
import { getOrderIdentityFieldKey } from "../order-detail-sections";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import type { Order } from "../../types";

const CASES: Array<{
  formType: Order["formType"];
  cheer?: Order["cheerFormSubtype"];
  dance?: Order["danceFormSubtype"];
  expectedKey: string;
}> = [
  { formType: "school-anthem", expectedKey: "schoolOrganizationName" },
  { formType: "marching-band", expectedKey: "schoolProgramName" },
  { formType: "sports-entertainment", expectedKey: "organizationName" },
  {
    formType: "school-all-star-cheer",
    cheer: "all-star-cheer",
    expectedKey: "gymName",
  },
  {
    formType: "school-all-star-cheer",
    cheer: "school-cheer-viroc-yes",
    expectedKey: "schoolName",
  },
  {
    formType: "school-all-star-dance",
    dance: "pom",
    expectedKey: "schoolProgramName",
  },
];

describe("Add Order: any meaningful field (except coupon / how-found)", () => {
  for (const c of CASES) {
    it(`${c.formType}${c.cheer ? `/${c.cheer}` : ""}${c.dance ? `/${c.dance}` : ""}: empty blocked; identity unlocks`, () => {
      const key = getOrderIdentityFieldKey(c.formType, c.cheer, c.dance);
      assert.equal(key, c.expectedKey);

      const empty = {
        formType: c.formType,
        cheerFormSubtype: c.cheer,
        danceFormSubtype: c.dance,
      } as Order;
      const gaps = getAddOrderRequiredGaps(empty);
      assert.equal(gaps.length, 1);
      assert.equal(gaps[0].key, "_anyField");
      assert.match(formatAddOrderSaveBlockReason(gaps), /at least one order detail/i);

      const filled = {
        ...empty,
        ...orderPatchFromOrderField(c.expectedKey, "Test Org", empty),
      } as Order;
      assert.deepEqual(getAddOrderRequiredGaps(filled), []);
      assert.equal(orderHasAddOrderContent(filled), true);
    });
  }

  it("coach phone alone unlocks save", () => {
    const draft = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      coachPhone: "512-555-0100",
    } as Order;
    assert.deepEqual(getAddOrderRequiredGaps(draft), []);
  });

  it("coupon alone does not unlock save", () => {
    const draft = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      couponCode: "SAVE10",
    } as Order;
    assert.equal(getAddOrderRequiredGaps(draft).length, 1);
    assert.equal(orderHasAddOrderContent(draft), false);
  });

  it("howDidYouFindOut alone does not unlock save", () => {
    const draft = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      howDidYouFindOut: "Instagram",
    } as Order;
    assert.equal(getAddOrderRequiredGaps(draft).length, 1);
  });

  it("coupon + howDidYouFindOut still blocked", () => {
    const draft = {
      formType: "school-anthem",
      couponCode: "X",
      howDidYouFindOut: "Friend",
    } as Order;
    assert.equal(getAddOrderRequiredGaps(draft).length, 1);
  });

  it("pre-filled country / copies / First Available alone do not unlock save", () => {
    const draft = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      country: "United States",
      numberOfCopies: "1",
      requestedEditor: "First Available",
      editorRequest: "FA",
    } as Order;
    assert.equal(orderHasAddOrderContent(draft), false);
    assert.equal(getAddOrderRequiredGaps(draft).length, 1);
  });

  it("school anthem default package alone does not unlock save", () => {
    const draft = {
      formType: "school-anthem",
      packageType: "SCHOOL ANTHEMS",
      package: "SCHOOL ANTHEMS",
      country: "United States",
    } as Order;
    assert.equal(orderHasAddOrderContent(draft), false);
  });
});
