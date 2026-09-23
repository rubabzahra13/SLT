"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollSendPanel = PayrollSendPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const ProducerStatementPreview_1 = require("@/components/payroll/ProducerStatementPreview");
const PayrollSendMailModal_1 = require("@/components/payroll/PayrollSendMailModal");
const AuthContext_1 = require("@/context/AuthContext");
const date_filters_1 = require("@/lib/date-filters");
const dates_1 = require("@/lib/dates");
const client_1 = require("@/lib/api/client");
const gmail_1 = require("@/lib/api/gmail");
const export_csv_1 = require("@/lib/export-csv");
const producer_payroll_mail_1 = require("@/lib/producer-payroll-mail");
function findProducerByName(name, producers) {
    return producers.find((producer) => producer.name.toUpperCase() === name.toUpperCase());
}
function resolveSelectedProducerName(selectedSendEditor, producerNames, producers) {
    if (selectedSendEditor === "all")
        return null;
    const byName = producerNames.find((name) => name.toUpperCase() === selectedSendEditor.toUpperCase());
    if (byName)
        return byName;
    const producer = producers.find((entry) => entry.id === selectedSendEditor ||
        entry.name.toUpperCase() === selectedSendEditor.toUpperCase());
    if (!producer)
        return null;
    return producerNames.find((name) => name.toUpperCase() === producer.name.toUpperCase()) ?? null;
}
function PayrollSendPanel({ categoryLabel, producerNames, categoryProducers, selectedSendEditor, payPeriod, payrollRecords, allOrders, producers, payrollAddons = [], }) {
    const { token, isViewOnly } = (0, AuthContext_1.useAuth)();
    const [gmailConnected, setGmailConnected] = (0, react_1.useState)(false);
    const [gmailFrom, setGmailFrom] = (0, react_1.useState)(null);
    const [loadingGmail, setLoadingGmail] = (0, react_1.useState)(true);
    const [isSending, setIsSending] = (0, react_1.useState)(false);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const [mailModalOpen, setMailModalOpen] = (0, react_1.useState)(false);
    const [sendError, setSendError] = (0, react_1.useState)(null);
    const [sent, setSent] = (0, react_1.useState)(false);
    const [sentSummary, setSentSummary] = (0, react_1.useState)(null);
    const payPeriodFilter = (0, react_1.useMemo)(() => (0, date_filters_1.payPeriodRangeToDateFilter)(payPeriod), [payPeriod]);
    const periodLabel = (0, react_1.useMemo)(() => (0, date_filters_1.payPeriodRangeLabel)(payPeriod), [payPeriod]);
    const filterPeriod = (0, react_1.useMemo)(() => {
        const bounds = (0, date_filters_1.calculateDateBounds)(payPeriodFilter.type, payPeriodFilter.value);
        return {
            start: bounds.start ? (0, dates_1.toCanonicalIsoDate)(bounds.start) : "",
            end: bounds.end ? (0, dates_1.toCanonicalIsoDate)(bounds.end) : "",
        };
    }, [payPeriodFilter]);
    const viewingAll = selectedSendEditor === "all";
    const sendLayout = viewingAll ? "together" : "separate";
    const targetProducerNames = (0, react_1.useMemo)(() => {
        if (viewingAll)
            return producerNames;
        const resolved = resolveSelectedProducerName(selectedSendEditor, producerNames, producers);
        return resolved ? [resolved] : producerNames;
    }, [viewingAll, selectedSendEditor, producerNames, producers]);
    const targetCount = targetProducerNames.length;
    const canExport = targetCount > 0;
    const categoryEditorCount = categoryProducers.length;
    const statementCount = producerNames.length;
    const activeProducerName = viewingAll
        ? producerNames[0] ?? ""
        : targetProducerNames[0] ?? "";
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        async function loadGmailStatus() {
            try {
                setLoadingGmail(true);
                const status = await (0, gmail_1.getGmailStatus)(token);
                if (!cancelled) {
                    setGmailConnected(status.connected);
                    setGmailFrom(status.email);
                }
            }
            catch {
                if (!cancelled) {
                    setGmailConnected(false);
                    setGmailFrom(null);
                }
            }
            finally {
                if (!cancelled)
                    setLoadingGmail(false);
            }
        }
        void loadGmailStatus();
        return () => {
            cancelled = true;
        };
    }, [token]);
    const canSend = canExport && gmailConnected && !isViewOnly && !isSending;
    const mixCountByProducer = (0, react_1.useMemo)(() => {
        const counts = new Map();
        for (const name of producerNames) {
            const rows = (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, name, filterPeriod, payrollAddons);
            counts.set(name, rows.length);
        }
        return counts;
    }, [producerNames, payrollRecords, allOrders, producers, filterPeriod, payrollAddons]);
    const previewItems = (0, react_1.useMemo)(() => {
        return targetProducerNames.flatMap((producerName) => {
            const producer = findProducerByName(producerName, producers);
            if (!producer)
                return [];
            const mixCount = mixCountByProducer.get(producerName) ?? 0;
            const rows = (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, producerName, filterPeriod, payrollAddons);
            const draft = (0, producer_payroll_mail_1.buildPayrollMailDraft)(producer, mixCount, periodLabel, categoryLabel);
            return [
                {
                    producerName,
                    email: producer.email,
                    draft,
                    mixCount,
                    rows,
                },
            ];
        });
    }, [
        targetProducerNames,
        producers,
        mixCountByProducer,
        periodLabel,
        categoryLabel,
        payrollRecords,
        allOrders,
        filterPeriod,
    ]);
    const missingEmailNames = (0, react_1.useMemo)(() => previewItems.filter((item) => !item.email).map((item) => item.producerName), [previewItems]);
    const downloadTargets = (0, react_1.useCallback)((targets) => {
        if (targets.length === 0) {
            if (typeof window !== "undefined") {
                alert("No completed records found for the selected pay period.");
            }
            return;
        }
        targets.forEach((targetName) => {
            const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(payrollRecords, allOrders, producers, targetName, filterPeriod, payrollAddons);
            (0, export_csv_1.triggerCsvDownload)(`Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
        });
    }, [payrollRecords, allOrders, producers, filterPeriod]);
    const handleDownload = (0, react_1.useCallback)(() => {
        downloadTargets(targetProducerNames);
    }, [downloadTargets, targetProducerNames]);
    const sendStatementToProducer = (0, react_1.useCallback)(async (producerName) => {
        const producer = findProducerByName(producerName, producers);
        if (!producer?.email) {
            throw new Error(`${producerName} has no email on file.`);
        }
        const mixCount = mixCountByProducer.get(producerName) ?? 0;
        const rows = (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, producerName, filterPeriod, payrollAddons);
        const draft = (0, producer_payroll_mail_1.buildPayrollMailDraft)(producer, mixCount, periodLabel, categoryLabel);
        const excelAttachment = (0, producer_payroll_mail_1.generatePayrollExcelAttachment)(rows);
        await (0, gmail_1.sendGmailEmail)({
            to_email: draft.to,
            subject: draft.subject,
            body: (0, producer_payroll_mail_1.renderPayrollMailPlainText)(draft, rows),
            html_body: (0, producer_payroll_mail_1.renderPayrollMailHtml)(draft, rows),
            attachments: [
                {
                    filename: draft.attachmentFilename,
                    content_base64: (0, producer_payroll_mail_1.stringToBase64)(excelAttachment),
                    mime_type: "application/vnd.ms-excel",
                },
            ],
        }, token);
    }, [
        producers,
        mixCountByProducer,
        payrollRecords,
        allOrders,
        filterPeriod,
        periodLabel,
        categoryLabel,
        token,
    ]);
    const handleSendTargets = (0, react_1.useCallback)(async (targets) => {
        if (!canSend || targets.length === 0)
            return;
        setIsSending(true);
        setSendError(null);
        setFeedback(null);
        const sentNames = [];
        const failed = [];
        for (const targetName of targets) {
            try {
                await sendStatementToProducer(targetName);
                sentNames.push(targetName);
            }
            catch (err) {
                const message = err instanceof client_1.ApiClientError
                    ? err.message
                    : err instanceof Error
                        ? err.message
                        : "Email could not be sent.";
                failed.push(`${targetName}: ${message}`);
            }
        }
        if (failed.length === 0) {
            const summary = sentNames.length === 1
                ? `Statement sent to ${sentNames[0]}.`
                : `Statements sent to ${sentNames.length} editors separately.`;
            setSent(true);
            setSentSummary(summary);
        }
        else if (sentNames.length === 0) {
            setSendError(failed.join(" "));
        }
        else {
            setSendError(`Sent ${sentNames.length} of ${targets.length}. ${failed.join(" ")}`);
            setSentSummary(`Sent ${sentNames.length} of ${targets.length} statements.`);
        }
        setIsSending(false);
    }, [canSend, sendStatementToProducer]);
    const openSendModal = (0, react_1.useCallback)(() => {
        setFeedback(null);
        if (missingEmailNames.length > 0) {
            setFeedback({
                type: "error",
                message: `Missing email for: ${missingEmailNames.join(", ")}.`,
            });
            return;
        }
        setSendError(null);
        setSent(false);
        setSentSummary(null);
        setMailModalOpen(true);
    }, [missingEmailNames]);
    const closeSendModal = (0, react_1.useCallback)(() => {
        if (isSending)
            return;
        setMailModalOpen(false);
        setSendError(null);
        setSent(false);
        setSentSummary(null);
        setFeedback(null);
    }, [isSending]);
    const handleConfirmSend = (0, react_1.useCallback)(() => {
        void handleSendTargets(targetProducerNames);
    }, [handleSendTargets, targetProducerNames]);
    const sendDisabledReason = isViewOnly
        ? "View-only users cannot send email"
        : !gmailConnected
            ? "Connect Gmail in Settings first"
            : missingEmailNames.length > 0
                ? `Missing email for: ${missingEmailNames.join(", ")}`
                : undefined;
    const downloadLabel = viewingAll ? "Download all" : "Download";
    const sendLabel = viewingAll ? "Send all" : "Send";
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-1 flex-col overflow-hidden", children: [canExport ? ((0, jsx_runtime_1.jsxs)("div", { className: "mb-4 shrink-0 space-y-3 border-b border-brand-line/60 pb-4", children: [(0, jsx_runtime_1.jsxs)("h2", { className: "text-[14px] font-semibold tracking-[-0.01em] text-brand-ink", children: ["Statements for ", statementCount, " editor", statementCount === 1 ? "" : "s"] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [(0, jsx_runtime_1.jsxs)("p", { className: "min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary", children: [(0, jsx_runtime_1.jsx)("span", { className: "font-semibold tabular-nums text-brand-orange", children: statementCount }), " ", "of", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold tabular-nums text-brand-ink", children: categoryEditorCount }), " ", categoryLabel, " producers have statements in ", periodLabel, ".", !viewingAll && activeProducerName ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [" ", "Viewing", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: activeProducerName }), "."] })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 flex-wrap items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownload, className: "inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-white px-3.5 text-[12px] font-semibold text-brand-ink transition hover:border-brand-orange/35 hover:text-brand-orange active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-3.5 w-3.5 text-brand-orange", strokeWidth: 2 }), downloadLabel, (0, jsx_runtime_1.jsxs)("span", { className: "tabular-nums text-brand-ink-tertiary", children: ["(", targetCount, ")"] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: openSendModal, disabled: isViewOnly || !gmailConnected || isSending || targetCount === 0, title: sendDisabledReason, className: (0, clsx_1.default)("inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold transition active:scale-[0.98]", canSend
                                                    ? "bg-brand-signature text-white hover:bg-brand-signature/90"
                                                    : "cursor-not-allowed bg-brand-signature/45 text-white/90"), children: [isSending ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-3.5 w-3.5 animate-spin", strokeWidth: 2 })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-3.5 w-3.5", strokeWidth: 2 })), sendLabel, (0, jsx_runtime_1.jsxs)("span", { className: (0, clsx_1.default)("tabular-nums", canSend ? "text-white/80" : "text-white/60"), children: ["(", targetCount, ")"] })] })] })] }), !loadingGmail && !gmailConnected ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2 text-[11px] leading-relaxed text-brand-ink-secondary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Connect Gmail in", " ", (0, jsx_runtime_1.jsx)(link_1.default, { href: "/settings", className: "font-semibold text-brand-signature hover:underline", children: "Settings" }), " ", "to send statements directly."] })] })) : null, feedback ? ((0, jsx_runtime_1.jsx)("p", { className: (0, clsx_1.default)("text-[11px] leading-relaxed", feedback.type === "success" && "text-brand-success", feedback.type === "warning" && "text-brand-warning", feedback.type === "error" && "text-brand-danger"), children: feedback.message })) : null] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 flex-1 overflow-y-auto", children: canExport ? ((0, jsx_runtime_1.jsx)(ProducerStatementPreview_1.ProducerStatementPreview, { embedded: true, sendLayout: sendLayout, selectedProducer: viewingAll ? "all" : selectedSendEditor, onProducerChange: () => { }, selectedPeriod: payPeriodFilter, onPeriodChange: () => { }, allowedProducerNames: targetProducerNames, payrollRecords: payrollRecords, allOrders: allOrders, producers: producers, payrollAddons: payrollAddons })) : ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning", children: (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-3.5 w-3.5", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: "No statements to send" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[12px] leading-relaxed text-brand-ink-secondary", children: ["No completed mixes match ", categoryLabel, " in ", periodLabel, ". Adjust the filters above."] })] })] })) })] }), (0, jsx_runtime_1.jsx)(PayrollSendMailModal_1.PayrollSendMailModal, { open: mailModalOpen, onClose: closeSendModal, items: previewItems, gmailFrom: gmailFrom, canSend: canSend && missingEmailNames.length === 0, isSending: isSending, onSend: handleConfirmSend, sendError: sendError, sent: sent, sentSummary: sentSummary })] }));
}
