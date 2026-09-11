"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = getData;
exports.findOrder = findOrder;
exports.formatPrice = formatPrice;
exports.titleCase = titleCase;
exports.getStatusColor = getStatusColor;
exports.getStatusLabel = getStatusLabel;
exports.getHaveStatus = getHaveStatus;
const order_form_1 = require("@/lib/order-form");
const discount_codes_1 = require("@/lib/discount-codes");
const producers_1 = require("@/lib/producers");
const editor_assignment_1 = require("@/lib/editor-assignment");
const mock_data_json_1 = __importDefault(require("@/data/mock-data.json"));
const cheer_demo_orders_1 = require("@/data/cheer-demo-orders");
const dance_demo_orders_1 = require("@/data/dance-demo-orders");
const new_categories_demo_orders_1 = require("@/data/new-categories-demo-orders");
function getData() {
    const raw = mock_data_json_1.default;
    const producers = raw.producers.map((p) => (0, producers_1.normalizeProducer)(p));
    const sanitizeMtdRecord = (r) => ({
        ...r,
        assignedProducer: (0, editor_assignment_1.resolveValidProducerAssignment)(r.assignedProducer, producers, r.category),
    });
    const sanitizeOrder = (o) => {
        const norm = (0, order_form_1.normalizeOrder)(o);
        return {
            ...norm,
            assignedProducer: (0, editor_assignment_1.resolveValidProducerAssignment)(norm.assignedProducer, producers, norm.category || norm.formType || ""),
        };
    };
    const combinedDemoOrders = [
        ...cheer_demo_orders_1.CHEER_DEMO_ORDERS,
        ...dance_demo_orders_1.DANCE_DEMO_ORDERS,
        ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_ORDERS,
    ];
    const demoOrdersById = new Map(combinedDemoOrders.map((o) => [o.id, sanitizeOrder(o)]));
    const existingRawOrders = raw.orders.map((o) => sanitizeOrder(o));
    const existingOrderIds = new Set(existingRawOrders.map((o) => o.id));
    const mergedOrders = existingRawOrders.map((o) => demoOrdersById.get(o.id) ?? o);
    const extraDemoOrders = combinedDemoOrders
        .filter((o) => !existingOrderIds.has(o.id))
        .map((o) => sanitizeOrder(o));
    const combinedDemoMtdRecords = [
        ...cheer_demo_orders_1.CHEER_DEMO_MTD_RECORDS,
        ...dance_demo_orders_1.DANCE_DEMO_MTD_RECORDS,
        ...new_categories_demo_orders_1.NEW_CATEGORIES_DEMO_MTD_RECORDS,
    ];
    const demoMtdById = new Map(combinedDemoMtdRecords.map((r) => [r.id, sanitizeMtdRecord(r)]));
    const existingRawMtd = (raw.mtdRecords || []).map((r) => sanitizeMtdRecord(r));
    const existingMtdIds = new Set(existingRawMtd.map((r) => r.id));
    const mergedMtdRecords = existingRawMtd.map((r) => demoMtdById.get(r.id) ?? r);
    const extraDemoMtdRecords = combinedDemoMtdRecords
        .filter((r) => !existingMtdIds.has(r.id))
        .map((r) => sanitizeMtdRecord(r));
    const allMtdRecords = [...mergedMtdRecords, ...extraDemoMtdRecords].map((r) => {
        const norm = sanitizeMtdRecord(r);
        if (norm.inMTD === undefined &&
            ((Boolean(norm.assignedProducer) && Boolean(norm.mixStartDate) && Boolean(norm.mixEndDate)) ||
                norm.status === "outsourced" ||
                norm.section === "OUTSOURCED MIXES")) {
            norm.inMTD = true;
        }
        return norm;
    });
    return {
        ...raw,
        producers,
        discountCodes: (raw.discountCodes ?? []).map((entry) => (0, discount_codes_1.normalizeDiscountCode)(entry)),
        orders: [...mergedOrders, ...extraDemoOrders],
        pastOrders: (raw.pastOrders ?? []).map((o) => sanitizeOrder(o)),
        mtdRecords: allMtdRecords,
    };
}
function findOrder(id) {
    const { orders, pastOrders } = getData();
    return orders.find((o) => o.id === id) ?? pastOrders.find((o) => o.id === id);
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
