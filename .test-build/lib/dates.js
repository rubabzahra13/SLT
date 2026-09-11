"use strict";
/** Shared date parsing for ISO strings and Excel serial day numbers. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFlexibleDate = parseFlexibleDate;
exports.toIsoDateString = toIsoDateString;
exports.formatDisplayDate = formatDisplayDate;
exports.compareIsoDates = compareIsoDates;
exports.isIsoDateBefore = isIsoDateBefore;
exports.isIsoDateAfter = isIsoDateAfter;
exports.toCanonicalIsoDate = toCanonicalIsoDate;
exports.extractDateRange = extractDateRange;
exports.doDateRangesOverlap = doDateRangesOverlap;
exports.isRecordDateRangeOverlapping = isRecordDateRangeOverlapping;
function parseFlexibleDate(value) {
    if (!value?.trim())
        return null;
    const raw = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const parsed = new Date(`${raw.slice(0, 10)}T12:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    // Excel serial day (e.g. 46225 → 2026-07-22)
    if (/^\d+(\.\d+)?$/.test(raw)) {
        const serial = Number(raw);
        if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) {
            return null;
        }
        const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}
/** Normalize stored dates to YYYY-MM-DD (handles Excel serials). */
function toIsoDateString(value) {
    if (!value?.trim())
        return "";
    const date = parseFlexibleDate(value);
    if (!date)
        return value.trim();
    // Prefer UTC for Excel serials; local noon ISO stays correct for YYYY-MM-DD.
    const useUtc = /^\d+(\.\d+)?$/.test(value.trim());
    const y = useUtc ? date.getUTCFullYear() : date.getFullYear();
    const m = String((useUtc ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, "0");
    const d = String(useUtc ? date.getUTCDate() : date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function formatDisplayDate(value) {
    const iso = toIsoDateString(value);
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso))
        return value?.trim() || "—";
    const date = parseFlexibleDate(iso);
    if (!date)
        return iso;
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
function compareIsoDates(a, b) {
    const isoA = toIsoDateString(a);
    const isoB = toIsoDateString(b);
    if (!isoA || !isoB)
        return 0;
    return isoA.localeCompare(isoB);
}
function isIsoDateBefore(a, b) {
    return compareIsoDates(a, b) < 0;
}
function isIsoDateAfter(a, b) {
    return compareIsoDates(a, b) > 0;
}
/** Extract canonical YYYY-MM-DD from string, Date, or serial */
function toCanonicalIsoDate(val) {
    if (!val)
        return "";
    if (val instanceof Date) {
        if (Number.isNaN(val.getTime()))
            return "";
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, "0");
        const d = String(val.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    return toIsoDateString(val);
}
/**
 * Extract normalized { start: string, end: string } (YYYY-MM-DD) from a DateRangeSpec.
 * If start is provided without end, end defaults to start.
 */
function extractDateRange(input) {
    if (!input)
        return { start: "", end: "" };
    if (typeof input === "string" || input instanceof Date) {
        const iso = toCanonicalIsoDate(input);
        return { start: iso, end: iso };
    }
    if (typeof input === "object") {
        const startVal = "start" in input && input.start !== undefined
            ? input.start
            : "mixStartDate" in input
                ? input.mixStartDate
                : null;
        const endVal = "end" in input && input.end !== undefined
            ? input.end
            : "mixEndDate" in input
                ? input.mixEndDate
                : null;
        const start = toCanonicalIsoDate(startVal);
        let end = toCanonicalIsoDate(endVal);
        if (start && !end) {
            end = start;
        }
        return { start, end };
    }
    return { start: "", end: "" };
}
/**
 * Shared utility function: given a record's scheduled range (Mix Start Date → Mix End Date)
 * and a selected filter period (a specific day or date range), return true if the record's
 * range overlaps the filter period at all — not just if the start date falls within it.
 *
 * Business Rule: Overlap (rec.start <= filter.end AND rec.end >= filter.start) is the rule everywhere.
 */
function doDateRangesOverlap(recordRange, filterPeriod) {
    const rec = extractDateRange(recordRange);
    const filter = extractDateRange(filterPeriod);
    // Unbounded filter (e.g. "All time" / no start and no end) overlaps everything
    if (!filter.start && !filter.end) {
        return true;
    }
    // Unscheduled record (no start and no end) cannot overlap a bounded filter
    if (!rec.start && !rec.end) {
        return false;
    }
    // Overlap logic: rec.start <= filter.end AND rec.end >= filter.start
    if (filter.end && rec.start > filter.end) {
        return false;
    }
    if (filter.start && rec.end < filter.start) {
        return false;
    }
    return true;
}
/**
 * Convenience wrapper for checking record overlap with separate mixStartDate and mixEndDate.
 */
function isRecordDateRangeOverlapping(mixStartDate, mixEndDate, filterPeriod) {
    return doDateRangesOverlap({ start: mixStartDate, end: mixEndDate }, filterPeriod);
}
