"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruncatedText = TruncatedText;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const clsx_1 = __importDefault(require("clsx"));
function TruncatedText({ text, className, style }) {
    const ref = (0, react_1.useRef)(null);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [truncated, setTruncated] = (0, react_1.useState)(false);
    const [visible, setVisible] = (0, react_1.useState)(false);
    const [position, setPosition] = (0, react_1.useState)({ top: 0, left: 0 });
    (0, react_1.useLayoutEffect)(() => setMounted(true), []);
    (0, react_1.useLayoutEffect)(() => {
        const el = ref.current;
        if (!el)
            return;
        const update = () => {
            setTruncated(el.scrollWidth > el.clientWidth + 1);
        };
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [text]);
    const showTooltip = () => {
        const el = ref.current;
        if (!el || !truncated)
            return;
        const rect = el.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 6,
            left: rect.left + rect.width / 2,
        });
        setVisible(true);
    };
    const hideTooltip = () => setVisible(false);
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { ref: ref, className: (0, clsx_1.default)("block min-w-0 truncate", className), style: style, onMouseEnter: showTooltip, onMouseLeave: hideTooltip, onFocus: showTooltip, onBlur: hideTooltip, children: text }), mounted && visible && truncated
                ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsx)("div", { role: "tooltip", className: "pointer-events-none fixed z-[9999] max-w-[260px] -translate-x-1/2 whitespace-normal rounded-lg border border-brand-line/25 bg-brand-ink px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white shadow-lg", style: { top: position.top, left: position.left }, children: text }), document.body)
                : null] }));
}
