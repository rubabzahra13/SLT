"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryAndSubtypeFromContext = getCategoryAndSubtypeFromContext;
exports.getCategoryAndSubtypeFromActiveTabFilters = getCategoryAndSubtypeFromActiveTabFilters;
exports.SetPricingModal = SetPricingModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
const pricing_engine_1 = require("@/lib/pricing-engine");
const CATEGORIES = [
    {
        key: "All-Star Cheer",
        label: "All-Star Cheer",
        hasSubtypes: false,
        hasTierTimeDimension: true,
        addOns: [],
    },
    {
        key: "School Cheer",
        label: "School Cheer",
        hasSubtypes: true,
        hasTierTimeDimension: true,
        addOns: [
            {
                name: "Rally Mix",
                price: "+$350 (flat, stacks on top of any tier above)",
            },
        ],
    },
    {
        key: "Youth Rec Cheer",
        label: "Youth Rec Cheer",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Extend 2 8ct Phrase/Raps",
                price: "+$25 (flat)",
            },
            {
                name: "Processing 8ct Sheets",
                price: "+$50 (flat)",
            },
        ],
    },
    {
        key: "Pom",
        label: "Pom",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Traditional VO",
                price: "+$25 (flat)",
            },
            {
                name: "Themed VO (up to 5)",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Hip Hop",
        label: "Hip Hop",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Traditional VO",
                price: "+$25 (flat)",
            },
            {
                name: "Themed VO (up to 5)",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Team Performance & Variety",
        label: "Team Performance & Variety",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Traditional VO",
                price: "+$25 (flat)",
            },
            {
                name: "Themed VO (up to 5)",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Gameday",
        label: "Gameday",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Traditional VO",
                price: "+$25 (flat)",
            },
            {
                name: "Themed VO (up to 5)",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Jazz/Kick",
        label: "Jazz/Kick",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Traditional VO",
                price: "+$25 (flat)",
            },
            {
                name: "Themed VO (up to 5)",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Marching Band",
        label: "Marching Band",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Sheet Music Add",
                price: "+$50 (flat)",
            },
            {
                name: "Add Vocals",
                price: "+$75 (flat)",
            },
        ],
    },
    {
        key: "Sports Entertainment",
        label: "Sports Entertainment",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [
            {
                name: "Rush Order (needed in under 7 days)",
                price: "+$100 (flat)",
            },
        ],
    },
    {
        key: "School Anthems",
        label: "School Anthems",
        hasSubtypes: false,
        hasTierTimeDimension: false,
        addOns: [],
    },
];
function getCategoryAndSubtypeFromContext(order, rec) {
    if (order) {
        if (order.formType === "school-all-star-cheer") {
            const sub = order.cheerFormSubtype;
            if (sub === "school-cheer-viroc-yes" || sub === "school-cheer-viroc-no") {
                return { category: "School Cheer", subtype: sub };
            }
            if (sub === "youth-rec-cheer") {
                return { category: "Youth Rec Cheer" };
            }
            return { category: "All-Star Cheer" };
        }
        if (order.formType === "school-all-star-dance" || order.formType === "dance") {
            const sub = order.danceFormSubtype;
            if (sub === "pom")
                return { category: "Pom" };
            if (sub === "hip-hop")
                return { category: "Hip Hop" };
            if (sub === "team-performance-variety")
                return { category: "Team Performance & Variety" };
            if (sub === "gameday")
                return { category: "Gameday" };
            if (sub === "jazz-kick")
                return { category: "Jazz/Kick" };
            return { category: "Pom" };
        }
        if (order.formType === "marching-band") {
            return { category: "Marching Band" };
        }
        if (order.formType === "sports-entertainment") {
            return { category: "Sports Entertainment" };
        }
        if (order.formType === "school-anthem" ||
            order.formType === "school-anthems") {
            return { category: "School Anthems" };
        }
    }
    if (rec) {
        const recCategory = (rec.category || "").toLowerCase();
        const recPkg = (rec.package || "").toLowerCase();
        if (recCategory.includes("marching"))
            return { category: "Marching Band" };
        if (recCategory.includes("sports"))
            return { category: "Sports Entertainment" };
        if (recCategory.includes("anthem"))
            return { category: "School Anthems" };
        if (recCategory.includes("dance")) {
            if (recPkg.includes("pom"))
                return { category: "Pom" };
            if (recPkg.includes("hip hop"))
                return { category: "Hip Hop" };
            if (recPkg.includes("tp") || recPkg.includes("team"))
                return { category: "Team Performance & Variety" };
            if (recPkg.includes("gameday") || recPkg.includes("performance"))
                return { category: "Gameday" };
            if (recPkg.includes("jazz") || recPkg.includes("kick"))
                return { category: "Jazz/Kick" };
            return { category: "Pom" };
        }
        if (recCategory.includes("school")) {
            if (recPkg.includes("viroc no"))
                return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
            return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
        }
        if (recCategory.includes("youth") || recCategory.includes("rec"))
            return { category: "Youth Rec Cheer" };
        if (recCategory.includes("cheer"))
            return { category: "All-Star Cheer" };
    }
    return { category: "All-Star Cheer" };
}
function getCategoryData(category) {
    switch (category) {
        case "All-Star Cheer":
            return {
                type: "tier-time",
                rows: pricing_engine_1.ALL_STAR_CHEER_RATE_CARD.map((r) => ({
                    tier: r.tier,
                    limit: r.limit,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    isTitanium: r.isTitanium,
                })),
            };
        case "School Cheer":
            return {
                type: "tier-time",
                rows: pricing_engine_1.SCHOOL_CHEER_RATE_CARD.map((r) => ({
                    tier: r.tier,
                    limit: r.limit,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    isTitanium: r.isTitanium,
                })),
            };
        case "Youth Rec Cheer":
            return {
                type: "flat-package",
                rows: pricing_engine_1.YOUTH_REC_CHEER_RATE_CARD.map((r) => ({
                    package: `${r.tier} ${r.limit}`,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: false,
                    isUnpriced: false,
                })),
            };
        case "Pom":
            return {
                type: "flat-package",
                rows: pricing_engine_1.POM_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Hip Hop":
            return {
                type: "flat-package",
                rows: pricing_engine_1.HIP_HOP_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Team Performance & Variety":
            return {
                type: "flat-package",
                rows: pricing_engine_1.TEAM_PERFORMANCE_VARIETY_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Gameday":
            return {
                type: "flat-package",
                rows: pricing_engine_1.GAMEDAY_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Jazz/Kick":
            return {
                type: "flat-package",
                rows: pricing_engine_1.JAZZ_KICK_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Marching Band":
            return {
                type: "flat-package",
                rows: pricing_engine_1.MARCHING_BAND_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: Boolean(r.alwaysFixedPayroll),
                    isUnpriced: false,
                })),
            };
        case "Sports Entertainment":
            return {
                type: "flat-package",
                rows: pricing_engine_1.SPORTS_ENTERTAINMENT_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: false,
                    isUnpriced: Boolean(r.isUnpriced || r.customer === null),
                })),
            };
        case "School Anthems":
            return {
                type: "flat-package",
                rows: pricing_engine_1.SCHOOL_ANTHEM_RATE_CARD.map((r) => ({
                    package: r.package,
                    customer: r.customer,
                    compliant: r.compliant,
                    nonCompliant: r.nonCompliant,
                    alwaysFixedPayroll: true,
                    isUnpriced: false,
                })),
            };
        default:
            return null;
    }
}
function getCategoryAndSubtypeFromActiveTabFilters(form, cheerSubtype, danceSubtype) {
    if (form === "school-all-star-cheer") {
        if (cheerSubtype === "school-cheer-viroc-yes") {
            return { category: "School Cheer", subtype: "school-cheer-viroc-yes" };
        }
        if (cheerSubtype === "school-cheer-viroc-no") {
            return { category: "School Cheer", subtype: "school-cheer-viroc-no" };
        }
        if (cheerSubtype === "youth-rec-cheer") {
            return { category: "Youth Rec Cheer" };
        }
        if (cheerSubtype === "all-star-cheer") {
            return { category: "All-Star Cheer" };
        }
        return { category: "All-Star Cheer" };
    }
    if (form === "school-all-star-dance") {
        if (danceSubtype === "pom")
            return { category: "Pom" };
        if (danceSubtype === "hip-hop")
            return { category: "Hip Hop" };
        if (danceSubtype === "team-performance-variety")
            return { category: "Team Performance & Variety" };
        if (danceSubtype === "gameday")
            return { category: "Gameday" };
        if (danceSubtype === "jazz-kick")
            return { category: "Jazz/Kick" };
        return { category: "Pom" };
    }
    if (form === "marching-band") {
        return { category: "Marching Band" };
    }
    if (form === "sports-entertainment") {
        return { category: "Sports Entertainment" };
    }
    if (form === "school-anthem" ||
        form === "school-anthems") {
        return { category: "School Anthems" };
    }
    return { category: "All-Star Cheer" };
}
function SetPricingModal({ open, onClose, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype, }) {
    const [selectedCategory, setSelectedCategory] = (0, react_1.useState)("All-Star Cheer");
    const [selectedSubtype, setSelectedSubtype] = (0, react_1.useState)("school-cheer-viroc-yes");
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        if (initialCategory) {
            setSelectedCategory(initialCategory);
            if (initialSubtype)
                setSelectedSubtype(initialSubtype);
        }
        else if (form) {
            const ctx = getCategoryAndSubtypeFromActiveTabFilters(form, cheerSubtype, danceSubtype);
            setSelectedCategory(ctx.category);
            if (ctx.subtype)
                setSelectedSubtype(ctx.subtype);
        }
        else {
            const ctx = getCategoryAndSubtypeFromContext(order, record);
            setSelectedCategory(ctx.category);
            if (ctx.subtype)
                setSelectedSubtype(ctx.subtype);
        }
    }, [open, order, record, form, cheerSubtype, danceSubtype, initialCategory, initialSubtype]);
    if (!open)
        return null;
    const categoryConfig = CATEGORIES.find((c) => c.key === selectedCategory) ?? CATEGORIES[0];
    const categoryData = getCategoryData(selectedCategory);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim/90 backdrop-blur-sm", onClick: onClose, "aria-label": "Close modal" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "pricing-reference-title", style: { height: "80vh", maxHeight: "80vh", display: "flex", flexDirection: "column" }, className: "relative w-full max-w-5xl overflow-hidden rounded-2xl border-2 border-neutral-400 bg-white shadow-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b-2 border-neutral-300 bg-neutral-100 px-6 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange-soft text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { className: "h-5 w-5", strokeWidth: 2.25 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h2", { id: "pricing-reference-title", className: "text-[20px] font-bold tracking-[-0.02em] text-neutral-900", children: "Pricing Reference Table" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-neutral-600", children: "Filterable reference lookup table mirroring original client pricing sheets." })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl p-2 text-neutral-500 transition hover:bg-neutral-200 hover:text-neutral-900", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", strokeWidth: 2 }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-600 mb-1.5", children: "Order Form / Category" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1.5 p-1 rounded-xl bg-neutral-200/80 border border-neutral-300 max-h-24 overflow-y-auto", children: CATEGORIES.map((cat) => {
                                            const active = selectedCategory === cat.key;
                                            return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelectedCategory(cat.key), className: (0, clsx_1.default)("rounded-lg px-3 py-1 text-[12px] font-semibold transition shrink-0", active
                                                    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-300"
                                                    : "text-neutral-700 hover:bg-white/70 hover:text-neutral-900"), children: cat.label }, cat.key));
                                        }) })] }), categoryConfig.hasSubtypes && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-600", children: "Subtype:" }), (0, jsx_runtime_1.jsxs)("div", { className: "inline-flex rounded-lg bg-neutral-200/90 p-0.5 border border-neutral-300", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelectedSubtype("school-cheer-viroc-yes"), className: (0, clsx_1.default)("rounded-md px-3 py-1 text-[12px] font-semibold transition", selectedSubtype === "school-cheer-viroc-yes"
                                                    ? "bg-brand-blue text-white shadow-sm"
                                                    : "text-neutral-700 hover:text-neutral-900"), children: "VIROC Yes" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelectedSubtype("school-cheer-viroc-no"), className: (0, clsx_1.default)("rounded-md px-3 py-1 text-[12px] font-semibold transition", selectedSubtype === "school-cheer-viroc-no"
                                                    ? "bg-brand-blue text-white shadow-sm"
                                                    : "text-neutral-700 hover:text-neutral-900"), children: "VIROC No" })] })] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-0 flex flex-col px-6 py-4 space-y-4 overflow-hidden", children: !categoryData || categoryData.rows.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { className: "h-8 w-8 text-neutral-400" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[14px] font-semibold text-neutral-800", children: "No pricing configured for this order form" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] text-neutral-500", children: "Please select another category from the filter above." })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1 min-h-[200px] overflow-y-auto rounded-lg border-2 border-neutral-400 bg-white shadow-sm", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full border-collapse text-left text-[12px]", children: [(0, jsx_runtime_1.jsx)("thead", { className: "sticky top-0 z-20 bg-neutral-200", children: (0, jsx_runtime_1.jsxs)("tr", { className: "bg-neutral-200 text-[11px] font-bold uppercase tracking-[0.06em] text-neutral-900 border-b-2 border-neutral-400", children: [categoryData.type === "tier-time" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Tier" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Time Limit" })] })) : ((0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 bg-neutral-200 text-neutral-900", children: "Package" })), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-right bg-neutral-200 text-neutral-900", children: "Customer Price" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-emerald-200 text-emerald-950 font-bold", children: "Music Affiliate \u2014 Compliant (Payroll Price)" }), (0, jsx_runtime_1.jsx)("th", { className: "sticky top-0 z-20 border border-neutral-300 px-3.5 py-2.5 text-center bg-rose-200 text-rose-950 font-bold", children: "Music Affiliate \u2014 Non-Compliant (Payroll Price)" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "text-neutral-900", children: categoryData.type === "tier-time"
                                                    ? categoryData.rows.map((row, idx) => {
                                                        const isTitanium = row.isTitanium;
                                                        return ((0, jsx_runtime_1.jsxs)("tr", { className: "even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900", children: row.tier }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-semibold tabular-nums text-neutral-700", children: row.limit }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-right font-bold tabular-nums text-neutral-900", children: (0, data_1.formatPrice)(row.customer) }), isTitanium || row.compliant === row.nonCompliant ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-3.5 w-3.5 text-brand-blue" }), (0, data_1.formatPrice)(row.compliant), " ", (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-normal text-neutral-600", children: "(always)" })] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40", children: (0, data_1.formatPrice)(row.compliant) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20", children: (0, data_1.formatPrice)(row.nonCompliant) })] }))] }, `${row.tier}-${row.limit}-${idx}`));
                                                    })
                                                    : categoryData.rows.map((row, idx) => {
                                                        const isUnpriced = row.isUnpriced || row.customer === null;
                                                        const alwaysFixed = row.alwaysFixedPayroll ||
                                                            (!isUnpriced && row.compliant === row.nonCompliant);
                                                        return ((0, jsx_runtime_1.jsxs)("tr", { className: "even:bg-neutral-50/80 hover:bg-blue-50/40 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 font-bold text-neutral-900", children: row.package }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-right font-bold tabular-nums text-neutral-900", children: isUnpriced ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { className: "h-3 w-3 text-amber-600 shrink-0" }), "TBD via email \u2014 needs manual quote"] })) : ((0, data_1.formatPrice)(row.customer)) }), isUnpriced ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 px-3.5 py-2 text-center text-[12px] font-medium text-neutral-500 bg-amber-50/10", children: "\u2014" })) : alwaysFixed ? ((0, jsx_runtime_1.jsx)("td", { colSpan: 2, className: "border border-neutral-300 bg-blue-50/40 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900", children: (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Tag, { className: "h-3.5 w-3.5 text-brand-blue" }), (0, data_1.formatPrice)(row.compliant), " ", (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-normal text-neutral-600", children: "(always)" })] }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-emerald-800 bg-emerald-50/40", children: (0, data_1.formatPrice)(row.compliant) }), (0, jsx_runtime_1.jsx)("td", { className: "border border-neutral-300 px-3.5 py-2 text-center font-bold tabular-nums text-neutral-900 bg-rose-50/20", children: (0, data_1.formatPrice)(row.nonCompliant) })] }))] }, `${row.package}-${idx}`));
                                                    }) })] }) }), categoryConfig.addOns.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-neutral-300 bg-neutral-50 p-4 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsxs)("h3", { className: "text-[13px] font-bold uppercase tracking-[0.06em] text-neutral-900", children: ["Add-Ons (", selectedCategory, ")"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-neutral-600", children: "Add-ons are modeled separately from base package prices and stack on top of the rate card amounts above." }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 overflow-hidden rounded-lg border border-neutral-300 bg-white", children: categoryConfig.addOns.map((addon) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[12px] border-b border-neutral-200 last:border-b-0", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-bold text-neutral-900", children: addon.name }), (0, jsx_runtime_1.jsx)("span", { className: "font-bold text-brand-orange", children: addon.price })] }, addon.name))) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 text-[12px] text-neutral-700", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { className: "h-4 w-4 shrink-0 text-brand-blue mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-neutral-900", children: "Music Affiliate Terminology & Compliance Rules:" }), " ", "Compliant Music Affiliate providers include", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-neutral-900", children: "Power Music, Power Music + Unleash the Beats, Unleash the Beats, Library Music" }), " ", "(plus ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-neutral-900", children: "Power Music Covers" }), " &", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-neutral-900", children: "Unleash the Beats Covers" }), " for Dance forms). Any other music affiliate value is treated as non-compliant."] })] })] })) }), (0, jsx_runtime_1.jsx)("div", { className: "shrink-0 flex items-center justify-end gap-3 border-t-2 border-neutral-300 bg-neutral-100 px-6 py-3.5", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-xl bg-neutral-900 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-neutral-800", children: "Close Reference" }) })] })] }));
}
