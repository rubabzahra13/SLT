import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countMagentoFormsWithSuggestions,
  listUnmatchedMagentoForms,
  listUnmatchedManualOrders,
  matchCandidatesBeforeMtd,
  suggestFormsForManual,
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

  it("keeps flagged Magento forms off Match Orders", () => {
    const flagged = baseOrder({
      id: "flagged",
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
      affiliateFlagStatus: "open",
      musicAffiliateSelections: "BMI, SESAC",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Thunder Gym",
      programName: "Thunder Gym",
    });
    assert.deepEqual(listUnmatchedMagentoForms([flagged, manual]), []);
    assert.deepEqual(suggestManualsForMagento(flagged, [flagged, manual]), []);
    assert.equal(countMagentoFormsWithSuggestions([flagged, manual]), 0);
  });

  it("suggestFormsForManual is the inverse of suggestManualsForMagento", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Summit Valley High",
      programName: "Summit Valley High",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Summit Valley High",
      programName: "Summit Valley High",
    });
    const otherForm = baseOrder({
      id: "f2",
      gymName: "Other Gym",
      programName: "Other Gym",
    });
    const fromForm = suggestManualsForMagento(form, [form, manual, otherForm]);
    const fromManual = suggestFormsForManual(manual, [form, manual, otherForm]);
    assert.equal(fromForm.length, 1);
    assert.equal(fromForm[0].manual.id, "m1");
    assert.equal(fromManual.length, 1);
    assert.equal(fromManual[0].form.id, "f1");
  });

  it("pre-MTD soft gate still suggests when manual status is stuck in_mtd", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Thunder Elite Cheer",
      programName: "Thunder Elite Cheer",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      status: "in_mtd",
      gymName: "Thunder Elite Cheer",
      programName: "Thunder Elite Cheer",
    });
    const fromManual = suggestFormsForManual(manual, [form, manual]);
    assert.equal(fromManual.length, 1);
    assert.equal(fromManual[0].form.id, "f1");
    const softGate = matchCandidatesBeforeMtd(manual, [form, manual]);
    assert.equal(softGate.length, 1);
    assert.equal(softGate[0].role, "form");
    const fromFormGate = matchCandidatesBeforeMtd(form, [form, manual]);
    // Match list hides in_mtd manuals, but pairing still works for the form side
    // only when the manual is listed as unmatched — keep list behavior, soft gate
    // for forms uses suggestManualsForMagento (excludes in_mtd manuals).
    assert.equal(fromFormGate.length, 0);
  });

  it("matchCandidatesBeforeMtd returns manuals for an unmatched Magento form", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Thunder Elite Cheer",
      programName: "Thunder Elite Cheer",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      status: "active",
      gymName: "Thunder Elite Cheer",
      programName: "Thunder Elite Cheer",
    });
    const softGate = matchCandidatesBeforeMtd(form, [form, manual]);
    assert.equal(softGate.length, 1);
    assert.equal(softGate[0].role, "manual");
    assert.equal(softGate[0].order.id, "m1");
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

  it("VIROC does not suggest on team name", () => {
    const form = baseOrder({
      id: "f1",
      cheerFormSubtype: "school-cheer-viroc-yes",
      gymName: "",
      schoolName: "",
      programName: "",
      teamName: "Open",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      cheerFormSubtype: "school-cheer-viroc-yes",
      gymName: "",
      schoolName: "",
      programName: "",
      teamName: "Open",
    });
    assert.deepEqual(suggestManualsForMagento(form, [form, manual]), []);
  });

  it("cheer: team-only manuals match Magento team names", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "",
      programName: "",
      teamName: "Open",
    });
    const manuals = [
      baseOrder({
        id: "m1",
        isManualEntry: true,
        gymName: "",
        programName: "",
        teamName: "Open",
      }),
      baseOrder({
        id: "m2",
        isManualEntry: true,
        gymName: "",
        programName: "",
        teamName: "Elite",
      }),
    ];
    const suggestions = suggestManualsForMagento(form, [form, ...manuals]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].manual.id, "m1");
    assert.equal(suggestions[0].identityName, "Open");
  });

  it("cheer: team match ranks first; gym/program still suggested when teams differ", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      teamName: "Open",
    });
    const byGym = baseOrder({
      id: "m-gym",
      isManualEntry: true,
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      teamName: "Elite",
    });
    const byTeam = baseOrder({
      id: "m-team",
      isManualEntry: true,
      gymName: "Other Gym",
      programName: "Other Gym",
      teamName: "Open",
    });
    const suggestions = suggestManualsForMagento(form, [form, byGym, byTeam]);
    assert.equal(suggestions.length, 2);
    assert.equal(suggestions[0].manual.id, "m-team");
    assert.equal(suggestions[0].matchKind, "team");
    assert.equal(suggestions[1].manual.id, "m-gym");
    assert.equal(suggestions[1].matchKind, "identity");
  });

  it("cheer: empty gym and empty team on either side does not suggest", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Spirit Elite",
      programName: "Spirit Elite",
      teamName: "",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "",
      programName: "",
      teamName: "",
    });
    assert.deepEqual(suggestManualsForMagento(form, [form, manual]), []);
  });

  it("dance still matches on school/program only, not a coincidental team", () => {
    const form = baseOrder({
      id: "f1",
      formType: "school-all-star-dance",
      cheerFormSubtype: undefined,
      danceFormSubtype: "pom",
      schoolProgramName: "Westside Dance",
      teamName: "Open",
    });
    const manual = baseOrder({
      id: "m1",
      formType: "school-all-star-dance",
      cheerFormSubtype: undefined,
      danceFormSubtype: "pom",
      isManualEntry: true,
      schoolProgramName: "",
      teamName: "Open",
    });
    assert.deepEqual(suggestManualsForMagento(form, [form, manual]), []);
  });

  it("matches on coach / billing contact even when gym names differ", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "Alpha Gym",
      programName: "Alpha Gym",
      coachEmail: "coach@wowza.test",
      billingPersonEmail: "bill@wowza.test",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "Beta Gym",
      programName: "Beta Gym",
      coachEmail: "coach@wowza.test",
      billingPersonEmail: "bill@wowza.test",
    });
    const suggestions = suggestManualsForMagento(form, [form, manual]);
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].manual.id, "m1");
  });

  it("does not match on Mix-only fields (package / length / division)", () => {
    const form = baseOrder({
      id: "f1",
      gymName: "",
      programName: "",
      packageType: "Platinum",
      package: "Platinum 2:30",
      timeLengthOfMix: "2:30",
      division: "Level 3",
      requestedEditor: "First Available",
    });
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      gymName: "",
      programName: "",
      packageType: "Platinum",
      package: "Platinum 2:30",
      timeLengthOfMix: "2:30",
      division: "Level 3",
      requestedEditor: "First Available",
    });
    assert.deepEqual(suggestManualsForMagento(form, [form, manual]), []);
  });

  it("marching band matches on school/program name or school/gym address", () => {
    const form = baseOrder({
      id: "f-mb",
      formType: "marching-band",
      cheerFormSubtype: undefined,
      schoolProgramName: "Lincoln Band",
      programName: "Lincoln Band",
      gymName: "",
      schoolGymAddress: "100 Band Way",
    });
    const byName = baseOrder({
      id: "m-mb-name",
      formType: "marching-band",
      cheerFormSubtype: undefined,
      isManualEntry: true,
      schoolProgramName: "Lincoln Band",
      programName: "Lincoln Band",
      gymName: "",
      schoolGymAddress: "9 Other Rd",
    });
    const byAddr = baseOrder({
      id: "m-mb-addr",
      formType: "marching-band",
      cheerFormSubtype: undefined,
      isManualEntry: true,
      schoolProgramName: "Other Band",
      programName: "Other Band",
      gymName: "",
      schoolGymAddress: "100 Band Way",
    });
    const suggestions = suggestManualsForMagento(form, [
      form,
      byName,
      byAddr,
    ]);
    assert.equal(suggestions.length, 2);
    assert.ok(suggestions.some((s) => s.manual.id === "m-mb-name"));
    assert.ok(suggestions.some((s) => s.manual.id === "m-mb-addr"));
  });

  it("matches when gym/school name OR billing address matches (either)", () => {
    const byName = suggestManualsForMagento(
      baseOrder({
        id: "f-name",
        gymName: "Wowza Gym",
        programName: "Wowza Gym",
        gymBillingAddress: "9 Other St",
      }),
      [
        baseOrder({
          id: "f-name",
          gymName: "Wowza Gym",
          programName: "Wowza Gym",
          gymBillingAddress: "9 Other St",
        }),
        baseOrder({
          id: "m-name",
          isManualEntry: true,
          gymName: "Wowza Gym",
          programName: "Wowza Gym",
          gymBillingAddress: "1 Different Ave",
        }),
      ]
    );
    assert.equal(byName.length, 1);
    assert.equal(byName[0].manual.id, "m-name");

    const byAddress = suggestManualsForMagento(
      baseOrder({
        id: "f-addr",
        gymName: "Alpha Gym",
        programName: "Alpha Gym",
        gymBillingAddress: "1 Wowza Ave",
      }),
      [
        baseOrder({
          id: "f-addr",
          gymName: "Alpha Gym",
          programName: "Alpha Gym",
          gymBillingAddress: "1 Wowza Ave",
        }),
        baseOrder({
          id: "m-addr",
          isManualEntry: true,
          gymName: "Beta Gym",
          programName: "Beta Gym",
          schoolBillingAddress: "1 Wowza Ave",
        }),
      ]
    );
    assert.equal(byAddress.length, 1);
    assert.equal(byAddress[0].manual.id, "m-addr");
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
