import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { getOrderDetailSections } from "../order-detail-sections";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function jazzKick(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "jk-mtd-1",
    formType: "school-all-star-dance",
    danceFormSubtype: "jazz-kick",
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
  style: "Jazz",
  requestedEditor: "First Available",
  packageType: "CUSTOM JAZZ/KICK",
  timeLengthOfMix: "2:15",
  licensingRequired: "Yes",
  musicAffiliate: "Power Music",
  routineNotes: "Notes here",
  powerMusicCovers: "",
  unleashTheBeatsCovers: "",
  couponCode: "",
};

describe("Jazz/Kick Dance Move-to-MTD form gate", () => {
  it("licensing + style + division required; covers + coupon optional", () => {
    const order = jazzKick();
    const keys = getOrderDetailSections(order).flatMap((s) =>
      s.fields.map((f) => f.key)
    );
    assert.ok(keys.includes("licensingRequired"));
    assert.ok(keys.includes("style"));
    assert.ok(keys.includes("divisionOfTeam"));
    assert.equal(isOptionalOrderFormField("licensingRequired", order), false);
    assert.equal(isOptionalOrderFormField("powerMusicCovers", order), true);
    assert.equal(isOptionalOrderFormField("unleashTheBeatsCovers", order), true);
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
  });

  it("blocks empty licensing and style; not empty covers", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      jazzKick({
        ...filledBase,
        licensingRequired: "",
        style: "",
        customVoiceovers: "No - None",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("licensingRequired"));
    assert.ok(keys.includes("style"));
    assert.ok(!keys.includes("powerMusicCovers"));
    assert.ok(!keys.includes("couponCode"));
  });

  it("voiceover follow-ups required only when custom voiceovers is Yes", () => {
    assert.deepEqual(
      getOrderFormFieldsBlockingMtd(
        jazzKick({
          ...filledBase,
          customVoiceovers: "No - None",
          voiceoverScript: "",
          pronunciationGuidance: "",
        })
      ).map((g) => g.key),
      []
    );
    const yesGaps = getOrderFormFieldsBlockingMtd(
      jazzKick({
        ...filledBase,
        customVoiceovers: "Yes - Included",
        voiceoverScript: "",
        pronunciationGuidance: "",
      })
    ).map((g) => g.key);
    assert.ok(yesGaps.includes("voiceoverScript"));
    assert.ok(yesGaps.includes("pronunciationGuidance"));
  });
});
