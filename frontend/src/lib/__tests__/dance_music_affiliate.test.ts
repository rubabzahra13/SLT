import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDanceMusicAffiliates,
  parseDanceMusicAffiliates,
  toggleDanceMusicAffiliate,
} from "../dance-music-affiliate";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

describe("toggleDanceMusicAffiliate exclusivity", () => {
  it("allows Power Music and Unleash together", () => {
    const withPower = toggleDanceMusicAffiliate([], "Power Music Covers");
    assert.deepEqual(withPower, ["Power Music Covers"]);
    assert.deepEqual(
      toggleDanceMusicAffiliate(withPower, "Unleash the Beats Covers"),
      ["Power Music Covers", "Unleash the Beats Covers"]
    );
  });

  it("selecting Non compliant clears both covers", () => {
    assert.deepEqual(
      toggleDanceMusicAffiliate(
        ["Power Music Covers", "Unleash the Beats Covers"],
        "Non compliant"
      ),
      ["Non compliant"]
    );
  });

  it("selecting a cover clears Non compliant", () => {
    assert.deepEqual(
      toggleDanceMusicAffiliate(["Non compliant"], "Power Music Covers"),
      ["Power Music Covers"]
    );
    assert.deepEqual(
      toggleDanceMusicAffiliate(["Non compliant"], "Unleash the Beats Covers"),
      ["Unleash the Beats Covers"]
    );
  });

  it("normalize drops covers when Non compliant is also present", () => {
    assert.deepEqual(
      normalizeDanceMusicAffiliates([
        "Power Music Covers",
        "Non compliant",
        "Unleash the Beats Covers",
      ]),
      ["Non compliant"]
    );
  });

  it("maps Magento short labels onto Power Music / Unleash covers", () => {
    assert.deepEqual(parseDanceMusicAffiliates("Power Music"), [
      "Power Music Covers",
    ]);
    assert.deepEqual(parseDanceMusicAffiliates("Unleash the Beats"), [
      "Unleash the Beats Covers",
    ]);
  });

  it("normalizeOrder applies exclusivity for every dance subtype", () => {
    for (const danceFormSubtype of [
      "pom",
      "hip-hop",
      "team-performance-variety",
      "gameday",
      "jazz-kick",
    ] as const) {
      const order = normalizeOrder({
        id: `dance-${danceFormSubtype}`,
        formType: "school-all-star-dance",
        danceFormSubtype,
        musicAffiliate: "Power Music Covers, Non compliant",
        status: "new",
        createdAt: "2026-01-01",
      } as Order);
      assert.equal(
        order.musicAffiliate,
        "Non compliant",
        danceFormSubtype
      );
    }
  });
});
