"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorSelectDropdown = EditorSelectDropdown;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const Avatar_1 = require("@/components/ui/Avatar");
const dates_1 = require("@/lib/dates");
function findOption(groups, value) {
    for (const group of groups) {
        const match = group.options.find((option) => option.name === value);
        if (match)
            return match;
    }
    return undefined;
}
function findGroupTone(groups, value) {
    for (const group of groups) {
        if (group.options.some((option) => option.name === value)) {
            return group.tone;
        }
    }
    return undefined;
}
function EditorInitials({ name }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-bg-subtle text-[11px] font-bold text-brand-ink-secondary", children: name.slice(0, 2) }));
}
function EditorAvatar({ name, producer, }) {
    if (producer?.avatar) {
        return (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: producer.avatar, alt: name, size: "sm" });
    }
    return (0, jsx_runtime_1.jsx)(EditorInitials, { name: name });
}
function EditorSelectDropdown({ id = "editor-select", value, onChange, groups, disabled = false, emptyLabel = "No matching editors", requestedEditor, }) {
    const triggerRef = (0, react_1.useRef)(null);
    const menuRef = (0, react_1.useRef)(null);
    const scrollRef = (0, react_1.useRef)(null);
    const [open, setOpen] = (0, react_1.useState)(false);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [position, setPosition] = (0, react_1.useState)(null);
    const selected = (0, react_1.useMemo)(() => findOption(groups, value), [groups, value]);
    const selectedTone = (0, react_1.useMemo)(() => findGroupTone(groups, value), [groups, value]);
    const hasOptions = groups.some((group) => group.options.length > 0);
    const displayName = selected?.name || value.trim();
    (0, react_1.useEffect)(() => setMounted(true), []);
    (0, react_1.useEffect)(() => {
        if (disabled || !hasOptions) {
            setOpen(false);
        }
    }, [disabled, hasOptions]);
    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        const gap = 8;
        const menuWidth = rect.width;
        const menuHeight = 320;
        const spaceBelow = window.innerHeight - rect.bottom - gap;
        const spaceAbove = rect.top - gap;
        const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
        setPosition({
            left: Math.round(left),
            width: Math.round(menuWidth),
            maxHeight: Math.min(menuHeight, openUp ? spaceAbove : spaceBelow),
            ...(openUp
                ? { bottom: Math.round(window.innerHeight - rect.top + gap) }
                : { top: Math.round(rect.bottom + gap) }),
        });
    };
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        scrollRef.current?.scrollTo({ top: 0 });
        updatePosition();
        const handle = () => updatePosition();
        window.addEventListener("scroll", handle, true);
        window.addEventListener("resize", handle);
        return () => {
            window.removeEventListener("scroll", handle, true);
            window.removeEventListener("resize", handle);
        };
    }, [open]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDocMouseDown = (event) => {
            const target = event.target;
            if (!triggerRef.current?.contains(target) &&
                !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);
    function selectEditor(name, optionDisabled) {
        if (optionDisabled)
            return;
        onChange(name);
        setOpen(false);
        triggerRef.current?.focus();
    }
    const triggerSubtitle = selected
        ? selectedTone === "booked"
            ? selected.bookedUntil
                ? `Booked till ${(0, dates_1.formatDisplayDate)(selected.bookedUntil)}`
                : `${selected.mixCount ?? 0} active mix${selected.mixCount === 1 ? "" : "es"}`
            : "Available now"
        : hasOptions
            ? "Choose an editor"
            : emptyLabel;
    const menu = open && position && hasOptions ? ((0, jsx_runtime_1.jsx)("div", { ref: menuRef, id: `${id}-listbox`, role: "listbox", "aria-label": "Editors", style: {
            position: "fixed",
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            ...(position.top !== undefined ? { top: position.top } : {}),
            ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
        }, className: "z-[60] flex flex-col overflow-hidden rounded-2xl border border-brand-line/80 bg-brand-elevated shadow-[var(--shadow-premium)]", children: (0, jsx_runtime_1.jsx)("div", { ref: scrollRef, className: "overflow-y-auto overscroll-contain p-2 scrollbar-hide", style: { maxHeight: position.maxHeight }, children: groups.map((group, groupIndex) => group.options.length === 0 ? null : ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)(groupIndex > 0 && "mt-2 border-t border-brand-line/60 pt-2"), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("mb-1.5 flex items-center px-1", group.tone === "available" ? "text-brand-success" : "text-brand-warning"), children: (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", group.tone === "available"
                                ? "bg-brand-success/10"
                                : "bg-brand-warning/10"), children: group.label }) }), (0, jsx_runtime_1.jsx)("ul", { className: "space-y-0.5", children: group.options.map((option) => {
                            const isSelected = value === option.name;
                            const isRequested = requestedEditor?.toUpperCase() === option.name.toUpperCase();
                            return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "option", "aria-selected": isSelected, disabled: option.disabled, onMouseDown: (event) => event.stopPropagation(), onClick: (event) => {
                                        event.stopPropagation();
                                        selectEditor(option.name, option.disabled);
                                    }, className: (0, clsx_1.default)("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", option.disabled
                                        ? "cursor-not-allowed opacity-45"
                                        : "hover:bg-brand-bg/80", isSelected &&
                                        "bg-brand-signature-soft ring-1 ring-brand-signature/25"), children: [(0, jsx_runtime_1.jsx)(EditorAvatar, { name: option.name, producer: option.producer }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsxs)("span", { className: "flex flex-wrap items-center gap-1.5", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[13px] font-semibold text-brand-ink", children: option.name }), isRequested ? ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-orange-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-orange", children: "Requested" })) : null, group.tone === "available" ? ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-success", children: "Open" })) : null] }), (0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-ink-tertiary", children: group.tone === "booked" ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("span", { children: [option.mixCount ?? 0, " mix", (option.mixCount ?? 0) === 1 ? "" : "es"] }), option.bookedUntil ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "h-3 w-3 shrink-0", strokeWidth: 2 }), "Till ", (0, dates_1.formatDisplayDate)(option.bookedUntil)] })) : null] })) : ((0, jsx_runtime_1.jsx)("span", { children: "Ready to assign" })) })] }), isSelected ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4 shrink-0 text-brand-signature", strokeWidth: 2.5 })) : null] }) }, option.name));
                        }) })] }, group.label))) }) })) : null;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { ref: triggerRef, id: id, type: "button", role: "combobox", "aria-expanded": open, "aria-controls": `${id}-listbox`, disabled: disabled || !hasOptions, onMouseDown: (event) => event.stopPropagation(), onClick: (event) => {
                    event.stopPropagation();
                    setOpen((current) => !current);
                }, className: (0, clsx_1.default)("mt-1.5 flex w-full items-center gap-3 rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-left outline-none transition", "focus-visible:border-brand-info/60 focus-visible:ring-2 focus-visible:ring-brand-info/15", (disabled || !hasOptions) && "cursor-not-allowed opacity-55", open && "border-brand-info/50 ring-2 ring-brand-info/10"), children: [displayName ? (selected ? ((0, jsx_runtime_1.jsx)(EditorAvatar, { name: selected.name, producer: selected.producer })) : ((0, jsx_runtime_1.jsx)(EditorInitials, { name: displayName }))) : ((0, jsx_runtime_1.jsx)("span", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-line-strong bg-brand-bg/60" })), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[13px] font-semibold text-brand-ink", children: displayName || emptyLabel }), (0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[11px] text-brand-ink-tertiary", children: triggerSubtitle })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-150", open && "rotate-180"), strokeWidth: 2.25 })] }), mounted && menu ? (0, react_dom_1.createPortal)(menu, document.body) : null] }));
}
