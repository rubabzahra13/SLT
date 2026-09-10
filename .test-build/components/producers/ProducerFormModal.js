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
const ProducerCategoryAddMenu_1 = require("@/components/producers/ProducerCategoryAddMenu");
const producer_category_groups_1 = require("@/lib/producer-category-groups");
const producers_1 = require("@/lib/producers");
const Avatar_1 = require("@/components/ui/Avatar");
const types_1 = require("@/types");
const rowInput = "w-full bg-transparent text-right text-[15px] text-brand-ink outline-none placeholder:text-brand-ink-tertiary";
function emptyForm() {
    return {
        name: "",
        initials: "",
        email: "",
        categories: [],
        categoryRates: {},
        avatar: "",
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
    const [validationError, setValidationError] = (0, react_1.useState)(null);
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
    }, [open, producer]);
    if (!open)
        return null;
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(94dvh,820px)] w-full max-w-md sm:w-[440px] sm:max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: isEdit ? "Edit Producer" : "New Producer" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleSubmit(), className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "min-h-0 flex-1 overflow-y-auto overscroll-contain", children: [validationError ? ((0, jsx_runtime_1.jsx)("div", { className: "bg-brand-danger-soft/80 px-5 py-2.5 text-[12px] font-medium text-brand-danger border-b border-brand-danger-muted", children: validationError })) : null, (0, jsx_runtime_1.jsx)("section", { className: "flex flex-col items-center px-6 pb-5 pt-7", children: (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { initials: form.initials || (0, producers_1.initialsFromName)(form.name) || "??", name: form.name, size: "xl" }) }), (0, jsx_runtime_1.jsxs)("section", { className: "border-y border-black/[0.08]", children: [(0, jsx_runtime_1.jsx)(ProfileRow, { label: "Name", children: (0, jsx_runtime_1.jsx)("input", { required: true, value: form.name, onChange: (e) => {
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
                                            }, placeholder: "CA", className: (0, clsx_1.default)(rowInput, "tracking-[0.08em]") }) }), (0, jsx_runtime_1.jsx)(ProfileRow, { label: "Email", children: (0, jsx_runtime_1.jsx)("input", { required: true, type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "Email", className: rowInput }) })] }), (0, jsx_runtime_1.jsx)("section", { className: "px-5 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl bg-brand-bg px-4 py-3 ring-1 ring-inset ring-black/[0.06]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "Category compensation" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: "Payroll percentage by category." })] }), (0, jsx_runtime_1.jsx)(ProducerCategoryAddMenu_1.ProducerCategoryAddMenu, { assignedCategories: form.categories, onAdd: addCategory })] }), form.categories.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[12px] leading-relaxed text-brand-ink-tertiary", children: "No categories assigned yet. Tap Add to pick a category and subcategory." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "mt-3 divide-y divide-black/[0.06]", children: form.categories.map((cat) => {
                                                const group = (0, producer_category_groups_1.findProducerCategoryGroup)(cat);
                                                return ((0, jsx_runtime_1.jsxs)("li", { className: "flex items-center gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate font-medium text-brand-ink-secondary", children: cat }), group ? ((0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: group.label })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-elevated px-2 py-1 ring-1 ring-inset ring-black/[0.06] focus-within:ring-brand-blue/30", children: [(0, jsx_runtime_1.jsx)("input", { type: "number", min: 0, max: 100, step: 1, value: form.categoryRates[cat] ?? "", onChange: (e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        updateCategoryRate(cat, isNaN(val) ? 0 : val);
                                                                    }, className: "w-10 bg-transparent text-right text-[13px] font-semibold tabular-nums text-brand-ink outline-none", "aria-label": `Compensation percentage for ${cat}` }), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink-tertiary", children: "%" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeCategory(cat), className: "shrink-0 rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-elevated hover:text-brand-danger", "aria-label": `Remove ${cat}`, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-3.5 w-3.5", strokeWidth: 1.75 }) })] }, cat));
                                            }) }))] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center pb-5 pt-6 sm:hidden", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-full bg-brand-bg p-2 text-brand-ink-tertiary", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) })] })] })] }));
}
function ProfileRow({ label, children, last, }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("flex items-center gap-4 px-5 py-[14px]", !last && "border-b border-black/[0.06]"), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-[88px] shrink-0 text-[15px] text-brand-ink", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "min-w-0 flex-1", children: children })] }));
}
