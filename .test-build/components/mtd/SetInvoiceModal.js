"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetInvoiceModal = SetInvoiceModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function SetInvoiceModal({ open, record, onClose, onSave, }) {
    const [invoice, setInvoice] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        setInvoice(record.invoice ?? "");
    }, [open, record]);
    if (!open || !record)
        return null;
    function handleSave() {
        onSave(record.id, invoice.trim());
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "surface-premium relative w-full max-w-md rounded-2xl shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4 border-b border-brand-line/70 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Invoice (H)" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[18px]", children: record.invoice ? "Edit invoice" : "Set invoice" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: record.programName })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4 p-6", children: (0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-label", children: "Invoice number" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: invoice, onChange: (e) => setInvoice(e.target.value), placeholder: "e.g. INV-1042", className: "mt-1.5 w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] text-brand-ink outline-none transition focus:border-brand-orange/50 focus:ring-2 focus:ring-brand-orange-muted", autoFocus: true })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-end gap-2 border-t border-brand-line/70 p-6", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg px-4 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: handleSave, className: "rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover", children: "Save invoice" })] })] })] }));
}
