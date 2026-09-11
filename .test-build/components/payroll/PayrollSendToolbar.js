"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollSendToolbar = PayrollSendToolbar;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const OrderFormFilters_1 = require("@/components/orders/OrderFormFilters");
const FilterPill_1 = require("@/components/ui/FilterPill");
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
function FilterGroup({ label, children, className, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex min-w-0 flex-col gap-1.5", className), children: [(0, jsx_runtime_1.jsx)("p", { className: "px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-brand-line/45", role: "group", "aria-label": label, children: children })] }));
}
function PayrollSendToolbar({ form, cheerSubtype, danceSubtype, formCounts, cheerCounts, danceCounts, sendEditorProducers, selectedSendEditor, onSelectedSendEditorChange, payPeriod, onPayPeriodChange, onFormChange, onCheerSubtypeChange, onDanceSubtypeChange, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-3.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between", role: "toolbar", "aria-label": "Payroll send filters", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40", children: [(0, jsx_runtime_1.jsx)(OrderFormFilters_1.OrderFormFilters, { grouped: true, portalMenus: true, form: form, cheerSubtype: cheerSubtype, danceSubtype: danceSubtype, onFormChange: onFormChange, onCheerSubtypeChange: onCheerSubtypeChange, onDanceSubtypeChange: onDanceSubtypeChange, formCounts: formCounts, cheerCounts: cheerCounts, danceCounts: danceCounts }), sendEditorProducers.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("div", { className: "px-1.5 py-0.5", children: (0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: sendEditorProducers, value: selectedSendEditor, onChange: onSelectedSendEditorChange, label: "Editor:", allLabel: "All Editors" }) })] })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "flex shrink-0 flex-wrap items-center gap-2.5", children: (0, jsx_runtime_1.jsxs)(FilterGroup, { label: "Period", children: [(0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "2 Weeks", active: payPeriod === "2weeks", variant: "grouped", onClick: () => onPayPeriodChange("2weeks") }), (0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "4 Weeks", active: payPeriod === "4weeks", variant: "grouped", onClick: () => onPayPeriodChange("4weeks") }), (0, jsx_runtime_1.jsx)(FilterPill_1.FilterPill, { label: "6 Weeks", active: payPeriod === "6weeks", variant: "grouped", onClick: () => onPayPeriodChange("6weeks") })] }) })] }) }));
}
