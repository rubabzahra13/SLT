"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponCodeField = CouponCodeField;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const InlineFields_1 = require("@/components/mtd/InlineFields");
const discount_codes_1 = require("@/lib/discount-codes");
function ValidFeedback({ match }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-start gap-2.5 rounded-xl border border-brand-success/25 bg-brand-success/8 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-success", strokeWidth: 2 }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: "Valid discount code" }), (0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full bg-brand-success/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success ring-1 ring-inset ring-brand-success/20", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.BadgeCheck, { className: "h-3 w-3", strokeWidth: 2.25 }), match.code] })] }), match.description ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-secondary", children: match.description })) : null] })] }));
}
function suggestionMessage(suggestion) {
    if (suggestion.reason === "spacing") {
        return "Same code with different spacing.";
    }
    return "Very close spelling to a saved discount code.";
}
function PotentialFeedback({ suggestions, editable, onApply, }) {
    const multiple = suggestions.length > 1;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 rounded-xl border border-brand-info/25 bg-brand-info/8 px-3 py-2.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Sparkles, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-signature", strokeWidth: 2 }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: multiple
                                    ? `${suggestions.length} possible matches`
                                    : "Possible match found" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-secondary", children: multiple
                                    ? "This entry is close to these saved discount codes."
                                    : "This looks close to a saved discount code." })] })] }), (0, jsx_runtime_1.jsx)("ul", { className: "mt-3 space-y-2", children: suggestions.map((suggestion) => ((0, jsx_runtime_1.jsx)("li", { className: "rounded-lg border border-brand-line/70 bg-brand-surface/80 px-3 py-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-start justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold uppercase tracking-wide text-brand-ink", children: suggestion.code.code }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] text-brand-ink-secondary", children: suggestionMessage(suggestion) }), suggestion.code.description ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[11px] leading-snug text-brand-ink-tertiary", children: suggestion.code.description })) : null] }), editable && onApply ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onApply(suggestion.code.code), className: "shrink-0 rounded-lg bg-brand-signature px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-signature-hover", children: "Use this code" })) : null] }) }, suggestion.code.id))) })] }));
}
function InvalidFeedback() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-warning", strokeWidth: 2 }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold text-brand-ink", children: "Code not recognized" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-secondary", children: ["This coupon isn't in the saved discount codes. Check the spelling or add it in", " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "/settings/discount-codes", className: "font-semibold text-brand-signature transition hover:text-brand-signature-hover", children: "Settings \u2192 Discount codes" }), "."] })] })] }));
}
function CouponCodeField({ value, discountCodes, editable = false, onChange, }) {
    const trimmed = value.trim();
    const evaluation = (0, discount_codes_1.evaluateCouponCode)(trimmed, discountCodes);
    const showValid = evaluation.status === "valid";
    const showPotential = evaluation.status === "potential";
    const showInvalid = evaluation.status === "invalid";
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "text-label", children: "Coupon code" }), editable && onChange ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-1.5", children: (0, jsx_runtime_1.jsx)(InlineFields_1.DetailInput, { value: value, onChange: onChange, placeholder: "Enter coupon code", className: (0, clsx_1.default)(showValid &&
                        "border-brand-success/45 bg-brand-success/5 focus:border-brand-success/60", showPotential &&
                        "border-brand-info/45 bg-brand-info/5 focus:border-brand-info/60", showInvalid &&
                        "border-brand-warning/45 bg-brand-warning/5 focus:border-brand-warning/60") }) })) : trimmed ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-[13px] font-semibold uppercase tracking-wide text-brand-ink", children: trimmed })) : ((0, jsx_runtime_1.jsx)("p", { className: "mt-1.5 text-[13px] text-brand-ink-tertiary", children: "Not set" })), showValid && evaluation.match ? ((0, jsx_runtime_1.jsx)(ValidFeedback, { match: evaluation.match })) : null, showPotential && evaluation.suggestions ? ((0, jsx_runtime_1.jsx)(PotentialFeedback, { suggestions: evaluation.suggestions, editable: editable, onApply: onChange })) : null, showInvalid ? (0, jsx_runtime_1.jsx)(InvalidFeedback, {}) : null] }));
}
