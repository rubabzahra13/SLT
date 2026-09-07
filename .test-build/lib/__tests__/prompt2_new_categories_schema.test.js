"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
(0, node_test_1.describe)("Prompt 2 — Schema Definition for Marching Band, Sports Entertainment, School Anthems", () => {
    (0, node_test_1.it)("Marching Band: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, no couponCode", () => {
        const marchingBandOrder = {
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
        strict_1.default.equal(marchingBandOrder.formType, "marching-band");
        strict_1.default.equal(marchingBandOrder.cheerFormSubtype, undefined, "Marching Band must NOT have cheerFormSubtype");
        strict_1.default.equal(marchingBandOrder.danceFormSubtype, undefined, "Marching Band must NOT have danceFormSubtype");
        strict_1.default.equal(marchingBandOrder.musicAffiliate, undefined, "Marching Band must NOT have musicAffiliate");
        strict_1.default.equal(marchingBandOrder.couponCode, undefined, "Marching Band must NOT have couponCode");
        strict_1.default.equal(marchingBandOrder.schoolProgramName, "Westlake High Marching Band");
        strict_1.default.equal(marchingBandOrder.schoolGymAddress, "100 Warrior Way");
        strict_1.default.equal(marchingBandOrder.city, "Austin");
        strict_1.default.equal(marchingBandOrder.stateProvince, "TX");
        strict_1.default.equal(marchingBandOrder.zipPostalCode, "78746");
        strict_1.default.equal(marchingBandOrder.country, "USA");
        strict_1.default.equal(marchingBandOrder.coachName, "John Philip Sousa");
        strict_1.default.equal(marchingBandOrder.coachPhone, "512-555-0199");
        strict_1.default.equal(marchingBandOrder.coachEmail, "sousa@westlakeband.org");
        strict_1.default.equal(marchingBandOrder.billingPersonName, "Jane Doe");
        strict_1.default.equal(marchingBandOrder.billingPersonEmail, "billing@westlakeband.org");
        strict_1.default.equal(marchingBandOrder.packageType, "FULL MARCHING ARRANGEMENT");
        strict_1.default.equal(marchingBandOrder.timeLengthOfMix, "7:00");
        strict_1.default.equal(marchingBandOrder.instrumentationNotes, "Heavy brass section, 4 trumpets, 2 tubas, full percussion line.");
        strict_1.default.equal(marchingBandOrder.lyricalNotes, "No vocal tracks; brass and woodwinds only.");
    });
    (0, node_test_1.it)("Sports Entertainment: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, no couponCode", () => {
        const sportsEntOrder = {
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
        strict_1.default.equal(sportsEntOrder.formType, "sports-entertainment");
        strict_1.default.equal(sportsEntOrder.cheerFormSubtype, undefined, "Sports Entertainment must NOT have cheerFormSubtype");
        strict_1.default.equal(sportsEntOrder.danceFormSubtype, undefined, "Sports Entertainment must NOT have danceFormSubtype");
        strict_1.default.equal(sportsEntOrder.musicAffiliate, undefined, "Sports Entertainment must NOT have musicAffiliate");
        strict_1.default.equal(sportsEntOrder.couponCode, undefined, "Sports Entertainment must NOT have couponCode");
        strict_1.default.equal(sportsEntOrder.organizationName, "Austin Arena Events");
        strict_1.default.equal(sportsEntOrder.billingAddress, "500 Center Court Blvd");
        strict_1.default.equal(sportsEntOrder.city, "Austin");
        strict_1.default.equal(sportsEntOrder.stateProvince, "TX");
        strict_1.default.equal(sportsEntOrder.zipPostalCode, "78701");
        strict_1.default.equal(sportsEntOrder.country, "USA");
        strict_1.default.equal(sportsEntOrder.musicContactName, "Vince McMahon");
        strict_1.default.equal(sportsEntOrder.musicContactPhone, "512-555-0144");
        strict_1.default.equal(sportsEntOrder.musicContactEmail, "vince@austinarena.com");
        strict_1.default.equal(sportsEntOrder.billingContactName, "Linda McMahon");
        strict_1.default.equal(sportsEntOrder.billingContactEmail, "finance@austinarena.com");
        strict_1.default.equal(sportsEntOrder.packageType, "HALFTIME SHOW");
        strict_1.default.equal(sportsEntOrder.isRushOrder, "yes");
        strict_1.default.equal(sportsEntOrder.timeLengthOfMix, "2:00");
        strict_1.default.equal(sportsEntOrder.customerSongs, "Eye of the Tiger, Welcome to the Jungle, Thunderstruck");
        strict_1.default.equal(sportsEntOrder.additionalNotes, "Include stadium crowd hypes and buzzer sound effect at 1:45.");
    });
    (0, node_test_1.it)("School Anthems: Fully-populated object matches exact field list with no subtype key, no musicAffiliate, INCLUDES couponCode", () => {
        const anthemOrder = {
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
        strict_1.default.equal(anthemOrder.formType, "school-anthem");
        strict_1.default.equal(anthemOrder.cheerFormSubtype, undefined, "School Anthems must NOT have cheerFormSubtype");
        strict_1.default.equal(anthemOrder.danceFormSubtype, undefined, "School Anthems must NOT have danceFormSubtype");
        strict_1.default.equal(anthemOrder.musicAffiliate, undefined, "School Anthems must NOT have musicAffiliate");
        strict_1.default.equal(anthemOrder.schoolOrganizationName, "Lake Travis High School");
        strict_1.default.equal(anthemOrder.schoolBillingAddress, "3322 Ranch Rd 620 S");
        strict_1.default.equal(anthemOrder.city, "Austin");
        strict_1.default.equal(anthemOrder.stateProvince, "TX");
        strict_1.default.equal(anthemOrder.zipPostalCode, "78738");
        strict_1.default.equal(anthemOrder.country, "USA");
        strict_1.default.equal(anthemOrder.musicContactName, "Alma Mater Committee");
        strict_1.default.equal(anthemOrder.musicContactPhone, "512-555-0822");
        strict_1.default.equal(anthemOrder.musicContactEmail, "anthem@laketravisisd.org");
        strict_1.default.equal(anthemOrder.billingPersonName, "District Finance Dept");
        strict_1.default.equal(anthemOrder.billingPersonEmail, "ap@laketravisisd.org");
        strict_1.default.equal(anthemOrder.mascot, "Cavaliers");
        strict_1.default.equal(anthemOrder.schoolProgramColors, "Red, Black, and White");
        strict_1.default.equal(anthemOrder.nicknames, "LT Cavs");
        strict_1.default.equal(anthemOrder.vocalsPreference, "Full Choir + Soloist");
        strict_1.default.equal(anthemOrder.instrumentalStylePreference, "Orchestral Brass & Strings");
        strict_1.default.equal(anthemOrder.lyricalNotes, "Hail to the Cavaliers, victorious and strong!");
        strict_1.default.equal(anthemOrder.couponCode, "AUSTIN2026");
    });
});
