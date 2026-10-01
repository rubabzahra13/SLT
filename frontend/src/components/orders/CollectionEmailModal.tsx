"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Mail,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import clsx from "clsx";
import { titleCase } from "@/lib/data";
import {
  buildCollectionEmailDraft,
  buildCollectionEmailClipboardText,
  resolveCoachEmail,
  type CollectionEmailDraft,
} from "@/lib/collection-email";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { getGmailStatus, sendGmailEmail } from "@/lib/api/gmail";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import type { MTDRecord, Order } from "@/types";

type CollectionEmailModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  orderById: Map<string, Order>;
  onClose: () => void;
};

const PDF_ASSET_PATH = "/assets/slt-eight-count-sheet.pdf";
const PDF_FILENAME = "SLT Eight-Count Sheet.pdf";

/**
 * Fetch the 8-count-sheet PDF from the public assets folder and return it as base64.
 */
async function fetchPdfBase64(): Promise<string> {
  const response = await fetch(PDF_ASSET_PATH);
  if (!response.ok) {
    throw new Error(`Could not load PDF asset (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Email Preview Component
// ---------------------------------------------------------------------------

function CollectionEmailPreview({
  draft,
  needs8CountPdf,
}: {
  draft: CollectionEmailDraft;
  needs8CountPdf: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line/70 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/15">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-signature to-brand-blue px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
          Sounds Like That
        </p>
        <h3 className="mt-1 text-[17px] font-bold tracking-[-0.02em] text-white">
          Action Required
        </h3>
        <p className="mt-1 text-[12px] text-white/90">
          Items needed by {draft.deadlineLabel}
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        {/* To / Subject */}
        <div className="rounded-xl border border-brand-line/50 bg-brand-bg/40 px-3 py-2.5">
          <div className="grid gap-1.5 text-[12px]">
            <div className="flex gap-2">
              <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                To
              </span>
              <span className="min-w-0 text-brand-ink">{draft.to}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                Subject
              </span>
              <span className="min-w-0 font-medium text-brand-ink">
                {draft.subject}
              </span>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <p className="text-[14px] font-semibold text-brand-ink">Hi there!!!</p>

        {/* Intro */}
        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">
          This is your only reminder that your mix is scheduled for production
          next week—yay! 🎉 To ensure we stay on track for your mix&apos;s
          completion, I&apos;ll need the following items submitted by{" "}
          <strong className="text-brand-ink">{draft.deadlineLabel}</strong>.
        </p>

        {/* Missing Items */}
        <div className="overflow-hidden rounded-xl border border-brand-danger/20 bg-brand-danger/5">
          <p className="border-b border-brand-danger/15 bg-brand-danger/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-danger">
            Missing Items
          </p>
          <ul className="divide-y divide-brand-line/40">
            {draft.missingItems.map((item, idx) => {
              const dashIdx = item.indexOf("\u2013");
              const label = dashIdx === -1 ? item.trim() : item.slice(0, dashIdx).trim();
              const desc = dashIdx === -1 ? "" : item.slice(dashIdx + 1).trim();
              return (
                <li key={idx} className="px-3 py-2.5 text-[12px]">
                  <span className="font-bold text-brand-danger">{label}</span>
                  {desc && (
                    <span className="text-brand-ink-secondary"> – {desc}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Attachment indicator */}
        {needs8CountPdf && (
          <div className="flex items-center gap-2 rounded-lg border border-brand-line/60 bg-brand-bg/60 px-3 py-2">
            <Paperclip className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary" />
            <span className="text-[12px] text-brand-ink-secondary">
              <span className="font-semibold text-brand-ink">Attachment:</span>{" "}
              {PDF_FILENAME}
            </span>
          </div>
        )}

        {/* Body continuation */}
        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">
          All items must be submitted by this date to keep your mix on next
          week&apos;s production schedule. If you&apos;re unable to meet the
          deadline or complete the tasks listed, please let me know as soon as
          possible. Our schedule is very tight during the busy season, and
          delays may result in your mix being moved to the end of our calendar.
          If we&apos;re able to shift it back by one week, we&apos;ll certainly
          try—but unfortunately, we can&apos;t guarantee availability.
        </p>

        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">
          Once everything is received, I&apos;ll confirm your invoice and make
          sure the editor has all the necessary details to move forward. Thank
          you so much for choosing us for your music needs—we&apos;re excited to
          work with you! Wishing you a fantastic week ahead!
        </p>

        {/* Signature */}
        <div className="border-t border-brand-line/40 pt-3">
          <p className="whitespace-pre-line text-[12px] leading-relaxed text-brand-ink">
            {`Cheerfully,\nMegan Marlow\nHEAD OF BUSINESS OPERATIONS\nSOUNDS LIKE THAT, INC.\nOffice phone: (909) 736-4848, Mon-Fri 9 am-5 pm EST\nwww.soundslikethat.com`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

export function CollectionEmailModal({
  open,
  record,
  allOrders,
  orderById,
  onClose,
}: CollectionEmailModalProps) {
  const { token, isViewOnly } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailFrom, setGmailFrom] = useState<string | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resolve the linked Order
  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : null),
    [record, allOrders]
  );

  // Resolve coach email
  const coachEmail = useMemo(
    () => (record ? resolveCoachEmail(record, linkedOrder) : null),
    [record, linkedOrder]
  );

  // Build the draft
  const draft = useMemo<CollectionEmailDraft | null>(() => {
    if (!record || !coachEmail) return null;
    try {
      return buildCollectionEmailDraft(record, linkedOrder, coachEmail);
    } catch {
      return null;
    }
  }, [record, linkedOrder, coachEmail]);

  // Reset state when modal opens
  useEffect(() => {
    if (!open || !record) return;
    setCopied(false);
    setSendError(null);
    setSent(false);
    setPdfLoadError(null);
  }, [open, record]);

  // Load Gmail status
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingGmail(true);
    getGmailStatus(token)
      .then((res) => {
        if (cancelled) return;
        setGmailConnected(res.connected);
        setGmailFrom(res.email);
      })
      .catch(() => {
        if (cancelled) return;
        setGmailConnected(false);
        setGmailFrom(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingGmail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  // Prevent body scroll
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const hasCoachEmail = Boolean(coachEmail);
  const missingEmailWarning = !hasCoachEmail;
  const canSend =
    hasCoachEmail &&
    gmailConnected &&
    !isViewOnly &&
    !sent &&
    Boolean(draft);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(
      buildCollectionEmailClipboardText(draft)
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!canSend || !draft) return;
    setIsSending(true);
    setSendError(null);
    setPdfLoadError(null);

    try {
      let attachments:
        | { filename: string; content_base64: string; mime_type: string }[]
        | undefined;

      if (draft.needs8CountPdf) {
        try {
          const base64 = await fetchPdfBase64();
          attachments = [
            {
              filename: PDF_FILENAME,
              content_base64: base64,
              mime_type: "application/pdf",
            },
          ];
        } catch (pdfErr) {
          setPdfLoadError(
            "Could not load the 8-count sheet PDF. Email will be sent without the attachment."
          );
          // Still send — just without attachment
        }
      }

      await sendGmailEmail(
        {
          to_email: draft.to,
          subject: draft.subject,
          body: draft.bodyPlainText,
          html_body: draft.bodyHtml,
          attachments,
        },
        token
      );
      setSent(true);
    } catch (err) {
      setSendError(
        err instanceof ApiClientError
          ? err.message
          : "Email could not be sent. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-email-title"
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        {/* Header */}
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-danger/8 via-brand-elevated to-brand-signature/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-danger/10 text-brand-danger ring-1 ring-inset ring-brand-danger/20">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {sent ? "Email sent" : "Collection email"}
                </p>
                <h2
                  id="collection-email-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  {sent
                    ? "Sent successfully"
                    : "Send Collection Email to Customer"}
                </h2>
                <p className="mt-1 truncate text-[13px] text-brand-ink-secondary">
                  {titleCase(record.programName)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/25">
                <Check className="h-7 w-7" strokeWidth={2} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-brand-ink">
                Collection email sent
              </p>
              <p className="mt-1 text-[13px] text-brand-ink-secondary">
                {draft?.to}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gmail not connected warning */}
              {!loadingGmail && !gmailConnected && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
                  <div className="min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary">
                    Connect Gmail in{" "}
                    <Link
                      href="/settings"
                      className="font-semibold text-brand-signature hover:underline"
                    >
                      Settings
                    </Link>{" "}
                    to send directly. You can still copy the email as a fallback.
                  </div>
                </div>
              )}

              {/* Missing coach email warning */}
              {missingEmailWarning && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-danger/30 bg-brand-danger/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    <span className="font-semibold text-brand-danger">
                      Coach Email is unavailable.
                    </span>{" "}
                    No customer email address was found for this order. Cannot
                    send the collection email.
                  </p>
                </div>
              )}

              {/* Gmail from address */}
              {gmailConnected && gmailFrom && (
                <p className="text-[11px] text-brand-ink-tertiary">
                  Sending from{" "}
                  <span className="font-semibold text-brand-ink-secondary">
                    {gmailFrom}
                  </span>
                </p>
              )}

              {/* PDF load error */}
              {pdfLoadError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    {pdfLoadError}
                  </p>
                </div>
              )}

              {/* Send error */}
              {sendError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-danger/25 bg-brand-danger/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    {sendError}
                  </p>
                </div>
              )}

              {/* 8-count copy note */}
              {draft?.needs8CountPdf && (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-line/60 bg-brand-bg/50 px-3.5 py-3">
                  <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink-tertiary" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    <span className="font-semibold text-brand-ink">
                      {PDF_FILENAME}
                    </span>{" "}
                    will be attached when sending via Gmail. Note: Copy Email
                    only copies the email text — the PDF attachment must be
                    added manually if pasting.
                  </p>
                </div>
              )}

              {/* Email Preview */}
              {draft ? (
                <CollectionEmailPreview
                  draft={draft}
                  needs8CountPdf={draft.needs8CountPdf}
                />
              ) : hasCoachEmail ? (
                <div className="rounded-xl border border-brand-line/60 bg-brand-bg/40 px-4 py-6 text-center text-[13px] text-brand-ink-tertiary">
                  No missing items found for this order.
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex flex-col border-t border-black/[0.08]">
          {sent ? (
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || isSending}
                className="inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSending ? "Sending…" : "Send via Gmail"}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!draft}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-medium transition",
                  draft
                    ? "text-brand-ink hover:bg-brand-bg"
                    : "cursor-not-allowed text-brand-ink-tertiary"
                )}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-brand-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy Email"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 py-3.5 text-[15px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
