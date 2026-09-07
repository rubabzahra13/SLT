"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DANCE_FORM_SUBTABS = void 0;
exports.OrderDanceSubTabs = OrderDanceSubTabs;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const types_1 = require("@/types");
Object.defineProperty(exports, "DANCE_FORM_SUBTABS", { enumerable: true, get: function () { return types_1.DANCE_FORM_SUBTABS; } });
function OrderDanceSubTabs({ subtype, onChange, counts }) {
    const teamPerfActive = subtype === "team-performance-variety" ||
        subtype === "gameday" ||
        subtype === "jazz-kick";
    const teamPerfTotal = (counts["team-performance-variety"] ?? 0) +
        (counts.gameday ?? 0) +
        (counts["jazz-kick"] ?? 0);
    return ((0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { orientation: "horizontal", className: "border-b border-brand-line bg-brand-bg/20", scrollClassName: "overflow-x-scroll scrollbar-hide", indicatorPlacement: "below", contentClassName: "flex w-max min-w-full px-4 py-2", children: (0, jsx_runtime_1.jsxs)("nav", { className: "flex gap-1", "aria-label": "Dance form types", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("all"), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", subtype === "all"
                        ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
                        : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: ["All Dance", (0, jsx_runtime_1.jsx)("span", { className: "ml-1 tabular-nums text-brand-ink-tertiary", children: counts.all ?? 0 })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("pom"), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", subtype === "pom"
                        ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
                        : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: ["POM", (0, jsx_runtime_1.jsx)("span", { className: "ml-1 tabular-nums text-brand-ink-tertiary", children: counts.pom ?? 0 })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("hip-hop"), className: (0, clsx_1.default)("shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors", subtype === "hip-hop"
                        ? "bg-brand-accent-soft text-brand-ink ring-1 ring-brand-line-strong"
                        : "text-brand-ink-secondary hover:bg-brand-surface hover:text-brand-ink"), children: ["Hip Hop", (0, jsx_runtime_1.jsx)("span", { className: "ml-1 tabular-nums text-brand-ink-tertiary", children: counts["hip-hop"] ?? 0 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center gap-0.5 rounded-md bg-brand-surface/80 p-0.5 ring-1 ring-brand-line", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("team-performance-variety"), className: (0, clsx_1.default)("rounded px-2 py-1 text-[11px] font-medium transition-colors", teamPerfActive
                                ? "text-brand-ink-secondary"
                                : "text-brand-ink-tertiary hover:text-brand-ink-secondary"), children: ["Team Performance & Variety", (0, jsx_runtime_1.jsx)("span", { className: "ml-1 tabular-nums", children: teamPerfTotal })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-brand-line-strong", children: "|" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("team-performance-variety"), className: (0, clsx_1.default)("rounded px-2 py-1 text-[11px] font-medium transition-colors", subtype === "team-performance-variety"
                                ? "bg-brand-accent text-white"
                                : "text-brand-ink-secondary hover:bg-brand-bg"), children: ["General", (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1 tabular-nums", subtype === "team-performance-variety"
                                        ? "text-white/80"
                                        : "text-brand-ink-tertiary"), children: counts["team-performance-variety"] ?? 0 })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("gameday"), className: (0, clsx_1.default)("rounded px-2 py-1 text-[11px] font-medium transition-colors", subtype === "gameday"
                                ? "bg-brand-accent text-white"
                                : "text-brand-ink-secondary hover:bg-brand-bg"), children: ["Gameday", (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1 tabular-nums", subtype === "gameday" ? "text-white/80" : "text-brand-ink-tertiary"), children: counts.gameday ?? 0 })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onChange("jazz-kick"), className: (0, clsx_1.default)("rounded px-2 py-1 text-[11px] font-medium transition-colors", subtype === "jazz-kick"
                                ? "bg-brand-accent text-white"
                                : "text-brand-ink-secondary hover:bg-brand-bg"), children: ["Jazz/Kick", (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("ml-1 tabular-nums", subtype === "jazz-kick" ? "text-white/80" : "text-brand-ink-tertiary"), children: counts["jazz-kick"] ?? 0 })] })] })] }) }));
}
