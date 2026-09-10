"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetRecordPricingModal = SetRecordPricingModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
const pricing_1 = require("@/lib/pricing");
function SetRecordPricingModal({ open, record, musicAffiliateInfo = null, onClose, onSave, readOnly = false, }) {
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [priceDraft, setPriceDraft] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        setPriceDraft(String(record.price));
    }, [open, record]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);
    if (!mounted || !open || !record)
        return null;
    const parsedDraft = (0, pricing_1.parsePriceInput)(priceDraft);
    const hasValidPrice = parsedDraft !== null;
    const priceChanged = hasValidPrice && parsedDraft !== record.price;
    const compliance = musicAffiliateInfo?.compliance ?? record.priceCompliance;
    const isCompliant = compliance === "compliant";
    function handleSave() {
        if (readOnly || !hasValidPrice)
            return;
        onSave(record.id, {
            price: parsedDraft,
            priceCompliance: record.priceCompliance,
        });
        onClose();
    }
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "record-pricing-title", className: "relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/60 bg-gradient-to-br from-brand-orange/10 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/12 text-brand-orange ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.DollarSign, { className: "h-5 w-5", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "MTD pricing" }), (0, jsx_runtime_1.jsx)("h2", { id: "record-pricing-title", className: "mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: readOnly ? "View package price" : "Edit package price" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 truncate text-[13px] text-brand-ink-secondary", children: (0, data_1.titleCase)(record.programName) })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", "aria-label": "Close dialog", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 px-6 py-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Package" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[14px] font-semibold leading-snug text-brand-ink", children: record.package }), musicAffiliateInfo ? ((0, jsx_runtime_1.jsxs)("div", { className: "mt-3 flex items-center justify-between gap-3 border-t border-brand-line/50 pt-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Music affiliate" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 truncate text-[13px] font-medium text-brand-ink", children: musicAffiliateInfo.affiliate })] }), (0, jsx_runtime_1.jsxs)("span", { className: (0, clsx_1.default)("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", isCompliant
                                                    ? "bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/20"
                                                    : "bg-brand-warning/12 text-brand-warning ring-1 ring-inset ring-brand-warning/20"), children: [isCompliant ? ((0, jsx_runtime_1.jsx)(lucide_react_1.ShieldCheck, { className: "h-3 w-3", strokeWidth: 2.25 })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "h-3 w-3", strokeWidth: 2.25 })), (0, pricing_1.complianceLabel)(compliance)] })] })) : null] }), (0, jsx_runtime_1.jsxs)("label", { htmlFor: "record-package-price", className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Package price" }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1.5 flex items-center rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 transition focus-within:border-brand-orange/50 focus-within:ring-2 focus-within:ring-brand-orange-muted", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[15px] font-semibold tabular-nums text-brand-ink-tertiary", children: "$" }), (0, jsx_runtime_1.jsx)("input", { id: "record-package-price", type: "text", inputMode: "decimal", value: priceDraft, readOnly: readOnly, disabled: readOnly, onChange: (event) => setPriceDraft(event.target.value), onKeyDown: (event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        handleSave();
                                                    }
                                                }, autoFocus: !readOnly, className: "ml-1.5 min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold tabular-nums text-brand-ink outline-none placeholder:text-brand-ink-tertiary/50 disabled:cursor-default", placeholder: "0.00" })] }), priceChanged ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-1.5 text-[12px] text-brand-ink-tertiary", children: ["Previously ", (0, data_1.formatPrice)(record.price)] })) : null] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col border-t border-black/[0.08]", children: [!readOnly && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, disabled: !hasValidPrice, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-orange transition hover:bg-brand-orange/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent", children: "Save pricing" })), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: readOnly ? "Close" : "Cancel" })] })] })] }), document.body);
}
