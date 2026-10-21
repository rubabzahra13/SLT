import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getAffiliateSelections,
  isHeldOnAffiliateFlag,
  isInvalidMultiAffiliateSelection,
  isMultiAffiliateSelection,
  openAffiliateFlagPatch,
  parseSelectedMusicAffiliates,
  resolveAffiliateFlagPatch,
} from "../affiliate-flag";
import { isAllowedAllStarDanceCoverPair } from "../dance-music-affiliate";
import type { DanceFormSubtype, Order } from "../../types";

function cheerOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord-1",
    customerName: "Coach",
    contactName: "Coach",
    programName: "Spirit Elite",
    category: "Cheer",
    package: "GOLD 2:00",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: true,
    attentionReason: null,
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    ...overrides,
  };
}

function danceOrder(
  subtype: DanceFormSubtype,
  overrides: Partial<Order> = {}
): Order {
  return {
    id: `dance-${subtype}`,
    customerName: "Coach",
    contactName: "Coach",
    programName: "Dance Academy",
    category: "Dance",
    package: "DANCE MIX",
    musicTheme: "",
    editorRequest: "FA",
    requestedProducer: "",
    price: 0,
    status: "new",
    createdAt: "2026-10-01",
    needsAttention: false,
    attentionReason: null,
    formType: "school-all-star-dance",
    danceFormSubtype: subtype,
    ...overrides,
  };
}

const DANCE_SUBTYPES: DanceFormSubtype[] = [
  "pom",
  "hip-hop",
  "team-performance-variety",
  "gameday",
  "jazz-kick",
];

const BOTH_COVERS = "Power Music Covers, Unleash the Beats Covers";

describe("affiliate flag detection", () => {
  it("treats Power Music + Unleash the Beats as a single option", () => {
    const parsed = parseSelectedMusicAffiliates(
      "Power Music + Unleash the Beats"
    );
    assert.deepEqual(parsed, ["Power Music + Unleash the Beats"]);
    assert.equal(
      isMultiAffiliateSelection("Power Music + Unleash the Beats"),
      false
    );
  });

  it("flags multiple distinct cheer affiliates", () => {
    const raw = "Power Music, Unleash the Beats, Library Music";
    const parsed = parseSelectedMusicAffiliates(raw);
    assert.ok(parsed.length >= 2);
    assert.ok(parsed.includes("Power Music"));
    assert.ok(parsed.includes("Unleash the Beats"));
    assert.equal(isMultiAffiliateSelection(raw), true);
  });

  it("holds cheer multi-select on Flagged until admin resolves", () => {
    const open = cheerOrder({
      musicAffiliate: "Power Music, Library Music",
      affiliateFlagStatus: "open",
      musicAffiliateSelections: "Power Music, Library Music",
    });
    assert.equal(isHeldOnAffiliateFlag(open), true);

    const resolved = cheerOrder({
      ...open,
      ...resolveAffiliateFlagPatch(open, "Power Music"),
    });
    assert.equal(resolved.musicAffiliate, "Power Music");
    assert.equal(resolved.affiliateFlagStatus, "released");
    assert.equal(isHeldOnAffiliateFlag(resolved), false);

    const released = cheerOrder({
      musicAffiliate: "Power Music",
      affiliateFlagStatus: "released",
      musicAffiliateSelections: "Power Music, Library Music",
    });
    assert.equal(isHeldOnAffiliateFlag(released), false);
  });

  it("openAffiliateFlagPatch only applies to multi cheer selections", () => {
    assert.equal(
      openAffiliateFlagPatch(cheerOrder({ musicAffiliate: "Power Music" })),
      null
    );
    const patch = openAffiliateFlagPatch(
      cheerOrder({
        musicAffiliate: "Power Music; Unleash the Beats",
      })
    );
    assert.ok(patch);
    assert.equal(patch!.affiliateFlagStatus, "open");
  });
});

describe("All-Star Dance Power + Unleash cover pair", () => {
  it("recognizes the allowed cover pair", () => {
    assert.equal(
      isAllowedAllStarDanceCoverPair([
        "Power Music Covers",
        "Unleash the Beats Covers",
      ]),
      true
    );
    assert.equal(
      isAllowedAllStarDanceCoverPair(["Power Music Covers", "Non compliant"]),
      false
    );
  });

  for (const subtype of DANCE_SUBTYPES) {
    it(`${subtype}: both covers → no flag`, () => {
      const order = danceOrder(subtype, { musicAffiliate: BOTH_COVERS });
      assert.equal(isInvalidMultiAffiliateSelection(order), false);
      assert.equal(isHeldOnAffiliateFlag(order), false);
      assert.equal(openAffiliateFlagPatch(order), null);
      assert.deepEqual(getAffiliateSelections(order), [
        "Power Music Covers",
        "Unleash the Beats Covers",
      ]);
    });

    it(`${subtype}: Power Music Covers only → no flag`, () => {
      const order = danceOrder(subtype, {
        musicAffiliate: "Power Music Covers",
      });
      assert.equal(isInvalidMultiAffiliateSelection(order), false);
      assert.equal(openAffiliateFlagPatch(order), null);
    });

    it(`${subtype}: Unleash the Beats Covers only → no flag`, () => {
      const order = danceOrder(subtype, {
        musicAffiliate: "Unleash the Beats Covers",
      });
      assert.equal(isInvalidMultiAffiliateSelection(order), false);
      assert.equal(openAffiliateFlagPatch(order), null);
    });
  }

  it("flags dance Power Music Covers + Non compliant", () => {
    const order = danceOrder("pom", {
      musicAffiliate: "Power Music Covers, Non compliant",
    });
    assert.equal(isInvalidMultiAffiliateSelection(order), true);
    assert.equal(isHeldOnAffiliateFlag(order), true);
    const patch = openAffiliateFlagPatch(order);
    assert.ok(patch);
    assert.equal(patch!.affiliateFlagStatus, "open");
  });

  it("does not change cheer multi-flag rules", () => {
    const patch = openAffiliateFlagPatch(
      cheerOrder({
        musicAffiliate: "Power Music; Unleash the Beats",
      })
    );
    assert.ok(patch);
    assert.equal(
      openAffiliateFlagPatch(cheerOrder({ musicAffiliate: "Power Music" })),
      null
    );
  });
});
