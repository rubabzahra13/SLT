"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFormFilters = OrderFormFilters;
const jsx_runtime_1 = require("react/jsx-runtime");
const FilterMenu_1 = require("@/components/ui/FilterMenu");
const types_1 = require("@/types");
function OrderFormFilters({ form, cheerSubtype, danceSubtype, onFormChange, onCheerSubtypeChange, onDanceSubtypeChange, formCounts, cheerCounts, danceCounts, grouped = false, portalMenus = false, }) {
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Form", hideLabel: true, grouped: grouped, portal: portalMenus, value: form, onChange: (v) => onFormChange(v), accent: "blue", options: types_1.ORDER_FORM_TABS.map(({ id, label }) => ({
                    value: id,
                    label,
                    count: formCounts[id] ?? 0,
                })) }), form === "school-all-star-cheer" ? ((0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Cheer", hideLabel: true, grouped: grouped, portal: portalMenus, value: cheerSubtype, onChange: (v) => onCheerSubtypeChange(v), accent: "orange", options: types_1.CHEER_FORM_SUBTABS_WITH_ALL.map(({ id, label }) => ({
                    value: id,
                    label,
                    count: cheerCounts[id] ?? 0,
                })) })) : null, form === "school-all-star-dance" ? ((0, jsx_runtime_1.jsx)(FilterMenu_1.FilterMenu, { label: "Dance", hideLabel: true, grouped: grouped, portal: portalMenus, value: danceSubtype, onChange: (v) => onDanceSubtypeChange(v), accent: "orange", options: types_1.DANCE_FORM_SUBTABS_WITH_ALL.map(({ id, label }) => ({
                    value: id,
                    label,
                    count: danceCounts[id] ?? 0,
                })) })) : null] }));
}
