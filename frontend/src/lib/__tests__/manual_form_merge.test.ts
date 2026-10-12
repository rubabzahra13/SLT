import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyManualFormMerges,
  classifyFieldSources,
  enrichOrderWithMatchingForm,
  findMatchingManualOrder,
  isAbsorbedFormOrder,
  mergeFormIntoManualOrder,
  mergeFormWinsIntoManualOrder,
  resolveManualFormPair,
  splitManualFormPair,
} from "../manual-form-merge";
import {
  normalizeProgramName,
  programNameSimilarity,
  programNamesMatch,
} from "../program-similarity";
import { getOrderIdentityName } from "../order-detail-sections";
import { listPreMtdOrderRecords } from "../order-staging";
import { isManualOrderRecord } from "../order-source";
import { getOrderRequirements } from "../order-requirements";
import type { Order } from "../../types";

function baseOrder(overrides: Partial<Order>): Order {
  const programName = overrides.programName ?? "Thunder Elite";
  const formType = overrides.formType ?? "school-all-star-cheer";
  const cheerFormSubtype =
    overrides.cheerFormSubtype ??
    (formType === "school-all-star-cheer" ? "all-star-cheer" : undefined);
  return {
    id: "ord-1",
    customerName: "Coach",
    contactName: "Coach",
    programName,
    // Identity field for all-star cheer (Program column / match key).
    gymName: overrides.gymName ?? programName,
    category: "Cheer",
    package: "GOLD 2:00",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: true,
    attentionReason: "missing data",
    formType,
    cheerFormSubtype,
    ...overrides,
  };
}

describe("program name similarity", () => {
  it("normalizes case, punctuation, and whitespace", () => {
    assert.equal(
      normalizeProgramName("  Thunder-Elite!! "),
      "thunder elite"
    );
  });

  it("scores exact and near matches at ≥ 90%", () => {
    assert.equal(
      programNameSimilarity("Thunder Elite", "thunder elite"),
      1
    );
    assert.ok(programNamesMatch("Thunder Elite", "Thunder Elitte"));
    assert.ok(programNameSimilarity("Thunder Elite", "Thunder Elitte") >= 0.9);
    assert.equal(programNamesMatch("Thunder Elite", "Lightning Storm"), false);
  });
});

