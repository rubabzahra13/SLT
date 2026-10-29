"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  LogOut,
  Mail,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAppState } from "@/context/AppStateContext";
import { ApiClientError, formatApiClientError } from "@/lib/api/client";
import {
  getGmailStatus,
  getGmailConnectUrl,
  disconnectGmail,
  sendGmailTestEmail,
  type GmailStatusResponse,
} from "@/lib/api/gmail";

const GMAIL_STATUS_STORAGE_KEY = "slt_gmail_status_v2";
/** Skip a visible re-check when we already know the answer recently. */
const CACHE_FRESH_MS = 30 * 60 * 1000;

type CachedGmailStatus = {
  connected: boolean;
  email: string | null;
  checkedAt: number;
};

type ConnectionPhase = "loading" | "verified" | "unavailable";

function readCachedStatus(): CachedGmailStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GMAIL_STATUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGmailStatus;
    if (typeof parsed?.connected !== "boolean") return null;
    return {
      connected: parsed.connected,
      email: typeof parsed.email === "string" ? parsed.email : null,
      checkedAt: typeof parsed.checkedAt === "number" ? parsed.checkedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeCachedStatus(res: GmailStatusResponse) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedGmailStatus = {
      connected: res.connected,
      email: res.email,
      checkedAt: Date.now(),
    };
    window.localStorage.setItem(GMAIL_STATUS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

function isCacheFresh(cache: CachedGmailStatus | null): boolean {
  if (!cache || !cache.checkedAt) return false;
  return Date.now() - cache.checkedAt < CACHE_FRESH_MS;
}

/** Calm copy: never surface raw HTTP codes like “500 Internal Server Error”. */
function friendlyGmailError(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    if (err.status === 0) {
      return formatApiClientError(err, fallback);
    }
    if (err.status >= 500 || err.status === 503) {
      return "We couldn’t reach Google email right now. Try again in a moment.";
    }
    if (err.status === 401 || err.status === 403) {
      return "Sign in again to manage your Google email connection.";
    }
  }
  const raw = formatApiClientError(err, fallback);
  if (/500|503|internal server|api request failed|timed out|unavailable/i.test(raw)) {
    return "We couldn’t reach Google email right now. Try again in a moment.";
  }
  return raw || fallback;
}

export function EmailSendingSettingsCard() {
  const { isViewOnly, token } = useAuth();
  const { addNotification, addAlert } = useAppState();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const oauthHandledRef = useRef(false);
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;

  const initialCache = readCachedStatus();
  const [status, setStatus] = useState<GmailStatusResponse>({
    connected: initialCache?.connected ?? false,
    email: initialCache?.email ?? null,
    provider: "google",
  });
  // Trust last-known UI immediately: like Google/Instagram account pages.
  const [phase, setPhase] = useState<ConnectionPhase>(
    initialCache ? "verified" : "loading"
  );
  const [loadingStatus, setLoadingStatus] = useState(!initialCache);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const applyStatus = useCallback(
    (
      res: GmailStatusResponse,
      opts?: { forceNotify?: "connected" | "disconnected" }
    ) => {
      const prev = readCachedStatus();
      setStatus(res);
      setPhase("verified");
      writeCachedStatus(res);

      const transitioned: "connected" | "disconnected" | null =
        opts?.forceNotify ??
        (prev !== null && prev.connected !== res.connected
          ? res.connected
            ? "connected"
            : "disconnected"
          : null);

      if (transitioned === "connected") {
        addNotificationRef.current({
          type: "gmail_connected",
          title: "Google account connected",
          message: res.email
            ? `Gmail ready to send from ${res.email}.`
            : "Gmail is connected for CRM email sending.",
          href: "/settings",
          ...(opts?.forceNotify
            ? {}
            : { dedupeKey: `gmail_connected:${res.email || "ok"}` }),
        });
      } else if (transitioned === "disconnected") {
        addNotificationRef.current({
          type: "gmail_disconnected",
          title: "Google account disconnected",
          message: "CRM emails cannot send until Gmail is connected again.",
          href: "/settings",
          ...(opts?.forceNotify ? {} : { dedupeKey: "gmail_disconnected" }),
        });
      }
    },
    []
  );

  const clearOauthParams = useCallback(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("gmail_success") && !params.has("gmail_error")) return;
    params.delete("gmail_success");
    params.delete("gmail_error");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const fetchStatus = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) {
        setLoadingStatus(true);
        setPhase("loading");
        setFeedback(null);
      }
      try {
        const res = await getGmailStatus(token);
        applyStatus(res);
        if (!silent) setFeedback(null);
      } catch (err) {
        if (silent && readCachedStatus()) {
          // Quiet background refresh failed: keep showing last-known, no banner.
          return;
        }
        setPhase("unavailable");
        setFeedback({
          type: "error",
          message: friendlyGmailError(
            err,
            "We couldn’t check your Google connection. Try again."
          ),
        });
      } finally {
        setLoadingStatus(false);
      }
    },
    [token, applyStatus]
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const gmailSuccess = searchParams.get("gmail_success");
      const gmailError = searchParams.get("gmail_error");

      if (gmailSuccess === "true" && !oauthHandledRef.current) {
        oauthHandledRef.current = true;
        setFeedback({
          type: "success",
          message: "Google account connected for email sending.",
        });
        setLoadingStatus(true);
        setPhase("loading");
        try {
          const res = await getGmailStatus(token);
          if (!cancelled) {
            applyStatus(res, { forceNotify: "connected" });
          }
        } catch {
          if (!cancelled) {
            setPhase("unavailable");
            writeCachedStatus({
              connected: true,
              email: null,
              provider: "google",
            });
            setStatus({
              connected: true,
              email: null,
              provider: "google",
            });
            addNotificationRef.current({
              type: "gmail_connected",
              title: "Google account connected",
              message: "Gmail is connected for CRM email sending.",
              href: "/settings",
            });
          }
        } finally {
          if (!cancelled) {
            setLoadingStatus(false);
            clearOauthParams();
          }
        }
        return;
      }

      if (gmailError && !oauthHandledRef.current) {
        oauthHandledRef.current = true;
        setFeedback({
          type: "error",
          message:
            gmailError === "cancelled"
              ? "Google connection was cancelled."
              : "We couldn’t connect Google. Please try again.",
        });
        clearOauthParams();
      }

      if (cancelled) return;

      const cache = readCachedStatus();
      if (isCacheFresh(cache)) {
        // Already know: no Checking spinner, no network probe on every open.
        setStatus({
          connected: cache!.connected,
          email: cache!.email,
          provider: "google",
        });
        setPhase("verified");
        setLoadingStatus(false);
        return;
      }

      if (cache) {
        // Stale cache: show it instantly, refresh quietly in the background.
        setStatus({
          connected: cache.connected,
          email: cache.email,
          provider: "google",
        });
        setPhase("verified");
        setLoadingStatus(false);
        await fetchStatus({ silent: true });
        return;
      }

      // First visit: one visible check.
      await fetchStatus({ silent: false });
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // Intentionally token-only: avoid refetch loops from unstable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        message: friendlyGmailError(
          err,
          "We couldn’t start Google sign-in. Please try again."
        ),
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
        message: res.message || "Test email sent to your connected account.",
      });
      addAlert({
        tone: "success",
        title: "Test email sent",
        message: res.message || "Sent to the connected Gmail account.",
      });
    } catch (err) {
      const message = friendlyGmailError(
        err,
        "Test email couldn’t be sent. Check the connection and try again."
      );
      setFeedback({ type: "error", message });
      addAlert({
        tone: "error",
        title: "Test email failed",
        message,
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
      applyStatus(
        { connected: false, email: null, provider: "google" },
        { forceNotify: "disconnected" }
      );
      setFeedback({
        type: "success",
        message: "Google account disconnected.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: friendlyGmailError(
          err,
          "Couldn’t disconnect Google. Please try again."
        ),
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const showChecking = phase === "loading";
  const showAsConnected = status.connected;
  const showAsDisconnected = phase === "verified" && !status.connected;

  return (
    <section className="dashboard-panel flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-brand-line/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
            <Mail className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink">
              Email Sending
            </h2>
            <p className="mt-0.5 truncate text-[11px] font-medium text-brand-ink-secondary">
              Google Gmail account connection and email delivery pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {feedback ? (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-[12px] font-medium ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            )}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="flex-1">{feedback.message}</span>
              {feedback.type === "error" ? (
                <button
                  type="button"
                  onClick={() => void fetchStatus({ silent: false })}
                  disabled={loadingStatus}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-amber-900 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loadingStatus ? "animate-spin" : ""}`}
                  />
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col justify-between gap-3 rounded-xl border border-brand-line/60 bg-brand-surface p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange ring-1 ring-inset ring-brand-orange/20">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-brand-ink">
                  Google Account
                </span>
                {showChecking ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-bg px-2 py-0.5 text-[11px] font-semibold text-brand-ink-tertiary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking…
                  </span>
                ) : phase === "unavailable" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-bg px-2 py-0.5 text-[11px] font-semibold text-brand-ink-tertiary ring-1 ring-inset ring-brand-line/60">
                    Can’t verify
                  </span>
                ) : showAsConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Not connected
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                {showChecking
                  ? "Checking your connection…"
                  : phase === "unavailable"
                    ? showAsConnected
                      ? "Last known: connected: status check failed"
                      : "Status check failed: try again"
                    : showAsConnected
                      ? status.email || "Connected"
                      : "Connect Google to send CRM emails"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!showChecking && showAsConnected && phase !== "unavailable" ? (
              <>
                <button
                  type="button"
                  disabled={isViewOnly || isSendingTest}
                  onClick={() => void handleSendTestEmail()}
                  title={
                    isViewOnly
                      ? "View Only users cannot send emails"
                      : "Send test email to connected account"
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-brand-elevated px-3 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-brand-orange" />
                  )}
                  <span>{isSendingTest ? "Sending…" : "Send Test Email"}</span>
                </button>

                <button
                  type="button"
                  disabled={isViewOnly || isDisconnecting}
                  onClick={() => void handleDisconnect()}
                  title={
                    isViewOnly
                      ? "View Only users cannot disconnect email account"
                      : "Disconnect Google account"
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[12px] font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>Disconnect</span>
                </button>
              </>
            ) : !showChecking && (showAsDisconnected || phase === "unavailable") ? (
              <button
                type="button"
                disabled={isViewOnly || isConnecting}
                onClick={() => void handleConnectGoogle()}
                title={
                  isViewOnly
                    ? "View Only users cannot connect Google account"
                    : "Connect Google account via OAuth"
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-cta px-3.5 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="h-3.5 w-3.5" />
                )}
                <span>
                  {phase === "unavailable" && showAsConnected
                    ? "Reconnect Google"
                    : "Connect Google Account"}
                </span>
              </button>
            ) : null}
          </div>
        </div>

        {isViewOnly ? (
          <p className="text-[11px] font-medium italic text-brand-ink-tertiary">
            View Only accounts can’t change email connections or send test
            emails.
          </p>
        ) : null}
      </div>
    </section>
  );
}
