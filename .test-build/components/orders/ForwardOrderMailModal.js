"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForwardOrderMailModal = ForwardOrderMailModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
const forward_order_mail_1 = require("@/lib/forward-order-mail");
const editor_assignment_1 = require("@/lib/editor-assignment");
function MailPreview({ draft }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/70 bg-white shadow-sm ring-1 ring-inset ring-brand-line/20", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/50 bg-brand-bg/50 px-4 py-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-2 text-[12px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "To" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 text-brand-ink", children: [draft.toName, " ", (0, jsx_runtime_1.jsxs)("span", { className: "text-brand-ink-secondary", children: ["<", draft.to, ">"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "Subject" }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 font-medium text-brand-ink", children: draft.subject })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 px-4 py-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] leading-relaxed text-brand-ink", children: draft.greeting }), (0, jsx_runtime_1.jsx)("p", { className: "text-[13px] leading-relaxed text-brand-ink-secondary", children: draft.intro }), draft.sections.map((section) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-bold uppercase tracking-[0.1em] text-brand-signature", children: section.title }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 space-y-1.5 rounded-lg bg-brand-bg/40 px-3 py-2.5", children: section.fields.map((field) => ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 gap-y-0.5 text-[12px]", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-medium text-brand-ink-secondary", children: field.label }), (0, jsx_runtime_1.jsx)("span", { className: "whitespace-pre-wrap text-brand-ink", children: field.value })] }, `${section.title}-${field.label}`))) })] }, section.title))), (0, jsx_runtime_1.jsxs)("div", { className: "border-t border-brand-line/40 pt-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] leading-relaxed text-brand-ink-secondary", children: draft.footer }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 whitespace-pre-line text-[12px] leading-relaxed text-brand-ink", children: draft.signature })] })] })] }));
}
function ForwardOrderMailModal({ open, record, orderById, allOrders, producers, onClose, }) {
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [step, setStep] = (0, react_1.useState)("compose");
    const [editorId, setEditorId] = (0, react_1.useState)("");
    const [selectedKeys, setSelectedKeys] = (0, react_1.useState)([]);
    const [copied, setCopied] = (0, react_1.useState)(false);
    const linkedOrder = (0, react_1.useMemo)(() => (record ? (0, editor_assignment_1.findLinkedOrder)(record, allOrders) : null), [record, allOrders]);
    const fieldGroups = (0, react_1.useMemo)(() => record
        ? (0, forward_order_mail_1.buildForwardOrderMailFieldGroups)(record, linkedOrder, orderById, producers)
        : [], [record, linkedOrder, orderById, producers]);
    const allFields = (0, react_1.useMemo)(() => (0, forward_order_mail_1.flattenForwardMailFields)(fieldGroups), [fieldGroups]);
    const fieldByKey = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const field of allFields) {
            map.set(field.key, field);
        }
        return map;
    }, [allFields]);
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        setStep("compose");
        setEditorId((0, forward_order_mail_1.resolveDefaultEditorKey)(record, producers, linkedOrder));
        setSelectedKeys((0, forward_order_mail_1.defaultSelectedForwardMailKeys)(fieldGroups));
        setCopied(false);
    }, [open, record, producers, fieldGroups, linkedOrder]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [open]);
    if (!mounted || !open || !record)
        return null;
    const editor = producers.find((producer) => producer.id === editorId);
    const selectedFields = selectedKeys
        .map((key) => fieldByKey.get(key))
        .filter((field) => Boolean(field));
    const draft = (0, forward_order_mail_1.buildForwardMailDraft)(record, editor, selectedFields);
    const canContinue = Boolean(editor?.email) && selectedFields.length > 0;
    function toggleField(key) {
        setSelectedKeys((current) => current.includes(key)
            ? current.filter((entry) => entry !== key)
            : [...current, key]);
    }
    function toggleSection(fields) {
        const keys = fields.map((field) => field.key);
        const allSelected = keys.every((key) => selectedKeys.includes(key));
        setSelectedKeys((current) => {
            if (allSelected) {
                return current.filter((key) => !keys.includes(key));
            }
            return Array.from(new Set([...current, ...keys]));
        });
    }
    async function handleCopy() {
        await navigator.clipboard.writeText((0, forward_order_mail_1.buildForwardMailClipboardText)(draft));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    }
    const isCompose = step === "compose";
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "forward-order-mail-title", className: "relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-5 w-5", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: isCompose ? "Forward order" : "Review email" }), (0, jsx_runtime_1.jsx)("h2", { id: "forward-order-mail-title", className: "mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: isCompose ? "Send mail to editor" : "Email preview" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 truncate text-[13px] text-brand-ink-secondary", children: (0, data_1.titleCase)(record.programName) })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", "aria-label": "Close dialog", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-y-auto px-6 py-5", children: isCompose ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("label", { className: "block", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Send to editor" }), (0, jsx_runtime_1.jsx)("select", { value: editorId, onChange: (event) => setEditorId(event.target.value), className: "mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15", children: producers.map((producer) => ((0, jsx_runtime_1.jsxs)("option", { value: producer.id, children: [producer.name, " \u00B7 ", producer.email] }, producer.id))) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Include in email" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelectedKeys(selectedKeys.length === allFields.length
                                                        ? []
                                                        : (0, forward_order_mail_1.defaultSelectedForwardMailKeys)(fieldGroups)), className: "text-[12px] font-medium text-brand-signature hover:underline", children: selectedKeys.length === allFields.length ? "Clear all" : "Select all" })] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: fieldGroups.map((group) => {
                                                const groupKeys = group.fields.map((field) => field.key);
                                                const allGroupSelected = groupKeys.every((key) => selectedKeys.includes(key));
                                                const someGroupSelected = !allGroupSelected &&
                                                    groupKeys.some((key) => selectedKeys.includes(key));
                                                return ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/70 bg-brand-bg/35", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleSection(group.fields), className: "flex w-full items-center justify-between gap-3 border-b border-brand-line/50 px-3 py-2.5 text-left transition hover:bg-brand-bg/60", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink", children: group.title }), (0, jsx_runtime_1.jsxs)("span", { className: (0, clsx_1.default)("text-[11px] font-medium", allGroupSelected
                                                                        ? "text-brand-signature"
                                                                        : someGroupSelected
                                                                            ? "text-brand-ink-secondary"
                                                                            : "text-brand-ink-tertiary"), children: [groupKeys.filter((key) => selectedKeys.includes(key)).length, "/", groupKeys.length] })] }), (0, jsx_runtime_1.jsx)("ul", { className: "divide-y divide-brand-line/40", children: group.fields.map((field) => {
                                                                const active = selectedKeys.includes(field.key);
                                                                return ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleField(field.key), className: (0, clsx_1.default)("flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/50", active && "bg-brand-signature/5"), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", active
                                                                                    ? "border-brand-signature bg-brand-signature text-white"
                                                                                    : "border-brand-line bg-white"), children: active ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-3 w-3", strokeWidth: 3 })) : null }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[12px] font-medium text-brand-ink", children: field.label }), (0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 block truncate text-[11px] text-brand-ink-secondary", children: field.value })] })] }) }, field.key));
                                                            }) })] }, group.title));
                                            }) })] })] })) : ((0, jsx_runtime_1.jsx)(MailPreview, { draft: draft })) }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-col border-t border-black/[0.08]", children: isCompose ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setStep("confirm"), disabled: !canContinue, className: "border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent", children: "Review email" }) })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleCopy, disabled: selectedFields.length === 0, className: "inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent", children: [copied ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4 text-brand-success" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Copy, { className: "h-4 w-4" })), copied ? "Copied" : "Copy email"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setStep("compose"), className: "inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }), "Back to fields"] })] })) })] })] }), document.body);
}
