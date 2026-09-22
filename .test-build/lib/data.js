"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = getData;
exports.formatPrice = formatPrice;
exports.titleCase = titleCase;
exports.getStatusColor = getStatusColor;
exports.getStatusLabel = getStatusLabel;
exports.getHaveStatus = getHaveStatus;
const discount_codes_1 = require("@/lib/discount-codes");
const producers_1 = require("@/lib/producers");
const mock_data_json_1 = __importDefault(require("@/data/mock-data.json"));
/**
 * Returns app configuration data (producers, discount codes, schedule entries).
 * Transactional data (orders, MTD records) is intentionally empty here —
 * the AppStateContext loads those exclusively from the backend API (Supabase).
 */
function getData() {
    const raw = mock_data_json_1.default;
    const producers = raw.producers.map((p) => (0, producers_1.normalizeProducer)(p));
    return {
        ...raw,
        producers,
        // Discount codes: always empty — loaded exclusively from backend API (Supabase).
        discountCodes: (raw.discountCodes ?? []).map((entry) => (0, discount_codes_1.normalizeDiscountCode)(entry)),
        orders: raw.orders || [],
        pastOrders: raw.pastOrders || [],
        mtdRecords: raw.mtdRecords || [],
        schedule: [],
    };
}
function formatPrice(price) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
    }).format(price);
}
const TITLE_CASE_ACRONYMS = new Set([
    "TBD",
    "FA",
    "NA",
    "HS",
    "LRG",
    "VAR",
    "SM",
    "NT",
    "D2",
    "COED",
    "COLLECTIONS",
    "CM",
    "YT",
    "YTH",
]);
/** Capitalize the first letter of each word; preserve known acronyms and times like 2:30. */
function titleCase(text) {
    if (!text?.trim())
        return text;
    const formatWord = (word) => {
        const upper = word.toUpperCase();
        if (TITLE_CASE_ACRONYMS.has(upper))
            return upper;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    };
    return text
        .split(/([/\s]+)/)
        .map((segment) => /[a-zA-Z]/.test(segment)
        ? segment.replace(/\b[A-Za-z]+\b/g, formatWord)
        : segment)
        .join("");
}
function getStatusColor(status) {
    switch (status) {
        case "new":
            return "bg-brand-blue-soft text-brand-signature ring-brand-blue-muted";
        case "active":
            return "bg-brand-accent-soft text-brand-ink-secondary ring-brand-line";
        case "needs_attention":
            return "bg-brand-orange-soft text-brand-orange ring-brand-orange-muted";
        case "outsourced":
            return "bg-brand-orange-soft/70 text-brand-orange ring-brand-orange-muted";
        case "completed":
            return "bg-brand-accent-soft text-brand-ink-tertiary ring-brand-line";
        case "in_mtd":
            return "bg-brand-blue-soft text-brand-signature ring-brand-blue-muted";
        default:
            return "bg-brand-accent-soft text-brand-neutral ring-brand-line";
    }
}
function getStatusLabel(status) {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function getHaveStatus(value) {
    const upper = value.toUpperCase();
    if (upper.includes("NEED"))
        return "need";
    if (upper.includes("HAVE"))
        return "have";
    return "partial";
}
