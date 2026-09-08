"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerCategoryAddMenu = ProducerCategoryAddMenu;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const producer_category_groups_1 = require("@/lib/producer-category-groups");
function computePanelPosition(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 16, 280);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    return {
        top: rect.bottom + 8,
        left: Math.min(Math.max(8, rect.right - width), maxLeft),
        width,
    };
}
function ProducerCategoryAddMenu({ assignedCategories, onAdd, portalZIndex = 60, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [position, setPosition] = (0, react_1.useState)(null);
    const rootRef = (0, react_1.useRef)(null);
    const buttonRef = (0, react_1.useRef)(null);
    const panelRef = (0, react_1.useRef)(null);
    const availableGroups = (0, producer_category_groups_1.getAvailableProducerCategoryGroups)(assignedCategories);
    const canAdd = (0, producer_category_groups_1.hasAvailableProducerCategories)(assignedCategories);
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !buttonRef.current)
            return;
        const updatePosition = () => {
            if (!buttonRef.current)
                return;
            setPosition(computePanelPosition(buttonRef.current));
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDown = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) ||
                panelRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);
    if (!canAdd)
        return null;
    const panel = mounted && open && position
        ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsx)("div", { ref: panelRef, className: "fixed max-h-[min(320px,70dvh)] overflow-y-auto rounded-2xl border border-brand-line bg-brand-elevated py-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]", style: {
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: portalZIndex,
            }, role: "listbox", "aria-label": "Select producer category", children: availableGroups.map((group) => ((0, jsx_runtime_1.jsxs)("div", { className: "px-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: group.label }), group.subcategories.map((subcategory) => ((0, jsx_runtime_1.jsx)("button", { type: "button", role: "option", "aria-selected": false, onClick: () => {
                            onAdd(subcategory.id);
                            setOpen(false);
                        }, className: "flex w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-brand-ink transition hover:bg-brand-bg-subtle", children: subcategory.label }, subcategory.id)))] }, group.id))) }), document.body)
        : null;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative shrink-0", children: [(0, jsx_runtime_1.jsxs)("button", { ref: buttonRef, type: "button", onClick: () => setOpen((value) => !value), className: "inline-flex h-8 items-center gap-1 rounded-full bg-brand-elevated px-3 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", "aria-expanded": open, "aria-haspopup": "listbox", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3.5 w-3.5", strokeWidth: 2.5 }), "Add"] }), panel] }));
}
