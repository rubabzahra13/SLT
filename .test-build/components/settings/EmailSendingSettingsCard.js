"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSendingSettingsCard = EmailSendingSettingsCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const AuthContext_1 = require("@/context/AuthContext");
const gmail_1 = require("@/lib/api/gmail");
function EmailSendingSettingsCard() {
    const { isViewOnly, token } = (0, AuthContext_1.useAuth)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [status, setStatus] = (0, react_1.useState)({
        connected: false,
        email: null,
        provider: "google",
    });
    const [loadingStatus, setLoadingStatus] = (0, react_1.useState)(true);
    const [isConnecting, setIsConnecting] = (0, react_1.useState)(false);
    const [isSendingTest, setIsSendingTest] = (0, react_1.useState)(false);
    const [isDisconnecting, setIsDisconnecting] = (0, react_1.useState)(false);
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const fetchStatus = async () => {
        try {
            setLoadingStatus(true);
            const res = await (0, gmail_1.getGmailStatus)(token);
            setStatus(res);
        }
        catch {
            setStatus({ connected: false, email: null, provider: "google" });
        }
        finally {
            setLoadingStatus(false);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchStatus();
        const gmailSuccess = searchParams.get("gmail_success");
        const gmailError = searchParams.get("gmail_error");
        if (gmailSuccess === "true") {
            setFeedback({
                type: "success",
                message: "Google account connected successfully for email sending.",
            });
        }
        else if (gmailError) {
            if (gmailError === "cancelled") {
                setFeedback({
                    type: "error",
                    message: "Google account connection was cancelled.",
                });
            }
            else {
                setFeedback({
                    type: "error",
                    message: "Unable to connect the Google account. Please try again.",
                });
            }
        }
    }, [searchParams, token]);
    const handleConnectGoogle = async () => {
        if (isViewOnly)
            return;
        try {
            setIsConnecting(true);
            setFeedback(null);
            const { url } = await (0, gmail_1.getGmailConnectUrl)(token);
            if (url) {
                window.location.href = url;
            }
        }
        catch (err) {
            setFeedback({
                type: "error",
                message: err instanceof Error ? err.message : "Unable to initiate Google connection. Please try again.",
            });
            setIsConnecting(false);
        }
    };
    const handleSendTestEmail = async () => {
        if (isViewOnly || !status.connected)
            return;
        try {
            setIsSendingTest(true);
            setFeedback(null);
            const res = await (0, gmail_1.sendGmailTestEmail)(token);
            setFeedback({
                type: "success",
                message: res.message || "Test email sent successfully to connected account.",
            });
        }
        catch (err) {
            setFeedback({
                type: "error",
                message: err instanceof Error ? err.message : "Test email could not be sent. Please check connection.",
            });
        }
        finally {
            setIsSendingTest(false);
        }
    };
    const handleDisconnect = async () => {
        if (isViewOnly || !status.connected)
            return;
        try {
            setIsDisconnecting(true);
            setFeedback(null);
            await (0, gmail_1.disconnectGmail)(token);
            setStatus({ connected: false, email: null, provider: "google" });
            setFeedback({
                type: "success",
                message: "Google account disconnected successfully.",
            });
        }
        catch (err) {
            setFeedback({
                type: "error",
                message: err instanceof Error ? err.message : "Failed to disconnect Google account.",
            });
        }
        finally {
            setIsDisconnecting(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "dashboard-panel flex flex-col", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex shrink-0 items-center justify-between border-b border-brand-line/30 px-4 py-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg-subtle/80 ring-1 ring-inset ring-brand-line/40", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-3.5 w-3.5 text-brand-ink-tertiary", strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary", children: "Email Sending" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 truncate text-[11px] font-medium text-brand-ink-tertiary", children: "Google Gmail account connection and email delivery pipeline" })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 space-y-3", children: [feedback && ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-start gap-2.5 rounded-xl p-3 text-[12px] font-medium ${feedback.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"}`, children: [feedback.type === "success" ? ((0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-4 w-4 shrink-0 text-emerald-600 mt-0.5" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-4 w-4 shrink-0 text-amber-600 mt-0.5" })), (0, jsx_runtime_1.jsx)("span", { className: "flex-1", children: feedback.message })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-brand-line/60 bg-brand-surface p-4 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3.5", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-5 w-5" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[14px] font-bold text-brand-ink", children: "Google Account" }), loadingStatus ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-md bg-brand-bg px-2 py-0.5 text-[11px] font-semibold text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-3 w-3 animate-spin" }), "Checking..."] })) : status.connected ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-3 w-3 text-emerald-600" }), "Connected"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20", children: "Not Connected" }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary mt-0.5", children: loadingStatus
                                                    ? "Verifying active Gmail connection..."
                                                    : status.connected
                                                        ? status.email
                                                        : "No Google account connected for sending CRM emails" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center gap-2", children: status.connected ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: isViewOnly || isSendingTest, onClick: handleSendTestEmail, title: isViewOnly ? "View Only users cannot send emails" : "Send test email to connected account", className: "inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg disabled:opacity-50 disabled:cursor-not-allowed", children: [isSendingTest ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-3.5 w-3.5 animate-spin text-brand-orange" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-3.5 w-3.5 text-brand-orange" })), (0, jsx_runtime_1.jsx)("span", { children: isSendingTest ? "Sending..." : "Send Test Email" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: isViewOnly || isDisconnecting, onClick: handleDisconnect, title: isViewOnly ? "View Only users cannot disconnect email account" : "Disconnect Google account", className: "inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed", children: [isDisconnecting ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-3.5 w-3.5 animate-spin" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.LogOut, { className: "h-3.5 w-3.5" })), (0, jsx_runtime_1.jsx)("span", { children: "Disconnect" })] })] })) : ((0, jsx_runtime_1.jsxs)("button", { type: "button", disabled: isViewOnly || isConnecting, onClick: handleConnectGoogle, title: isViewOnly ? "View Only users cannot connect Google account" : "Connect Google account via OAuth", className: "inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed", children: [isConnecting ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-3.5 w-3.5 animate-spin" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "h-3.5 w-3.5" })), (0, jsx_runtime_1.jsx)("span", { children: "Connect Google Account" })] })) })] }), isViewOnly && ((0, jsx_runtime_1.jsx)("p", { className: "text-[11px] font-medium text-brand-ink-tertiary italic", children: "Note: View Only accounts cannot modify email connections or send test emails." }))] })] }));
}
