"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftSelect = SoftSelect;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const MENU_MAX_HEIGHT = 208; // max-h-52
const GAP = 4;
function SoftSelect({ "aria-label": ariaLabel, value, options, onChange, open, onOpenChange, className, placeholder = "Select", placement = "auto", searchable = false, searchPlaceholder = "Search…", size = "sm", }) {
    const rootRef = (0, react_1.useRef)(null);
    const triggerRef = (0, react_1.useRef)(null);
    const menuRef = (0, react_1.useRef)(null);
    const searchRef = (0, react_1.useRef)(null);
    const [menuPos, setMenuPos] = (0, react_1.useState)(null);
    const [query, setQuery] = (0, react_1.useState)("");
    const selected = options.find((opt) => opt.value === value);
    const filteredOptions = searchable
        ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;
    const updateMenuPos = () => {
        const trigger = triggerRef.current;
        if (!trigger)
            return;
        const rect = trigger.getBoundingClientRect();
        const width = Math.max(rect.width, 180);
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
        const listMax = searchable ? 280 : MENU_MAX_HEIGHT;
        const estimatedHeight = Math.min(listMax, Math.max(96, filteredOptions.length * 32 + (searchable ? 48 : 8)));
        const spaceBelow = window.innerHeight - rect.bottom - GAP - 8;
        const spaceAbove = rect.top - GAP - 8;
        const inLowerHalf = rect.top > window.innerHeight * 0.45;
        let openUp = false;
        if (placement === "above") {
            openUp = spaceAbove >= 72 || spaceAbove >= spaceBelow;
        }
        else if (placement === "below") {
            openUp = false;
        }
        else {
            openUp =
                (inLowerHalf && spaceAbove > 72) ||
                    spaceBelow < estimatedHeight ||
                    (spaceAbove > spaceBelow && spaceBelow < listMax);
        }
        const maxHeight = Math.max(72, Math.min(listMax, openUp ? spaceAbove : spaceBelow));
        setMenuPos({
            left: Math.round(left),
            width: Math.round(width),
            maxHeight: Math.round(maxHeight),
            ...(openUp
                ? { bottom: Math.round(window.innerHeight - rect.top + GAP) }
                : { top: Math.round(rect.bottom + GAP) }),
        });
    };
    (0, react_1.useLayoutEffect)(() => {
        if (!open || !triggerRef.current) {
            setMenuPos(null);
            return;
        }
        updateMenuPos();
        const handle = () => updateMenuPos();
        window.addEventListener("scroll", handle, true);
        window.addEventListener("resize", handle);
        return () => {
            window.removeEventListener("scroll", handle, true);
            window.removeEventListener("resize", handle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, filteredOptions.length, placement, searchable]);
    (0, react_1.useEffect)(() => {
        if (!open) {
            setQuery("");
            return;
        }
        if (searchable) {
            const id = window.setTimeout(() => searchRef.current?.focus(), 0);
            return () => window.clearTimeout(id);
        }
    }, [open, searchable]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        let remove;
        const timer = window.setTimeout(() => {
            function onDocPointerDown(event) {
                const target = event.target;
                if (rootRef.current?.contains(target))
                    return;
                if (menuRef.current?.contains(target))
                    return;
                onOpenChange(false);
            }
            function onKeyDown(event) {
                if (event.key === "Escape")
                    onOpenChange(false);
            }
            document.addEventListener("pointerdown", onDocPointerDown, true);
            document.addEventListener("keydown", onKeyDown);
            remove = () => {
                document.removeEventListener("pointerdown", onDocPointerDown, true);
                document.removeEventListener("keydown", onKeyDown);
            };
        }, 0);
        return () => {
            window.clearTimeout(timer);
            remove?.();
        };
    }, [open, onOpenChange]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative min-w-0", className), children: [(0, jsx_runtime_1.jsxs)("button", { ref: triggerRef, type: "button", "aria-label": ariaLabel, "aria-haspopup": "listbox", "aria-expanded": open, onMouseDown: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenChange(!open);
                }, onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, className: (0, clsx_1.default)("inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 text-left font-medium text-brand-ink outline-none transition", size === "md"
                    ? "h-10 rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-[13px] hover:border-brand-line-strong focus-visible:ring-2 focus-visible:ring-brand-blue/15"
                    : "h-8 rounded-full bg-brand-bg px-3 text-[13px] hover:bg-brand-bg-subtle focus-visible:ring-2 focus-visible:ring-brand-blue/20", open &&
                    (size === "md"
                        ? "border-brand-blue/45 ring-2 ring-brand-blue/15"
                        : "bg-brand-blue-soft/70 font-semibold text-brand-signature ring-1 ring-inset ring-brand-blue/25")), children: [(0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate", children: selected?.label ?? placeholder }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition-transform duration-150", open && "rotate-180 text-brand-signature"), strokeWidth: 2.25, "aria-hidden": true })] }), open && menuPos
                ? (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { ref: menuRef, role: "listbox", "aria-label": ariaLabel, onMouseDown: (e) => e.stopPropagation(), className: "fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/10", style: {
                        left: menuPos.left,
                        top: menuPos.top,
                        bottom: menuPos.bottom,
                        width: menuPos.width,
                        maxHeight: menuPos.maxHeight,
                        zIndex: 9999,
                    }, children: [searchable ? ((0, jsx_runtime_1.jsx)("div", { className: "shrink-0 border-b border-brand-line/40 p-1.5", children: (0, jsx_runtime_1.jsx)("input", { ref: searchRef, type: "search", value: query, onChange: (e) => setQuery(e.target.value), onMouseDown: (e) => e.stopPropagation(), placeholder: searchPlaceholder, "aria-label": searchPlaceholder, className: "h-8 w-full rounded-lg border border-brand-line/50 bg-brand-bg px-2.5 text-[12px] font-medium text-brand-ink outline-none placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15" }) })) : null, (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-y-auto p-1 scrollbar-hide", children: filteredOptions.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "px-2.5 py-2 text-[12px] text-brand-ink-tertiary", children: "No matches" })) : (filteredOptions.map((opt) => {
                                const isSelected = opt.value === value;
                                return ((0, jsx_runtime_1.jsxs)("button", { type: "button", role: "option", "aria-selected": isSelected, onMouseDown: (e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onChange(opt.value);
                                        onOpenChange(false);
                                    }, className: (0, clsx_1.default)("flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors", isSelected
                                        ? "bg-brand-blue-soft text-brand-signature"
                                        : "text-brand-ink-secondary hover:bg-brand-bg-subtle hover:text-brand-ink"), children: [(0, jsx_runtime_1.jsx)("span", { className: "min-w-0 flex-1 truncate", children: opt.label }), isSelected ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3.5 w-3.5 shrink-0 text-brand-signature", strokeWidth: 2.5 })) : null] }, opt.value));
                            })) })] }), document.body)
                : null] }));
}
