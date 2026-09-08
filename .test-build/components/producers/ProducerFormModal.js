"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerFormModal = ProducerFormModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const producer_avatars_1 = require("@/lib/producer-avatars");
const producers_1 = require("@/lib/producers");
const types_1 = require("@/types");
const rowInput = "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";
function emptyForm() {
    return {
        name: "",
        initials: "",
        email: "",
        categories: [],
        categoryRates: {},
        avatar: producer_avatars_1.PRODUCER_AVATARS[0].src,
    };
}
function fromProducer(producer) {
    const norm = (0, producers_1.normalizeProducer)(producer);
    const categories = norm.categories?.length
        ? [...norm.categories]
        : norm.specialty
            ? [norm.specialty]
            : [];
    const categoryRates = {};
    for (const cat of categories) {
        const raw = norm.ratesByCategory?.[cat] ?? norm.defaultRate ?? 0.50;
        categoryRates[cat] = raw <= 1 ? Math.round(raw * 100) : raw;
    }
    return {
        name: norm.name,
        initials: norm.initials,
        email: norm.email,
        categories,
        categoryRates,
        avatar: norm.avatar,
    };
}
function ProducerFormModal({ open, onClose, producer, onSave, }) {
    const [form, setForm] = (0, react_1.useState)(emptyForm);
    const [initialsTouched, setInitialsTouched] = (0, react_1.useState)(false);
    const [pickingAvatar, setPickingAvatar] = (0, react_1.useState)(false);
    const [categoryDropdownOpen, setCategoryDropdownOpen] = (0, react_1.useState)(false);
    const [validationError, setValidationError] = (0, react_1.useState)(null);
    const dropdownRef = (0, react_1.useRef)(null);
    const isEdit = Boolean(producer);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        setValidationError(null);
        if (producer) {
            setForm(fromProducer(producer));
            setInitialsTouched(true);
        }
        else {
            setForm(emptyForm());
            setInitialsTouched(false);
        }
        setPickingAvatar(false);
        setCategoryDropdownOpen(false);
    }, [open, producer]);
    // Close category dropdown on outside click
    (0, react_1.useEffect)(() => {
        if (!categoryDropdownOpen)
            return;
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setCategoryDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [categoryDropdownOpen]);
    if (!open)
        return null;
    const availableCategories = types_1.PRODUCER_CATEGORIES.filter((c) => !form.categories.includes(c));
    function addCategory(cat) {
        setForm((prev) => {
            if (prev.categories.includes(cat))
                return prev;
            return {
                ...prev,
                categories: [...prev.categories, cat],
                categoryRates: {
                    ...prev.categoryRates,
                    [cat]: prev.categoryRates[cat] ?? 50,
                },
            };
        });
        setCategoryDropdownOpen(false);
    }
    function removeCategory(cat) {
        setForm((prev) => {
            const nextRates = { ...prev.categoryRates };
            delete nextRates[cat];
            return {
                ...prev,
                categories: prev.categories.filter((c) => c !== cat),
                categoryRates: nextRates,
            };
        });
    }
    function updateCategoryRate(cat, val) {
        setForm((prev) => ({
            ...prev,
            categoryRates: {
                ...prev.categoryRates,
                [cat]: val,
            },
        }));
    }
    function handleSubmit(e) {
        e?.preventDefault();
        setValidationError(null);
        const initials = (form.initials || (0, producers_1.initialsFromName)(form.name))
            .toUpperCase()
            .slice(0, 4);
        if (!form.name.trim() || !form.email.trim() || !initials) {
            setValidationError("Please fill out name, initials, and email.");
            return;
        }
        for (const cat of form.categories) {
            const rate = form.categoryRates[cat];
            if (typeof rate !== "number" || isNaN(rate) || rate < 0 || rate > 100) {
                setValidationError(`Invalid compensation percentage for category "${cat}". Must be between 0% and 100%.`);
                return;
            }
        }
        const categories = form.categories;
        const specialty = categories[0] ?? "";
        const ratesByCategory = {};
        for (const cat of categories) {
            const val = form.categoryRates[cat] ?? 50;
            ratesByCategory[cat] = val > 1 ? val / 100 : val;
        }
        onSave({
            id: producer?.id || `prod-${Date.now()}`,
            name: form.name.trim(),
            initials,
            email: form.email.trim().toLowerCase(),
            categories,
            specialty,
            avatar: form.avatar,
            mixesThisWeek: producer?.mixesThisWeek ?? 0,
            nextAvailable: producer?.nextAvailable || "TBD",
            status: producer?.status || "available",
            workDays: producer?.workDays ?? [...types_1.DEFAULT_WORK_DAYS],
            timeOff: producer?.timeOff ?? [],
            maxMixesPerDay: producer?.maxMixesPerDay ?? null,
            maxProducerCostPerDay: producer?.maxProducerCostPerDay ?? null,
            overtimeDays: producer?.overtimeDays ?? [],
            ratesByCategory,
            compensationModel: producer?.compensationModel ?? "percentage_of_payroll_base",
        });
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(94dvh,820px)] w-full max-w-md sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: isEdit ? "Edit Producer" : "New Producer" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleSubmit(), className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "min-h-0 flex-1 overflow-y-auto overscroll-contain", children: [validationError ? ((0, jsx_runtime_1.jsx)("div", { className: "bg-brand-danger-soft/80 px-5 py-2.5 text-[12px] font-medium text-brand-danger border-b border-brand-danger-muted", children: validationError })) : null, (0, jsx_runtime_1.jsxs)("section", { className: "flex flex-col items-center px-6 pb-5 pt-7", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setPickingAvatar((v) => !v), className: "group relative", "aria-expanded": pickingAvatar, "aria-label": "Change photo", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute -inset-[3px] rounded-full bg-[conic-gradient(from_210deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888,#f09433)] opacity-90", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("span", { className: "absolute -inset-px rounded-full bg-brand-elevated", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("img", { src: form.avatar, alt: "", className: "relative h-[96px] w-[96px] rounded-full bg-brand-bg object-cover ring-[3px] ring-brand-elevated transition group-active:scale-[0.98]" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setPickingAvatar((v) => !v), className: "mt-3 text-[14px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Change photo" }), pickingAvatar ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-4 w-full", children: (0, jsx_runtime_1.jsx)("div", { className: "-mx-2 flex gap-3 overflow-x-auto px-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: producer_avatars_1.PRODUCER_AVATARS.map((option) => {
                                                const selected = form.avatar === option.src;
                                                return ((0, jsx_runtime_1.jsx)("button", { type: "button", title: option.label, onClick: () => {
                                                        setForm({ ...form, avatar: option.src });
                                                        setPickingAvatar(false);
                                                    }, className: (0, clsx_1.default)("shrink-0 rounded-full p-[2px] transition", selected
                                                        ? "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]"
                                                        : "bg-transparent hover:bg-brand-bg-subtle"), children: (0, jsx_runtime_1.jsx)("img", { src: option.src, alt: option.label, className: "h-14 w-14 rounded-full bg-brand-bg object-cover ring-2 ring-brand-elevated" }) }, option.id));
                                            }) }) })) : null] }), (0, jsx_runtime_1.jsxs)("section", { className: "border-y border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)(ProfileRow, { label: "Name", children: (0, jsx_runtime_1.jsx)("input", { required: true, value: form.name, onChange: (e) => {
                                                const name = e.target.value;
                                                setForm((prev) => ({
                                                    ...prev,
                                                    name,
                                                    initials: initialsTouched
                                                        ? prev.initials
                                                        : (0, producers_1.initialsFromName)(name),
                                                }));
                                            }, placeholder: "Name", className: rowInput }) }), (0, jsx_runtime_1.jsx)(ProfileRow, { label: "Initials", children: (0, jsx_runtime_1.jsx)("input", { required: true, maxLength: 4, value: form.initials, onChange: (e) => {
                                                setInitialsTouched(true);
                                                setForm({
                                                    ...form,
                                                    initials: e.target.value.toUpperCase(),
                                                });
                                            }, placeholder: "CA", className: (0, clsx_1.default)(rowInput, "tracking-[0.08em]") }) }), (0, jsx_runtime_1.jsx)(ProfileRow, { label: "Email", children: (0, jsx_runtime_1.jsx)("input", { required: true, type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "Email", className: rowInput }) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "border-b border-black/[0.08] px-5 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Category Compensation" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: "Configure compensation percentage per category" })] }), availableCategories.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "relative", ref: dropdownRef, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setCategoryDropdownOpen((v) => !v), className: "inline-flex h-7 items-center gap-1 rounded-full bg-brand-bg px-2.5 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle", "aria-expanded": categoryDropdownOpen, "aria-haspopup": "listbox", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "h-3 w-3", strokeWidth: 2.5 }), "Add Category"] }), categoryDropdownOpen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl bg-brand-elevated shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]", role: "listbox", "aria-label": "Select category", children: (0, jsx_runtime_1.jsx)("div", { className: "max-h-56 overflow-y-auto py-1.5", children: availableCategories.map((cat) => ((0, jsx_runtime_1.jsx)("button", { type: "button", role: "option", "aria-selected": false, onClick: () => addCategory(cat), className: "w-full px-4 py-2.5 text-left text-[13px] text-brand-ink transition hover:bg-brand-bg-subtle", children: cat }, cat))) }) }))] }))] }), form.categories.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[12px] text-brand-ink-tertiary", children: "No categories assigned. Click \"+ Add Category\" to assign categories and set compensation rates." })) : ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 overflow-hidden rounded-xl border border-black/[0.08] bg-brand-bg/50", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-left text-[13px]", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "border-b border-black/[0.06] bg-brand-bg-subtle/80 text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsx)("th", { className: "px-3.5 py-2", children: "Category" }), (0, jsx_runtime_1.jsx)("th", { className: "px-3.5 py-2 text-right", children: "Compensation %" }), (0, jsx_runtime_1.jsx)("th", { className: "w-12 px-3 py-2 text-center", children: "Action" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-black/[0.06] bg-white/70", children: form.categories.map((cat) => ((0, jsx_runtime_1.jsxs)("tr", { className: "group", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-3.5 py-2.5 font-medium text-brand-ink", children: cat }), (0, jsx_runtime_1.jsx)("td", { className: "px-3.5 py-2 text-right", children: (0, jsx_runtime_1.jsxs)("div", { className: "inline-flex items-center justify-end gap-1 rounded-lg border border-black/[0.12] bg-white px-2 py-1 focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/20", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 100, step: 1, value: form.categoryRates[cat] ?? "", onChange: (e) => {
                                                                                const val = parseFloat(e.target.value);
                                                                                updateCategoryRate(cat, isNaN(val) ? 0 : val);
                                                                            }, className: "w-12 text-right text-[13px] font-semibold text-brand-ink outline-none" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-tertiary", children: "%" })] }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-3 py-2 text-center", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeCategory(cat), className: "inline-flex h-7 w-7 items-center justify-center rounded-lg text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger", "aria-label": `Remove ${cat}`, title: `Remove ${cat}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5" }) }) })] }, cat))) })] }) }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center pb-5 pt-6 sm:hidden", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-full bg-brand-bg p-2 text-brand-ink-tertiary", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) })] })] })] }));
}
function ProfileRow({ label, children, last, }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("flex items-center gap-4 px-5 py-[14px]", !last && "border-b border-black/[0.06]"), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-[88px] shrink-0 text-[15px] text-brand-ink", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "min-w-0 flex-1", children: children })] }));
}
