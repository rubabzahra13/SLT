"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOLIDAY_MONTH_DAY_REF_YEAR = exports.US_HOLIDAYS = exports.US_PUBLIC_HOLIDAY_CATALOG = exports.OTHER_PUBLIC_HOLIDAY_NAME = exports.DEFAULT_HOLIDAY_NAMES = exports.OTHER_PERSONAL_REASON_NAME = exports.PERSONAL_TIME_OFF_REASONS = void 0;
exports.isOtherPersonalReason = isOtherPersonalReason;
exports.findUsPublicHoliday = findUsPublicHoliday;
exports.isOtherPublicHoliday = isOtherPublicHoliday;
exports.toMonthDay = toMonthDay;
exports.monthDayToReferenceIso = monthDayToReferenceIso;
exports.formatMonthDayLabel = formatMonthDayLabel;
exports.createDefaultStudioHolidays = createDefaultStudioHolidays;
exports.normalizeStudioHoliday = normalizeStudioHoliday;
exports.createDefaultPersonalReasons = createDefaultPersonalReasons;
exports.normalizeStudioPersonalReason = normalizeStudioPersonalReason;
exports.ensurePersonalReasonsList = ensurePersonalReasonsList;
exports.enabledPersonalReasonNames = enabledPersonalReasonNames;
exports.expandStudioHolidayDatesForYear = expandStudioHolidayDatesForYear;
exports.studioHolidayIsoSetInRange = studioHolidayIsoSetInRange;
exports.isStudioHolidayIso = isStudioHolidayIso;
exports.studioHolidayNamesForIso = studioHolidayNamesForIso;
exports.resolveHolidayDatesForToday = resolveHolidayDatesForToday;
exports.findStudioHolidayByName = findStudioHolidayByName;
exports.reasonsForTimeOffType = reasonsForTimeOffType;
exports.defaultReasonForTimeOffType = defaultReasonForTimeOffType;
exports.producerHasHoliday = producerHasHoliday;
function isoFromLocalDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
exports.PERSONAL_TIME_OFF_REASONS = [
    "Vacation",
    "Family",
    "Medical",
    "Personal appointment",
    "Travel",
    "Bereavement",
    "Other",
];
exports.OTHER_PERSONAL_REASON_NAME = "Other";
function isOtherPersonalReason(name) {
    return name.trim().toLowerCase() === exports.OTHER_PERSONAL_REASON_NAME.toLowerCase();
}
/** Built-in holiday names used to seed studio holiday settings. */
exports.DEFAULT_HOLIDAY_NAMES = [
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
exports.OTHER_PUBLIC_HOLIDAY_NAME = "Other";
/**
 * Searchable catalog of common U.S. public / widely observed holidays.
 * Month/day defaults are typical; admins can override. Year is applied when assigning.
 */
exports.US_PUBLIC_HOLIDAY_CATALOG = [
    { name: "New Year's Day", startDate: "01-01", endDate: "01-01" },
    { name: "Martin Luther King Jr. Day", startDate: "01-19", endDate: "01-19" },
    { name: "Valentine's Day", startDate: "02-14", endDate: "02-14" },
    { name: "Presidents' Day", startDate: "02-16", endDate: "02-16" },
    { name: "St. Patrick's Day", startDate: "03-17", endDate: "03-17" },
    { name: "Easter Sunday", startDate: "04-05", endDate: "04-05" },
    { name: "Good Friday", startDate: "04-03", endDate: "04-03" },
    { name: "Mother's Day", startDate: "05-10", endDate: "05-10" },
    { name: "Memorial Day", startDate: "05-25", endDate: "05-25" },
    { name: "Juneteenth", startDate: "06-19", endDate: "06-19" },
    { name: "Father's Day", startDate: "06-21", endDate: "06-21" },
    { name: "Independence Day", startDate: "07-04", endDate: "07-04" },
    { name: "Labor Day", startDate: "09-07", endDate: "09-07" },
    { name: "Columbus Day / Indigenous Peoples' Day", startDate: "10-12", endDate: "10-12" },
    { name: "Halloween", startDate: "10-31", endDate: "10-31" },
    { name: "Veterans Day", startDate: "11-11", endDate: "11-11" },
    { name: "Thanksgiving", startDate: "11-26", endDate: "11-26" },
    { name: "Day after Thanksgiving", startDate: "11-27", endDate: "11-27" },
    { name: "Christmas Eve", startDate: "12-24", endDate: "12-24" },
    { name: "Christmas Day", startDate: "12-25", endDate: "12-25" },
    { name: "New Year's Eve", startDate: "12-31", endDate: "12-31" },
    { name: exports.OTHER_PUBLIC_HOLIDAY_NAME },
];
function findUsPublicHoliday(name) {
    const needle = name.trim().toLowerCase();
    return exports.US_PUBLIC_HOLIDAY_CATALOG.find((entry) => entry.name.toLowerCase() === needle);
}
function isOtherPublicHoliday(name) {
    const n = name.trim().toLowerCase();
    return n === exports.OTHER_PUBLIC_HOLIDAY_NAME.toLowerCase() || n === "other holiday";
}
/** @deprecated Prefer studio holidays from settings; kept for fallbacks. */
exports.US_HOLIDAYS = exports.DEFAULT_HOLIDAY_NAMES;
/** Leap-year reference used for month/day calendar picking. */
exports.HOLIDAY_MONTH_DAY_REF_YEAR = 2000;
const MONTH_DAY_RE = /^\d{2}-\d{2}$/;
const FULL_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function toMonthDay(value) {
    if (!value)
        return "";
    const trimmed = value.trim();
    if (MONTH_DAY_RE.test(trimmed))
        return trimmed;
    if (FULL_ISO_RE.test(trimmed))
        return trimmed.slice(5);
    return "";
}
function monthDayToReferenceIso(monthDay) {
    const md = toMonthDay(monthDay) || "01-01";
    return `${exports.HOLIDAY_MONTH_DAY_REF_YEAR}-${md}`;
}
/** Display month + day with no year (e.g. "Jan 1"). */
function formatMonthDayLabel(monthDay) {
    const md = toMonthDay(monthDay);
    if (!md)
        return "—";
    const [m, d] = md.split("-").map(Number);
    return new Date(exports.HOLIDAY_MONTH_DAY_REF_YEAR, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
/** Reference month/day patterns (floating holidays use a typical occurrence). */
function defaultMonthDays() {
    const pad = (n) => String(n).padStart(2, "0");
    const d = (month, day) => `${pad(month)}-${pad(day)}`;
    // Approximate floating holidays with common mid-month weekdays.
    return {
        "New Year's Day": { start: d(1, 1), end: d(1, 1) },
        "Martin Luther King Jr. Day": { start: d(1, 19), end: d(1, 19) },
        "Presidents' Day": { start: d(2, 16), end: d(2, 16) },
        "Memorial Day": { start: d(5, 25), end: d(5, 25) },
        Juneteenth: { start: d(6, 19), end: d(6, 19) },
        "Independence Day": { start: d(7, 4), end: d(7, 4) },
        "Labor Day": { start: d(9, 7), end: d(9, 7) },
        "Columbus Day / Indigenous Peoples' Day": { start: d(10, 12), end: d(10, 12) },
        "Veterans Day": { start: d(11, 11), end: d(11, 11) },
        Thanksgiving: { start: d(11, 26), end: d(11, 26) },
        "Day after Thanksgiving": { start: d(11, 27), end: d(11, 27) },
        "Christmas Eve": { start: d(12, 24), end: d(12, 24) },
        "Christmas Day": { start: d(12, 25), end: d(12, 25) },
        "New Year's Eve": { start: d(12, 31), end: d(12, 31) },
        "Other holiday": { start: d(1, 1), end: d(1, 1) },
    };
}
function createDefaultStudioHolidays() {
    const dates = defaultMonthDays();
    return exports.DEFAULT_HOLIDAY_NAMES.map((name, index) => {
        const range = dates[name] ?? { start: "01-01", end: "01-01" };
        return {
            id: `holiday-default-${index + 1}`,
            name,
            startDate: range.start,
            endDate: range.end,
        };
    });
}
function normalizeStudioHoliday(raw) {
    const todayMd = toMonthDay(isoFromLocalDate(new Date())) || "01-01";
    const start = toMonthDay(raw.startDate) || todayMd;
    const end = toMonthDay(raw.endDate) || start;
    return {
        id: raw.id ||
            `holiday-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: raw.name.trim(),
        startDate: start,
        endDate: end,
    };
}
function createDefaultPersonalReasons() {
    return exports.PERSONAL_TIME_OFF_REASONS.map((name, index) => ({
        id: `personal-default-${index + 1}`,
        name,
        enabled: true,
        isOther: name === exports.OTHER_PERSONAL_REASON_NAME,
    }));
}
function normalizeStudioPersonalReason(raw) {
    const name = (raw.name || "").trim() || exports.OTHER_PERSONAL_REASON_NAME;
    const isOther = Boolean(raw.isOther) ||
        name.toLowerCase() === exports.OTHER_PERSONAL_REASON_NAME.toLowerCase();
    return {
        id: raw.id ||
            `personal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: isOther && !raw.name?.trim() ? exports.OTHER_PERSONAL_REASON_NAME : name,
        enabled: isOther ? true : raw.enabled !== false,
        isOther: isOther || undefined,
    };
}
/** Ensure stored lists always include an enabled “Other” row. */
function ensurePersonalReasonsList(reasons) {
    const normalized = reasons.map((entry) => normalizeStudioPersonalReason(entry));
    const hasOther = normalized.some((entry) => entry.isOther);
    if (hasOther) {
        return normalized.map((entry) => entry.isOther ? { ...entry, enabled: true } : entry);
    }
    return [
        ...normalized,
        {
            id: `personal-other-${Date.now()}`,
            name: exports.OTHER_PERSONAL_REASON_NAME,
            enabled: true,
            isOther: true,
        },
    ];
}
function enabledPersonalReasonNames(reasons) {
    return ensurePersonalReasonsList(reasons)
        .filter((entry) => entry.enabled)
        .map((entry) => entry.name);
}
/**
 * Apply an annual MM-DD holiday range to concrete YYYY-MM-DD dates.
 * Uses the next occurrence relative to today (current year if still upcoming).
 */
/** All calendar dates for one studio holiday in a given year (inclusive). */
function expandStudioHolidayDatesForYear(holiday, year) {
    const startMd = toMonthDay(holiday.startDate);
    const endMd = toMonthDay(holiday.endDate || holiday.startDate);
    if (!startMd)
        return [];
    const crossesYear = Boolean(endMd && endMd < startMd);
    const endYear = crossesYear ? year + 1 : year;
    const startDate = parseIsoToLocalDate(`${year}-${startMd}`);
    const endDate = parseIsoToLocalDate(`${endYear}-${endMd || startMd}`);
    if (!startDate || !endDate)
        return [];
    const out = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(endDate);
    last.setHours(0, 0, 0, 0);
    let guard = 0;
    while (cursor <= last && guard < 400) {
        out.push(isoFromLocalDate(cursor));
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
    }
    return out;
}
function parseIsoToLocalDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m)
        return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y ||
        date.getMonth() !== mo - 1 ||
        date.getDate() !== d) {
        return null;
    }
    return date;
}
/** Studio holiday dates between minIso and maxIso (inclusive). */
function studioHolidayIsoSetInRange(holidays, minIso, maxIso) {
    const minYear = Number(minIso.slice(0, 4));
    const maxYear = Number(maxIso.slice(0, 4));
    const set = new Set();
    for (let year = minYear; year <= maxYear + 1; year += 1) {
        for (const holiday of holidays) {
            for (const iso of expandStudioHolidayDatesForYear(holiday, year)) {
                if (iso >= minIso && iso <= maxIso)
                    set.add(iso);
            }
        }
    }
    return set;
}
function isStudioHolidayIso(iso, holidays) {
    return studioHolidayNamesForIso(iso, holidays).length > 0;
}
/** Holiday names that cover this calendar date (may be more than one). */
function studioHolidayNamesForIso(iso, holidays) {
    const year = Number(iso.slice(0, 4));
    const names = [];
    for (const holiday of holidays) {
        const covers = expandStudioHolidayDatesForYear(holiday, year).includes(iso) ||
            expandStudioHolidayDatesForYear(holiday, year - 1).includes(iso);
        if (covers)
            names.push(holiday.name);
    }
    return names;
}
function resolveHolidayDatesForToday(holiday, todayIso = isoFromLocalDate(new Date())) {
    const startMd = toMonthDay(holiday.startDate);
    const endMd = toMonthDay(holiday.endDate || holiday.startDate);
    if (!startMd) {
        return { startDate: todayIso, endDate: todayIso };
    }
    const crossesYear = Boolean(endMd && endMd < startMd);
    const startRef = new Date(`${exports.HOLIDAY_MONTH_DAY_REF_YEAR}-${startMd}T12:00:00`);
    const endRef = new Date(`${exports.HOLIDAY_MONTH_DAY_REF_YEAR + (crossesYear ? 1 : 0)}-${endMd || startMd}T12:00:00`);
    const durationDays = Math.max(0, Math.round((endRef.getTime() - startRef.getTime()) / 86_400_000));
    const todayYear = Number(todayIso.slice(0, 4));
    let year = todayYear;
    let start = `${year}-${startMd}`;
    while (start < todayIso) {
        year += 1;
        start = `${year}-${startMd}`;
    }
    const resolvedEnd = new Date(`${start}T12:00:00`);
    resolvedEnd.setDate(resolvedEnd.getDate() + durationDays);
    return {
        startDate: start,
        endDate: isoFromLocalDate(resolvedEnd),
    };
}
function findStudioHolidayByName(holidays, name) {
    const needle = name.trim().toLowerCase();
    return holidays.find((h) => h.name.trim().toLowerCase() === needle);
}
function reasonsForTimeOffType(type, holidays, personalReasons) {
    if (type === "personal") {
        if (personalReasons && personalReasons.length > 0) {
            return enabledPersonalReasonNames(personalReasons);
        }
        return exports.PERSONAL_TIME_OFF_REASONS;
    }
    if (holidays && holidays.length > 0) {
        return holidays.map((h) => h.name);
    }
    return exports.DEFAULT_HOLIDAY_NAMES;
}
function defaultReasonForTimeOffType(type, holidays, personalReasons) {
    return reasonsForTimeOffType(type, holidays, personalReasons)[0] ?? "";
}
function producerHasHoliday(producer, holidayName) {
    const needle = holidayName.trim().toLowerCase();
    return producer.timeOff.some((entry) => entry.type === "holiday" && entry.reason.trim().toLowerCase() === needle);
}
