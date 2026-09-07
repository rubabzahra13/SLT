"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnToMTDModal = ReturnToMTDModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const data_1 = require("@/lib/data");
function ReturnToMTDModal({ open, record, onClose, onConfirm, }) {
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
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
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "return-mtd-title", className: "relative w-full max-w-[380px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-7 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-signature/10 text-brand-signature ring-1 ring-inset ring-brand-signature/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeftCircle, { className: "h-7 w-7", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsx)("h2", { id: "return-mtd-title", className: "mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: "Return to MTD?" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: [(0, data_1.titleCase)(record.programName), " will move back to the MTD board as Ongoing. Payroll status will be cleared."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col border-t border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onConfirm, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8", children: "Return to MTD" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] })] })] }), document.body);
}
