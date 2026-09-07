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
        specialty: "Cheer",
        avatar: producer_avatars_1.PRODUCER_AVATARS[0].src,
    };
}
function fromProducer(producer) {
    return {
        name: producer.name,
        initials: producer.initials,
        email: producer.email,
        specialty: producer.specialty,
        avatar: producer.avatar,
    };
}
function ProducerFormModal({ open, onClose, producer, onSave, }) {
    const [form, setForm] = (0, react_1.useState)(emptyForm);
    const [initialsTouched, setInitialsTouched] = (0, react_1.useState)(false);
    const [pickingAvatar, setPickingAvatar] = (0, react_1.useState)(false);
    const isEdit = Boolean(producer);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        if (producer) {
            setForm(fromProducer(producer));
            setInitialsTouched(true);
        }
        else {
            setForm(emptyForm());
            setInitialsTouched(false);
        }
        setPickingAvatar(false);
    }, [open, producer]);
    if (!open)
        return null;
    function handleSubmit(e) {
        e?.preventDefault();
        const initials = (form.initials || (0, producers_1.initialsFromName)(form.name))
            .toUpperCase()
            .slice(0, 4);
        if (!form.name.trim() || !form.email.trim() || !initials)
            return;
        onSave({
            id: producer?.id || `prod-${Date.now()}`,
            name: form.name.trim(),
            initials,
            email: form.email.trim().toLowerCase(),
            specialty: form.specialty,
            avatar: form.avatar,
            mixesThisWeek: producer?.mixesThisWeek ?? 0,
            nextAvailable: producer?.nextAvailable || "TBD",
            status: producer?.status || "available",
            workDays: producer?.workDays ?? [...types_1.DEFAULT_WORK_DAYS],
            timeOff: producer?.timeOff ?? [],
            maxMixesPerDay: producer?.maxMixesPerDay ?? null,
            overtimeDays: producer?.overtimeDays ?? [],
        });
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative flex max-h-[min(94dvh,820px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[28px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[28px]", children: [(0, jsx_runtime_1.jsxs)("header", { className: "relative flex shrink-0 items-center justify-between border-b border-black/[0.08] px-4 py-3.5", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "min-w-[64px] text-left text-[15px] text-brand-ink-secondary transition hover:text-brand-ink", children: "Cancel" }), (0, jsx_runtime_1.jsx)("h2", { className: "absolute left-1/2 -translate-x-1/2 text-[16px] font-semibold tracking-[-0.01em] text-brand-ink", children: isEdit ? "Edit profile" : "New producer" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => handleSubmit(), className: "min-w-[64px] text-right text-[15px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Done" })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "min-h-0 flex-1 overflow-y-auto overscroll-contain", children: [(0, jsx_runtime_1.jsxs)("section", { className: "flex flex-col items-center px-6 pb-5 pt-7", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setPickingAvatar((v) => !v), className: "group relative", "aria-expanded": pickingAvatar, "aria-label": "Change photo", children: [(0, jsx_runtime_1.jsx)("span", { className: "absolute -inset-[3px] rounded-full bg-[conic-gradient(from_210deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888,#f09433)] opacity-90", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("span", { className: "absolute -inset-px rounded-full bg-brand-elevated", "aria-hidden": true }), (0, jsx_runtime_1.jsx)("img", { src: form.avatar, alt: "", className: "relative h-[96px] w-[96px] rounded-full bg-brand-bg object-cover ring-[3px] ring-brand-elevated transition group-active:scale-[0.98]" })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setPickingAvatar((v) => !v), className: "mt-3 text-[14px] font-semibold text-brand-blue transition hover:text-brand-blue-hover", children: "Change photo" }), pickingAvatar ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-4 w-full", children: (0, jsx_runtime_1.jsx)("div", { className: "-mx-2 flex gap-3 overflow-x-auto px-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", children: producer_avatars_1.PRODUCER_AVATARS.map((option) => {
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
                                            }, placeholder: "CA", className: (0, clsx_1.default)(rowInput, "tracking-[0.08em]") }) }), (0, jsx_runtime_1.jsx)(ProfileRow, { label: "Email", children: (0, jsx_runtime_1.jsx)("input", { required: true, type: "email", value: form.email, onChange: (e) => setForm({ ...form, email: e.target.value }), placeholder: "Email", className: rowInput }) }), (0, jsx_runtime_1.jsx)(ProfileRow, { label: "Category", last: true, children: (0, jsx_runtime_1.jsxs)("div", { className: "relative flex w-full items-center justify-end", children: [(0, jsx_runtime_1.jsx)("select", { value: form.specialty, onChange: (e) => setForm({ ...form, specialty: e.target.value }), className: (0, clsx_1.default)(rowInput, "appearance-none pr-5 text-right"), children: types_1.PRODUCER_CATEGORIES.map((c) => ((0, jsx_runtime_1.jsx)("option", { value: c, children: c }, c))) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "pointer-events-none absolute right-0 h-3.5 w-3.5 text-brand-ink-tertiary", strokeWidth: 2 })] }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center pb-5 pt-6 sm:hidden", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-full bg-brand-bg p-2 text-brand-ink-tertiary", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) })] })] })] }));
}
function ProfileRow({ label, children, last, }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: (0, clsx_1.default)("flex items-center gap-4 px-5 py-[14px]", !last && "border-b border-black/[0.06]"), children: [(0, jsx_runtime_1.jsx)("span", { className: "w-[88px] shrink-0 text-[15px] text-brand-ink", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "min-w-0 flex-1", children: children })] }));
}
