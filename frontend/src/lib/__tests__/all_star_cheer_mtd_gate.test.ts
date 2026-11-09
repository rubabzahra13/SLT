import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMatchBlockingMissingFields,
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
  previewMatchFormWinsOrder,
  resolveFinalMatchedOrder,
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

  it("previewMatchFormWinsOrder keeps manual Notes when Magento Notes are blank", () => {
    const manual = allStarCheer({
      id: "manual-notes",
      isManualEntry: true,
      mergedFormOrderId: "form-notes",
      routineNotes: "Just typed notes",
      additionalNotes: "Just typed notes",
      lyricalNotes: "Just typed notes",
    });
    const form = allStarCheer({
      id: "form-notes",
      isManualEntry: false,
      mergedIntoManualOrderId: "manual-notes",
      routineNotes: "",
      additionalNotes: "",
      lyricalNotes: "",
    });
    const preview = previewMatchFormWinsOrder(manual, form);
    assert.equal(preview.routineNotes, "Just typed notes");
    assert.equal(preview.additionalNotes, "Just typed notes");
    assert.equal(preview.lyricalNotes, "Just typed notes");
  });

  it("resolveFinalMatchedOrder prefers Magento and keeps manual snapshot for Split", () => {
    const manual = allStarCheer({
      id: "manual-final",
      isManualEntry: true,
      mergedFormOrderId: "form-final",
      gymName: "ming",
      gymBillingAddress: "old manual address",
      teamColors: "manual red",
      musicTheme: "(BMI)",
      songListSuggestions: "",
      routineNotes: "",
      assignedProducer: "CH",
      invoice: "9876",
      manualOverlapSnapshot: { gymBillingAddress: "old manual address" },
    });
    const form = allStarCheer({
      id: "form-final",
      isManualEntry: false,
      mergedIntoManualOrderId: "manual-final",
      gymName: "ming",
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
      musicAffiliate: "BMI",
      sendingEightCountSheets: "Yes",
      songListSuggestions: "",
      musicTheme: "m · (BMI)",
      routineNotes: "Notes",
    });

    const final = resolveFinalMatchedOrder(manual, [manual, form]);
    // Saved booking values stay. Magento only fills blanks (notes, song list).
    assert.equal(final.gymBillingAddress, "old manual address");
    assert.equal(final.teamColors, "manual red");
    assert.equal(final.routineNotes, "Notes");
    assert.match(String(final.songListSuggestions || ""), /BMI/);
    assert.equal(final.assignedProducer, "CH");
    assert.equal(final.invoice, "9876");
    assert.equal(final.isManualEntry, true);
    assert.deepEqual(final.manualOverlapSnapshot, {
      gymBillingAddress: "old manual address",
    });
    assert.deepEqual(
      getOrderFormFieldsBlockingMtd(manual, [manual, form]).map((g) => g.key),
      []
    );
  });

  it("does not block MTD when Cheer songs live only in Magento musicTheme", () => {
    const manual = allStarCheer({
      id: "manual-ming-songs",
      isManualEntry: true,
      mergedFormOrderId: "form-ming-songs",
      gymName: "ming",
      packageType: "GOLD",
      requestedEditor: "First Available",
      songListSuggestions: "",
      musicTheme: "(BMI)",
    });
    const form = allStarCheer({
      id: "form-ming-songs",
      isManualEntry: false,
      mergedIntoManualOrderId: "manual-ming-songs",
      gymName: "ming",
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
      musicAffiliate: "BMI",
      sendingEightCountSheets: "Yes",
      // Match Confirm typed songs into theme packing, not songListSuggestions.
      songListSuggestions: "",
      musicTheme: "m · (BMI)",
      routineNotes: "Notes",
    });

    assert.ok(
      getOrderFormFieldsBlockingMtd(manual).some(
        (g) => g.key === "songListSuggestions"
      ),
      "empty songListSuggestions on manual alone still blocks"
    );
    assert.deepEqual(
      getOrderFormFieldsBlockingMtd(manual, [manual, form]).map((g) => g.key),
      [],
      "Cheer musicTheme song list from Magento must clear Song list/suggestions"
    );
  });

  it("does not re-ask Magento fields that live only on the absorbed form", () => {
    const manual = allStarCheer({
      id: "manual-ming",
      isManualEntry: true,
      mergedFormOrderId: "form-ming",
      gymName: "ming",
      packageType: "GOLD",
      requestedEditor: "First Available",
      coachName: "Pat Coach",
      coachPhone: "555-0100",
      coachEmail: "pat@gym.com",
      // Magento-only fields empty on booking row (stale match snapshot).
      gymBillingAddress: "",
      zipPostalCode: "",
      division: "",
      teamCoedAllGirl: "",
      teamColors: "",
      sendingEightCountSheets: "",
      routineNotes: "",
    });
    const form = allStarCheer({
      id: "form-ming",
      isManualEntry: false,
      mergedIntoManualOrderId: "manual-ming",
      gymName: "ming",
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
      musicAffiliate: "Varsity",
      sendingEightCountSheets: "Yes",
      songListSuggestions: "Song A",
      routineNotes: "Notes",
    });

    const rawGaps = getOrderFormFieldsBlockingMtd(manual);
    assert.ok(
      rawGaps.some((g) => g.key === "gymBillingAddress"),
      "without overlay, empty manual still blocks"
    );

    const gaps = getOrderFormFieldsBlockingMtd(manual, [manual, form]);
    for (const key of [
      "gymBillingAddress",
      "zipPostalCode",
      "division",
      "teamCoedAllGirl",
      "teamColors",
      "sendingEightCountSheets",
      "routineNotes",
    ]) {
      assert.ok(
        !gaps.some((g) => g.key === key),
        `${key} must come from absorbed Magento form`
      );
    }
    assert.deepEqual(
      gaps.map((g) => g.key).sort(),
      [],
      `matched Magento values must clear MTD gate, got: ${gaps
        .map((g) => g.label)
        .join(", ")}`
    );
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

describe("All-Star Cheer match confirm gate", () => {
  const filledCore: Partial<Order> = {
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
  };

  it("blocks match when a required field is empty on both sides", () => {
    const manual = allStarCheer({
      id: "manual-1",
      isManualEntry: true,
      ...filledCore,
      city: "",
    });
    const magento = allStarCheer({
      id: "form-1",
      isManualEntry: false,
      ...filledCore,
      city: "",
      couponCode: "",
      howDidYouFindOut: "",
    });
    const gaps = getMatchBlockingMissingFields(manual, magento);
    assert.ok(
      gaps.some((g) => g.key === "city"),
      "empty City on both sides must block Confirm match"
    );
    assert.ok(
      !gaps.some((g) => g.key === "couponCode" || g.key === "howDidYouFindOut"),
      "coupon / how-found stay optional at match"
    );
  });

  it("allows match when Magento or manual fills the required field", () => {
    const manual = allStarCheer({
      id: "manual-2",
      isManualEntry: true,
      ...filledCore,
      city: "",
    });
    const magento = allStarCheer({
      id: "form-2",
      isManualEntry: false,
      ...filledCore,
      city: "Austin",
      couponCode: "",
      howDidYouFindOut: "",
    });
    const gaps = getMatchBlockingMissingFields(manual, magento);
    assert.ok(!gaps.some((g) => g.key === "city"));
  });

  it("allows match when only the manual side fills a required field", () => {
    const manual = allStarCheer({
      id: "manual-3",
      isManualEntry: true,
      ...filledCore,
      zipPostalCode: "78701",
    });
    const magento = allStarCheer({
      id: "form-3",
      isManualEntry: false,
      ...filledCore,
      zipPostalCode: "",
      couponCode: "",
      howDidYouFindOut: "",
    });
    const gaps = getMatchBlockingMissingFields(manual, magento);
    assert.ok(
      !gaps.some((g) => g.key === "zipPostalCode"),
      "manual ZIP alone must satisfy the match gate"
    );
  });
});
