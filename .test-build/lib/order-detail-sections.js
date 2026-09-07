"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCheerFormCode = getCheerFormCode;
exports.getCheerFormTitle = getCheerFormTitle;
exports.getOrderFormBadge = getOrderFormBadge;
exports.getOrderDetailSections = getOrderDetailSections;
exports.getFormTypeLabel = getFormTypeLabel;
const types_1 = require("@/types");
const order_form_1 = require("@/lib/order-form");
const order_detail_fields_1 = require("@/lib/order-detail-fields");
const order_columns_1 = require("@/components/orders/order-columns");
const ALL_STAR_CHEER_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const SCHOOL_CHEER_VIROC_YES_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const SCHOOL_CHEER_VIROC_NO_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const YOUTH_REC_CHEER_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const POM_DANCE_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const HIP_HOP_DANCE_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const TEAM_PERFORMANCE_VARIETY_DANCE_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const GAMEDAY_DANCE_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const JAZZ_KICK_DANCE_FIELDS = [
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
                label: "How many copies of your music will you need to send out to your coaches and participants?",
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
const CHEER_FORM_CODES = {
    "all-star-cheer": "A",
    "school-cheer-viroc-yes": "B",
    "school-cheer-viroc-no": "C",
    "youth-rec-cheer": "D",
};
function formatFieldValue(order, def) {
    const raw = (0, order_detail_fields_1.rawFieldValue)(order, def.key);
    const value = def.multiline
        ? def.preserveCase
            ? raw.trim() || "—"
            : (0, order_form_1.displayMultiline)(raw, 2000)
        : def.preserveCase
            ? raw.trim() || "—"
            : (0, order_form_1.displayText)(raw);
    return {
        key: def.key,
        label: def.label,
        value,
        multiline: def.multiline,
        wide: def.wide ?? def.label.length > 42,
        preserveCase: def.preserveCase,
    };
}
function buildSections(sectionDefs, order) {
    return sectionDefs.map((section) => ({
        title: section.title,
        fields: section.fields.map((field) => formatFieldValue(order, field)),
    }));
}
function getCheerFormCode(subtype) {
    if (!subtype)
        return null;
    return CHEER_FORM_CODES[subtype] ?? null;
}
function getCheerFormTitle(subtype) {
    if (!subtype)
        return null;
    return types_1.CHEER_FORM_SUBTABS.find((tab) => tab.id === subtype)?.label ?? null;
}
function getOrderFormBadge(order) {
    if (order.formType !== "school-all-star-cheer")
        return null;
    const code = getCheerFormCode(order.cheerFormSubtype);
    const title = getCheerFormTitle(order.cheerFormSubtype);
    if (!code || !title)
        return title;
    return `${code} · ${title.toUpperCase()}`;
}
function getOrderDetailSections(order) {
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
    return [
        {
            title: "Order details",
            fields: (0, order_columns_1.getOrderFormColumns)(order).map((col) => {
                const raw = (0, order_detail_fields_1.rawFieldValue)(order, col.key);
                const multiline = col.nowrap === false;
                return {
                    key: col.key,
                    label: col.header,
                    value: multiline ? (0, order_form_1.displayMultiline)(raw, 2000) : (0, order_form_1.displayText)(raw),
                    multiline,
                };
            }),
        },
    ];
}
function getFormTypeLabel(formType) {
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
