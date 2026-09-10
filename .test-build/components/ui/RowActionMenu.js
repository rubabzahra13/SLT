"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowActionMenu = RowActionMenu;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const AuthContext_1 = require("@/context/AuthContext");
function RowActionMenu({ items, label = "Row actions", className, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    const { isViewOnly } = (0, AuthContext_1.useAuth)();
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDown = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative inline-flex", className), children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: (e) => {
                    e.stopPropagation();
                    setOpen((value) => !value);
                }, "aria-label": label, "aria-expanded": open, className: (0, clsx_1.default)("inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25", open && "border-brand-orange/40 bg-brand-orange-soft/35 text-brand-orange"), children: isViewOnly ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-3.5 w-3.5", strokeWidth: 2 })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-3.5 w-3.5", strokeWidth: 2 })) }), open ? ((0, jsx_runtime_1.jsx)("div", { className: "absolute right-0 top-[calc(100%+6px)] z-40 min-w-[168px] overflow-hidden rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]", onClick: (e) => e.stopPropagation(), children: items.map((item) => ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: (e) => {
                        e.stopPropagation();
                        item.onSelect();
                        setOpen(false);
                    }, className: (0, clsx_1.default)("flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-brand-bg", item.tone === "danger"
                        ? "font-medium text-brand-danger"
                        : "text-brand-ink-secondary hover:text-brand-ink"), children: item.label }, item.id))) })) : null] }));
}
