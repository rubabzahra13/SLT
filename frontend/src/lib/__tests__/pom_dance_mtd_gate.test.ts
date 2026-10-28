import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderFormFieldsBlockingMtd,
  isOptionalOrderFormField,
} from "../order-form-missing";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

function pom(overrides: Partial<Order> = {}): Order {
  return normalizeOrder({
    id: "pom-mtd-1",
    formType: "school-all-star-dance",
    danceFormSubtype: "pom",
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
  divisionOfTeam: "Varsity",
  coachName: "Pat Coach",
  coachPhone: "555-0100",
  coachEmail: "pat@school.edu",
  billingPersonName: "Alex Bill",
  billingPersonEmail: "alex@school.edu",
  choreographerName: "N/A",
  choreographerEmail: "N/A",
  numberOfCopies: "3",
  packageType: "CUSTOM POM",
  requestedEditor: "First Available",
  timeLengthOfMix: "2:15",
  musicAffiliate: "Power Music",
  routineNotes: "Notes here",
  customVoiceovers: "No - None",
  couponCode: "",
};

describe("POM Dance Move-to-MTD form gate", () => {
  it("covers + coupon optional; core Magento fields required", () => {
    const order = pom();
    assert.equal(isOptionalOrderFormField("powerMusicCovers", order), true);
    assert.equal(isOptionalOrderFormField("unleashTheBeatsCovers", order), true);
    assert.equal(isOptionalOrderFormField("couponCode", order), true);
    assert.equal(isOptionalOrderFormField("musicAffiliate", order), false);
    assert.equal(isOptionalOrderFormField("routineNotes", order), false);
    assert.equal(isOptionalOrderFormField("customVoiceovers", order), false);
  });

  it("does not block on empty cover boxes even when Power Music affiliate is set", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      pom({
        ...filledBase,
        powerMusicCovers: "",
        unleashTheBeatsCovers: "",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.deepEqual(keys, [], `unexpected gaps: ${keys.join(", ")}`);
  });

  it("requires voiceover script + pronunciation when custom voiceovers is Yes", () => {
    const gaps = getOrderFormFieldsBlockingMtd(
      pom({
        ...filledBase,
        customVoiceovers: "Yes - Included",
        voiceoverScript: "",
        pronunciationGuidance: "",
        powerMusicCovers: "",
      })
    );
    const keys = gaps.map((g) => g.key);
    assert.ok(keys.includes("voiceoverScript"));
    assert.ok(keys.includes("pronunciationGuidance"));
    assert.ok(!keys.includes("powerMusicCovers"));
    assert.ok(!keys.includes("couponCode"));
  });
});
