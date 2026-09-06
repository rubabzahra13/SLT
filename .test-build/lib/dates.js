"use strict";
/** Shared date parsing for ISO strings and Excel serial day numbers. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFlexibleDate = parseFlexibleDate;
exports.toIsoDateString = toIsoDateString;
exports.formatDisplayDate = formatDisplayDate;
exports.compareIsoDates = compareIsoDates;
exports.isIsoDateBefore = isIsoDateBefore;
exports.isIsoDateAfter = isIsoDateAfter;
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
