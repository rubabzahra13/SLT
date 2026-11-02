import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { packageTierOnly, parsePackage } from "../package";
import { buildLegacyPackage, normalizeOrder } from "../order-form";
import { rawFieldValue } from "../order-detail-fields";
import type { Order } from "@/types";

describe("package type vs mix length", () => {
  it("packageTierOnly strips leaked mix length from package_type", () => {
    assert.equal(packageTierOnly("TBD 1:00"), "TBD");
    assert.equal(packageTierOnly("Gold 2:30"), "Gold");
    assert.equal(packageTierOnly("Platinum"), "Platinum");
    assert.equal(parsePackage("TBD 1:00").limit, "1:00");
  });

  it("buildLegacyPackage does not keep time inside the tier segment", () => {
    assert.equal(buildLegacyPackage("TBD 1:00", "1:00"), "TBD 1:00");
    assert.equal(buildLegacyPackage("TBD", "1:00"), "TBD 1:00");
  });

  it("normalizeOrder and match display keep Package Type tier-only", () => {
    const normalized = normalizeOrder({
      id: "o1",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      packageType: "TBD 1:00",
      package: "TBD 1:00",
      timeLengthOfMix: "1:00",
      programName: "hello guys",
      status: "new",
    } as Order);
    assert.equal(normalized.packageType, "TBD");
    assert.equal(normalized.timeLengthOfMix, "1:00");
    assert.equal(rawFieldValue(normalized, "packageType"), "TBD");
    assert.equal(rawFieldValue(normalized, "timeLengthOfMix"), "1:00");
  });
});
