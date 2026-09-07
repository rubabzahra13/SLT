import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type {
  MarchingBandOrder,
  SportsEntertainmentOrder,
  SchoolAnthemOrder,
} from "../../types";

describe("Prompt 2 — Schema Definition for Marching Band, Sports Entertainment, School Anthems", () => {
  it("Marching Band: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, no couponCode", () => {
    const marchingBandOrder: MarchingBandOrder = {
      id: "ord-test-mb-01",
      customerName: "Westlake High Marching Band",
      contactName: "John Philip Sousa",
      programName: "Westlake High Marching Band",
      category: "Marching Band",
      package: "FULL MARCHING ARRANGEMENT",
      musicTheme: "Stars and Stripes",
      editorRequest: "FA",
      requestedProducer: "Casey Marlow",
      price: 1200,
      status: "new",
      createdAt: new Date().toISOString(),
      needsAttention: false,
      attentionReason: null,

      // Marching Band Customer-Submitted Fields (Exact list per spec)
      formType: "marching-band",
      schoolProgramName: "Westlake High Marching Band",
      schoolGymAddress: "100 Warrior Way",
      city: "Austin",
      stateProvince: "TX",
      zipPostalCode: "78746",
      country: "USA",
      coachName: "John Philip Sousa",
      coachPhone: "512-555-0199",
      coachEmail: "sousa@westlakeband.org",
      billingPersonName: "Jane Doe",
      billingPersonEmail: "billing@westlakeband.org",
      packageType: "FULL MARCHING ARRANGEMENT",
      timeLengthOfMix: "7:00",
      instrumentationNotes: "Heavy brass section, 4 trumpets, 2 tubas, full percussion line.",
      lyricalNotes: "No vocal tracks; brass and woodwinds only.",
    };

    assert.equal(marchingBandOrder.formType, "marching-band");
    assert.equal((marchingBandOrder as any).cheerFormSubtype, undefined, "Marching Band must NOT have cheerFormSubtype");
    assert.equal((marchingBandOrder as any).danceFormSubtype, undefined, "Marching Band must NOT have danceFormSubtype");
    assert.equal((marchingBandOrder as any).musicAffiliate, undefined, "Marching Band must NOT have musicAffiliate");
    assert.equal((marchingBandOrder as any).couponCode, undefined, "Marching Band must NOT have couponCode");

    assert.equal(marchingBandOrder.schoolProgramName, "Westlake High Marching Band");
    assert.equal(marchingBandOrder.schoolGymAddress, "100 Warrior Way");
    assert.equal(marchingBandOrder.city, "Austin");
    assert.equal(marchingBandOrder.stateProvince, "TX");
    assert.equal(marchingBandOrder.zipPostalCode, "78746");
    assert.equal(marchingBandOrder.country, "USA");
    assert.equal(marchingBandOrder.coachName, "John Philip Sousa");
    assert.equal(marchingBandOrder.coachPhone, "512-555-0199");
    assert.equal(marchingBandOrder.coachEmail, "sousa@westlakeband.org");
    assert.equal(marchingBandOrder.billingPersonName, "Jane Doe");
    assert.equal(marchingBandOrder.billingPersonEmail, "billing@westlakeband.org");
    assert.equal(marchingBandOrder.packageType, "FULL MARCHING ARRANGEMENT");
    assert.equal(marchingBandOrder.timeLengthOfMix, "7:00");
    assert.equal(marchingBandOrder.instrumentationNotes, "Heavy brass section, 4 trumpets, 2 tubas, full percussion line.");
    assert.equal(marchingBandOrder.lyricalNotes, "No vocal tracks; brass and woodwinds only.");
  });

  it("Sports Entertainment: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, no couponCode", () => {
    const sportsEntOrder: SportsEntertainmentOrder = {
      id: "ord-test-se-01",
      customerName: "Austin Arena Events",
      contactName: "Vince McMahon",
      programName: "Austin Arena Events",
      category: "Sports Entertainment",
      package: "HALFTIME SHOW",
      musicTheme: "High Energy Entrance",
      editorRequest: "FA",
      requestedProducer: "Matt Stevens",
      price: 1500,
      status: "new",
      createdAt: new Date().toISOString(),
      needsAttention: false,
      attentionReason: null,

      // Sports Entertainment Customer-Submitted Fields (Exact list per spec)
      formType: "sports-entertainment",
      organizationName: "Austin Arena Events",
      billingAddress: "500 Center Court Blvd",
      city: "Austin",
      stateProvince: "TX",
      zipPostalCode: "78701",
      country: "USA",
      musicContactName: "Vince McMahon",
      musicContactPhone: "512-555-0144",
      musicContactEmail: "vince@austinarena.com",
      billingContactName: "Linda McMahon",
      billingContactEmail: "finance@austinarena.com",
      packageType: "HALFTIME SHOW",
      isRushOrder: "yes",
      timeLengthOfMix: "2:00",
      customerSongs: "Eye of the Tiger, Welcome to the Jungle, Thunderstruck",
      additionalNotes: "Include stadium crowd hypes and buzzer sound effect at 1:45.",
    };

    assert.equal(sportsEntOrder.formType, "sports-entertainment");
    assert.equal((sportsEntOrder as any).cheerFormSubtype, undefined, "Sports Entertainment must NOT have cheerFormSubtype");
    assert.equal((sportsEntOrder as any).danceFormSubtype, undefined, "Sports Entertainment must NOT have danceFormSubtype");
    assert.equal((sportsEntOrder as any).musicAffiliate, undefined, "Sports Entertainment must NOT have musicAffiliate");
    assert.equal((sportsEntOrder as any).couponCode, undefined, "Sports Entertainment must NOT have couponCode");

    assert.equal(sportsEntOrder.organizationName, "Austin Arena Events");
    assert.equal(sportsEntOrder.billingAddress, "500 Center Court Blvd");
    assert.equal(sportsEntOrder.city, "Austin");
    assert.equal(sportsEntOrder.stateProvince, "TX");
    assert.equal(sportsEntOrder.zipPostalCode, "78701");
    assert.equal(sportsEntOrder.country, "USA");
    assert.equal(sportsEntOrder.musicContactName, "Vince McMahon");
    assert.equal(sportsEntOrder.musicContactPhone, "512-555-0144");
    assert.equal(sportsEntOrder.musicContactEmail, "vince@austinarena.com");
    assert.equal(sportsEntOrder.billingContactName, "Linda McMahon");
    assert.equal(sportsEntOrder.billingContactEmail, "finance@austinarena.com");
    assert.equal(sportsEntOrder.packageType, "HALFTIME SHOW");
    assert.equal(sportsEntOrder.isRushOrder, "yes");
    assert.equal(sportsEntOrder.timeLengthOfMix, "2:00");
    assert.equal(sportsEntOrder.customerSongs, "Eye of the Tiger, Welcome to the Jungle, Thunderstruck");
    assert.equal(sportsEntOrder.additionalNotes, "Include stadium crowd hypes and buzzer sound effect at 1:45.");
  });

  it("School Anthems: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, INCLUDES couponCode", () => {
    const anthemOrder: SchoolAnthemOrder = {
      id: "ord-test-sa-01",
      customerName: "Lake Travis High School",
      contactName: "Alma Mater Committee",
      programName: "Lake Travis High School",
      category: "School Anthem",
      package: "FULL ANTHEM PACKAGE",
      musicTheme: "Traditional Fight Song",
      editorRequest: "FA",
      requestedProducer: "Anne Miller",
      price: 950,
      status: "new",
      createdAt: new Date().toISOString(),
      needsAttention: false,
      attentionReason: null,

      // School Anthems Customer-Submitted Fields (Exact list per spec)
      formType: "school-anthem",
      schoolOrganizationName: "Lake Travis High School",
      schoolBillingAddress: "3322 Ranch Rd 620 S",
      city: "Austin",
      stateProvince: "TX",
      zipPostalCode: "78738",
      country: "USA",
      musicContactName: "Alma Mater Committee",
      musicContactPhone: "512-555-0822",
      musicContactEmail: "anthem@laketravisisd.org",
      billingPersonName: "District Finance Dept",
      billingPersonEmail: "ap@laketravisisd.org",
      mascot: "Cavaliers",
      schoolProgramColors: "Red, Black, and White",
      nicknames: "LT Cavs",
      vocalsPreference: "Full Choir + Soloist",
      instrumentalStylePreference: "Orchestral Brass & Strings",
      lyricalNotes: "Hail to the Cavaliers, victorious and strong!",
      couponCode: "AUSTIN2026",
    };

    assert.equal(anthemOrder.formType, "school-anthem");
    assert.equal((anthemOrder as any).cheerFormSubtype, undefined, "School Anthems must NOT have cheerFormSubtype");
    assert.equal((anthemOrder as any).danceFormSubtype, undefined, "School Anthems must NOT have danceFormSubtype");
    assert.equal((anthemOrder as any).musicAffiliate, undefined, "School Anthems must NOT have musicAffiliate");

    assert.equal(anthemOrder.schoolOrganizationName, "Lake Travis High School");
    assert.equal(anthemOrder.schoolBillingAddress, "3322 Ranch Rd 620 S");
    assert.equal(anthemOrder.city, "Austin");
    assert.equal(anthemOrder.stateProvince, "TX");
    assert.equal(anthemOrder.zipPostalCode, "78738");
    assert.equal(anthemOrder.country, "USA");
    assert.equal(anthemOrder.musicContactName, "Alma Mater Committee");
    assert.equal(anthemOrder.musicContactPhone, "512-555-0822");
    assert.equal(anthemOrder.musicContactEmail, "anthem@laketravisisd.org");
    assert.equal(anthemOrder.billingPersonName, "District Finance Dept");
    assert.equal(anthemOrder.billingPersonEmail, "ap@laketravisisd.org");
    assert.equal(anthemOrder.mascot, "Cavaliers");
    assert.equal(anthemOrder.schoolProgramColors, "Red, Black, and White");
    assert.equal(anthemOrder.nicknames, "LT Cavs");
    assert.equal(anthemOrder.vocalsPreference, "Full Choir + Soloist");
    assert.equal(anthemOrder.instrumentalStylePreference, "Orchestral Brass & Strings");
    assert.equal(anthemOrder.lyricalNotes, "Hail to the Cavaliers, victorious and strong!");
    assert.equal(anthemOrder.couponCode, "AUSTIN2026");
  });
});
