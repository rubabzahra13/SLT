"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddPastOrderModal = AddPastOrderModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const order_form_1 = require("@/lib/order-form");
const categories = ["Cheer", "Dance", "Marching Band", "School", "Outsourced"];
function AddPastOrderModal({ open, onClose, onAdd, producers, }) {
    const [form, setForm] = (0, react_1.useState)({
        programName: "",
        customerName: "",
        musicTheme: "",
        category: "Cheer",
        package: "",
        assignedProducer: producers[0] || "CASEY",
        price: "",
        completedAt: new Date().toISOString().slice(0, 10),
    });
    if (!open)
        return null;
    function handleSubmit(e) {
        e.preventDefault();
        const draft = {
            id: `ord-past-${Date.now()}`,
            customerName: form.customerName.toUpperCase(),
            contactName: form.customerName.toUpperCase(),
            programName: form.programName.toUpperCase(),
            schoolProgramName: form.programName.toUpperCase(),
            schoolAddress: "",
            city: "",
            stateProvince: "",
            zipPostalCode: "",
            country: "United States",
            division: form.category,
            coachName: form.customerName.toUpperCase(),
            coachPhone: "",
            coachEmail: "",
            billingPersonName: form.customerName.toUpperCase(),
            billingPersonEmail: "",
            choreographerName: "N/A",
            choreographerEmail: "N/A",
            numberOfCopies: "",
            packageType: form.package.toUpperCase() || "TBD",
            requestedEditor: form.assignedProducer,
            timeLengthOfMix: "",
            musicAffiliate: "Power Music Covers",
            powerMusicCovers: form.musicTheme.toUpperCase() || "",
            routineNotes: form.musicTheme.toUpperCase() || "",
            customVoiceovers: "No - None",
            category: form.category,
            package: form.package.toUpperCase() || "TBD",
            musicTheme: form.musicTheme.toUpperCase() || "PM & UTB COVERS (CM)",
            editorRequest: form.assignedProducer,
            requestedProducer: form.assignedProducer,
            assignedProducer: form.assignedProducer,
            price: Number(form.price) || 0,
            status: "completed",
            createdAt: form.completedAt,
            completedAt: form.completedAt,
            needsAttention: false,
            attentionReason: null,
        };
        const order = (0, order_form_1.normalizeOrder)({
            ...draft,
            formType: (0, order_form_1.inferFormType)(draft),
        });
        onAdd(order);
        setForm({
            programName: "",
            customerName: "",
            musicTheme: "",
            category: "Cheer",
            package: "",
            assignedProducer: producers[0] || "CASEY",
            price: "",
            completedAt: new Date().toISOString().slice(0, 10),
        });
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "surface-premium relative w-full max-w-lg rounded-2xl p-6 shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-6 flex items-start justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Past orders" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[18px]", children: "Add past order" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: "Archive a completed order for search and reference." })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(Field, { label: "Program name", children: (0, jsx_runtime_1.jsx)("input", { required: true, value: form.programName, onChange: (e) => setForm({ ...form, programName: e.target.value }), placeholder: "SPIRIT XTREME AS MIGHTY MINI", className: inputClass }) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsx)(Field, { label: "Contact", children: (0, jsx_runtime_1.jsx)("input", { required: true, value: form.customerName, onChange: (e) => setForm({ ...form, customerName: e.target.value }), placeholder: "WALTER", className: inputClass }) }), (0, jsx_runtime_1.jsx)(Field, { label: "Category", children: (0, jsx_runtime_1.jsx)("select", { value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), className: inputClass, children: categories.map((c) => ((0, jsx_runtime_1.jsx)("option", { children: c }, c))) }) })] }), (0, jsx_runtime_1.jsx)(Field, { label: "Package", children: (0, jsx_runtime_1.jsx)("input", { value: form.package, onChange: (e) => setForm({ ...form, package: e.target.value }), placeholder: "PLATINUM 2:30 NO SPLIT", className: inputClass }) }), (0, jsx_runtime_1.jsx)(Field, { label: "Music / theme (F)", children: (0, jsx_runtime_1.jsx)("input", { value: form.musicTheme, onChange: (e) => setForm({ ...form, musicTheme: e.target.value }), placeholder: "SONGS FOR CHEER EDITORS CHOICE (CM)", className: inputClass }) }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsx)(Field, { label: "Producer", children: (0, jsx_runtime_1.jsx)("select", { value: form.assignedProducer, onChange: (e) => setForm({ ...form, assignedProducer: e.target.value }), className: inputClass, children: producers.map((p) => ((0, jsx_runtime_1.jsx)("option", { children: p }, p))) }) }), (0, jsx_runtime_1.jsx)(Field, { label: "Price", children: (0, jsx_runtime_1.jsx)("input", { type: "number", required: true, min: 0, value: form.price, onChange: (e) => setForm({ ...form, price: e.target.value }), placeholder: "1400", className: inputClass }) })] }), (0, jsx_runtime_1.jsx)(Field, { label: "Completed date", children: (0, jsx_runtime_1.jsx)("input", { type: "date", required: true, value: form.completedAt, onChange: (e) => setForm({ ...form, completedAt: e.target.value }), className: inputClass }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3 pt-2", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "flex-1 rounded-xl border border-brand-line py-2.5 text-[13px] font-semibold transition hover:bg-brand-bg", children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "flex-1 rounded-xl bg-brand-accent py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-accent-hover", children: "Add to past orders" })] })] })] })] }));
}
function Field({ label, children, }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-label", children: label }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1.5", children: children })] }));
}
const inputClass = "w-full rounded-xl border border-brand-line bg-brand-bg px-3.5 py-2.5 text-[13px] outline-none transition focus:border-brand-line-strong focus:bg-brand-surface";
