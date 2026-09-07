"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteDiscountCodeModal = DeleteDiscountCodeModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
function DeleteDiscountCodeModal({ open, discountCode, onClose, onConfirm, }) {
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
    if (!mounted || !open || !discountCode)
        return null;
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "delete-discount-code-title", className: "relative w-full max-w-[340px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-7 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange-soft text-[13px] font-bold tracking-[0.08em] text-brand-orange-deep", children: discountCode.code.slice(0, 4) }), (0, jsx_runtime_1.jsxs)("h2", { id: "delete-discount-code-title", className: "mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: ["Delete ", discountCode.code, "?"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: discountCode.description }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[12px] leading-relaxed text-brand-ink-tertiary", children: "This removes the code from your catalog. Existing orders that used it will keep their coupon field." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col border-t border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onConfirm, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60", children: "Delete code" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] })] })] }), document.body);
}
