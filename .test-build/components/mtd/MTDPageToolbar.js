"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTDPageToolbar = MTDPageToolbar;
const jsx_runtime_1 = require("react/jsx-runtime");
const OrderFormFilters_1 = require("@/components/orders/OrderFormFilters");
const MTDTableFilters_1 = require("@/components/mtd/MTDTableFilters");
const FilterMenu_1 = require("@/components/ui/FilterMenu");
function MTDPageToolbar({ form, cheerSubtype, danceSubtype, orderType, onOrderTypeChange, newOrdersCount, reassignedOrdersCount, onFormChange, onCheerSubtypeChange, onDanceSubtypeChange, formCounts, cheerCounts, danceCounts, records, producers, orderById, filters, onFiltersChange, onFiltersReset, onPricingClick, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center gap-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "inline-flex flex-wrap items-center gap-0.5 rounded-xl bg-brand-elevated/80 p-0.5 ring-1 ring-inset ring-brand-line/40", role: "toolbar", "aria-label": "MTD filters", children: [(0, jsx_runtime_1.jsx)(OrderFormFilters_1.OrderFormFilters, { grouped: true, form: form, cheerSubtype: cheerSubtype, danceSubtype: danceSubtype, onFormChange: onFormChange, onCheerSubtypeChange: onCheerSubtypeChange, onDanceSubtypeChange: onDanceSubtypeChange, formCounts: formCounts, cheerCounts: cheerCounts, danceCounts: danceCounts }), (0, jsx_runtime_1.jsx)("span", { className: "mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsx)(MTDTableFilters_1.MTDTableFilterPanel, { grouped: true, records: records, producers: producers, orderById: orderById, filters: filters, onChange: onFiltersChange, onReset: onFiltersReset, form: form }), onOrderTypeChange && orderType ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "mx-0.5 hidden h-5 w-px shrink-0 bg-brand-line/45 sm:block", "aria-hidden": true }), (0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Order Type", hideLabel: true, grouped: true, value: orderType, onChange: (v) => onOrderTypeChange(v), accent: orderType === "reassigned" ? "red" : "blue", options: [
                                        { value: "new_orders", label: "New Orders", count: newOrdersCount },
                                        { value: "reassigned", label: "Reassigned", count: reassignedOrdersCount, isRed: true },
                                    ] })] })) : null] }) }), (0, jsx_runtime_1.jsx)(MTDTableFilters_1.MTDFilterChipsRow, { records: records, producers: producers, orderById: orderById, filters: filters, onChange: onFiltersChange, onReset: onFiltersReset, form: form })] }));
}
