"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.US_HOLIDAYS = exports.PERSONAL_TIME_OFF_REASONS = void 0;
exports.reasonsForTimeOffType = reasonsForTimeOffType;
exports.defaultReasonForTimeOffType = defaultReasonForTimeOffType;
exports.PERSONAL_TIME_OFF_REASONS = [
    "Vacation",
    "Family",
    "Medical",
    "Personal appointment",
    "Travel",
    "Bereavement",
    "Other",
];
/** Common US federal + widely observed holidays */
exports.US_HOLIDAYS = [
    "New Year's Day",
    "Martin Luther King Jr. Day",
    "Presidents' Day",
    "Memorial Day",
    "Juneteenth",
    "Independence Day",
    "Labor Day",
    "Columbus Day / Indigenous Peoples' Day",
    "Veterans Day",
    "Thanksgiving",
    "Day after Thanksgiving",
    "Christmas Eve",
    "Christmas Day",
    "New Year's Eve",
    "Other holiday",
];
function reasonsForTimeOffType(type) {
    return type === "holiday" ? exports.US_HOLIDAYS : exports.PERSONAL_TIME_OFF_REASONS;
}
function defaultReasonForTimeOffType(type) {
    return reasonsForTimeOffType(type)[0];
}
