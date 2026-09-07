"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetInvoicesModal = SetInvoicesModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
function SetInvoicesModal({ open, records, onClose, onSave, }) {
    const [draft, setDraft] = (0, react_1.useState)({});
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const next = {};
        for (const rec of records) {
            next[rec.id] = rec.invoice ?? "";
        }
        setDraft(next);
    }, [open, records]);
    if (!open)
        return null;
    function handleSave() {
        onSave(draft);
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "surface-premium relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4 border-b border-brand-line/70 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Invoice (H)" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[18px]", children: "Set invoices" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: ["Enter invoice numbers for the ", records.length, " visible MTD rows."] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "overflow-y-scroll scrollbar-hide p-6", indicatorPlacement: "gutter", contentClassName: "overflow-hidden rounded-xl border border-brand-line/70", children: records.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "px-4 py-8 text-center text-[13px] text-brand-ink-secondary", children: "No rows match the current filters." })) : (records.map((rec, index) => ((0, jsx_runtime_1.jsxs)("div", { className: index > 0
                                ? "flex items-center justify-between gap-4 border-t border-brand-line/60 px-4 py-3"
                                : "flex items-center justify-between gap-4 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold", children: rec.programName }), (0, jsx_runtime_1.jsxs)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: [rec.contactName, " \u00B7 ", rec.package] })] }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: draft[rec.id] ?? "", onChange: (e) => setDraft((prev) => ({
                                        ...prev,
                                        [rec.id]: e.target.value,
                                    })), placeholder: "Invoice #", className: "w-36 shrink-0 rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-1.5 text-[13px] tabular-nums outline-none focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange-muted", "aria-label": `Invoice for ${rec.programName}` })] }, rec.id)))) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-end gap-2 border-t border-brand-line/70 p-6", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, className: "rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover", children: "Save invoices" })] })] })] }));
}
