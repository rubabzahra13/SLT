import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS,
  normalizeSchoolCheerVirocMusicAffiliateLabel,
  schoolCheerVirocMusicAffiliateOptionsForPackage,
} from "../pricing-reference";
import { musicAffiliateOptionsForOrder } from "../../components/mtd/MusicAffiliateField";
import { normalizeOrder } from "../order-form";
import type { Order } from "../../types";

describe("School Cheer / V!ROC Music Affiliate options", () => {
  it("catalog is exactly three Magento options (no Songs for Cheer)", () => {
    assert.deepEqual([...SCHOOL_CHEER_VIROC_MUSIC_AFFILIATE_OPTIONS], [
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      "100% original custom music (titanium package only)",
      "Non compliant",
    ]);
  });

  it("non-Titanium packages hide titanium-only original custom music", () => {
    assert.deepEqual(
      schoolCheerVirocMusicAffiliateOptionsForPackage("GOLD 2:00"),
      [
        "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
        "Non compliant",
      ]
    );
  });

  it("Titanium packages hide Power Music & Unleash covers and keep original custom", () => {
    assert.deepEqual(
      schoolCheerVirocMusicAffiliateOptionsForPackage("TITANIUM 2:30"),
      [
        "100% original custom music (titanium package only)",
        "Non compliant",
      ]
    );
  });

  it("SoftSelect: All-Star keeps Songs for Cheer; V!ROC does not", () => {
    assert.deepEqual(
      musicAffiliateOptionsForOrder({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        packageType: "GOLD 2:15",
      }),
      [
        "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
        "Songs for Cheer",
        "Non compliant",
      ]
    );
    assert.deepEqual(
      musicAffiliateOptionsForOrder({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "GOLD 2:15",
      }),
      [
        "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
        "Non compliant",
      ]
    );
    assert.deepEqual(
      musicAffiliateOptionsForOrder({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        packageType: "TITANIUM 2:00",
      }),
      [
        "100% original custom music (titanium package only)",
        "Non compliant",
      ]
    );
  });

  it("incoming Magento short forms normalize onto the three V!ROC labels", () => {
    assert.equal(
      normalizeSchoolCheerVirocMusicAffiliateLabel("Power Music"),
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"
    );
    assert.equal(
      normalizeSchoolCheerVirocMusicAffiliateLabel("Non-compliant"),
      "Non compliant"
    );

    const incoming = normalizeOrder({
      id: "ord-viroc-incoming",
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
      cheerFormSubtype: "school-cheer-viroc-yes",
      musicAffiliate: "Power Music",
    } as Order);
    assert.equal(
      incoming.musicAffiliate,
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)"
    );
  });
});
