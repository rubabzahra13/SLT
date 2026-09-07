"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDetailDisplay = formatDetailDisplay;
exports.MTDOrderDetails = MTDOrderDetails;
const jsx_runtime_1 = require("react/jsx-runtime");
const order_detail_sections_1 = require("@/lib/order-detail-sections");
const order_detail_fields_1 = require("@/lib/order-detail-fields");
const CouponCodeField_1 = require("@/components/mtd/CouponCodeField");
const InlineFields_1 = require("@/components/mtd/InlineFields");
function formatDetailDisplay(value) {
    if (!value?.trim() || value === "—")
        return "";
    return value.replace(/\s*[—–]\s*/g, ", ").trim();
}
function OrderFieldTile({ label, multiline, children, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-3.5 ring-1 ring-inset ring-brand-line/10", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: children })] }));
}
function MTDOrderDetails({ order, discountCodes = [], editable = false, onFieldChange, }) {
    const sections = (0, order_detail_sections_1.getOrderDetailSections)(order);
    if (sections.length === 0) {
        return ((0, jsx_runtime_1.jsx)("p", { className: "text-[13px] text-brand-ink-secondary", children: "No order form fields available for this record." }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-6", children: sections.map((section) => ((0, jsx_runtime_1.jsxs)("section", { className: "overflow-hidden rounded-xl border border-brand-line/45 bg-white ring-1 ring-inset ring-brand-line/10", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/35 bg-brand-bg-subtle/60 px-4 py-2.5", children: (0, jsx_runtime_1.jsx)("h3", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: section.title }) }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 gap-3 p-4", children: section.fields.map((field) => {
                        const rawValue = (0, order_detail_fields_1.rawFieldValue)(order, field.key);
                        const displayValue = formatDetailDisplay(field.value);
                        if (field.key === "couponCode") {
                            return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl border border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-3.5 ring-1 ring-inset ring-brand-line/10", children: (0, jsx_runtime_1.jsx)(CouponCodeField_1.CouponCodeField, { value: rawValue, discountCodes: discountCodes, editable: editable, onChange: onFieldChange
                                        ? (value) => onFieldChange(field.key, value)
                                        : undefined }) }, field.key));
                        }
                        return ((0, jsx_runtime_1.jsx)(OrderFieldTile, { label: field.label, multiline: field.multiline, children: editable && onFieldChange ? (field.multiline ? ((0, jsx_runtime_1.jsx)(InlineFields_1.DetailTextarea, { value: rawValue, onChange: (value) => onFieldChange(field.key, value), rows: 4 })) : ((0, jsx_runtime_1.jsx)(InlineFields_1.DetailInput, { value: rawValue, onChange: (value) => onFieldChange(field.key, value) }))) : displayValue ? ((0, jsx_runtime_1.jsx)("p", { className: field.multiline
                                    ? "whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink"
                                    : "text-[13px] font-semibold text-brand-ink", children: displayValue })) : ((0, jsx_runtime_1.jsx)("p", { className: "text-[13px] text-brand-ink-tertiary", children: "Not set" })) }, field.key));
                    }) })] }, section.title))) }));
}
