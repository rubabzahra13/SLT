"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderCheerSubTabs = OrderCheerSubTabs;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const DottedScroll_1 = require("@/components/ui/DottedScroll");
function getCategory(subtype) {
    if (subtype === "all")
        return "all";
    if (subtype === "school-cheer-viroc-yes" || subtype === "school-cheer-viroc-no") {
        return "school-cheer";
    }
    if (subtype === "youth-rec-cheer")
        return "youth-rec-cheer";
    return "all-star-cheer";
}
const MAIN_CATEGORIES = [
    { id: "all", label: "All Cheer" },
    { id: "all-star-cheer", label: "All Star Cheer" },
    { id: "school-cheer", label: "School Cheer" },
    { id: "youth-rec-cheer", label: "Youth Rec Cheer" },
];
function OrderCheerSubTabs({ subtype, onChange, counts }) {
    const category = getCategory(subtype);
    const schoolCheerTotal = (counts["school-cheer-viroc-yes"] ?? 0) + (counts["school-cheer-viroc-no"] ?? 0);
    function mainCount(id) {
        if (id === "all")
            return counts["all"] ?? 0;
        if (id === "school-cheer")
            return schoolCheerTotal;
        if (id === "youth-rec-cheer")
            return counts["youth-rec-cheer"] ?? 0;
        return counts["all-star-cheer"] ?? 0;
    }
    function selectCategory(id) {
        if (id === "all") {
            onChange("all");
            return;
        }
        if (id === "school-cheer") {
            onChange(subtype === "school-cheer-viroc-no" ? "school-cheer-viroc-no" : "school-cheer-viroc-yes");
            return;
        }
        if (id === "youth-rec-cheer") {
            onChange("youth-rec-cheer");
            return;
        }
        onChange("all-star-cheer");
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line bg-brand-bg/20", children: [(0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { orientation: "horizontal", scrollClassName: "overflow-x-scroll scrollbar-hide", indicatorPlacement: "below", contentClassName: "flex w-max min-w-full px-4 py-2", children: (0, jsx_runtime_1.jsx)("nav", { className: "flex gap-1", "aria-label": "Cheer form categories", children: MAIN_CATEGORIES.map(({ id, label }) => {
                        const active = category === id;
                        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => selectCategory(id), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", active
                                ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
                                : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: [label, (0, jsx_runtime_1.jsx)("span", { className: "ml-1 tabular-nums text-brand-ink-tertiary", children: mainCount(id) })] }, id));
                    }) }) }), category === "school-cheer" ? ((0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { orientation: "horizontal", scrollClassName: "overflow-x-scroll scrollbar-hide", indicatorPlacement: "below", contentClassName: "flex w-max min-w-full border-t border-brand-line/60 px-4 py-2 pl-6", children: (0, jsx_runtime_1.jsxs)("nav", { className: "flex gap-1", "aria-label": "School Cheer form types", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("school-cheer-viroc-yes"), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", subtype === "school-cheer-viroc-yes"
                                ? "bg-brand-accent text-white shadow-sm"
                                : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: ["VIROC Yes", (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1 tabular-nums", subtype === "school-cheer-viroc-yes" ? "text-white/80" : "text-brand-ink-tertiary"), children: counts["school-cheer-viroc-yes"] ?? 0 })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("school-cheer-viroc-no"), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", subtype === "school-cheer-viroc-no"
                                ? "bg-brand-accent text-white shadow-sm"
                                : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: ["VIROC No", (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1 tabular-nums", subtype === "school-cheer-viroc-no" ? "text-white/80" : "text-brand-ink-tertiary"), children: counts["school-cheer-viroc-no"] ?? 0 })] })] }) })) : null] }));
}