describe("manual ↔ form merge", () => {
  it("fills empty manual fields from form and keeps isManualEntry", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Gym",
      city: "",
      gymBillingAddress: "",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Other Gym",
      city: "Dallas",
      gymBillingAddress: "100 Main St",
      teamName: "Senior Black",
      division: "Level 5",
    });

    const merged = mergeFormIntoManualOrder(manual, form);
    assert.equal(merged.isManualEntry, true);
    assert.equal(merged.id, "manual-1");
    assert.equal(merged.gymName, "Thunder Gym");
    assert.equal(merged.city, "Dallas");
    assert.equal(merged.gymBillingAddress, "100 Main St");
    assert.equal(merged.teamName, "Senior Black");
    assert.equal(merged.mergedFormOrderId, "form-1");
    assert.equal(merged.needsAttention, true);
  });

  it("findMatchingManualOrder requires ≥ 90% program similarity", () => {
    const manuals = [
      baseOrder({ id: "m1", isManualEntry: true, programName: "Thunder Elite" }),
      baseOrder({ id: "m2", isManualEntry: true, programName: "Coastal Wave" }),
    ];
    const form = baseOrder({
      id: "f1",
      programName: "Thunder Elitte",
      isManualEntry: false,
    });
    const match = findMatchingManualOrder(form, manuals);
    assert.ok(match);
    assert.equal(match!.id, "m1");
    assert.equal(
      findMatchingManualOrder(
        baseOrder({ id: "f2", programName: "Totally Different" }),
        manuals
      ),
      null
    );
  });

  it("applyManualFormMerges absorbs form into one manual board row", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Spirit Athletics",
      city: "",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Spirit Athletics",
      city: "Austin",
      gymBillingAddress: "9 Oak Ave",
    });
    const otherForm = baseOrder({
      id: "form-2",
      isManualEntry: false,
      programName: "Unrelated Program",
    });

    const result = applyManualFormMerges([manual, form, otherForm]);
    const mergedManual = result.find((o) => o.id === "manual-1")!;
    const absorbed = result.find((o) => o.id === "form-1")!;
    const untouched = result.find((o) => o.id === "form-2")!;

    assert.equal(mergedManual.city, "Austin");
    assert.equal(mergedManual.isManualEntry, true);
    assert.equal(isAbsorbedFormOrder(absorbed), true);
    assert.equal(absorbed.mergedIntoManualOrderId, "manual-1");
    assert.equal(isAbsorbedFormOrder(untouched), false);
  });

  it("listPreMtdOrderRecords shows one Manual row with form fields filled", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Victory Cheer",
      gymName: "Victory Cheer",
      package: "SILVER 2:00",
      timeLengthOfMix: "",
      songListSuggestions: "",
      sendingEightCountSheets: "",
      city: "",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Victory Cheer",
      // All-star identity field must match for pairing (≥90%).
      gymName: "Victory Cheer",
      timeLengthOfMix: "2:00",
      songListSuggestions: "Song A",
      sendingEightCountSheets: "Yes",
      haveSongs: "HAVE SONGS",
      city: "Houston",
      gymBillingAddress: "1 Victory Way",
      teamName: "Open",
      division: "Level 4",
      country: "United States",
    });

    const rows = listPreMtdOrderRecords([manual, form], []);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].orderId, "manual-1");
    assert.equal(rows[0].isManualScheduleEntry, true);
    assert.equal(isManualOrderRecord(rows[0], [manual, form]), true);
    assert.equal(rows[0].songListSuggestions, "Song A");
    assert.equal(rows[0].timeLengthOfMix, "2:00");

    const enriched = enrichOrderWithMatchingForm(manual, [manual, form]);
    assert.equal(enriched.city, "Houston");
    assert.equal(enriched.gymName, "Victory Cheer");
    assert.equal(enriched.gymBillingAddress, "1 Victory Way");
    assert.equal(enriched.isManualEntry, true);

    // Still Missing data until collections/songs completeness rules are met.
    assert.equal(getOrderRequirements(rows[0]).status, "Missing Data");
  });

  it("form-wins merge keeps form on overlap and manual-only fields", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Gym",
      city: "Manual City",
      teamName: "",
      division: "Manual Div",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Form Gym",
      city: "Form City",
      teamName: "Senior Black",
      division: "",
    });

    const merged = mergeFormWinsIntoManualOrder(manual, form);
    assert.equal(merged.isManualEntry, true);
    assert.equal(merged.gymName, "Form Gym");
    assert.equal(merged.city, "Form City");
    assert.equal(merged.teamName, "Senior Black");
    assert.equal(merged.division, "Manual Div");
    assert.equal(merged.manualOverlapSnapshot?.gymName, "Thunder Gym");
    assert.equal(merged.manualOverlapSnapshot?.city, "Manual City");
    assert.equal(merged.manualOverlapSnapshot?.division, undefined);
  });

  it("split restores two orders and recovers stashed manual overlaps", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Gym",
      city: "Manual City",
      teamName: "",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Form Gym",
      city: "Form City",
      teamName: "Senior Black",
    });
    const merged = mergeFormWinsIntoManualOrder(manual, form);
    const absorbedForm = {
      ...form,
      mergedIntoManualOrderId: "manual-1",
    };
    const { manual: splitManual, form: splitForm } = splitManualFormPair(
      merged,
      absorbedForm
    );

    assert.equal(splitManual.gymName, "Thunder Gym");
    assert.equal(splitManual.city, "Manual City");
    assert.equal(splitManual.teamName, "");
    assert.equal(splitManual.mergedFormOrderId, undefined);
    assert.equal(splitManual.manualOverlapSnapshot, undefined);
    assert.equal(splitForm.mergedIntoManualOrderId, undefined);
    assert.equal(splitForm.gymName, "Form Gym");
    assert.equal(splitForm.teamName, "Senior Black");
    assert.equal(splitManual.suppressManualFormMerge, true);
    assert.equal(splitForm.suppressManualFormMerge, true);

    // Auto-merge must not re-absorb after an admin Split.
    const reapplied = applyManualFormMerges([splitManual, splitForm]);
    assert.equal(isAbsorbedFormOrder(reapplied.find((o) => o.id === "form-1")!), false);
    assert.equal(reapplied.find((o) => o.id === "manual-1")!.mergedFormOrderId, undefined);
  });

  it("tags fields from form and/or manual sources", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      city: "",
      teamName: "Manual Team",
    });
    const form = baseOrder({
      id: "f1",
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      city: "Dallas",
      teamName: "",
    });
    assert.deepEqual(classifyFieldSources("gymName", manual, form).sort(), [
      "form",
      "manual",
    ]);
    assert.deepEqual(classifyFieldSources("city", manual, form), ["form"]);
    assert.deepEqual(classifyFieldSources("teamName", manual, form), [
      "manual",
    ]);
    const pair = resolveManualFormPair(manual, [manual, form]);
    assert.ok(pair);
    assert.equal(pair!.form.id, "f1");
  });

  it("matches form↔manual on category identity field (not only programName)", () => {
    const manual = baseOrder({
      id: "m-anthem",
      isManualEntry: true,
      formType: "school-anthem",
      cheerFormSubtype: undefined,
      programName: "Ignored Board Label",
      schoolOrganizationName: "Monument Valley High",
      gymName: "",
    });
    const form = baseOrder({
      id: "f-anthem",
      isManualEntry: false,
      formType: "school-anthem",
      cheerFormSubtype: undefined,
      programName: "Something Else",
      schoolOrganizationName: "Monument Valley High",
      gymName: "",
    });

    assert.equal(getOrderIdentityName(manual), "Monument Valley High");
    assert.equal(getOrderIdentityName(form), "Monument Valley High");
    const match = findMatchingManualOrder(form, [manual]);
    assert.ok(match);
    assert.equal(match!.id, "m-anthem");
  });

  it("does not pair across cheer subtypes", () => {
    const manual = baseOrder({
      id: "m-youth",
      isManualEntry: true,
      cheerFormSubtype: "youth-rec-cheer",
      programName: "Thunder Elite",
      gymName: "",
    });
    const form = baseOrder({
      id: "f-allstar",
      isManualEntry: false,
      cheerFormSubtype: "all-star-cheer",
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
    });
    assert.equal(findMatchingManualOrder(form, [manual]), null);
  });

  it("does not pair V!ROC Yes with School Cheer (V!ROC No) or other forms", () => {
    const virocManual = baseOrder({
      id: "m-viroc",
      isManualEntry: true,
      cheerFormSubtype: "school-cheer-viroc-yes",
      varsityVirocCustomer: "Yes",
      programName: "Lincoln High",
      schoolName: "Lincoln High",
      gymName: "",
    });
    const schoolCheerForm = baseOrder({
      id: "f-school",
      isManualEntry: false,
      cheerFormSubtype: "school-cheer-viroc-no",
      varsityVirocCustomer: "No",
      programName: "Lincoln High",
      schoolName: "Lincoln High",
      gymName: "",
    });
    assert.equal(findMatchingManualOrder(schoolCheerForm, [virocManual]), null);

    const anthemForm = baseOrder({
      id: "f-anthem",
      isManualEntry: false,
      formType: "school-anthem",
      cheerFormSubtype: undefined,
      programName: "Lincoln High",
      schoolOrganizationName: "Lincoln High",
      gymName: "",
    });
    assert.equal(findMatchingManualOrder(anthemForm, [virocManual]), null);
  });

  it("does not pair across dance subtypes", () => {
    const pomManual = baseOrder({
      id: "m-pom",
      isManualEntry: true,
      formType: "school-all-star-dance",
      cheerFormSubtype: undefined,
      danceFormSubtype: "pom",
      programName: "Coastal Wave",
      schoolProgramName: "Coastal Wave",
      gymName: "",
    });
    const hipHopForm = baseOrder({
      id: "f-hh",
      isManualEntry: false,
      formType: "school-all-star-dance",
      cheerFormSubtype: undefined,
      danceFormSubtype: "hip-hop",
      programName: "Coastal Wave",
      schoolProgramName: "Coastal Wave",
      gymName: "",
    });
    assert.equal(findMatchingManualOrder(hipHopForm, [pomManual]), null);
  });
});
