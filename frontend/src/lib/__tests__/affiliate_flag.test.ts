import { describe, it } from "node:test";
import assert from "node:assert";
import {
  isHeldOnAffiliateFlag,
  isMultiAffiliateSelection,
  openAffiliateFlagPatch,
  parseSelectedMusicAffiliates,
  releaseAffiliateFlagPatch,
  resolveAffiliateFlagPatch,
} from "../affiliate-flag";
import type { Order } from "../../types";

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

  it("holds cheer multi-select on Flagged until released", () => {
    const open = cheerOrder({
      musicAffiliate: "Power Music, Library Music",
      affiliateFlagStatus: "open",
      musicAffiliateSelections: "Power Music, Library Music",
    });
    assert.equal(isHeldOnAffiliateFlag(open), true);

    const resolved = cheerOrder({
      ...resolveAffiliateFlagPatch(open, "Power Music"),
      musicAffiliate: "Power Music",
      affiliateFlagStatus: "resolved",
      musicAffiliateSelections: "Power Music, Library Music",
    });
    assert.equal(isHeldOnAffiliateFlag(resolved), true);
    assert.equal(resolved.musicAffiliate, "Power Music");

    const released = cheerOrder({
      ...resolved,
      ...releaseAffiliateFlagPatch(),
    });
    assert.equal(isHeldOnAffiliateFlag(released), false);
  });

  it("openAffiliateFlagPatch only applies to multi cheer selections", () => {
    assert.equal(
      openAffiliateFlagPatch(
        cheerOrder({ musicAffiliate: "Power Music" })
      ),
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
