"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveToMtdConfirmModal = MoveToMtdConfirmModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const data_1 = require("@/lib/data");
const editor_assignment_1 = require("@/lib/editor-assignment");
function MoveToMtdConfirmModal({ open, record, onClose, onConfirm, }) {
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
    const assigned = (0, editor_assignment_1.getDisplayAssignedProducer)(record);
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "move-to-mtd-title", className: "relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-7 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "h-7 w-7", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsx)("h2", { id: "move-to-mtd-title", className: "mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: "Move to MTD?" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: [(0, data_1.titleCase)(record.programName), " will move to the MTD board."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mx-6 mb-6 flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3 text-left", children: [(0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-3.5 w-3.5", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12.5px] leading-relaxed text-brand-ink-secondary", children: ["Once on MTD, the editor", assigned ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [" ", "(", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: assigned }), ")"] })) : null, " ", "can no longer be reassigned. Assign or change the editor here on the Orders tab before moving."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-2 border-t border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "border-r border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                    onConfirm();
                                    onClose();
                                }, className: "py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-blue-soft/40", children: "Move to MTD" })] })] })] }), document.body);
}
