import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { getOrderDetailSections } from "../order-detail-sections";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function teamPerf(
  overrides: Partial<Order> = {},
  subtype: string = "team-performance-variety"
): Order {
  return normalizeOrder({
    id: "tp-mtd-1",
    formType: "school-all-star-dance",
    danceFormSubtype: subtype as Order["danceFormSubtype"],
    status: "new",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Order);
}

const filledBase: Partial<Order> = {
  schoolProgramName: "Lake Travis",
  schoolGymAddress: "1 Gym Way",
  city: "Austin",
  stateProvince: "TX",
  zipPostalCode: "78701",
  country: "United States",
  coachName: "Pat Coach",
  coachPhone: "555-0100",
  coachEmail: "pat@school.edu",
  billingPersonName: "Alex Bill",
  billingPersonEmail: "alex@school.edu",
  choreographerName: "N/A",
  choreographerEmail: "N/A",
  numberOfCopies: "3",
  divisionOfTeam: "Varsity",
  style: "Jazz / Lyrical",
  requestedEditor: "First Available",
  packageType: "CUSTOM TEAM PERFORMANCE",
  timeLengthOfMix: "2:30",
  musicAffiliate: "Power Music",
  routineNotes: "Notes here",
  powerMusicCovers: "",
  unleashTheBeatsCovers: "",
  couponCode: "",
};

describe("Team Performance & Variety Move-to-MTD form gate", () => {
  it("form includes Style + Division; covers/coupon optional", () => {
    const order = teamPerf();
    const keys = getOrderDetailSections(order).flatMap((s) =>
      s.fields.map((f) => f.key)
    );
    assert.ok(keys.includes("style"), "Style field required on form");
    assert.ok(keys.includes("divisionOfTeam"));
    assert.equal(isOptionalOrderFormField("style", order), false);
    assert.equal(isOptionalOrderFormField("powerMusicCovers", order), true);
    assert.equal(isOptionalOrderFormField("unleashTheBeatsCovers", order), true);
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
  });

  it("legacy team-performance subtype uses the same field set (includes Style)", () => {
    const keys = getOrderDetailSections(teamPerf({}, "team-performance")).flatMap(
      (s) => s.fields.map((f) => f.key)
    );
    assert.ok(keys.includes("style"));
    assert.ok(keys.includes("divisionOfTeam"));
  });

  it("blocks empty Style; does not block empty covers", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      teamPerf({
        ...filledBase,
        style: "",
        customVoiceovers: "No - None",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("style"));
    assert.ok(!keys.includes("powerMusicCovers"));
    assert.ok(!keys.includes("couponCode"));
  });

  it("voiceover follow-ups required for Yes/other; not for No", () => {
    const noGaps = getOrderFormFieldsBlockingMtd(
      teamPerf({
        ...filledBase,
        customVoiceovers: "No - None",
        voiceoverScript: "",
        pronunciationGuidance: "",
      })
    );
    assert.deepEqual(noGaps.map((g) => g.key), []);

    const yesGaps = getOrderFormFieldsBlockingMtd(
      teamPerf({
        ...filledBase,
        customVoiceovers: "Yes - Included",
        voiceoverScript: "",
        pronunciationGuidance: "",
      })
    ).map((g) => g.key);
    assert.ok(yesGaps.includes("voiceoverScript"));
    assert.ok(yesGaps.includes("pronunciationGuidance"));

    const otherGaps = getOrderFormFieldsBlockingMtd(
      teamPerf({
        ...filledBase,
        customVoiceovers: "Custom request",
        voiceoverScript: "",
        pronunciationGuidance: "",
      })
    ).map((g) => g.key);
    assert.ok(otherGaps.includes("voiceoverScript"));
    assert.ok(otherGaps.includes("pronunciationGuidance"));
  });
});
