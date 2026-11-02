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

  it("SoftSelect always lists all four Magento options (package filter removed)", () => {
    assert.equal(isTitaniumCheerPackage("TITANIUM 2:30"), true);
    assert.equal(isTitaniumCheerPackage("GOLD 2:00"), false);
    const expected = [...ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS];
    assert.deepEqual(
      allStarCheerMusicAffiliateOptionsForPackage("GOLD 2:00"),
      expected
    );
    assert.deepEqual(
      allStarCheerMusicAffiliateOptionsForPackage("TITANIUM 2:30"),
      expected
    );
  });

  it("keeps Magento multi-select intact (does not collapse to Non compliant)", () => {
    const multi = ALL_STAR_CHEER_MUSIC_AFFILIATE_OPTIONS.join(", ");
    assert.equal(normalizeAllStarCheerMusicAffiliateLabel(multi), multi);

    const incoming = normalizeOrder({
      id: "ord-multi-aff",
      customerName: "Coach",
      contactName: "Coach",
      programName: "QA FLAG NABS",
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
      musicAffiliate: multi,
      musicAffiliateSelections: multi,
    } as Order);
    assert.equal(incoming.musicAffiliate, multi);
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
