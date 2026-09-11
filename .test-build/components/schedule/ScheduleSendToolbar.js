"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleSendToolbar = ScheduleSendToolbar;
const jsx_runtime_1 = require("react/jsx-runtime");
const OrderFormFilters_1 = require("@/components/orders/OrderFormFilters");
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
function ScheduleSendToolbar({ form, cheerSubtype, danceSubtype, formCounts, cheerCounts, danceCounts, sendEditorProducers, selectedSendEditor, onSelectedSendEditorChange, onFormChange, onCheerSubtypeChange, onDanceSubtypeChange, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-col gap-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative z-40 inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40", children: [(0, jsx_runtime_1.jsx)(OrderFormFilters_1.OrderFormFilters, { grouped: true, portalMenus: true, form: form, cheerSubtype: cheerSubtype, danceSubtype: danceSubtype, onFormChange: onFormChange, onCheerSubtypeChange: onCheerSubtypeChange, onDanceSubtypeChange: onDanceSubtypeChange, formCounts: formCounts, cheerCounts: cheerCounts, danceCounts: danceCounts }), sendEditorProducers.length > 0 ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("div", { className: "px-1.5 py-0.5", children: (0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: sendEditorProducers, value: selectedSendEditor, onChange: onSelectedSendEditorChange, label: "Editor:", allLabel: "All Editors" }) })] })) : null] }) }));
}
