import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatAddOrderSaveBlockReason,
  getAddOrderRequiredGaps,
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

describe("Add Order — only identity name required", () => {
  for (const c of CASES) {
    it(`${c.formType}${c.cheer ? `/${c.cheer}` : ""}${c.dance ? `/${c.dance}` : ""} requires ${c.expectedKey}`, () => {
      const key = getOrderIdentityFieldKey(c.formType, c.cheer, c.dance);
      assert.equal(key, c.expectedKey);

      const empty = {
        formType: c.formType,
        cheerFormSubtype: c.cheer,
        danceFormSubtype: c.dance,
      } as Order;
      const gaps = getAddOrderRequiredGaps(empty);
      assert.equal(gaps.length, 1);
      assert.equal(gaps[0].key, c.expectedKey);
      assert.match(formatAddOrderSaveBlockReason(gaps), /before saving/i);

      const filled = {
        ...empty,
        ...orderPatchFromOrderField(c.expectedKey, "Test Org", empty),
      } as Order;
      assert.deepEqual(getAddOrderRequiredGaps(filled), []);
    });
  }
});
