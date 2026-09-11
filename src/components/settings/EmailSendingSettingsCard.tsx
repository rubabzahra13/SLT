"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, LogOut, Mail, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getGmailStatus,
  getGmailConnectUrl,
  disconnectGmail,
  sendGmailTestEmail,
  type GmailStatusResponse,
} from "@/lib/api/gmail";

export function EmailSendingSettingsCard() {
  const { isViewOnly, token } = useAuth();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<GmailStatusResponse>({
    connected: false,
    email: null,
    provider: "google",
  });

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await getGmailStatus(token);
      setStatus(res);
    } catch {
      setStatus({ connected: false, email: null, provider: "google" });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const gmailSuccess = searchParams.get("gmail_success");
    const gmailError = searchParams.get("gmail_error");

    if (gmailSuccess === "true") {
      setFeedback({
        type: "success",
        message: "Google account connected successfully for email sending.",
      });
    } else if (gmailError) {
      if (gmailError === "cancelled") {
        setFeedback({
          type: "error",
          message: "Google account connection was cancelled.",
        });
      } else {
        setFeedback({
          type: "error",
          message: "Unable to connect the Google account. Please try again.",
        });
      }
    }
  }, [searchParams, token]);

  const handleConnectGoogle = async () => {
    if (isViewOnly) return;
    try {
      setIsConnecting(true);
      setFeedback(null);
      const { url } = await getGmailConnectUrl(token);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to initiate Google connection. Please try again.",
      });
      setIsConnecting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (isViewOnly || !status.connected) return;
    try {
      setIsSendingTest(true);
      setFeedback(null);
      const res = await sendGmailTestEmail(token);
      setFeedback({
        type: "success",
        message: res.message || "Test email sent successfully to connected account.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Test email could not be sent. Please check connection.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDisconnect = async () => {
    if (isViewOnly || !status.connected) return;
    try {
      setIsDisconnecting(true);
      setFeedback(null);
      await disconnectGmail(token);
      setStatus({ connected: false, email: null, provider: "google" });
      setFeedback({
        type: "success",
        message: "Google account disconnected successfully.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to disconnect Google account.",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <section className="dashboard-panel flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-brand-line/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg-subtle/80 ring-1 ring-inset ring-brand-line/40">
            <Mail className="h-3.5 w-3.5 text-brand-ink-tertiary" strokeWidth={2} />
          </div>
          <div>
            <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
              Email Sending
            </h2>
            <p className="mt-0.5 truncate text-[11px] font-medium text-brand-ink-tertiary">
              Google Gmail account connection and email delivery pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {feedback && (
          <div
            className={`flex items-start gap-2.5 rounded-xl p-3 text-[12px] font-medium ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            )}
            <span className="flex-1">{feedback.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-brand-line/60 bg-brand-surface p-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-brand-ink">Google Account</span>
                {loadingStatus ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-bg px-2 py-0.5 text-[11px] font-semibold text-brand-ink-tertiary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </span>
                ) : status.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-[12px] text-brand-ink-secondary mt-0.5">
                {loadingStatus
                  ? "Verifying active Gmail connection..."
                  : status.connected
                  ? status.email
                  : "No Google account connected for sending CRM emails"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status.connected ? (
              <>
                <button
                  type="button"
                  disabled={isViewOnly || isSendingTest}
                  onClick={handleSendTestEmail}
                  title={isViewOnly ? "View Only users cannot send emails" : "Send test email to connected account"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-brand-orange" />
                  )}
                  <span>{isSendingTest ? "Sending..." : "Send Test Email"}</span>
                </button>

                <button
                  type="button"
                  disabled={isViewOnly || isDisconnecting}
                  onClick={handleDisconnect}
                  title={isViewOnly ? "View Only users cannot disconnect email account" : "Disconnect Google account"}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isViewOnly || isConnecting}
                onClick={handleConnectGoogle}
                title={isViewOnly ? "View Only users cannot connect Google account" : "Connect Google account via OAuth"}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                <span>Connect Google Account</span>
              </button>
            )}
          </div>
        </div>

        {isViewOnly && (
          <p className="text-[11px] font-medium text-brand-ink-tertiary italic">
            Note: View Only accounts cannot modify email connections or send test emails.
          </p>
        )}
      </div>
    </section>
  );
}
