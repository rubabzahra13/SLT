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
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Length of mix", preserveCase: true },
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
        multiline: true,
      },
    ],
  },
];

const SCHOOL_CHEER_VIROC_YES_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School",
    fields: [
      { key: "schoolName", label: "School Name" },
      { key: "schoolBillingAddress", label: "School Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "School State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team information",
    fields: [
      { key: "mascot", label: "Mascot" },
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
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "virocChoreographerName", label: "V!ROC Choreographer (full name)" },
      { key: "virocChoreographerEmail", label: "V!ROC Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix information",
    fields: [
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Length of mix", preserveCase: true },
      { key: "splitOrNoSplit", label: "Split or No Split" },
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
        multiline: true,
      },
    ],
  },
];

const SCHOOL_CHEER_VIROC_NO_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School",
    fields: [
      { key: "schoolName", label: "School Name" },
      { key: "schoolBillingAddress", label: "School Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "School State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Team information",
    fields: [
      { key: "mascot", label: "Mascot" },
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
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix information",
    fields: [
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Length of mix", preserveCase: true },
      { key: "splitOrNoSplit", label: "Split or No Split" },
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
        multiline: true,
      },
    ],
  },
];

const YOUTH_REC_CHEER_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Program & Team information",
    fields: [
      { key: "programName", label: "Program Name" },
      { key: "teamName", label: "Team Name" },
      { key: "colors", label: "Colors" },
    ],
  },
  {
    title: "Billing Address",
    fields: [
      { key: "billingAddress", label: "Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { key: "coachContactFullName", label: "Coach Contact (full name)" },
      { key: "coachEmailAddress", label: "Coach Email Address", preserveCase: true },
      { key: "coachPhone", label: "Coach Phone #", preserveCase: true },
      { key: "emailAddress", label: "Email Address", preserveCase: true },
    ],
  },
  {
    title: "Mix information",
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
        key: "usingEightCountSheets",
        label: "Will you be using 8 count sheets?",
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
        multiline: true,
      },
    ],
  },
];

const POM_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
      { key: "divisionOfTeam", label: "Division of Team", multiline: true },
    ],
  },
  {
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix & Routine information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "customVoiceovers", label: "Custom Voiceovers for your mix?" },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label: "Pronunciation guidance",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
    ],
  },
];

const HIP_HOP_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
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
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix & Routine information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "customVoiceovers", label: "Custom Voiceovers for your mix?" },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label: "Pronunciation guidance",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
    ],
  },
];

const TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
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
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix & Routine information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "divisionOfTeam", label: "Division of Team", multiline: true },
      { key: "style", label: "Style" },
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "customVoiceovers", label: "Custom Voiceovers for your mix?" },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label: "Pronunciation guidance",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
    ],
  },
];

const GAMEDAY_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
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
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix & Routine information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "styleOfGamedayMix", label: "Style of Gameday Mix" },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "customVoiceovers", label: "Custom Voiceovers for your mix?" },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label: "Pronunciation guidance",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
    ],
  },
];

const JAZZ_KICK_DANCE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
    fields: [
      { key: "schoolProgramName", label: "School/Program Name" },
      { key: "schoolGymAddress", label: "School/Gym Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
      { key: "divisionOfTeam", label: "Division of Team", multiline: true },
    ],
  },
  {
    title: "Contact & Choreographer information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
      { key: "choreographerName", label: "Choreographer (full name)" },
      { key: "choreographerEmail", label: "Choreographer email", preserveCase: true },
    ],
  },
  {
    title: "Mix & Routine information",
    fields: [
      {
        key: "numberOfCopies",
        label:
          "How many copies of your music will you need to send out to your coaches and participants?",
        wide: true,
      },
      { key: "style", label: "Style" },
      { key: "requestedEditor", label: "Requested editor", preserveCase: true },
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      {
        key: "licensingRequired",
        label: "Do you attend any event where you are required to show proper licensing?",
        preserveCase: true,
      },
      { key: "musicAffiliate", label: "Music affiliate" },
      {
        key: "routineNotes",
        label: "Routine notes",
        multiline: true,
        preserveCase: true,
      },
      { key: "customVoiceovers", label: "Custom Voiceovers for your mix?" },
      {
        key: "voiceoverScript",
        label: "What do you want the voiceovers to say?",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "pronunciationGuidance",
        label: "Pronunciation guidance",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
    ],
  },
];

