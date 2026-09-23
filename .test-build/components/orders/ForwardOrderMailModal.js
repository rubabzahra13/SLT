"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForwardOrderMailModal = ForwardOrderMailModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const data_1 = require("@/lib/data");
const forward_order_mail_1 = require("@/lib/forward-order-mail");
const editor_assignment_1 = require("@/lib/editor-assignment");
const gmail_1 = require("@/lib/api/gmail");
const client_1 = require("@/lib/api/client");
const AuthContext_1 = require("@/context/AuthContext");
const AppStateContext_1 = require("@/context/AppStateContext");
const PdfCanvasViewer_1 = require("@/components/ui/PdfCanvasViewer");
const InlineFields_1 = require("@/components/mtd/InlineFields");
const dates_1 = require("@/lib/dates");
const email_templates_1 = require("@/lib/email-templates");
const music_resource_links_1 = require("@/lib/music-resource-links");
function EightCountSheetsPdfOverlay({ onClose }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 flex items-center justify-center p-4", style: { zIndex: 10000 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/60 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close PDF preview" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "eight-count-pdf-title", className: "relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 border-b border-brand-line/60 bg-brand-elevated px-5 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Attachment" }), (0, jsx_runtime_1.jsx)("h3", { id: "eight-count-pdf-title", className: "truncate text-[15px] font-semibold text-brand-ink", children: forward_order_mail_1.EIGHT_COUNT_SHEETS_PDF_FILENAME })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink", "aria-label": "Close", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4", strokeWidth: 2 }) })] }), (0, jsx_runtime_1.jsx)(PdfCanvasViewer_1.PdfImageViewer, { manifestSrc: forward_order_mail_1.EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST, className: "h-[70vh] w-full" })] })] }));
}
function LinkedMailText({ text }) {
    const parts = (0, music_resource_links_1.splitMailTextWithLinks)(text);
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: parts.map((part, index) => {
            if (part.type === "link") {
                return ((0, jsx_runtime_1.jsx)("a", { href: part.url, target: "_blank", rel: "noopener noreferrer", className: "font-semibold text-brand-signature underline underline-offset-2 hover:text-brand-signature-hover", children: part.label }, index));
            }
            return (0, jsx_runtime_1.jsx)("span", { children: part.value }, index);
        }) }));
}
function MailPreview({ draft, attachmentFilename, onViewAttachment, }) {
    const isCustomer = draft.variant === "customer";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-2xl border border-brand-line/70 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/15", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-gradient-to-br from-brand-signature to-brand-blue px-5 py-5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85", children: "Sounds Like That" }), (0, jsx_runtime_1.jsx)("h3", { className: "mt-1 text-[18px] font-bold tracking-[-0.02em] text-white", children: isCustomer ? "Action Required" : "Order Details" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-white/90", children: draft.programName })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 px-5 py-5", children: [(0, jsx_runtime_1.jsx)("div", { className: "rounded-xl border border-brand-line/50 bg-brand-bg/40 px-3 py-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-1.5 text-[12px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "To" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 text-brand-ink", children: [draft.toName, " ", (0, jsx_runtime_1.jsxs)("span", { className: "text-brand-ink-secondary", children: ["<", draft.to, ">"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: "Subject" }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 font-medium text-brand-ink", children: draft.subject })] })] }) }), attachmentFilename ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onViewAttachment, className: "flex w-full items-center gap-2 rounded-xl border border-brand-line/50 bg-brand-orange-soft/20 px-3 py-2.5 text-left transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25", "aria-label": `View ${attachmentFilename}`, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Paperclip, { className: "h-4 w-4 shrink-0 text-brand-orange", strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("span", { className: "min-w-0 truncate text-[12px] font-medium text-brand-ink underline-offset-2 hover:underline", children: attachmentFilename })] })) : null, draft.greeting.trim() ? ((0, jsx_runtime_1.jsx)("p", { className: "text-[14px] font-semibold text-brand-ink", children: draft.greeting })) : null, draft.intro.trim() ? ((0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary", children: (0, jsx_runtime_1.jsx)(LinkedMailText, { text: draft.intro }) })) : null, isCustomer && draft.programLine && draft.sections.length > 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold uppercase tracking-[0.02em] text-brand-ink", children: draft.programLine }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold uppercase tracking-[0.06em] text-brand-ink", children: draft.sections[0]?.title || "Missing items" })] })) : null, isCustomer
                        ? draft.sections.flatMap((section) => section.fields.map((field) => ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-bold uppercase tracking-[0.02em] text-brand-ink", children: field.label }), (0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary", children: (0, jsx_runtime_1.jsx)(LinkedMailText, { text: field.value }) })] }, `${section.title}-${field.label}`))))
                        : draft.sections.map((section) => ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-xl border border-brand-line/60 bg-brand-bg/30", children: [(0, jsx_runtime_1.jsx)("p", { className: "border-b border-brand-line/50 bg-brand-signature/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-signature", children: section.title }), (0, jsx_runtime_1.jsx)("dl", { className: "divide-y divide-brand-line/40", children: section.fields.map((field) => ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 px-3 py-2.5 text-[12px]", children: [(0, jsx_runtime_1.jsx)("dt", { className: "font-semibold text-brand-ink-secondary", children: field.label }), (0, jsx_runtime_1.jsx)("dd", { className: "whitespace-pre-wrap text-brand-ink", children: (0, jsx_runtime_1.jsx)(LinkedMailText, { text: field.value }) })] }, `${section.title}-${field.label}`))) })] }, section.title))), draft.footer.trim() || draft.signature.trim() ? ((0, jsx_runtime_1.jsxs)("div", { className: "border-t border-brand-line/40 pt-3", children: [draft.footer.trim() ? ((0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap text-[12px] leading-relaxed text-brand-ink-secondary", children: (0, jsx_runtime_1.jsx)(LinkedMailText, { text: draft.footer }) })) : null, draft.signature.trim() ? ((0, jsx_runtime_1.jsx)("p", { className: "mt-3 whitespace-pre-line text-[12px] leading-relaxed text-brand-ink", children: (0, jsx_runtime_1.jsx)(LinkedMailText, { text: draft.signature }) })) : null] })) : null] })] }));
}
function ForwardOrderMailModal({ open, record, orderById, allOrders, producers, recipient = "producer", onClose, }) {
    const { token, isViewOnly } = (0, AuthContext_1.useAuth)();
    const { emailTemplates, updateMTD } = (0, AppStateContext_1.useAppState)();
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [step, setStep] = (0, react_1.useState)("compose");
    const [editorId, setEditorId] = (0, react_1.useState)("");
    const [customerContactId, setCustomerContactId] = (0, react_1.useState)("");
    const [customerDeadlineIso, setCustomerDeadlineIso] = (0, react_1.useState)("");
    const [selectedKeys, setSelectedKeys] = (0, react_1.useState)([]);
    const [gmailConnected, setGmailConnected] = (0, react_1.useState)(false);
    const [gmailFrom, setGmailFrom] = (0, react_1.useState)(null);
    const [loadingGmail, setLoadingGmail] = (0, react_1.useState)(false);
    const [isSending, setIsSending] = (0, react_1.useState)(false);
    const [sendError, setSendError] = (0, react_1.useState)(null);
    const [sent, setSent] = (0, react_1.useState)(false);
    const [pdfPreviewOpen, setPdfPreviewOpen] = (0, react_1.useState)(false);
    const isCustomer = recipient === "customer";
    const isCustomerResend = isCustomer && Boolean(record?.missingDataEmailSentAt);
    const linkedOrder = (0, react_1.useMemo)(() => (record ? (0, editor_assignment_1.findLinkedOrder)(record, allOrders) : null), [record, allOrders]);
    const customerContacts = (0, react_1.useMemo)(() => (record ? (0, forward_order_mail_1.resolveCustomerMailContacts)(record, linkedOrder) : []), [record, linkedOrder]);
    const fieldGroups = (0, react_1.useMemo)(() => {
        if (!record)
            return [];
        if (isCustomer) {
            const groups = (0, forward_order_mail_1.buildMissingDataMailFieldGroups)(record);
            if (!isCustomerResend)
                return groups;
            return groups.map((group) => ({
                ...group,
                title: "Items to correct",
                fields: group.fields.map((field) => ({
                    ...field,
                    section: "Items to correct",
                })),
            }));
        }
        return (0, forward_order_mail_1.buildForwardOrderMailFieldGroups)(record, linkedOrder, orderById, producers);
    }, [record, linkedOrder, orderById, producers, isCustomer, isCustomerResend]);
    const allFields = (0, react_1.useMemo)(() => (0, forward_order_mail_1.flattenForwardMailFields)(fieldGroups), [fieldGroups]);
    const fieldByKey = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const field of allFields) {
            map.set(field.key, field);
        }
        return map;
    }, [allFields]);
    const activeCustomerTemplate = (0, react_1.useMemo)(() => {
        if (!isCustomer)
            return null;
        return isCustomerResend
            ? emailTemplates.customer_incorrect_data
            : emailTemplates.customer_missing_data;
    }, [isCustomer, isCustomerResend, emailTemplates]);
    const needsSubmissionDeadline = (0, react_1.useMemo)(() => {
        if (!activeCustomerTemplate)
            return false;
        return (0, email_templates_1.emailTemplateUsesAnyPlaceholder)(activeCustomerTemplate, [
            "day",
            "completeDate",
        ]);
    }, [activeCustomerTemplate]);
    const customerTemplateUsesDay = (0, react_1.useMemo)(() => {
        if (!activeCustomerTemplate)
            return false;
        return (0, email_templates_1.emailTemplateUsesAnyPlaceholder)(activeCustomerTemplate, ["day"]);
    }, [activeCustomerTemplate]);
    const customerTemplateUsesCompleteDate = (0, react_1.useMemo)(() => {
        if (!activeCustomerTemplate)
            return false;
        return (0, email_templates_1.emailTemplateUsesAnyPlaceholder)(activeCustomerTemplate, [
            "completeDate",
        ]);
    }, [activeCustomerTemplate]);
    (0, react_1.useEffect)(() => {
        setMounted(true);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open || !record)
            return;
        setStep("compose");
        setEditorId((0, forward_order_mail_1.resolveDefaultEditorKey)(record, producers, linkedOrder));
        setCustomerContactId(customerContacts[0]?.id ?? "");
        setCustomerDeadlineIso(record ? (0, forward_order_mail_1.customerSubmissionDeadlineIso)(record) : "");
        setSelectedKeys((0, forward_order_mail_1.defaultSelectedForwardMailKeys)(fieldGroups));
        setSendError(null);
        setSent(false);
        setPdfPreviewOpen(false);
    }, [
        open,
        record,
        producers,
        fieldGroups,
        linkedOrder,
        customerContacts,
        recipient,
    ]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        let cancelled = false;
        setLoadingGmail(true);
        (0, gmail_1.getGmailStatus)(token)
            .then((res) => {
            if (cancelled)
                return;
            setGmailConnected(res.connected);
            setGmailFrom(res.email);
        })
            .catch(() => {
            if (cancelled)
                return;
            setGmailConnected(false);
            setGmailFrom(null);
        })
            .finally(() => {
            if (!cancelled)
                setLoadingGmail(false);
        });
        return () => {
            cancelled = true;
        };
    }, [open, token]);
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
    const customerContact = customerContacts.find((contact) => contact.id === customerContactId);
    const selectedFields = selectedKeys
        .map((key) => fieldByKey.get(key))
        .filter((field) => Boolean(field));
    const customerDeadlineIsoNormalized = (0, dates_1.toIsoDateString)(customerDeadlineIso);
    const customerDeadlineDate = isCustomer && /^\d{4}-\d{2}-\d{2}$/.test(customerDeadlineIsoNormalized)
        ? (0, dates_1.parseFlexibleDate)(customerDeadlineIsoNormalized) ??
            (0, forward_order_mail_1.resolveCustomerSubmissionDeadline)(record)
        : isCustomer
            ? (0, forward_order_mail_1.resolveCustomerSubmissionDeadline)(record)
            : null;
    const customerTemplateForDraft = activeCustomerTemplate ??
        email_templates_1.DEFAULT_EMAIL_TEMPLATES.customer_missing_data;
    const draft = isCustomer
        ? (0, forward_order_mail_1.buildCustomerMissingDataDraft)(record, customerContact, selectedFields, customerTemplateForDraft, {
            sectionTitle: isCustomerResend
                ? "Items to correct"
                : "Missing items",
            deadline: needsSubmissionDeadline && customerDeadlineDate
                ? customerDeadlineDate
                : undefined,
        })
        : (0, forward_order_mail_1.buildForwardMailDraft)(record, editor, selectedFields, emailTemplates.producer_order);
    const hasRecipient = isCustomer
        ? Boolean(customerContact?.email)
        : Boolean(editor?.email);
    const hasCustomerDeadline = !isCustomer ||
        !needsSubmissionDeadline ||
        /^\d{4}-\d{2}-\d{2}$/.test(customerDeadlineIsoNormalized);
    const customerDeadlineDisplay = (() => {
        if (!customerDeadlineDate || !needsSubmissionDeadline)
            return null;
        const fields = (0, forward_order_mail_1.formatCustomerDeadlineFields)(customerDeadlineDate);
        // Prefer complete date (already includes the ordinal day); fall back to day-only.
        if (customerTemplateUsesCompleteDate)
            return fields.completeDate;
        if (customerTemplateUsesDay)
            return fields.day;
        return null;
    })();
    const canContinue = hasRecipient && selectedFields.length > 0 && hasCustomerDeadline;
    const canSend = canContinue && gmailConnected && !isViewOnly && !sent;
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
    async function handleSend() {
        if (!canSend || !hasRecipient)
            return;
        setIsSending(true);
        setSendError(null);
        try {
            const attachments = isCustomer && (0, forward_order_mail_1.customerMailIncludesEightCountSheets)(selectedKeys)
                ? [await (0, forward_order_mail_1.loadEightCountSheetsAttachment)()]
                : undefined;
            await (0, gmail_1.sendGmailEmail)({
                to_email: draft.to,
                subject: draft.subject,
                body: (0, forward_order_mail_1.renderForwardMailPlainText)(draft),
                html_body: (0, forward_order_mail_1.renderForwardMailHtml)(draft),
                attachments,
            }, token);
            if (isCustomer && record) {
                updateMTD(record.id, {
                    missingDataEmailSentAt: new Date().toISOString(),
                });
            }
            setSent(true);
        }
        catch (err) {
            setSendError(err instanceof client_1.ApiClientError
                ? err.message
                : "Email could not be sent. Please try again.");
        }
        finally {
            setIsSending(false);
        }
    }
    const isCompose = step === "compose";
    const composeTitle = isCustomer
        ? isCustomerResend
            ? "Request corrected materials"
            : "Email customer about missing data"
        : "Send mail to editor";
    const composeEyebrow = isCustomer
        ? isCustomerResend
            ? "Incorrect data"
            : "Missing data"
        : "Forward order";
    const includeLabel = isCustomer
        ? isCustomerResend
            ? "Items to ask them to correct"
            : "Missing items to request"
        : "Include in email";
    const recipientLabel = isCustomer ? "Send to customer" : "Send to editor";
    const eightCountAttachment = isCustomer && (0, forward_order_mail_1.customerMailIncludesEightCountSheets)(selectedKeys)
        ? forward_order_mail_1.EIGHT_COUNT_SHEETS_PDF_FILENAME
        : null;
    return (0, react_dom_1.createPortal)((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("fixed inset-0 z-[100] flex items-center justify-center p-4", pdfPreviewOpen && "pointer-events-none"), children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-black/45 backdrop-blur-[2px]", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "forward-order-mail-title", className: "relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-start gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-5 w-5", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: isCompose ? composeEyebrow : sent ? "Email sent" : "Review email" }), (0, jsx_runtime_1.jsx)("h2", { id: "forward-order-mail-title", className: "mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink", children: isCompose
                                                                ? composeTitle
                                                                : sent
                                                                    ? "Sent successfully"
                                                                    : "Email preview" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 truncate text-[13px] text-brand-ink-secondary", children: (0, data_1.titleCase)(record.programName) })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", "aria-label": "Close dialog", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-y-auto px-6 py-5", children: isCompose ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [!loadingGmail && !gmailConnected ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-warning" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary", children: ["Connect Gmail in", " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "/settings", className: "font-semibold text-brand-signature hover:underline", children: "Settings" }), " ", "to send directly. You can still copy the email as a fallback."] })] })) : null, gmailConnected && gmailFrom ? ((0, jsx_runtime_1.jsxs)("p", { className: "text-[11px] text-brand-ink-tertiary", children: ["Sending from", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink-secondary", children: gmailFrom })] })) : null, isCustomer && customerContacts.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-warning" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] leading-relaxed text-brand-ink-secondary", children: "No customer email was found on this order. Add a coach or billing email in the order details first." })] })) : null, isCustomer && allFields.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl border border-brand-line/60 bg-brand-bg/40 px-3.5 py-3 text-[12px] leading-relaxed text-brand-ink-secondary", children: "No missing API data is flagged on this order right now." })) : null, isCustomer && isCustomerResend ? ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3 text-[12px] leading-relaxed text-brand-ink-secondary", children: ["A missing-data email was already sent", record.missingDataEmailSentAt
                                                    ? ` on ${new Date(record.missingDataEmailSentAt).toLocaleString()}`
                                                    : "", ". Use this follow-up to ask the customer to resubmit anything that came back incorrect."] })) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: recipientLabel }), isCustomer ? ((0, jsx_runtime_1.jsx)("select", { value: customerContactId, onChange: (event) => setCustomerContactId(event.target.value), disabled: customerContacts.length === 0, className: "mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15 disabled:opacity-60", children: customerContacts.map((contact) => ((0, jsx_runtime_1.jsxs)("option", { value: contact.id, children: [contact.role, " \u00B7 ", contact.name, " \u00B7 ", contact.email] }, contact.id))) })) : ((0, jsx_runtime_1.jsx)("select", { value: editorId, onChange: (event) => setEditorId(event.target.value), className: "mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15", children: producers.map((producer) => ((0, jsx_runtime_1.jsxs)("option", { value: producer.id, children: [producer.name, " \u00B7 ", producer.email] }, producer.id))) }))] }), isCustomer && needsSubmissionDeadline ? ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: "Submission deadline" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary", children: ["This date fills the", " ", customerTemplateUsesDay && customerTemplateUsesCompleteDate
                                                            ? "Day and Complete date variables"
                                                            : customerTemplateUsesDay
                                                                ? "Day variable"
                                                                : "Complete date variable", " ", "in your template. Defaults from the mix schedule; change if needed."] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-1.5", children: (0, jsx_runtime_1.jsx)(InlineFields_1.InlineDateInput, { value: customerDeadlineIso, onChange: setCustomerDeadlineIso, className: "w-full", menuZIndex: 110, displayValue: customerDeadlineDisplay ?? undefined }) })] })) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2 flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: includeLabel }), allFields.length > 0 ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSelectedKeys(selectedKeys.length === allFields.length
                                                                ? []
                                                                : (0, forward_order_mail_1.defaultSelectedForwardMailKeys)(fieldGroups)), className: "text-[12px] font-medium text-brand-signature hover:underline", children: selectedKeys.length === allFields.length
                                                                ? "Clear all"
                                                                : "Select all" })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: fieldGroups.map((group) => {
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
                                                    }) })] }), isCustomer && eightCountAttachment ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setPdfPreviewOpen(true), className: "flex w-full items-center gap-2 rounded-xl border border-brand-line/60 bg-brand-bg/40 px-3.5 py-2.5 text-left transition hover:border-brand-orange/35 hover:bg-brand-orange-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25", "aria-label": `View ${eightCountAttachment}`, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Paperclip, { className: "h-4 w-4 shrink-0 text-brand-orange", strokeWidth: 2 }), (0, jsx_runtime_1.jsxs)("p", { className: "min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink underline-offset-2 hover:underline", children: eightCountAttachment }), " ", "will be included when this email is sent. Click to view."] })] })) : null] })) : sent ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center py-8 text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-14 w-14 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/25", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-7 w-7", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-4 text-[15px] font-semibold text-brand-ink", children: ["Email sent to ", draft.toName] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: draft.to })] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [sendError ? ((0, jsx_runtime_1.jsxs)("div", { className: "mb-4 flex items-start gap-2.5 rounded-xl border border-brand-danger/25 bg-brand-danger/8 px-3.5 py-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-4 w-4 shrink-0 text-brand-danger" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] leading-relaxed text-brand-ink-secondary", children: sendError })] })) : null, (0, jsx_runtime_1.jsx)(MailPreview, { draft: draft, attachmentFilename: eightCountAttachment, onViewAttachment: () => setPdfPreviewOpen(true) })] })) }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-col border-t border-black/[0.08]", children: isCompose ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setStep("confirm"), disabled: !canContinue, className: "py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent", children: "Review email" })) : sent ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8", children: "Done" })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleSend, disabled: !canSend || isSending, className: "inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent", children: [isSending ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-4 w-4 animate-spin" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" })), isSending ? "Sending…" : "Send via Gmail"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                                                setSendError(null);
                                                setStep("compose");
                                            }, className: "inline-flex items-center justify-center gap-2 border-t border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }), "Back to fields"] })] })) })] })] }), pdfPreviewOpen ? ((0, jsx_runtime_1.jsx)(EightCountSheetsPdfOverlay, { onClose: () => setPdfPreviewOpen(false) })) : null] }), document.body);
}
