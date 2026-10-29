import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMarchingBandOrderPricing,
  determineComplianceStatus,
  lookupMarchingBandRateCardEntry,
  MARCHING_BAND_RATE_CARD,
  setRuntimeCompliantAffiliateLabelsByCategory,
} from "../pricing-engine";
import { syncRuntimeCompliantAffiliateLabels } from "../pricing-reference";
import { resolveOrderPriceCompliance } from "../pricing";

describe("Prompt 5: Marching Band Pricing Engine Unit Tests", () => {
  it("Rate Card completeness: Fight Song and Alma Mater are separate packages", () => {
    assert.equal(MARCHING_BAND_RATE_CARD.length, 6);
    assert.deepEqual(
      MARCHING_BAND_RATE_CARD.map((e) => e.package),
      [
        // Magento PACKAGE TYPE dropdown order
        "DRUM CADENCE ORIGINAL",
        "BAND CHANT",
        "FIGHT SONG ORIGINAL",
        "FIGHT SONG PLUS",
        "ALMA MATER ORIGINAL",
        "ALMA MATER PLUS",
      ]
    );
  });

  it("BAND CHANT is flat $600 (no music-affiliate split on this form)", () => {
    const withAff = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Power Music",
    });
    const noAff = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
    });
    const custom = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Custom Music / Client-Provided Track",
    });
    assert.equal(withAff.customerFacingPrice, 600);
    assert.equal(withAff.payrollBasePrice, 600);
    assert.equal(withAff.alwaysFixedPayroll, true);
    assert.equal(noAff.payrollBasePrice, 600);
    assert.equal(custom.payrollBasePrice, 600);
  });

  it("Compliant affiliate text field matches ignoring spacing and capitalization", () => {
    for (const affiliate of [
      "power music",
      "POWER  MUSIC",
      "PowerMusic",
      "power-music",
      "Unleash   the   Beats",
      "unleashthebeats",
      "POWER music + unleash THE beats",
      "library music",
    ]) {
      assert.equal(
        determineComplianceStatus("pom", affiliate),
        "compliant",
        affiliate
      );
    }
  });

  it("Any text that is not a compliant affiliate is non-compliant", () => {
    for (const affiliate of [
      "Custom Music / Client-Provided Track",
      "Non compliant",
      "whatever the client typed",
      "Spotify playlist",
    ]) {
      assert.equal(
        determineComplianceStatus("pom", affiliate),
        "non-compliant",
        affiliate
      );
    }
  });

  it("Songs for Cheer and original custom music are compliant", () => {
    for (const affiliate of [
      "Songs for Cheer",
      "Songs for Cheer: Editor's Choice",
      "100% original custom music (titanium package only)",
      "Power Music Covers",
      "Unleash the Beats Covers",
    ]) {
      assert.equal(
        determineComplianceStatus("pom", affiliate),
        "compliant",
        affiliate
      );
    }
  });

  it("Edit Affiliates runtime labels control compliance for incoming Magento text", () => {
    setRuntimeCompliantAffiliateLabelsByCategory({
      Pom: ["Power Music Covers", "Custom Renamed Affiliate"],
    });
    assert.equal(
      determineComplianceStatus("pom", "Power Music Covers"),
      "compliant"
    );
    assert.equal(
      determineComplianceStatus("pom", "Custom Renamed Affiliate"),
      "compliant"
    );
    assert.equal(
      determineComplianceStatus("pom", "Songs for Cheer"),
      "non-compliant"
    );
    assert.equal(
      determineComplianceStatus("pom", "Non compliant"),
      "non-compliant"
    );

    syncRuntimeCompliantAffiliateLabels({
      categories: {
        Pom: {
          rows: [],
          addOns: [],
          compliantAffiliateIds: ["songs-for-cheer"],
          compliantAffiliateLabels: {},
          nonCompliantAffiliateLabels: {},
        },
      },
    });
    assert.equal(
      determineComplianceStatus("pom", "Songs for Cheer"),
      "compliant"
    );
    assert.equal(
      determineComplianceStatus("pom", "Power Music Covers"),
      "non-compliant"
    );

    // Restore built-in defaults for later tests in this file / process.
    setRuntimeCompliantAffiliateLabelsByCategory({});
  });

  it("manual Add Order free text fuzzy-matches spacing, caps, and near wording", () => {
    for (const affiliate of [
      "power  music   covers",
      "POWER MUSIC COVERS",
      "PowerMusikCovers",
      "power musik covers",
      "songs for cheer editors choice",
      "100% original custom music titanium package only",
    ]) {
      assert.equal(
        determineComplianceStatus("all-star-cheer", affiliate),
        "compliant",
        affiliate
      );
    }
    assert.equal(
      determineComplianceStatus("all-star-cheer", "totally random bootleg"),
      "non-compliant"
    );
  });

  it("Add Order musicAffiliate text uses the same compliance check as Magento", () => {
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        musicAffiliate: "Power Music Covers",
      }),
      "compliant"
    );
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "all-star-cheer",
        musicAffiliate: "Non compliant",
      }),
      "non-compliant"
    );
    assert.equal(
      resolveOrderPriceCompliance({
        formType: "school-all-star-cheer",
        cheerFormSubtype: "school-cheer-viroc-yes",
        musicAffiliate: "Custom Music / Client-Provided Track",
      }),
      "non-compliant"
    );
  });

  it("DRUM CADENCE ORIGINAL is flat $350 (no music-affiliate split)", () => {
    const withAff = calculateMarchingBandOrderPricing({
      packageType: "DRUM CADENCE ORIGINAL",
      musicAffiliate: "Unleash the Beats",
    });
    const custom = calculateMarchingBandOrderPricing({
      packageType: "Drum Cadence",
      musicAffiliate: "Songs for Cheer: Editor's Choice",
    });
    assert.equal(withAff.customerFacingPrice, 350);
    assert.equal(withAff.payrollBasePrice, 350);
    assert.equal(withAff.alwaysFixedPayroll, true);
    assert.equal(custom.payrollBasePrice, 350);
  });

  it("BAND CHANT ignores retired Sheet Music and Add Vocals flags", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "BAND CHANT",
      musicAffiliate: "Power Music + Unleash the Beats",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });
    assert.equal(res.customerFacingPrice, 600);
    assert.equal(res.payrollBasePrice, 600);
  });

  it("Fight Song Plus must not match cheaper Fight Song Original", () => {
    const plus = lookupMarchingBandRateCardEntry("Fight Song Plus");
    const original = lookupMarchingBandRateCardEntry("Fight Song Original");
    assert.equal(plus?.package, "FIGHT SONG PLUS");
    assert.equal(plus?.customer, 2250);
    assert.equal(original?.package, "FIGHT SONG ORIGINAL");
    assert.equal(original?.customer, 1100);
  });

  it("Fight Song / Alma Mater packages ignore affiliates (always flat)", () => {
    for (const packageType of [
      "FIGHT SONG ORIGINAL",
      "ALMA MATER ORIGINAL",
      "FIGHT SONG PLUS",
      "ALMA MATER PLUS",
    ]) {
      const compliantAff = calculateMarchingBandOrderPricing({
        packageType,
        musicAffiliate: "Power Music",
      });
      const nonCompliantAff = calculateMarchingBandOrderPricing({
        packageType,
        musicAffiliate: "Custom Music / Client-Provided Track",
      });
      const expected = packageType.includes("PLUS") ? 2250 : 1100;
      assert.equal(compliantAff.alwaysFixedPayroll, true);
      assert.equal(nonCompliantAff.alwaysFixedPayroll, true);
      assert.equal(compliantAff.payrollBasePrice, expected);
      assert.equal(nonCompliantAff.payrollBasePrice, expected);
      assert.equal(compliantAff.customerFacingPrice, expected);
      assert.equal(nonCompliantAff.customerFacingPrice, expected);
    }
  });

  it("FIGHT SONG ORIGINAL alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG ORIGINAL",
    });

    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.payrollBasePrice, 1100);
    assert.equal(res.alwaysFixedPayroll, true);
    assert.equal(res.packageName, "FIGHT SONG ORIGINAL");
  });

  it("ALMA MATER ORIGINAL alone: customerFacingPrice = 1100, payrollBasePrice = 1100 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "ALMA MATER ORIGINAL",
    });

    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.payrollBasePrice, 1100);
    assert.equal(res.alwaysFixedPayroll, true);
    assert.equal(res.packageName, "ALMA MATER ORIGINAL");
  });

  it("Legacy combined label still resolves (FIGHT SONG / ALMA MATER → FIGHT SONG ORIGINAL @ $1100)", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG / ALMA MATER",
    });
    assert.equal(res.customerFacingPrice, 1100);
    assert.equal(res.packageName, "FIGHT SONG ORIGINAL");
  });

  it("FIGHT SONG PLUS alone: customerFacingPrice = 2250, payrollBasePrice = 2250 unconditionally", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "FIGHT SONG PLUS",
    });

    assert.equal(res.customerFacingPrice, 2250);
    assert.equal(res.payrollBasePrice, 2250);
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("Legacy Plus parenthetical still resolves; retired add-on flags do not change price", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "ALMA MATER PLUS (Written & Recorded Lyrics)",
      hasSheetMusicAdd: true,
      hasAddVocals: true,
    });

    assert.equal(res.customerFacingPrice, 2250);
    assert.equal(res.payrollBasePrice, 2250);
    assert.equal(res.packageName, "ALMA MATER PLUS");
    assert.equal(res.alwaysFixedPayroll, true);
  });

  it("Invalid package name: engine flags / returns null matchedEntry and 0 price", () => {
    const res = calculateMarchingBandOrderPricing({
      packageType: "INVALID MARCHING BAND PACKAGE",
    });

    assert.equal(res.matchedEntry, null);
    assert.equal(res.customerFacingPrice, 0);
    assert.equal(res.payrollBasePrice, 0);
  });
});