const MARCHING_BAND_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Program information",
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
    title: "Contact & Billing information",
    fields: [
      { key: "coachName", label: "Coach (full name)" },
      { key: "coachPhone", label: "Coach phone #", preserveCase: true },
      { key: "coachEmail", label: "Coach email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
    ],
  },
  {
    title: "Package & Production information",
    fields: [
      { key: "packageType", label: "Package type", multiline: true },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      {
        key: "instrumentationNotes",
        label: "Notes to producer regarding instrumentation",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "lyricalNotes",
        label: "Notes to producer regarding lyrics",
        multiline: true,
        preserveCase: true,
      },
    ],
  },
];

const SPORTS_ENTERTAINMENT_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Organization information",
    fields: [
      { key: "organizationName", label: "Organization Name" },
      { key: "billingAddress", label: "Organization's Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact & Billing information",
    fields: [
      { key: "musicContactName", label: "Music Contact Name" },
      { key: "musicContactPhone", label: "Music Contact Phone", preserveCase: true },
      { key: "musicContactEmail", label: "Music Contact Email", preserveCase: true },
      { key: "billingContactName", label: "Billing Contact Name" },
      { key: "billingContactEmail", label: "Billing Contact Email", preserveCase: true },
    ],
  },
  {
    title: "Package & Production information",
    fields: [
      { key: "packageType", label: "Package type", multiline: true },
      { key: "isRushOrder", label: "Do You Need A Rush Order?" },
      { key: "timeLengthOfMix", label: "Time length of mix", preserveCase: true },
      {
        key: "customerSongs",
        label: "Customer-submitted song list",
        multiline: true,
        preserveCase: true,
      },
      {
        key: "additionalNotes",
        label: "Additional notes",
        multiline: true,
        preserveCase: true,
      },
    ],
  },
];

const SCHOOL_ANTHEMS_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "School / Organization information",
    fields: [
      { key: "schoolOrganizationName", label: "School/Organization Name" },
      { key: "schoolBillingAddress", label: "School Billing Address", multiline: true },
      { key: "city", label: "City" },
      { key: "stateProvince", label: "State/Province" },
      { key: "zipPostalCode", label: "ZIP/Postal Code", preserveCase: true },
      { key: "country", label: "Country" },
    ],
  },
  {
    title: "Contact & Billing information",
    fields: [
      { key: "musicContactName", label: "Music Contact Name" },
      { key: "musicContactPhone", label: "Music Contact Phone", preserveCase: true },
      { key: "musicContactEmail", label: "Music Contact Email", preserveCase: true },
      { key: "billingPersonName", label: "Billing person (full name)" },
      { key: "billingPersonEmail", label: "Billing person email", preserveCase: true },
    ],
  },
  {
    title: "Anthem Preferences & Details",
    fields: [
      { key: "mascot", label: "Mascot" },
      { key: "schoolProgramColors", label: "School/Program Colors" },
      { key: "nicknames", label: "Nicknames / Terms / Sayings", multiline: true },
      { key: "vocalsPreference", label: "Vocals Preference" },
      { key: "instrumentalStylePreference", label: "Instrumental Style Preference" },
      {
        key: "lyricalNotes",
        label: "Lyrical Notes / Ideas",
        multiline: true,
        preserveCase: true,
      },
      { key: "couponCode", label: "Coupon code", preserveCase: true },
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
    switch (order.danceFormSubtype) {
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
      return "All Star Cheer";
    case "school-all-star-dance":
      return "All Star Dance";
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
