"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDITOR_NAMES = exports.MTD_RECORD_STATUS_OPTIONS = exports.SONGS_OPTIONS = exports.EIGHT_CS_OPTIONS = exports.EDITOR_REQUEST_OPTIONS = exports.DANCE_FORM_SUBTABS = exports.CHEER_FORM_SUBTABS_WITH_ALL = exports.CHEER_FORM_SUBTABS = exports.ORDER_FORM_TABS = exports.PRODUCER_CATEGORIES = exports.DEFAULT_WORK_DAYS = exports.WEEKDAYS = void 0;
exports.WEEKDAYS = [
    { id: "sun", label: "Sunday", short: "Sun" },
    { id: "mon", label: "Monday", short: "Mon" },
    { id: "tue", label: "Tuesday", short: "Tue" },
    { id: "wed", label: "Wednesday", short: "Wed" },
    { id: "thu", label: "Thursday", short: "Thu" },
    { id: "fri", label: "Friday", short: "Fri" },
    { id: "sat", label: "Saturday", short: "Sat" },
];
exports.DEFAULT_WORK_DAYS = [
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
];
exports.PRODUCER_CATEGORIES = [
    "Cheer",
    "Dance",
    "Marching Band",
    "Hip-Hop",
    "School",
];
exports.ORDER_FORM_TABS = [
    { id: "school-all-star-cheer", label: "All Star Cheer" },
    { id: "school-all-star-dance", label: "All Star Dance" },
    { id: "marching-band", label: "Marching Band" },
    { id: "sports-entertainment", label: "Sports Entertainment" },
    { id: "school-anthem", label: "School Anthem" },
];
exports.CHEER_FORM_SUBTABS = [
    { id: "all-star-cheer", label: "All Star Cheer" },
    { id: "school-cheer-viroc-yes", label: "School Cheer · VIROC Yes" },
    { id: "school-cheer-viroc-no", label: "School Cheer · VIROC No" },
    { id: "youth-rec-cheer", label: "Youth Rec Cheer" },
];
exports.CHEER_FORM_SUBTABS_WITH_ALL = [
    { id: "all", label: "All Cheer" },
    ...exports.CHEER_FORM_SUBTABS,
];
exports.DANCE_FORM_SUBTABS = [
    { id: "pom", label: "POM" },
    { id: "hip-hop", label: "Hip Hop" },
    { id: "team-performance-variety", label: "Team Performance & Variety" },
    { id: "gameday", label: "Gameday" },
    { id: "jazz-kick", label: "Jazz/Kick" },
];
exports.EDITOR_REQUEST_OPTIONS = ["FA", "NA"];
exports.EIGHT_CS_OPTIONS = [
    "HAVE CS",
    "HAVE CS & VIDEO",
    "NEED CS",
    "NEED ORDER FORM & CS",
    "NEED ORDER FORM, CS, & VIDEO",
];
exports.SONGS_OPTIONS = ["HAVE", "NEED SONGS", "NEED NOTES", "NO"];
exports.MTD_RECORD_STATUS_OPTIONS = [
    "Waiting for Data",
    "Completed",
    "Outsourced",
    "Ongoing",
];
exports.EDITOR_NAMES = [
    "CM",
    "MS",
    "NC",
    "ANNE",
    "SS",
    "BV",
    "MM",
    "LAUREN",
    "WALTER",
    "SHELLY",
    "KENDALL",
    "JD",
    "G",
    "JM",
    "JOP",
    "R",
];
