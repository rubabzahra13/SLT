import type { CheerFormSubtype, Order, OrderFormType } from "@/types";
import { CHEER_FORM_SUBTABS } from "@/types";
import { displayMultiline, displayText } from "@/lib/order-form";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { getOrderFormColumns } from "@/components/orders/order-columns";

export type OrderDetailField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  wide?: boolean;
  preserveCase?: boolean;
};

export type OrderDetailSection = {
  title: string;
  fields: OrderDetailField[];
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  wide?: boolean;
  preserveCase?: boolean;
};

const ALL_STAR_CHEER_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Gym",
    fields: [
      { key: "gymName", label: "Gym Name" },
      { key: "gymBillingAddress", label: "Gym Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "Gym State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team information",
    fields: [
      { key: "teamName", label: "Team Name" },
      {
        key: "division",
        label: "Division that your team competes in",
        multiline: true,
      },
      { key: "teamCoedAllGirl", label: "My team is (Coed/All Girl)" },
      { key: "teamColors", label: "Team colors" },
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
    ],
  },
  {
    title: "Mix information",
    fields: [
      { key: "requestedEditor", label: "Requested producer", preserveCase: true },
      { key: "packageType", label: "Package type" },
      { key: "timeLengthOfMix", label: "Length of Mix", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "sendingEightCountSheets",
        label: "Will you be sending 8 count sheets?",
      },

      {
        key: "songListSuggestions",
        label: "Song list/suggestions",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
      {
        key: "howDidYouFindOut",
        label: "How did you find out about Sounds Like That?",
      },
    ],
  },
];

/** Customer form fields for School Cheer · VIROC only (edit order form). */
const SCHOOL_CHEER_VIROC_YES_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School Information",
    fields: [
      { key: "schoolName", label: "School Name" },
      { key: "schoolBillingAddress", label: "School Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team Information",
    fields: [
      { key: "mascot", label: "Mascot" },
      {
        key: "division",
        label: "Division that your team competes in",
        multiline: true,
      },
      { key: "teamCoedAllGirl", label: "My team is" },
      { key: "teamColors", label: "Team Colors" },
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      { key: "billingPersonEmail", label: "Billing Person Email", preserveCase: true },
      { key: "virocChoreographerName", label: "V!ROC Choreographer (full name)" },
      {
        key: "virocChoreographerEmail",
        label: "V!ROC Choreographer Email",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      { key: "packageType", label: "Package Type" },
      {
        key: "timeLengthOfMix",
        label: "Length of Mix",
        preserveCase: true,
      },
      { key: "splitOrNoSplit", label: "Split or No Split" },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "sendingEightCountSheets",
        label: "Will you be sending 8-Count Sheets?",
      },
      {
        key: "songListSuggestions",
        label: "Song List/Suggestions",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
      {
        key: "howDidYouFindOut",
        label: "How did you find out about Sounds Like That?",
      },
    ],
  },
];

/** Customer form fields for School Cheer (VIROC No) — edit + New Order only. */
const SCHOOL_CHEER_VIROC_NO_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School Information",
    fields: [
      { key: "schoolName", label: "School Name" },
      { key: "schoolBillingAddress", label: "School Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team Information",
    fields: [
      { key: "mascot", label: "Mascot" },
      {
        key: "division",
        label: "Division that your team competes in",
        multiline: true,
      },
      { key: "teamCoedAllGirl", label: "My team is" },
      { key: "teamColors", label: "Team Colors" },
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      { key: "billingPersonEmail", label: "Billing Person Email", preserveCase: true },
      {
        key: "choreographerName",
        label: "Choreographer (full name) — if not relevant, put N/A",
      },
      {
        key: "choreographerEmail",
        label: "Choreographer Email — if not relevant, put N/A",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      { key: "packageType", label: "Package Type" },
      {
        key: "timeLengthOfMix",
        label: "Length of Mix",
        preserveCase: true,
      },
      { key: "splitOrNoSplit", label: "Split or No Split" },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "sendingEightCountSheets",
        label: "Will you be sending 8-Count Sheets?",
      },
      {
        key: "songListSuggestions",
        label: "Song List/Suggestions",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
      {
        key: "howDidYouFindOut",
        label: "How did you find out about Sounds Like That?",
      },
    ],
  },
];

/** Customer form fields for Youth Rec Cheer — edit + New Order only. */
const YOUTH_REC_CHEER_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Program Information",
    fields: [
      { key: "schoolProgramName", label: "Program Name" },
      { key: "teamName", label: "Team Name" },
      { key: "youthRecColors", label: "Colors" },
      {
        key: "youthRecBillingAddress",
        label: "Billing Address",
        multiline: true,
      },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachContactFullName", label: "Coach (full name)" },
      {
        key: "coachEmailAddress",
        label: "Coach Email Address",
        preserveCase: true,
      },
      { key: "coachPhone", label: "Phone #" },
      {
        // Magento label "Email Address" — SoT is billing_person_email.
        key: "billingPersonEmail",
        label: "Email Address",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      { key: "packageType", label: "Package" },
      { key: "timeLengthOfMix", label: "Mix Length", preserveCase: true },
      { key: "splitOrNoSplit", label: "Split or No Split" },
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      {
        key: "sendingEightCountSheets",
        label: "Will you be using 8 Count Sheets?",
      },
      {
        key: "songListSuggestions",
        label: "Song List/Suggestions",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
      {
        key: "howDidYouFindOut",
        label: "How did you find out about Sounds Like That?",
      },
    ],
  },
];

/** Customer form fields for POM — edit + New Order only. */
const POM_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
      { key: "divisionOfTeam", label: "Division of Team" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
      {
        key: "choreographerName",
        label:
          "Choreographer (full name) — if this is not relevant to your order, put N/A",
        wide: true,
      },
      {
        key: "choreographerEmail",
        label:
          "Choreographer Email — if this is not relevant to your order, put N/A",
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package Type" },
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "powerMusicCovers",
        label: "Power Music Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "unleashTheBeatsCovers",
        label: "Unleash the Beats Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "customVoiceovers",
        label: "Custom Voiceovers for your Mix?",
      },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label:
          "Please include pronunciation guidance for any school/gym name, team color, mascot, or other voiceover wording that could be unclear. We will record exactly what you type—re-records due to pronunciation issues will be charged.",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

/** Customer form fields for Hip Hop — edit + New Order only. */
const HIP_HOP_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
      { key: "divisionOfTeam", label: "Division of Team" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
      {
        key: "choreographerName",
        label:
          "Choreographer (full name) — if this is not relevant to your order, put N/A",
        wide: true,
      },
      {
        key: "choreographerEmail",
        label:
          "Choreographer Email — if this is not relevant to your order, put N/A",
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package Type" },
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "powerMusicCovers",
        label: "Power Music Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "unleashTheBeatsCovers",
        label: "Unleash the Beats Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "customVoiceovers",
        label: "Custom Voiceovers for your Mix?",
      },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label:
          "Please include pronunciation guidance for any school/gym name, team color, mascot, or other voiceover wording that could be unclear. We will record exactly what you type—re-records due to pronunciation issues will be charged.",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

/** Customer form fields for Team Performance & Variety — edit + New Order only. */
const TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
      {
        key: "choreographerName",
        label:
          "Choreographer (full name) — if this is not relevant to your order, put N/A",
        wide: true,
      },
      {
        key: "choreographerEmail",
        label:
          "Choreographer Email — if this is not relevant to your order, put N/A",
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "divisionOfTeam", label: "Division of Team" },
      { key: "style", label: "Style" },
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      { key: "packageType", label: "Package Type" },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "powerMusicCovers",
        label: "Power Music Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "unleashTheBeatsCovers",
        label: "Unleash the Beats Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label:
          "Routine Notes (please list the styles of dance required, the order in the mix desired, and the amount of time or number of 8 counts required per section)",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      {
        key: "customVoiceovers",
        label: "Custom Voiceovers for your Mix?",
      },
      {
        key: "voiceoverScript",
        label: "What do you want your custom voiceovers to say?",
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label:
          "Please include pronunciation guidance for any school/gym name, team color, mascot, or other voiceover wording that could be unclear. We will record exactly what you type—re-records due to pronunciation issues will be charged.",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

/** Customer form fields for Gameday — edit + New Order only. */
const GAMEDAY_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
      {
        key: "choreographerName",
        label:
          "Choreographer (full name) — if this is not relevant to your order, put N/A",
        wide: true,
      },
      {
        key: "choreographerEmail",
        label:
          "Choreographer Email — if this is not relevant to your order, put N/A",
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package Type" },
      { key: "styleOfGamedayMix", label: "Style of Gameday Mix" },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "powerMusicCovers",
        label: "Power Music Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "unleashTheBeatsCovers",
        label: "Unleash the Beats Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "customVoiceovers",
        label: "Custom Voiceovers for your Mix?",
      },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label:
          "Please include pronunciation guidance for any school/gym name, team color, mascot, or other voiceover wording that could be unclear. We will record exactly what you type—re-records due to pronunciation issues will be charged.",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

/** Customer form fields for Jazz/Kick — edit + New Order only. */
const JAZZ_KICK_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
      {
        key: "choreographerName",
        label:
          "Choreographer (full name) — if this is not relevant to your order, put N/A",
        wide: true,
      },
      {
        key: "choreographerEmail",
        label:
          "Choreographer Email — if this is not relevant to your order, put N/A",
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "divisionOfTeam", label: "Division of Team" },
      { key: "style", label: "Style" },
      { key: "requestedEditor", label: "Requested Editor", preserveCase: true },
      { key: "packageType", label: "Package Type" },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      {
        key: "licensingRequired",
        label:
          "Do you attend any event where you are required to show proper licensing?",
        wide: true,
      },
      { key: "musicAffiliate", label: "Music Affiliate" },
      {
        key: "powerMusicCovers",
        label: "Power Music Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "unleashTheBeatsCovers",
        label: "Unleash the Beats Covers",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "routineNotes",
        label: "Routine Notes",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "customVoiceovers",
        label: "Custom Voiceovers for your Mix?",
      },
      {
        key: "voiceoverScript",
        label: "What do you want your custom voiceovers to say?",
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label:
          "Please include pronunciation guidance for any school/gym name, team color, mascot, or other voiceover wording that could be unclear. We will record exactly what you type—re-records due to pronunciation issues will be charged.",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

/** Customer form fields for Marching Band — edit + New Order only. */
const MARCHING_BAND_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Program Information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach Phone #" },
      { key: "coachEmail", label: "Coach Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      { key: "packageType", label: "Package Type" },
      {
        key: "timeLengthOfMix",
        label: "Time Length of Mix",
        preserveCase: true,
      },
      {
        // Magento instrumentation notes → song_list_suggestions SoT.
        key: "songListSuggestions",
        label: "Notes to Producer Regarding Instrumentation",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
      {
        // Magento lyrical notes → routine_notes SoT.
        key: "routineNotes",
        label: "Notes to Producer Regarding Lyrics / Mix",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
    ],
  },
];

/** Customer form fields for Sports Entertainment — edit + New Order only. */
const SPORTS_ENTERTAINMENT_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Organization Information",
    fields: [
      { key: "organizationName", label: "Organization Name" },
      {
        key: "organizationBillingAddress",
        label: "Organization's Billing Address",
        multiline: true,
      },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "musicContactName", label: "Music Contact Name" },
      { key: "musicContactPhone", label: "Music Contact Phone" },
      {
        key: "musicContactEmail",
        label: "Music Contact Email",
        preserveCase: true,
      },
      {
        key: "billingContactName",
        label: "Billing Contact Name (If different than Music Contact)",
        wide: true,
      },
      {
        key: "billingContactEmail",
        label: "Billing Contact Email",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Mix Information",
    fields: [
      { key: "packageType", label: "Package Type" },
      {
        key: "clientRequestedMixDueDate",
        label: "Please allow 14 days turn around for all Pro Team mixes.",
        wide: true,
      },
      {
        key: "clientRequestedRushOrder",
        label:
          "Do you need a Rush Order? If you need your mix in under 7 days, there is a rush fee of $100.",
        wide: true,
      },
      { key: "timeLengthOfMix", label: "Time Length", preserveCase: true },
      {
        key: "customerSongs",
        label: "Songs",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "additionalNotes",
        label: "Additional Notes",
        multiline: true,
        preserveCase: true,
      },
    ],
  },
];

/** Customer form fields for School Anthem — edit + New Order only. */
const SCHOOL_ANTHEMS_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School/Organization Information",
    fields: [
      { key: "schoolOrganizationName", label: "School/Organization Name" },
      {
        key: "schoolBillingAddress",
        label: "School/Organization Billing Address",
        multiline: true,
      },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { key: "musicContactName", label: "Music Contact Name" },
      { key: "musicContactPhone", label: "Music Contact Phone" },
      {
        key: "musicContactEmail",
        label: "Music Contact Email",
        preserveCase: true,
      },
      { key: "billingPersonName", label: "Billing Person (full name)" },
      {
        key: "billingPersonEmail",
        label: "Billing Person Email",
        preserveCase: true,
      },
    ],
  },
  {
    title: "Team Information",
    fields: [
      { key: "mascot", label: "Mascot" },
      { key: "schoolProgramColors", label: "School/Program Colors" },
      { key: "nicknames", label: "Nicknames", preserveCase: true },
    ],
  },
  {
    title: "Song Information",
    fields: [
      { key: "vocalsPreference", label: "Vocals Preference" },
      {
        // Magento "Instrumental Style Preference" → song_list_suggestions SoT.
        key: "songListSuggestions",
        label: "Instrumental Style Preference",
        wide: true,
      },
      {
        // Magento "Lyrical Notes" → routine_notes SoT.
        key: "routineNotes",
        label: "Lyrical Notes",
        multiline: true,
        preserveCase: true,
        wide: true,
      },
    ],
  },
  {
    title: "Coupon Code",
    fields: [
      { key: "couponCode", label: "Coupon Code", preserveCase: true },
    ],
  },
];

const CHEER_FORM_CODES: Partial<Record<CheerFormSubtype, string>> = {
  "all-star-cheer": "A",
  "school-cheer-viroc-yes": "B",
  "school-cheer-viroc-no": "C",
  "youth-rec-cheer": "D",
};

function formatFieldValue(
  order: Order,
  def: FieldDef
): OrderDetailField {
  const raw = rawFieldValue(order, def.key);
  const value = def.multiline
    ? def.preserveCase
      ? raw.trim() || "—"
      : displayMultiline(raw, 2000)
    : def.preserveCase
      ? raw.trim() || "—"
      : displayText(raw);

  return {
    key: def.key,
    label: def.label,
    value,
    multiline: def.multiline,
    wide: def.wide ?? def.label.length > 42,
    preserveCase: def.preserveCase,
  };
}

function buildSections(
  sectionDefs: { title: string; fields: FieldDef[] }[],
  order: Order
): OrderDetailSection[] {
  return sectionDefs.map((section) => ({
    title: section.title,
    fields: section.fields.map((field) => formatFieldValue(order, field)),
  }));
}

export function getCheerFormCode(subtype?: CheerFormSubtype): string | null {
  if (!subtype) return null;
  return CHEER_FORM_CODES[subtype] ?? null;
}

export function getCheerFormTitle(subtype?: CheerFormSubtype): string | null {
  if (!subtype) return null;
  return CHEER_FORM_SUBTABS.find((tab) => tab.id === subtype)?.label ?? null;
}

export function getOrderFormBadge(order: Order): string | null {
  if (order.formType !== "school-all-star-cheer") return null;
  const code = getCheerFormCode(order.cheerFormSubtype);
  const title = getCheerFormTitle(order.cheerFormSubtype);
  if (!code || !title) return title;
  return `${code} · ${title.toUpperCase()}`;
}

/** True when any order-form section field differs between original and draft. */
export function orderFormFieldsDirty(
  original: Order,
  draft: Order
): boolean {
  const sections = getOrderDetailSections(original);
  for (const section of sections) {
    for (const field of section.fields) {
      const prev = rawFieldValue(original, field.key).trim();
      const next = rawFieldValue(draft, field.key).trim();
      if (field.key === "numberOfCopies") {
        // UI defaults empty copies to "1"; don't treat that alone as dirty.
        const prevNorm = prev || "1";
        const nextNorm = next || "1";
        if (prevNorm !== nextNorm) return true;
        continue;
      }
      if (prev !== next) return true;
    }
  }
  return false;
}

export function getOrderDetailSections(order: Order): OrderDetailSection[] {
  if (order.formType === "school-all-star-cheer") {
    switch (order.cheerFormSubtype) {
      case "all-star-cheer":
        return buildSections(ALL_STAR_CHEER_FIELDS, order);
      case "school-cheer-viroc-yes":
        return buildSections(SCHOOL_CHEER_VIROC_YES_FIELDS, order);
      case "school-cheer-viroc-no":
        return buildSections(SCHOOL_CHEER_VIROC_NO_FIELDS, order);
      case "youth-rec-cheer":
        return buildSections(YOUTH_REC_CHEER_FIELDS, order);
      default:
        return buildSections(ALL_STAR_CHEER_FIELDS, order);
    }
  }

  if (order.formType === "school-all-star-dance") {
    const danceSubtype = String(order.danceFormSubtype || "").trim();
    // Legacy Magento / UI aliases → Team Performance & Variety Routines.
    if (
      danceSubtype === "team-performance" ||
      danceSubtype.startsWith("team-performance")
    ) {
      return buildSections(TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS, order);
    }
    switch (danceSubtype) {
      case "pom":
        return buildSections(POM_DANCE_FIELDS, order);
      case "hip-hop":
        return buildSections(HIP_HOP_DANCE_FIELDS, order);
      case "team-performance-variety":
        return buildSections(TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS, order);
      case "gameday":
        return buildSections(GAMEDAY_DANCE_FIELDS, order);
      case "jazz-kick":
        return buildSections(JAZZ_KICK_DANCE_FIELDS, order);
      default:
        return buildSections(POM_DANCE_FIELDS, order);
    }
  }

  if (order.formType === "marching-band") {
    return buildSections(MARCHING_BAND_FIELDS, order);
  }

  if (order.formType === "sports-entertainment") {
    return buildSections(SPORTS_ENTERTAINMENT_FIELDS, order);
  }

  if (order.formType === "school-anthem") {
    return buildSections(SCHOOL_ANTHEMS_FIELDS, order);
  }

  return [
    {
      title: "Order details",
      fields: getOrderFormColumns(order).map((col) => {
        const raw = rawFieldValue(order, col.key);
        const multiline = col.nowrap === false;
        return {
          key: col.key,
          label: col.header,
          value: multiline ? displayMultiline(raw, 2000) : displayText(raw),
          multiline,
        };
      }),
    },
  ];
}

export function getFormTypeLabel(formType: OrderFormType): string {
  switch (formType) {
    case "school-all-star-cheer":
      return "School/All Star Cheer";
    case "school-all-star-dance":
      return "School/All Star Dance";
    case "marching-band":
      return "Marching Band";
    case "sports-entertainment":
      return "Sports Entertainment";
    case "school-anthem":
      return "School Anthem";
    default:
      return formType;
  }
}

/**
 * Customer Magento forms that collect a coupon code.
 * Marching Band and Sports Entertainment do not.
 * All Cheer subtypes, all Dance subtypes, and School Anthem do.
 */
export function formSupportsCouponCode(
  formType?: OrderFormType | string | null
): boolean {
  return (
    formType === "school-all-star-cheer" ||
    formType === "school-all-star-dance" ||
    formType === "school-anthem"
  );
}

function firstIdentityField(
  sections: { title: string; fields: FieldDef[] }[]
): { key: string; label: string } {
  const field = sections[0]?.fields[0];
  return {
    key: field?.key || "programName",
    label: field?.label || "Program",
  };
}

function identityFieldForForm(
  formType: OrderFormType | string | undefined,
  cheerSubtype?: string | null,
  danceSubtype?: string | null
): { key: string; label: string } {
  switch (formType) {
    case "school-all-star-cheer":
      switch (cheerSubtype) {
        case "school-cheer-viroc-yes":
          return firstIdentityField(SCHOOL_CHEER_VIROC_YES_FIELDS);
        case "school-cheer-viroc-no":
          return firstIdentityField(SCHOOL_CHEER_VIROC_NO_FIELDS);
        case "youth-rec-cheer":
          return firstIdentityField(YOUTH_REC_CHEER_FIELDS);
        case "all-star-cheer":
        default:
          return firstIdentityField(ALL_STAR_CHEER_FIELDS);
      }
    case "school-all-star-dance":
      switch (danceSubtype) {
        case "hip-hop":
          return firstIdentityField(HIP_HOP_DANCE_FIELDS);
        case "team-performance":
        case "team-performance-variety":
          return firstIdentityField(TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS);
        case "gameday":
          return firstIdentityField(GAMEDAY_DANCE_FIELDS);
        case "jazz-kick":
          return firstIdentityField(JAZZ_KICK_DANCE_FIELDS);
        case "pom":
        default:
          return firstIdentityField(POM_DANCE_FIELDS);
      }
    case "marching-band":
      return firstIdentityField(MARCHING_BAND_FIELDS);
    case "sports-entertainment":
      return firstIdentityField(SPORTS_ENTERTAINMENT_FIELDS);
    case "school-anthem":
      return firstIdentityField(SCHOOL_ANTHEMS_FIELDS);
    default:
      return { key: "programName", label: "Program" };
  }
}

/**
 * Orders/MTD "Program" column header — matches the first field label
 * on that form's edit / New Order view.
 */
export function getProgramColumnHeader(
  formType: OrderFormType | string | undefined,
  cheerSubtype?: string | null,
  danceSubtype?: string | null
): string {
  return identityFieldForForm(formType, cheerSubtype, danceSubtype).label;
}

/**
 * Orders/MTD person-name column header — matches the contact name field
 * on that form's edit / New Order view.
 */
export function getContactColumnHeader(
  formType: OrderFormType | string | undefined,
  _cheerSubtype?: string | null,
  _danceSubtype?: string | null
): string {
  if (
    formType === "school-all-star-cheer" ||
    formType === "school-all-star-dance" ||
    formType === "marching-band"
  ) {
    return "Coach name";
  }
  if (
    formType === "sports-entertainment" ||
    formType === "school-anthem"
  ) {
    return "Music Contact Name";
  }
  return "Contact";
}

/** Field key for the category/subtype identity name (first edit-form field). */
export function getOrderIdentityFieldKey(
  formType: OrderFormType | string | undefined,
  cheerSubtype?: string | null,
  danceSubtype?: string | null
): string {
  return identityFieldForForm(formType, cheerSubtype, danceSubtype).key;
}

/** Resolve cheer subtype for identity matching (incl. V!ROC flag fallback). */
function resolveCheerSubtypeForIdentity(order: Order): string | null | undefined {
  if (order.cheerFormSubtype) return order.cheerFormSubtype;
  const viroc = String(order.varsityVirocCustomer || "").trim().toLowerCase();
  if (viroc === "yes") return "school-cheer-viroc-yes";
  if (viroc === "no") return "school-cheer-viroc-no";
  return order.cheerFormSubtype;
}

/**
 * Value used to match form ↔ manual orders for this category/subtype.
 * Prefers the first edit-form field, then falls back to programName.
 * V!ROC Yes/No both use School Name (same as the edit form / Program column).
 */
export function getOrderIdentityName(order: Order): string {
  const cheerSubtype = resolveCheerSubtypeForIdentity(order);
  const key = getOrderIdentityFieldKey(
    order.formType,
    cheerSubtype,
    order.danceFormSubtype
  );
  const fromField = rawFieldValue(order, key).trim();
  if (fromField) return fromField;
  // V!ROC / school cheer: also accept schoolName aliases if primary getter empty.
  if (
    cheerSubtype === "school-cheer-viroc-yes" ||
    cheerSubtype === "school-cheer-viroc-no"
  ) {
    const school =
      order.schoolName || order.schoolProgramName || order.programName || "";
    if (String(school).trim()) return String(school).trim();
  }
  return String(order.programName || "").trim();
}

/**
 * Person name for Orders/MTD contact columns (Coach / Music Contact).
 * Reads coach_name SoT aliases only — never school_gym_name identity.
 */
export function getOrderContactPersonName(
  order?: Order | null,
  recordContactName?: string | null,
  recordProgramName?: string | null
): string {
  const identity = (
    (order ? getOrderIdentityName(order) : "") ||
    recordProgramName ||
    ""
  )
    .trim()
    .toLowerCase();

  const candidates = [
    order?.coachName,
    order?.musicContactName,
    order?.coachContactFullName,
    order?.contactName,
    recordContactName,
    order?.customerName,
  ];

  for (const raw of candidates) {
    const name = String(raw || "").trim();
    if (!name) continue;
    if (/^(contact|customer)$/i.test(name)) continue;
    if (identity && name.toLowerCase() === identity) continue;
    return name;
  }
  return "";
}
