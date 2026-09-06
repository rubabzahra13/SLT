"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCouponCode = normalizeCouponCode;
exports.normalizeDiscountCode = normalizeDiscountCode;
exports.evaluateCouponCode = evaluateCouponCode;
exports.lookupDiscountCode = lookupDiscountCode;
exports.isValidDiscountCode = isValidDiscountCode;
exports.isDuplicateDiscountCode = isDuplicateDiscountCode;
/** Uppercase and strip all whitespace for comparison. */
function normalizeCouponCode(code) {
    return code.trim().toUpperCase().replace(/\s+/g, "");
}
function normalizeDiscountCode(raw) {
    return {
        id: raw.id,
        code: (raw.code || "").trim().toUpperCase(),
        description: (raw.description || "").trim(),
    };
}
function levenshtein(a, b) {
    if (a === b)
        return 0;
    if (!a.length)
        return b.length;
    if (!b.length)
        return a.length;
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i += 1)
        matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1)
        matrix[0][j] = j;
    for (let i = 1; i < rows; i += 1) {
        for (let j = 1; j < cols; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}
function maxTypoDistance(length) {
    if (length <= 4)
        return 1;
    if (length <= 8)
        return 2;
    return 3;
}
function isSimilarTypo(input, candidate) {
    if (!input || !candidate)
        return false;
    const distance = levenshtein(input, candidate);
    if (distance === 0)
        return false;
    const maxLen = Math.max(input.length, candidate.length);
    const lengthGap = Math.abs(input.length - candidate.length);
    if (lengthGap > 2)
        return false;
    if (distance > maxTypoDistance(maxLen))
        return false;
    const similarity = 1 - distance / maxLen;
    return similarity >= 0.72;
}
function evaluateCouponCode(input, discountCodes) {
    const trimmed = input.trim();
    if (!trimmed)
        return { status: "empty" };
    const normalizedInput = normalizeCouponCode(trimmed);
    const upperInput = trimmed.toUpperCase();
    const exact = discountCodes.find((entry) => entry.code.toUpperCase() === upperInput);
    if (exact) {
        return { status: "valid", match: exact, reason: "exact" };
    }
    const suggestions = [];
    const seen = new Set();
    const addSuggestion = (entry, reason) => {
        if (seen.has(entry.id))
            return;
        seen.add(entry.id);
        suggestions.push({ code: entry, reason });
    };
    for (const entry of discountCodes) {
        const normalized = normalizeCouponCode(entry.code);
        const upperCode = entry.code.toUpperCase();
        if (normalized === normalizedInput && upperCode !== upperInput) {
            addSuggestion(entry, "spacing");
            continue;
        }
        if (normalized !== normalizedInput && isSimilarTypo(normalizedInput, normalized)) {
            addSuggestion(entry, "typo");
        }
    }
    if (suggestions.length > 0) {
        suggestions.sort((a, b) => {
            const reasonOrder = { spacing: 0, typo: 1 };
            if (reasonOrder[a.reason] !== reasonOrder[b.reason]) {
                return reasonOrder[a.reason] - reasonOrder[b.reason];
            }
            return (levenshtein(normalizedInput, normalizeCouponCode(a.code.code)) -
                levenshtein(normalizedInput, normalizeCouponCode(b.code.code)));
        });
        return { status: "potential", suggestions };
    }
    const normalizedExact = discountCodes.find((entry) => normalizeCouponCode(entry.code) === normalizedInput);
    if (normalizedExact) {
        return { status: "valid", match: normalizedExact, reason: "exact" };
    }
    return { status: "invalid" };
}
function lookupDiscountCode(code, discountCodes) {
    const evaluation = evaluateCouponCode(code, discountCodes);
    return evaluation.status === "valid" ? evaluation.match ?? null : null;
}
function isValidDiscountCode(code, discountCodes) {
    return evaluateCouponCode(code, discountCodes).status === "valid";
}
function isDuplicateDiscountCode(code, discountCodes, excludeId) {
    const normalized = code.trim().toUpperCase();
    if (!normalized)
        return false;
    return discountCodes.some((entry) => entry.id !== excludeId && entry.code.toUpperCase() === normalized);
}
