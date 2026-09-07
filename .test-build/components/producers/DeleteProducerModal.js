"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteProducerModal = DeleteProducerModal;
const jsx_runtime_1 = require("react/jsx-runtime");
function DeleteProducerModal({ open, producer, onClose, onConfirm, }) {
    if (!open || !producer)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "delete-producer-title", className: "relative w-full max-w-[340px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-7 text-center", children: [(0, jsx_runtime_1.jsx)("img", { src: producer.avatar, alt: "", className: "mx-auto h-16 w-16 rounded-full bg-brand-bg object-cover" }), (0, jsx_runtime_1.jsxs)("h2", { id: "delete-producer-title", className: "mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: ["Delete ", producer.name, "?"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: "This removes them from the producer roster. You can add them again later if needed." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col border-t border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onConfirm, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft/60", children: "Delete" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" })] })] })] }));
}
