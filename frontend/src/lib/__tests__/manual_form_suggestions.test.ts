import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMagentoFormsWithSuggestions,
  listUnmatchedMagentoForms,
  listUnmatchedManualOrders,
  suggestManualsForMagento,
  suggestionLinkLabel,
} from "../manual-form-suggestions";
import { mergeFormWinsPatches } from "../manual-form-merge";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "o1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    isManualEntry: false,
    programName: "",
    gymName: "",
    status: "new",
    ...overrides,
  } as Order;
}

describe("manual Magento suggestions", () => {
  it("lists unmatched Magento forms only", () => {
    const orders = [
      baseOrder({ id: "f1", gymName: "Thunder Gym" }),
      baseOrder({
        id: "m1",
        isManualEntry: true,
        gymName: "Thunder Gym",
      }),
      baseOrder({
        id: "f2",
        gymName: "Linked Form",
        mergedIntoManualOrderId: "m1",
      }),
    ];
    const forms = listUnmatchedMagentoForms(orders);
    assert.equal(forms.length, 1);
    assert.equal(forms[0].id, "f1");
    const manuals = listUnmatchedManualOrders(orders);
    assert.equal(manuals.length, 1);
    assert.equal(manuals[0].id, "m1");
  });

  it("suggests manuals only when both identities filled and similar", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Summit Valley High",
      programName: "Summit Valley High",
    });
    const manuals = [
      baseOrder({
        id: "m1",
        isManualEntry: true,
        gymName: "Summit Valley High",
        programName: "Summit Valley High",
      }),
      baseOrder({
        id: "m2",
        isManualEntry: true,
        gymName: "",
        programName: "",
      }),
      baseOrder({
        id: "m3",
        isManualEntry: true,
        gymName: "Totally Different Academy",
        programName: "Totally Different Academy",
      }),
    ];
    const suggestions = suggestManualsForMagento(form, [
      form,
      ...manuals,
    ]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].manual.id, "m1");
    assert.match(suggestionLinkLabel(suggestions[0].identityName), /Summit/);
  });

  it("returns no suggestions when Magento identity is empty", () => {
    const form = baseOrder({ id: "f1", gymName: "", programName: "" });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Something",
      programName: "Something",
    });
    assert.deepEqual(suggestManualsForMagento(form, [form, manual]), []);
  });

  it("does not suggest across cheer subtypes", () => {
    const form = baseOrder({
      id: "f1",
      cheerFormSubtype: "all-star-cheer",
      gymName: "Thunder Elite",
      programName: "Thunder Elite",
    });
    const virocManual = baseOrder({
      id: "m1",
      isManualEntry: true,
      cheerFormSubtype: "school-cheer-viroc-yes",
      schoolName: "Thunder Elite",
      programName: "Thunder Elite",
      varsityVirocCustomer: "Yes",
    });
    assert.deepEqual(
      suggestManualsForMagento(form, [form, virocManual]),
      []
    );
  });

  it("countMagentoFormsWithSuggestions only counts forms that have a candidate", () => {
    const formWith = baseOrder({
      id: "f1",
      gymName: "Alpha Gym",
      programName: "Alpha Gym",
    });
    const formWithout = baseOrder({
      id: "f2",
      gymName: "Beta Gym",
      programName: "Beta Gym",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Alpha Gym",
      programName: "Alpha Gym",
    });
    assert.equal(
      countMagentoFormsWithSuggestions([formWith, formWithout, manual]),
      1
    );
  });

  it("explicit Match via mergeFormWinsPatches links the pair", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      gymName: "Spirit Athletics",
      programName: "Spirit Athletics",
      city: "Austin",
    });
    const form = baseOrder({
      id: "form-1",
      gymName: "Spirit Athletics",
      programName: "Spirit Athletics",
      city: "Dallas",
      packageType: "PLATINUM",
    });
    const { manualPatch, formPatch } = mergeFormWinsPatches(manual, form);
    assert.equal(manualPatch.mergedFormOrderId, "form-1");
    assert.ok(manualPatch.manualOverlapSnapshot);
    assert.equal(formPatch.mergedIntoManualOrderId, "manual-1");
  });
});
