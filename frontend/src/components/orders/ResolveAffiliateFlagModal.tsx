"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  Flag,
  Loader2,
  Mail,
  Send,
  X,
} from "lucide-react";
import clsx from "clsx";
import { SoftSelect } from "@/components/ui/SoftSelect";
import { useAuth } from "@/context/AuthContext";
import { useAppState } from "@/context/AppStateContext";
import { getGmailStatus, sendGmailEmail } from "@/lib/api/gmail";
import { ApiClientError } from "@/lib/api/client";
import { titleCase } from "@/lib/data";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  getAffiliateSelections,
  resolveAffiliateFlagPatch,
} from "@/lib/affiliate-flag";
import {
  buildCustomerAffiliateClarificationDraft,
  renderForwardMailHtml,
  renderForwardMailPlainText,
  resolveCustomerMailContacts,
} from "@/lib/forward-order-mail";
import { DEFAULT_EMAIL_TEMPLATES } from "@/lib/email-templates";
import type { MTDRecord, Order } from "@/types";

type ResolveAffiliateFlagModalProps = {
  open: boolean;
  record: MTDRecord | null;
  allOrders: Order[];
  mode: "resolve" | "email";
  onClose: () => void;
};

export function ResolveAffiliateFlagModal({
  open,
  record,
  allOrders,
  mode,
  onClose,
}: ResolveAffiliateFlagModalProps) {
  const { token, isViewOnly } = useAuth();
  const { emailTemplates, updateOrder, addNotification } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState("");
  const [selectOpen, setSelectOpen] = useState(false);
  const [customerContactId, setCustomerContactId] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailFrom, setGmailFrom] = useState<string | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : null),
    [record, allOrders]
  );

  const selections = useMemo(
    () => getAffiliateSelections(linkedOrder, record),
    [linkedOrder, record]
  );

  const customerContacts = useMemo(
    () => (record ? resolveCustomerMailContacts(record, linkedOrder) : []),
    [record, linkedOrder]
  );

  const affiliateOptions = useMemo(
    () =>
      selections.map((label) => ({
        value: label,
        label,
      })),
    [selections]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !record) return;
    setSelectedAffiliate(selections[0] || "");
    setCustomerContactId(customerContacts[0]?.id ?? "");
    setSelectOpen(false);
    setSendError(null);
    setSent(false);
    setIsSending(false);
    setIsSaving(false);
  }, [open, record, selections, customerContacts]);

  useEffect(() => {
    if (!open || mode !== "email" || !token) return;
    let cancelled = false;
    setLoadingGmail(true);
    getGmailStatus(token)
      .then((res) => {
        if (cancelled) return;
        setGmailConnected(res.connected);
        setGmailFrom(res.email);
      })
      .catch(() => {
        if (!cancelled) {
          setGmailConnected(false);
          setGmailFrom(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGmail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode, token]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const customerContact = customerContacts.find(
    (c) => c.id === customerContactId
  );

  const template =
    emailTemplates.customer_affiliate_clarification ??
    DEFAULT_EMAIL_TEMPLATES.customer_affiliate_clarification;

  const draft =
    record && mode === "email"
      ? buildCustomerAffiliateClarificationDraft(
          record,
          customerContact,
          selectedAffiliate,
          selections,
          template
        )
      : null;

  async function handleResolve() {
    if (!linkedOrder || !selectedAffiliate.trim() || isViewOnly) return;
    setIsSaving(true);
    setSendError(null);
    try {
      const patch = resolveAffiliateFlagPatch(linkedOrder, selectedAffiliate);
      await updateOrder(linkedOrder.id, patch, linkedOrder);
      addNotification({
        type: "mtd_move",
        title: "Affiliate resolved",
        message: `${titleCase(linkedOrder.programName)} → ${selectedAffiliate}. Move to Orders when ready.`,
      });
      onClose();
    } catch (err) {
      setSendError(
        err instanceof ApiClientError
          ? err.message
          : "Could not save affiliate choice."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendEmail() {
    if (!draft || !record || !selectedAffiliate.trim() || isViewOnly) return;
    if (!draft.to || !gmailConnected) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendGmailEmail(
        {
          to_email: draft.to,
          subject: draft.subject,
          body: renderForwardMailPlainText(draft),
          html_body: renderForwardMailHtml(draft),
        },
        token
      );
      setSent(true);
      addNotification({
        type: "schedule",
        title: "Affiliate email sent",
        message: draft.toName
          ? `Sent to ${draft.toName} (${draft.to}).`
          : `Sent to ${draft.to}.`,
      });
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

  if (!mounted || !open || !record) return null;

  const isEmail = mode === "email";
  const canResolve =
    Boolean(selectedAffiliate.trim()) &&
    Boolean(linkedOrder) &&
    !isViewOnly &&
    !isSaving;
  const canSend =
    Boolean(draft?.to) &&
    Boolean(selectedAffiliate.trim()) &&
    gmailConnected &&
    !isViewOnly &&
    !sent &&
    !isSending;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="affiliate-flag-modal-title"
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-rose-500/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-600 ring-1 ring-inset ring-rose-500/20">
                {isEmail ? (
                  <Mail className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <Flag className="h-5 w-5" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {isEmail ? "Affiliate clarification" : "Flagged affiliate"}
                </p>
                <h2
                  id="affiliate-flag-modal-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  {isEmail
                    ? sent
                      ? "Email sent"
                      : "Email customer"
                    : "Choose one music affiliate"}
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <p className="text-[12px] font-medium text-brand-ink-secondary">
              Selected on form ({selections.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {selections.map((label) => (
                <li
                  key={label}
                  className="rounded-lg bg-brand-bg px-3 py-2 text-[13px] text-brand-ink ring-1 ring-inset ring-brand-line/40"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-brand-ink-secondary">
              {isEmail
                ? "Affiliate to suggest in email"
                : "Resolve with this affiliate"}
            </label>
            <SoftSelect
              aria-label="Music affiliate"
              value={selectedAffiliate}
              options={affiliateOptions}
              onChange={setSelectedAffiliate}
              open={selectOpen}
              onOpenChange={setSelectOpen}
              size="md"
              placeholder="Select affiliate"
            />
          </div>

          {isEmail ? (
            <>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-brand-ink-secondary">
                  Send to customer
                </label>
                {customerContacts.length === 0 ? (
                  <p className="text-[13px] text-rose-600">
                    No customer email on this order.
                  </p>
                ) : (
                  <select
                    value={customerContactId}
                    onChange={(e) => setCustomerContactId(e.target.value)}
                    className="w-full rounded-xl border border-brand-line/60 bg-white px-3 py-2.5 text-[13px] text-brand-ink"
                  >
                    {customerContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {draft ? (
                <div className="rounded-xl border border-brand-line/45 bg-white p-4 text-[13px] leading-relaxed text-brand-ink-secondary">
                  <p className="font-semibold text-brand-ink">{draft.subject}</p>
                  <p className="mt-3 whitespace-pre-wrap">
                    {[draft.greeting, draft.intro, draft.footer, draft.signature]
                      .filter(Boolean)
                      .join("\n\n")}
                  </p>
                </div>
              ) : null}

              {loadingGmail ? (
                <p className="text-[12px] text-brand-ink-tertiary">
                  Checking Gmail…
                </p>
              ) : !gmailConnected ? (
                <p className="flex items-start gap-2 text-[12px] text-rose-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Connect Gmail in Settings to send this email
                  {gmailFrom ? ` (last: ${gmailFrom})` : ""}.
                </p>
              ) : (
                <p className="text-[12px] text-brand-ink-tertiary">
                  Sending from {gmailFrom || "connected Gmail"}
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-brand-ink-tertiary">
              After you resolve, use <span className="font-medium text-brand-ink-secondary">Move to Orders</span> on
              this row to put it on the normal Orders board.
            </p>
          )}

          {sendError ? (
            <p className="flex items-start gap-2 text-[12px] text-rose-600">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {sendError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-line/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3.5 py-2 text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
          >
            {sent ? "Close" : "Cancel"}
          </button>
          {isEmail ? (
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void handleSendEmail()}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition",
                canSend
                  ? "bg-brand-signature text-white hover:opacity-95"
                  : "cursor-not-allowed bg-brand-bg text-brand-ink-tertiary"
              )}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : sent ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sent ? "Sent" : "Send email"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canResolve}
              onClick={() => void handleResolve()}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition",
                canResolve
                  ? "bg-brand-signature text-white hover:opacity-95"
                  : "cursor-not-allowed bg-brand-bg text-brand-ink-tertiary"
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Resolve affiliate
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
