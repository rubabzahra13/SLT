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

describe("Add Order: identity (Cheer also team name)", () => {
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
      assert.match(
        formatAddOrderSaveBlockReason(gaps),
        /at least 1 field from Gym or Coach \/ Billing\. Division and Team Name do not count/i
      );

      const filled = {
        ...empty,
        ...orderPatchFromOrderField(c.expectedKey, "Test Org", empty),
      } as Order;
      assert.deepEqual(getAddOrderRequiredGaps(filled), []);
      assert.equal(orderHasAddOrderContent(filled), true);
    });
  }

  it("cheer: gym / coach / billing unlock; team name does not", () => {
    const withPhone = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      coachPhone: "512-555-0100",
    } as Order;
    assert.equal(orderHasAddOrderContent(withPhone), true);
    const withBilling = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      gymBillingAddress: "100 Main St",
    } as Order;
    assert.equal(orderHasAddOrderContent(withBilling), true);
    const withTeam = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      teamName: "Open",
    } as Order;
    assert.equal(orderHasAddOrderContent(withTeam), false);
  });

  it("VIROC / School Cheer: any one form field unlocks save (no Magento team name)", () => {
    const virocEmpty = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "school-cheer-viroc-yes",
      teamName: "Open",
    } as Order;
    // Team Name is not on the VIROC Magento form, so it does not count.
    assert.equal(orderHasAddOrderContent(virocEmpty), false);
    const viroc = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "school-cheer-viroc-yes",
      schoolName: "Lake Travis",
    } as Order;
    assert.equal(orderHasAddOrderContent(viroc), true);
    const school = {
      formType: "school-all-star-cheer",
      cheerFormSubtype: "school-cheer-viroc-no",
      coachPhone: "512-555-0100",
    } as Order;
    assert.equal(orderHasAddOrderContent(school), true);
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
