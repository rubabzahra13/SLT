import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  displayMixLengthLabel,
  formatMixDuration,
  isValidMixDuration,
  mixLengthUsesDurationInputsOnly,
  normalizeMixDurationValue,
  parseMixDurationParts,
} from "../mix-duration";
import { transformOrder } from "../api/orders";
import type { BackendOrder } from "../api/orders";

describe("mix duration parsing", () => {
  it("parses m:ss values", () => {
    assert.deepEqual(parseMixDurationParts("2:00"), {
      minutes: "2",
      seconds: "00",
    });
    assert.deepEqual(parseMixDurationParts("1:45"), {
      minutes: "1",
      seconds: "45",
    });
  });

  it("parses Magento bare-minute values as m:00 for every category", () => {
    for (const raw of ["1", "3", "4", "5"]) {
      const parts = parseMixDurationParts(raw);
      assert.equal(parts.minutes, raw);
      assert.equal(parts.seconds, "00");
      assert.equal(normalizeMixDurationValue(raw), `${raw}:00`);
      assert.equal(isValidMixDuration(raw), true);
    }
    assert.deepEqual(parseMixDurationParts("0"), {
      minutes: "",
      seconds: "",
    });
  });

  it("carries Magento over-seconds typos like 1:60", () => {
    assert.deepEqual(parseMixDurationParts("1:60"), {
      minutes: "2",
      seconds: "00",
    });
    assert.equal(normalizeMixDurationValue("1:60"), "2:00");
    assert.equal(isValidMixDuration("1:60"), true);
  });

  it("leaves TBD and Other tokens alone", () => {
    assert.equal(normalizeMixDurationValue("TBD"), "TBD");
    assert.equal(normalizeMixDurationValue("other"), "other");
    assert.equal(normalizeMixDurationValue("Other…"), "Other…");
  });

  it("formats minutes and seconds", () => {
    assert.equal(formatMixDuration("1", "00"), "1:00");
    assert.equal(formatMixDuration("0", "00"), "");
  });

  it("uses freeform duration inputs for MB and SE only", () => {
    assert.equal(mixLengthUsesDurationInputsOnly("marching-band"), true);
    assert.equal(
      mixLengthUsesDurationInputsOnly("sports-entertainment"),
      true
    );
    assert.equal(
      mixLengthUsesDurationInputsOnly("school-all-star-cheer"),
      false
    );
    assert.equal(
      mixLengthUsesDurationInputsOnly("school-all-star-dance"),
      false
    );
    assert.equal(mixLengthUsesDurationInputsOnly("school-anthem"), false);
  });

  it("displayMixLengthLabel formats bare minutes for tables", () => {
    assert.equal(displayMixLengthLabel("1"), "1:00");
    assert.equal(displayMixLengthLabel("2:30"), "2:30");
    assert.equal(displayMixLengthLabel("TBD"), "TBD");
    assert.equal(displayMixLengthLabel(""), "");
  });
});

describe("transformOrder normalizes Time Length for every form type", () => {
  const formTypes = [
    "school-all-star-cheer",
    "school-all-star-dance",
    "marching-band",
    "sports-entertainment",
  ] as const;

  for (const formType of formTypes) {
    it(`${formType}: bare Magento minutes become m:ss`, () => {
      const order = transformOrder({
        id: `mix-${formType}`,
        form_type: formType,
        time_length_of_mix: "1",
        package: "CUSTOM",
        package_type: "CUSTOM",
      } as BackendOrder);
      assert.equal(order.timeLengthOfMix, "1:00");
    });

    it(`${formType}: keeps existing m:ss`, () => {
      const order = transformOrder({
        id: `mix-${formType}-ms`,
        form_type: formType,
        time_length_of_mix: "1:45",
      } as BackendOrder);
      assert.equal(order.timeLengthOfMix, "1:45");
    });
  }
});
