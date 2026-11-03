import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isRushOrderFlag,
  payrollRowIsRushOrder,
  recordIsRushOrder,
} from "../forward-order-mail";

describe("Payroll rush from Orders tab", () => {
  it("accepts yes / Yes / true casing", () => {
    assert.equal(isRushOrderFlag("yes"), true);
    assert.equal(isRushOrderFlag("Yes"), true);
    assert.equal(isRushOrderFlag("YES"), true);
    assert.equal(isRushOrderFlag(true), true);
    assert.equal(isRushOrderFlag("no"), false);
    assert.equal(isRushOrderFlag(false), false);
  });

  it("accepts Magento SE fee-suffixed Yes answers", () => {
    assert.equal(isRushOrderFlag("Yes +$100"), true);
    assert.equal(isRushOrderFlag("yes +$100"), true);
    assert.equal(isRushOrderFlag("Yes+$100"), true);
    assert.equal(isRushOrderFlag("No +$0"), false);
  });

  it("SE board toggle follows Magento Yes +$100 client answer", () => {
    assert.equal(
      recordIsRushOrder({
        formType: "sports-entertainment",
        clientRequestedRushOrder: "Yes +$100",
        isRushOrder: "no",
      }),
      true
    );
  });

  it("uses linked order rush when mix record has no rush fields", () => {
    const mix = { isRushOrder: "no", rushFeeQuantity: 0, rushFeeOption: "none" };
    const order = { isRushOrder: "Yes" };
    assert.equal(recordIsRushOrder(mix), false);
    assert.equal(payrollRowIsRushOrder(mix, order), true);
  });

  it("stays false when neither mix nor order is rush", () => {
    assert.equal(
      payrollRowIsRushOrder(
        { isRushOrder: "no" },
        { isRushOrder: "no" }
      ),
      false
    );
  });
});
