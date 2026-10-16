import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyDbMusicAffiliates,
  getCompliantAffiliateLabelsForCategory,
  getRuntimeMusicAffiliateSoftSelect,
  syncRuntimeCompliantAffiliateLabels,
} from "../pricing-reference";
import { determineComplianceStatus } from "../pricing-engine";
import { resolveOrderPriceCompliance } from "../pricing";
import { musicAffiliateOptionsForOrder } from "../../components/mtd/MusicAffiliateField";
import type { BackendMusicAffiliateOption } from "../api/music-affiliates";

function row(
  partial: Partial<BackendMusicAffiliateOption> & {
    subtype_id: string;
    option_key: string;
    label: string;
    is_compliant: boolean;
  }
): BackendMusicAffiliateOption {
  return {
    id: partial.id || partial.option_key,
    form_type: "school-all-star-cheer",
    subtype_id: partial.subtype_id,
    option_key: partial.option_key,
    label: partial.label,
    is_compliant: partial.is_compliant,
    enabled: partial.enabled ?? true,
    sort_order: partial.sort_order ?? 0,
  };
}

describe("DB music affiliate catalog → SoftSelect + compliance", () => {
  it("hydrates SoftSelect and compliance from music_affiliate_options rows", () => {
    // Avoid writing localStorage in node tests — pass an empty store.
    const store = { categories: {} };
    applyDbMusicAffiliates(
      [
        row({
          subtype_id: "all-star-cheer",
          option_key: "power-music-unleash-covers",
          label:
            "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
          is_compliant: true,
          sort_order: 0,
        }),
        row({
          subtype_id: "all-star-cheer",
          option_key: "songs-for-cheer",
          label: "Songs for Cheer",
          is_compliant: true,
          sort_order: 1,
        }),
        row({
          subtype_id: "all-star-cheer",
          option_key: "non-compliant",
          label: "Non compliant",
          is_compliant: false,
          sort_order: 2,
        }),
        row({
          subtype_id: "school-cheer",
          option_key: "power-music-unleash-covers",
          label:
            "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
          is_compliant: true,
          sort_order: 0,
        }),
        row({
          subtype_id: "school-cheer",
          option_key: "non-compliant",
          label: "Non compliant",
          is_compliant: false,
          sort_order: 1,
        }),
      ],
      store
    );

    // SoftSelect catalogs match Pricing Reference per subtype.
    assert.deepEqual(getRuntimeMusicAffiliateSoftSelect("All-Star Cheer"), [
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      "Songs for Cheer",
      "Non compliant",
    ]);
    assert.deepEqual(getRuntimeMusicAffiliateSoftSelect("School Cheer"), [
      "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      "Non compliant",
    ]);

    assert.ok(
      musicAffiliateOptionsForOrder({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        packageType: "",
      }).includes("Songs for Cheer")
    );
    assert.ok(
      !musicAffiliateOptionsForOrder({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        packageType: "",
      }).includes("Songs for Cheer")
    );

    // Compliance uses catalog labels for that subcategory.
    assert.equal(
      determineComplianceStatus("all-star-cheer", "Songs for Cheer"),
      "compliant"
    );
    assert.equal(
      determineComplianceStatus("school-cheer-viroc-yes", "Songs for Cheer"),
      "non-compliant"
    );
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        musicAffiliate: "Songs for Cheer",
      }),
      "compliant"
    );
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        musicAffiliate: "Songs for Cheer",
      }),
      "non-compliant"
    );
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-no",
        musicAffiliate:
          "Power Music & Unleash the Beats Covers (can not be used for a Titanium Package)",
      }),
      "compliant"
    );

    const schoolLabels = getCompliantAffiliateLabelsForCategory(
      "School Cheer",
      store
    );
    assert.ok(
      schoolLabels.some((l) => l.includes("Power Music & Unleash"))
    );
    assert.ok(!schoolLabels.includes("Songs for Cheer"));

    // Cleanup runtime for other test files.
    syncRuntimeCompliantAffiliateLabels({ categories: {} });
  });
});
