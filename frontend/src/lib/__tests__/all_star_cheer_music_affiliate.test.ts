import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS,
  allStarCheerMusicAffiliateOptionsForPackage,
  isTitaniumCheerPackage,
  normalizeAllStarCheerMusicAffiliateLabel,
} from "../pricing-reference";
import { inferMusicAffiliate, normalizeOrder } from "../order-form";
import type { Order } from "../../types";

describe("All-Star Cheer Music Affiliate options", () => {
  it("catalog is exactly the four Magento/form choices", () => {
    assert.deepEqual([...ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS], [
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      "Songs for Cheer",
      "100% original custom music (titanium package only)",
      "Non compliant",
    ]);
  });

  it("non-Titanium packages hide titanium-only original custom music", () => {
    const opts = allStarCheerMusicAffiliateOptionsForPackage("GOLD 2:00");
    assert.deepEqual(opts, [
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      "Songs for Cheer",
      "Non compliant",
    ]);
  });

  it("Titanium packages hide Power Music & Unleash covers and keep original custom", () => {
    assert.equal(isTitaniumCheerPackage("TITANIUM 2:30"), true);
    assert.equal(isTitaniumCheerPackage("GOLD 2:00"), false);
    const opts = allStarCheerMusicAffiliateOptionsForPackage("TITANIUM 2:30");
    assert.deepEqual(opts, [
      "Songs for Cheer",
      "100% original custom music (titanium package only)",
      "Non compliant",
    ]);
  });

  it("incoming Magento text normalizes onto the four All-Star labels", () => {
    assert.equal(
      normalizeAllStarCheerMusicAffiliateLabel("Non-compliant"),
      "Non compliant"
    );
    assert.equal(
      normalizeAllStarCheerMusicAffiliateLabel("songs for cheer"),
      "Songs for Cheer"
    );
    assert.equal(
      normalizeAllStarCheerMusicAffiliateLabel(
        "Power Music & Unleash the Beats Covers"
      ),
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"
    );
    assert.equal(inferMusicAffiliate(""), "");
    assert.equal(inferMusicAffiliate("Non Compliant track"), "Non compliant");

    const incoming = normalizeOrder({
      id: "ord-incoming",
      customerName: "Coach",
      contactName: "Coach",
      programName: "Elite",
      category: "Cheer",
      package: "GOLD 2:00",
      musicTheme: "",
      editorRequest: "FA",
      requestedProducer: "",
      price: 0,
      status: "new",
      createdAt: "2026-10-01",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      musicAffiliate: "Songs for Cheer",
    } as Order);
    assert.equal(incoming.musicAffiliate, "Songs for Cheer");
  });
});
