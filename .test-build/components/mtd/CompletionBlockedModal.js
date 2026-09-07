"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionBlockedModal = CompletionBlockedModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const mtd_completion_1 = require("@/lib/mtd-completion");
const data_1 = require("@/lib/data");
const copy = {
    completed: {
        title: "Cannot mark completed yet",
        description: "still needs a few fields before it can move to payroll.",
    },
    assignment: {
        title: "Cannot set status yet",
        description: "needs an assigned editor and mix dates before it can be marked Ongoing or Outsourced.",
    },
};
function CompletionBlockedModal({ open, record, reason = "completed", onClose, }) {
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
    const requirements = reason === "assignment"
        ? (0, mtd_completion_1.canSetOngoingOrOutsourced)(record).requirements
        : (0, mtd_completion_1.canCompleteForPayroll)(record).requirements;
    const { title, description } = copy[reason];
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "completion-blocked-title", className: "relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "px-6 pb-5 pt-7 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-warning/12 text-brand-warning ring-1 ring-inset ring-brand-warning/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-7 w-7", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsx)("h2", { id: "completion-blocked-title", className: "mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: title }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 text-[13px] leading-relaxed text-brand-ink-secondary", children: [(0, data_1.titleCase)(record.programName), " ", description] })] }), (0, jsx_runtime_1.jsx)("ul", { className: "space-y-2 px-6 pb-6", children: requirements.map((item) => ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center justify-between rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] text-brand-ink", children: item.label }), (0, jsx_runtime_1.jsx)("span", { className: item.met
                                        ? "text-[11px] font-semibold uppercase tracking-wide text-brand-success"
                                        : "text-[11px] font-semibold uppercase tracking-wide text-brand-warning", children: item.met ? "Filled" : "Missing" })] }, item.key))) }), (0, jsx_runtime_1.jsx)("div", { className: "border-t border-black/[0.08]", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "w-full py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: "Got it" }) })] })] }), document.body);
}
