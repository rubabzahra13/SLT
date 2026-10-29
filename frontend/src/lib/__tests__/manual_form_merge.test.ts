import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyManualFormMerges,
  canSplitManualFormPair,
  classifyFieldProvenance,
  classifyFieldSources,
  enrichOrderWithMatchingForm,
  findMatchingManualOrder,
  isAbsorbedFormOrder,
  buildSplitPreviewRows,
  mergeFormIntoManualOrder,
  mergeFormWinsIntoManualOrder,
  reconcileUnlinkedManualFormPairs,
  repairCorruptCrossCategoryFormMerge,
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

  it("applyManualFormMerges only honors persisted Magento↔manual links", () => {
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
    // Name match alone must NOT merge on board load.
    const unlinked = applyManualFormMerges([manual, form]);
    assert.equal(unlinked.find((o) => o.id === "manual-1")!.city, "");
    assert.equal(
      isAbsorbedFormOrder(unlinked.find((o) => o.id === "form-1")!),
      false
    );

    // Persisted Magento receiveOrder link is applied for display.
    const linkedManual = {
      ...manual,
      mergedFormOrderId: "form-1",
    };
    const linkedForm = {
      ...form,
      mergedIntoManualOrderId: "manual-1",
    };
    const result = applyManualFormMerges([linkedManual, linkedForm]);
    const mergedManual = result.find((o) => o.id === "manual-1")!;
    const absorbed = result.find((o) => o.id === "form-1")!;

    assert.equal(mergedManual.city, "Austin");
    assert.equal(mergedManual.isManualEntry, true);
    assert.equal(isAbsorbedFormOrder(absorbed), true);
    assert.equal(absorbed.mergedIntoManualOrderId, "manual-1");
  });

  it("applyManualFormMerges keeps snapshotted manual edits (soft merge, not hard form-wins)", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Spirit Athletics",
      gymName: "Spirit Athletics",
      city: "Edited City",
      mergedFormOrderId: "form-1",
      manualOverlapSnapshot: { city: "" },
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Spirit Athletics",
      gymName: "Spirit Athletics",
      city: "Austin",
      mergedIntoManualOrderId: "manual-1",
    });
    const result = applyManualFormMerges([manual, form]);
    assert.equal(
      result.find((o) => o.id === "manual-1")!.city,
      "Edited City",
      "persisted manual edit must survive board reload after snapshot"
    );
  });

  it("listPreMtdOrderRecords keeps manual + Magento form as two rows until admin Match links them", () => {
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

    // Without a persisted link, both rows stay on the board.
    const unlinkedRows = listPreMtdOrderRecords([manual, form], []);
    assert.equal(unlinkedRows.length, 2);
    assert.equal(isManualOrderRecord(unlinkedRows.find((r) => r.orderId === "manual-1")!, [manual, form]), true);

    const linkedManual = { ...manual, mergedFormOrderId: "form-1" };
    const linkedForm = { ...form, mergedIntoManualOrderId: "manual-1" };
    const rows = listPreMtdOrderRecords([linkedManual, linkedForm], []);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].orderId, "manual-1");
    assert.equal(isManualOrderRecord(rows[0], [linkedManual, linkedForm]), false);
    assert.equal(rows[0].songListSuggestions, "Song A");
    assert.equal(rows[0].timeLengthOfMix, "2:00");

    const enriched = enrichOrderWithMatchingForm(linkedManual, [
      linkedManual,
      linkedForm,
    ]);
    assert.equal(enriched.city, "Houston");
    assert.equal(enriched.isManualEntry, true);
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

  it("frozen manual snapshot stays under fields after later edits", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Sample Demo Gym",
      city: "Manual City",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Client Form Gym",
      city: "Form City",
    });

    const merged = mergeFormWinsIntoManualOrder(manual, form);
    const edited = {
      ...merged,
      gymName: "Edited After Match",
      city: "Edited City",
    };

    assert.deepEqual(
      classifyFieldProvenance(
        "gymName",
        edited,
        form,
        true,
        merged.manualOverlapSnapshot
      ),
      {
        shown: "form",
        alsoHas: { source: "manual", value: "Sample Demo Gym" },
      }
    );
    assert.deepEqual(
      classifyFieldProvenance(
        "city",
        edited,
        form,
        true,
        merged.manualOverlapSnapshot
      ),
      {
        shown: "form",
        alsoHas: { source: "manual", value: "Manual City" },
      }
    );

    // Re-applying form must not rewrite the frozen snapshot.
    const rematched = mergeFormWinsIntoManualOrder(edited, form);
    assert.equal(rematched.manualOverlapSnapshot?.gymName, "Sample Demo Gym");
    assert.equal(rematched.manualOverlapSnapshot?.city, "Manual City");
  });

  it("refuses cross-category form-wins and repairs corrupted taxonomy", () => {
    const anthemManual = baseOrder({
      id: "manual-anthem",
      isManualEntry: true,
      formType: "school-anthem",
      cheerFormSubtype: undefined,
      programName: "Sample Demo Gym",
      schoolOrganizationName: "Sample Demo Gym",
      gymName: "Sample Demo Gym",
      package: "SCHOOL ANTHEMS",
      packageType: "SCHOOL ANTHEMS",
    });
    const cheerForm = baseOrder({
      id: "form-cheer",
      isManualEntry: false,
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      programName: "Sample Demo Gym",
      gymName: "Sample Demo Gym",
      package: "GOLD 2:00",
    });
    const blocked = mergeFormWinsIntoManualOrder(anthemManual, cheerForm);
    assert.equal(blocked.formType, "school-anthem");
    assert.equal(blocked.mergedFormOrderId, undefined);

    const corrupted = {
      ...anthemManual,
      formType: "school-all-star-cheer" as const,
      cheerFormSubtype: "all-star-cheer" as const,
      package: "GOLD 2:00",
      mergedFormOrderId: "form-cheer",
      manualOverlapSnapshot: {
        formType: "school-anthem",
        package: "SCHOOL ANTHEMS",
        packageType: "SCHOOL ANTHEMS",
        schoolOrganizationName: "Sample Demo Gym",
      },
    };
    const repaired = repairCorruptCrossCategoryFormMerge(corrupted);
    assert.equal(repaired.formType, "school-anthem");
    assert.equal(repaired.package, "SCHOOL ANTHEMS");
    assert.equal(repaired.mergedFormOrderId, undefined);
  });

  it("buildSplitPreviewRows flags restored manual overlaps", () => {
    const before = baseOrder({
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
    const manual = mergeFormWinsIntoManualOrder(before, form);

    const { rows, nextManual } = buildSplitPreviewRows(manual, form);
    assert.equal(nextManual.formType, "school-all-star-cheer");
    assert.equal(nextManual.gymName, "Thunder Gym");
    const gymRow = rows.find((r) => r.key === "gymName");
    assert.ok(gymRow);
    assert.equal(gymRow!.manualValue, "Thunder Gym");
    assert.equal(gymRow!.formValue, "Form Gym");
    assert.equal(gymRow!.manualRestored, true);
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
    assert.equal(splitManual.suppressManualFormMerge, false);
    assert.equal(splitForm.suppressManualFormMerge, false);

    // No persisted link → soft merge does not re-absorb after Split.
    const reapplied = applyManualFormMerges([splitManual, splitForm]);
    assert.equal(isAbsorbedFormOrder(reapplied.find((o) => o.id === "form-1")!), false);
    assert.equal(reapplied.find((o) => o.id === "manual-1")!.mergedFormOrderId, undefined);
  });

  it("canSplitManualFormPair only while both sides stay on Orders", () => {
    const manual = baseOrder({
      id: "manual-1",
      isManualEntry: true,
      mergedFormOrderId: "form-1",
      status: "new",
    });
    const form = baseOrder({
      id: "form-1",
      isManualEntry: false,
      mergedIntoManualOrderId: "manual-1",
      status: "new",
    });
    assert.equal(canSplitManualFormPair(manual, form), true);
    assert.equal(
      canSplitManualFormPair({ ...manual, status: "in_mtd" }, form),
      false
    );
    assert.equal(
      canSplitManualFormPair(manual, { ...form, status: "completed" }),
      false
    );
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
    // Same value on both → one shown source, no duplicate alternate.
    assert.deepEqual(classifyFieldProvenance("gymName", manual, form), {
      shown: "manual",
    });
    assert.deepEqual(classifyFieldProvenance("city", manual, form), {
      shown: "form",
    });
    assert.deepEqual(classifyFieldProvenance("teamName", manual, form), {
      shown: "manual",
    });
    const conflictManual = {
      ...manual,
      city: "Austin",
    };
    assert.deepEqual(
      classifyFieldProvenance("city", conflictManual, form, false),
      {
        shown: "manual",
        alsoHas: { source: "form", value: "Dallas" },
      }
    );
    assert.deepEqual(
      classifyFieldProvenance("city", conflictManual, form, true),
      {
        shown: "form",
        alsoHas: { source: "manual", value: "Austin" },
      }
    );
    // Name match alone does not pair from either side: needs a persisted Magento link.
    assert.equal(resolveManualFormPair(manual, [manual, form]), null);
    assert.equal(resolveManualFormPair(form, [manual, form]), null);
    const linkedManual = { ...manual, mergedFormOrderId: "f1" };
    const linkedForm = { ...form, mergedIntoManualOrderId: "m1" };
    const pair = resolveManualFormPair(linkedManual, [linkedManual, linkedForm]);
    assert.ok(pair);
    assert.equal(pair!.form.id, "f1");
    assert.equal(
      resolveManualFormPair(linkedForm, [linkedManual, linkedForm])!.manual.id,
      "m1"
    );
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

  it("reconcileUnlinkedManualFormPairs links Sports Entertainment by organization name", () => {
    const manual = baseOrder({
      id: "m-se",
      isManualEntry: true,
      formType: "sports-entertainment",
      cheerFormSubtype: undefined,
      programName: "ABC Org",
      organizationName: "ABC Org",
      gymName: "",
      city: "Islamabad",
      package: "PRE-GAME / HALFTIME REMIXED",
    });
    const form = baseOrder({
      id: "f-se",
      isManualEntry: false,
      formType: "sports-entertainment",
      cheerFormSubtype: undefined,
      programName: "ABC Org",
      organizationName: "ABC Org",
      gymName: "",
      city: "Islamabad",
      stateProvince: "ICT",
      timeLengthOfMix: "2:00",
      package: "PRE-GAME / HALFTIME REMIXED",
      createdAt: "2026-10-16T04:30:00.000Z",
    });

    assert.equal(getOrderIdentityName(manual), "ABC Org");
    assert.equal(getOrderIdentityName(form), "ABC Org");

    const { orders, merges } = reconcileUnlinkedManualFormPairs([manual, form]);
    assert.equal(merges.length, 1);
    assert.equal(merges[0].manualId, "m-se");
    assert.equal(merges[0].formId, "f-se");

    const linkedManual = orders.find((o) => o.id === "m-se")!;
    const linkedForm = orders.find((o) => o.id === "f-se")!;
    assert.equal(linkedManual.mergedFormOrderId, "f-se");
    assert.equal(linkedForm.mergedIntoManualOrderId, "m-se");
    assert.equal(linkedManual.isManualEntry, true);
    assert.equal(linkedManual.timeLengthOfMix, "2:00");

    // Pair resolves for Overwrite / Split UI.
    const pair = resolveManualFormPair(linkedManual, orders);
    assert.ok(pair);
    assert.equal(pair!.form.id, "f-se");
  });

  it("reconcileUnlinkedManualFormPairs is idempotent for already-linked pairs", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      mergedFormOrderId: "f1",
    });
    const form = baseOrder({
      id: "f1",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      mergedIntoManualOrderId: "m1",
      city: "Dallas",
    });
    const { merges } = reconcileUnlinkedManualFormPairs([manual, form]);
    assert.equal(merges.length, 0);
  });

  it("reconcileUnlinkedManualFormPairs claims one form per manual", () => {
    const manual = baseOrder({
      id: "m1",
      isManualEntry: true,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
    });
    const formA = baseOrder({
      id: "f-a",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      createdAt: "2026-10-01",
    });
    const formB = baseOrder({
      id: "f-b",
      isManualEntry: false,
      programName: "Thunder Elite",
      gymName: "Thunder Elite",
      createdAt: "2026-10-02",
    });
    const { merges } = reconcileUnlinkedManualFormPairs([manual, formA, formB]);
    assert.equal(merges.length, 1);
    assert.equal(merges[0].formId, "f-a");
  });
});
