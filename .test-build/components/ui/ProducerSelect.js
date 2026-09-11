"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerSelect = ProducerSelect;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const producers_1 = require("@/lib/producers");
function computeMenuPosition(trigger) {
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(240, rect.width);
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    return {
        top: rect.bottom + 4,
        left: Math.min(Math.max(8, rect.left), maxLeft),
        width,
    };
}
function ProducerSelect({ producers, value, onChange, label = "Editor:", allLabel = "All Editors", searchable = true, searchPlaceholder = "Search editors…", className, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [position, setPosition] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    const rootRef = (0, react_1.useRef)(null);
    const buttonRef = (0, react_1.useRef)(null);
    const menuRef = (0, react_1.useRef)(null);
    const searchInputRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !buttonRef.current)
            return;
        const updatePosition = () => {
            if (!buttonRef.current)
                return;
            setPosition(computeMenuPosition(buttonRef.current));
        };
        const handleScroll = (event) => {
            const target = event.target;
            if (target instanceof Node &&
                (menuRef.current?.contains(target) || rootRef.current?.contains(target))) {
                return;
            }
            updatePosition();
        };
        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [open]);
    (0, react_1.useEffect)(() => {
        if (!open) {
            setSearchQuery("");
            return;
        }
        if (searchable) {
            const frame = window.requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
            return () => window.cancelAnimationFrame(frame);
        }
    }, [open, searchable]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const handlePointerDown = (event) => {
            const target = event.target;
            if (rootRef.current?.contains(target) ||
                menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const handleEscape = (event) => {
            if (event.key !== "Escape")
                return;
            if (searchQuery.trim()) {
                event.preventDefault();
                setSearchQuery("");
                return;
            }
            setOpen(false);
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [open, searchQuery]);
    const uniqueProducers = (0, react_1.useMemo)(() => {
        const seen = new Set();
        return producers.filter((p) => {
            const key = (p.id || p.name).toLowerCase();
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }, [producers]);
    const filteredProducers = (0, react_1.useMemo)(() => {
        const query = searchQuery.trim();
        const list = !searchable || !query
            ? uniqueProducers
            : uniqueProducers.filter((producer) => (0, producers_1.matchesProducerSearch)(producer, query));
        if (!query)
            return list;
        return [...list].sort((a, b) => (0, producers_1.producerSearchScore)(b, query) - (0, producers_1.producerSearchScore)(a, query));
    }, [uniqueProducers, searchable, searchQuery]);
    const selectedProducer = uniqueProducers.find((p) => p.name.toUpperCase() === value.toUpperCase() ||
        p.id.toUpperCase() === value.toUpperCase());
    const displayLabel = selectedProducer ? selectedProducer.name : allLabel;
    const displayColor = value === "all"
        ? null
        : selectedProducer
            ? selectedProducer.color || "#94a3b8"
            : "#94a3b8";
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const showAllOption = !normalizedQuery || allLabel.toLowerCase().includes(normalizedQuery);
    const selectProducer = (nextValue) => {
        onChange(nextValue);
        setOpen(false);
    };
    const menu = mounted && open && position ? ((0, jsx_runtime_1.jsxs)("div", { ref: menuRef, className: "fixed z-[200] flex max-h-72 flex-col overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]", style: {
            top: position.top,
            left: position.left,
            width: position.width,
        }, onMouseDown: (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement) {
                return;
            }
            event.preventDefault();
        }, children: [searchable ? ((0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/50 p-2", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary", strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("input", { ref: searchInputRef, type: "text", autoComplete: "off", autoCorrect: "off", spellCheck: false, value: searchQuery, onChange: (event) => setSearchQuery(event.target.value), placeholder: searchPlaceholder, "aria-label": searchPlaceholder, className: "h-8 w-full rounded-lg border border-brand-line/70 bg-brand-elevated pl-8 pr-2.5 text-[12px] text-brand-ink outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15", onMouseDown: (event) => event.stopPropagation(), onKeyDown: (event) => {
                                event.stopPropagation();
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    if (showAllOption && normalizedQuery.length === 0) {
                                        selectProducer("all");
                                        return;
                                    }
                                    if (filteredProducers[0]) {
                                        selectProducer(filteredProducers[0].name);
                                    }
                                }
                            } })] }) })) : null, (0, jsx_runtime_1.jsxs)("div", { className: "overflow-y-auto p-1", children: [showAllOption ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => selectProducer("all"), className: (0, clsx_1.default)("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg", value === "all"
                            ? "bg-brand-accent-soft text-brand-ink font-semibold"
                            : "text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full bg-brand-ink-tertiary/40" }), (0, jsx_runtime_1.jsx)("span", { children: allLabel })] })) : null, filteredProducers.map((p) => {
                        const isSelected = value === p.name ||
                            value === p.id ||
                            value.toUpperCase() === p.name.toUpperCase();
                        const color = p.color || "#94a3b8";
                        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => selectProducer(p.name), className: (0, clsx_1.default)("flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg", isSelected
                                ? "bg-brand-accent-soft text-brand-ink font-semibold"
                                : "text-brand-ink-secondary"), children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10", style: { backgroundColor: color }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 flex-1 truncate", children: p.name }), p.initials ? ((0, jsx_runtime_1.jsx)("span", { className: "shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: p.initials })) : null] }, p.id));
                    }), filteredProducers.length === 0 && !showAllOption ? ((0, jsx_runtime_1.jsx)("p", { className: "px-2.5 py-2 text-[12px] text-brand-ink-tertiary", children: "No matching editors" })) : null] })] })) : null;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: (0, clsx_1.default)("relative inline-flex items-center gap-1.5", className), children: [label ? ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-secondary", children: label })) : null, (0, jsx_runtime_1.jsxs)("button", { ref: buttonRef, type: "button", onClick: () => setOpen((prev) => !prev), "aria-expanded": open, "aria-haspopup": "listbox", className: "inline-flex h-8 items-center gap-2 rounded-lg border border-brand-line/80 bg-brand-elevated px-2.5 text-[12px] font-medium text-brand-ink shadow-sm transition hover:border-brand-line-strong focus:outline-none focus:ring-2 focus:ring-brand-blue/20", children: [displayColor ? ((0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10", style: { backgroundColor: displayColor }, "aria-hidden": "true" })) : ((0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full bg-brand-ink-tertiary/40", "aria-hidden": "true" })), (0, jsx_runtime_1.jsx)("span", { className: "max-w-[140px] truncate", children: displayLabel }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition", open && "rotate-180") })] }), menu ? (0, react_dom_1.createPortal)(menu, document.body) : null] }));
}
