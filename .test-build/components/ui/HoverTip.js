"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoverTip = HoverTip;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
function HoverTip({ label, content, children, className = "", placement = "bottom", }) {
    const ref = (0, react_1.useRef)(null);
    const [open, setOpen] = (0, react_1.useState)(false);
    const [coords, setCoords] = (0, react_1.useState)({
        top: 0,
        left: 0,
        transform: "translateX(-50%)",
    });
    const tip = content ?? (label ? (0, jsx_runtime_1.jsx)("span", { children: label }) : null);
    const hasTip = Boolean(tip);
    const show = () => {
        const el = ref.current;
        if (!el || !hasTip)
            return;
        const rect = el.getBoundingClientRect();
        if (placement === "right") {
            setCoords({
                top: rect.top + rect.height / 2,
                left: rect.right + 8,
                transform: "translateY(-50%)",
            });
        }
        else if (placement === "left") {
            setCoords({
                top: rect.top + rect.height / 2,
                left: rect.left - 14,
                transform: "translate(-100%, -50%)",
            });
        }
        else if (placement === "top") {
            setCoords({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
                transform: "translate(-50%, -100%)",
            });
        }
        else {
            setCoords({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
                transform: "translateX(-50%)",
            });
        }
        setOpen(true);
    };
    const baseDisplay = className.includes("flex") || className.includes("block") ? "" : "inline-flex ";
    return ((0, jsx_runtime_1.jsxs)("span", { ref: ref, className: `${baseDisplay}${className}`.trim(), onMouseEnter: show, onMouseLeave: () => setOpen(false), onFocus: show, onBlur: () => setOpen(false), children: [children, open && tip
                ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsx)("span", { role: "tooltip", className: content
                        ? "pointer-events-none fixed z-[200] max-w-[240px] rounded-xl border border-brand-line/80 bg-brand-elevated px-3 py-2.5 text-left shadow-[var(--shadow-premium)]"
                        : "pointer-events-none fixed z-[200] whitespace-nowrap rounded-md bg-brand-accent px-2 py-1 text-[11px] font-semibold leading-none text-white shadow-md", style: {
                        top: coords.top,
                        left: coords.left,
                        transform: coords.transform,
                    }, children: tip }), document.body)
                : null] }));
}
