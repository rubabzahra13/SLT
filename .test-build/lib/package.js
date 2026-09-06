"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePackage = parsePackage;
/** Split values like "PLATINUM 2:30 NO SPLIT" into tier, limit, and split. */
function parsePackage(packageStr) {
    const value = packageStr.trim();
    if (!value)
        return { tier: "-", limit: "-", split: "-" };
    const upper = value.toUpperCase();
    let split = "-";
    if (/\bNO\s+SPLIT\b/.test(upper)) {
        split = "No Split";
    }
    else if (/\bSPLIT\b/.test(upper)) {
        split = "Split";
    }
    const withoutSplit = value
        .replace(/\s+NO\s+SPLIT\b/i, "")
        .replace(/\s+SPLIT\b/i, "")
        .trim();
    const timeMatch = withoutSplit.match(/\d+:\d+/);
    if (!timeMatch || timeMatch.index === undefined) {
        if (/\bTBD\b/i.test(withoutSplit)) {
            const tier = withoutSplit.replace(/\s+TBD\b/i, "").trim();
            return { tier: tier || withoutSplit, limit: "TBD", split };
        }
        return { tier: withoutSplit || value, limit: "-", split };
    }
    const tier = withoutSplit.slice(0, timeMatch.index).trim();
    const limit = timeMatch[0];
    return {
        tier: tier || withoutSplit,
        limit,
        split,
    };
}
