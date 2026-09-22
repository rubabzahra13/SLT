"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, ArrowLeft, Check, Loader2, Mail, Paperclip, Send, X } from "lucide-react";
import clsx from "clsx";
import { titleCase } from "@/lib/data";
import {
  buildCustomerMissingDataDraft,
  buildForwardMailDraft,
  buildForwardOrderMailFieldGroups,
  buildMissingDataMailFieldGroups,
  customerMailIncludesEightCountSheets,
  customerSubmissionDeadlineIso,
  formatCustomerDeadlineFields,
  resolveCustomerSubmissionDeadline,
  defaultSelectedForwardMailKeys,
  EIGHT_COUNT_SHEETS_PDF_FILENAME,
  EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST,
  flattenForwardMailFields,
  loadEightCountSheetsAttachment,
  renderForwardMailHtml,
  renderForwardMailPlainText,
  resolveCustomerMailContacts,
  resolveDefaultEditorKey,
  type ForwardMailDraft,
  type ForwardMailField,
} from "@/lib/forward-order-mail";
import { findLinkedOrder } from "@/lib/editor-assignment";
import { getGmailStatus, sendGmailEmail } from "@/lib/api/gmail";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { useAppState } from "@/context/AppStateContext";
import { PdfImageViewer } from "@/components/ui/PdfCanvasViewer";
import { InlineDateInput } from "@/components/mtd/InlineFields";
import { parseFlexibleDate, toIsoDateString } from "@/lib/dates";
import {
  DEFAULT_EMAIL_TEMPLATES,
  emailTemplateUsesAnyPlaceholder,
} from "@/lib/email-templates";
import { splitMailTextWithLinks } from "@/lib/music-resource-links";
import type { MTDRecord, Order, Producer } from "@/types";

export type ForwardOrderMailRecipient = "producer" | "customer";

type ForwardOrderMailModalProps = {
  open: boolean;
  record: MTDRecord | null;
  orderById: Map<string, Order>;
  allOrders: Order[];
  producers: Producer[];
  recipient?: ForwardOrderMailRecipient;
  onClose: () => void;
};

type ModalStep = "compose" | "confirm";

function EightCountSheetsPdfOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 10000 }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close PDF preview"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eight-count-pdf-title"
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-brand-line/60 bg-brand-elevated px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              Attachment
            </p>
            <h3
              id="eight-count-pdf-title"
              className="truncate text-[15px] font-semibold text-brand-ink"
            >
              {EIGHT_COUNT_SHEETS_PDF_FILENAME}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-ink-secondary transition hover:bg-brand-bg hover:text-brand-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <PdfImageViewer
          manifestSrc={EIGHT_COUNT_SHEETS_PREVIEW_MANIFEST}
          className="h-[70vh] w-full"
        />
      </div>
    </div>
  );
}

function LinkedMailText({ text }: { text: string }) {
  const parts = splitMailTextWithLinks(text);
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "link") {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-signature underline underline-offset-2 hover:text-brand-signature-hover"
            >
              {part.label}
            </a>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </>
  );
}

function MailPreview({
  draft,
  attachmentFilename,
  onViewAttachment,
}: {
  draft: ForwardMailDraft;
  attachmentFilename?: string | null;
  onViewAttachment?: () => void;
}) {
  const isCustomer = draft.variant === "customer";

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line/70 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/15">
      <div className="bg-gradient-to-br from-brand-signature to-brand-blue px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
          Sounds Like That
        </p>
        <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-white">
          {isCustomer ? "Action Required" : "Order Details"}
        </h3>
        <p className="mt-1 text-[13px] text-white/90">{draft.programName}</p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-xl border border-brand-line/50 bg-brand-bg/40 px-3 py-2.5">
          <div className="grid gap-1.5 text-[12px]">
            <div className="flex gap-2">
              <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                To
              </span>
              <span className="min-w-0 text-brand-ink">
                {draft.toName}{" "}
                <span className="text-brand-ink-secondary">&lt;{draft.to}&gt;</span>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-14 shrink-0 font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                Subject
              </span>
              <span className="min-w-0 font-medium text-brand-ink">{draft.subject}</span>
            </div>
          </div>
        </div>

        {attachmentFilename ? (
          <button
            type="button"
            onClick={onViewAttachment}
            className="flex w-full items-center gap-2 rounded-xl border border-brand-line/50 bg-brand-orange-soft/20 px-3 py-2.5 text-left transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25"
            aria-label={`View ${attachmentFilename}`}
          >
            <Paperclip
              className="h-4 w-4 shrink-0 text-brand-orange"
              strokeWidth={2}
            />
            <span className="min-w-0 truncate text-[12px] font-medium text-brand-ink underline-offset-2 hover:underline">
              {attachmentFilename}
            </span>
          </button>
        ) : null}

        {draft.greeting.trim() ? (
          <p className="text-[14px] font-semibold text-brand-ink">{draft.greeting}</p>
        ) : null}
        {draft.intro.trim() ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary">
            <LinkedMailText text={draft.intro} />
          </p>
        ) : null}

        {isCustomer && draft.programLine && draft.sections.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.02em] text-brand-ink">
              {draft.programLine}
            </p>
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-brand-ink">
              {draft.sections[0]?.title || "Missing items"}
            </p>
          </div>
        ) : null}

        {isCustomer
          ? draft.sections.flatMap((section) =>
              section.fields.map((field) => (
                <div key={`${section.title}-${field.label}`} className="space-y-1">
                  <p className="text-[12px] font-bold uppercase tracking-[0.02em] text-brand-ink">
                    {field.label}
                  </p>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary">
                    <LinkedMailText text={field.value} />
                  </p>
                </div>
              ))
            )
          : draft.sections.map((section) => (
              <div
                key={section.title}
                className="overflow-hidden rounded-xl border border-brand-line/60 bg-brand-bg/30"
              >
                <p className="border-b border-brand-line/50 bg-brand-signature/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-signature">
                  {section.title}
                </p>
                <dl className="divide-y divide-brand-line/40">
                  {section.fields.map((field) => (
                    <div
                      key={`${section.title}-${field.label}`}
                      className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-3 px-3 py-2.5 text-[12px]"
                    >
                      <dt className="font-semibold text-brand-ink-secondary">
                        {field.label}
                      </dt>
                      <dd className="whitespace-pre-wrap text-brand-ink">
                        <LinkedMailText text={field.value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}

        {draft.footer.trim() || draft.signature.trim() ? (
          <div className="border-t border-brand-line/40 pt-3">
            {draft.footer.trim() ? (
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-brand-ink-secondary">
                <LinkedMailText text={draft.footer} />
              </p>
            ) : null}
            {draft.signature.trim() ? (
              <p className="mt-3 whitespace-pre-line text-[12px] leading-relaxed text-brand-ink">
                <LinkedMailText text={draft.signature} />
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ForwardOrderMailModal({
  open,
  record,
  orderById,
  allOrders,
  producers,
  recipient = "producer",
  onClose,
}: ForwardOrderMailModalProps) {
  const { token, isViewOnly } = useAuth();
  const { emailTemplates, updateMTD } = useAppState();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<ModalStep>("compose");
  const [editorId, setEditorId] = useState("");
  const [customerContactId, setCustomerContactId] = useState("");
  const [customerDeadlineIso, setCustomerDeadlineIso] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailFrom, setGmailFrom] = useState<string | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const isCustomer = recipient === "customer";
  const isCustomerResend =
    isCustomer && Boolean(record?.missingDataEmailSentAt);

  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : null),
    [record, allOrders]
  );

  const customerContacts = useMemo(
    () => (record ? resolveCustomerMailContacts(record, linkedOrder) : []),
    [record, linkedOrder]
  );

  const fieldGroups = useMemo(() => {
    if (!record) return [];
    if (isCustomer) {
      const groups = buildMissingDataMailFieldGroups(record);
      if (!isCustomerResend) return groups;
      return groups.map((group) => ({
        ...group,
        title: "Items to correct",
        fields: group.fields.map((field) => ({
          ...field,
          section: "Items to correct",
        })),
      }));
    }
    return buildForwardOrderMailFieldGroups(
      record,
      linkedOrder,
      orderById,
      producers
    );
  }, [record, linkedOrder, orderById, producers, isCustomer, isCustomerResend]);

  const allFields = useMemo(
    () => flattenForwardMailFields(fieldGroups),
    [fieldGroups]
  );

  const fieldByKey = useMemo(() => {
    const map = new Map<string, ForwardMailField>();
    for (const field of allFields) {
      map.set(field.key, field);
    }
    return map;
  }, [allFields]);

  const activeCustomerTemplate = useMemo(() => {
    if (!isCustomer) return null;
    return isCustomerResend
      ? emailTemplates.customer_incorrect_data
      : emailTemplates.customer_missing_data;
  }, [isCustomer, isCustomerResend, emailTemplates]);

  const needsSubmissionDeadline = useMemo(() => {
    if (!activeCustomerTemplate) return false;
    return emailTemplateUsesAnyPlaceholder(activeCustomerTemplate, [
      "day",
      "completeDate",
    ]);
  }, [activeCustomerTemplate]);

  const customerTemplateUsesDay = useMemo(() => {
    if (!activeCustomerTemplate) return false;
    return emailTemplateUsesAnyPlaceholder(activeCustomerTemplate, ["day"]);
  }, [activeCustomerTemplate]);

  const customerTemplateUsesCompleteDate = useMemo(() => {
    if (!activeCustomerTemplate) return false;
    return emailTemplateUsesAnyPlaceholder(activeCustomerTemplate, [
      "completeDate",
    ]);
  }, [activeCustomerTemplate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !record) return;
    setStep("compose");
    setEditorId(resolveDefaultEditorKey(record, producers, linkedOrder));
    setCustomerContactId(customerContacts[0]?.id ?? "");
    setCustomerDeadlineIso(
      record ? customerSubmissionDeadlineIso(record) : ""
    );
    setSelectedKeys(defaultSelectedForwardMailKeys(fieldGroups));
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

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const editor = producers.find((producer) => producer.id === editorId);
  const customerContact = customerContacts.find(
    (contact) => contact.id === customerContactId
  );
  const selectedFields = selectedKeys
    .map((key) => fieldByKey.get(key))
    .filter((field): field is ForwardMailField => Boolean(field));

  const customerDeadlineIsoNormalized = toIsoDateString(customerDeadlineIso);
  const customerDeadlineDate =
    isCustomer && /^\d{4}-\d{2}-\d{2}$/.test(customerDeadlineIsoNormalized)
      ? parseFlexibleDate(customerDeadlineIsoNormalized) ??
        resolveCustomerSubmissionDeadline(record)
      : isCustomer
        ? resolveCustomerSubmissionDeadline(record)
        : null;

  const customerTemplateForDraft =
    activeCustomerTemplate ??
    DEFAULT_EMAIL_TEMPLATES.customer_missing_data;

  const draft = isCustomer
    ? buildCustomerMissingDataDraft(
        record,
        customerContact,
        selectedFields,
        customerTemplateForDraft,
        {
          sectionTitle: isCustomerResend
            ? "Items to correct"
            : "Missing items",
          deadline:
            needsSubmissionDeadline && customerDeadlineDate
              ? customerDeadlineDate
              : undefined,
        }
      )
    : buildForwardMailDraft(
        record,
        editor,
        selectedFields,
        emailTemplates.producer_order
      );
  const hasRecipient = isCustomer
    ? Boolean(customerContact?.email)
    : Boolean(editor?.email);
  const hasCustomerDeadline =
    !isCustomer ||
    !needsSubmissionDeadline ||
    /^\d{4}-\d{2}-\d{2}$/.test(customerDeadlineIsoNormalized);
  const customerDeadlineDisplay = (() => {
    if (!customerDeadlineDate || !needsSubmissionDeadline) return null;
    const fields = formatCustomerDeadlineFields(customerDeadlineDate);
    // Prefer complete date (already includes the ordinal day); fall back to day-only.
    if (customerTemplateUsesCompleteDate) return fields.completeDate;
    if (customerTemplateUsesDay) return fields.day;
    return null;
  })();
  const canContinue =
    hasRecipient && selectedFields.length > 0 && hasCustomerDeadline;
  const canSend = canContinue && gmailConnected && !isViewOnly && !sent;

  function toggleField(key: string) {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key]
    );
  }

  function toggleSection(fields: ForwardMailField[]) {
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
    if (!canSend || !hasRecipient) return;
    setIsSending(true);
    setSendError(null);
    try {
      const attachments =
        isCustomer && customerMailIncludesEightCountSheets(selectedKeys)
          ? [await loadEightCountSheetsAttachment()]
          : undefined;

      await sendGmailEmail(
        {
          to_email: draft.to,
          subject: draft.subject,
          body: renderForwardMailPlainText(draft),
          html_body: renderForwardMailHtml(draft),
          attachments,
        },
        token
      );
      if (isCustomer && record) {
        updateMTD(record.id, {
          missingDataEmailSentAt: new Date().toISOString(),
        });
      }
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
  const eightCountAttachment =
    isCustomer && customerMailIncludesEightCountSheets(selectedKeys)
      ? EIGHT_COUNT_SHEETS_PDF_FILENAME
      : null;

  return createPortal(
    <>
      <div
        className={clsx(
          "fixed inset-0 z-[100] flex items-center justify-center p-4",
          pdfPreviewOpen && "pointer-events-none"
        )}
      >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-order-mail-title"
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {isCompose ? composeEyebrow : sent ? "Email sent" : "Review email"}
                </p>
                <h2
                  id="forward-order-mail-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  {isCompose
                    ? composeTitle
                    : sent
                      ? "Sent successfully"
                      : "Email preview"}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isCompose ? (
            <div className="space-y-4">
              {!loadingGmail && !gmailConnected ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
                  <div className="min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary">
                    Connect Gmail in{" "}
                    <Link href="/settings" className="font-semibold text-brand-signature hover:underline">
                      Settings
                    </Link>{" "}
                    to send directly. You can still copy the email as a fallback.
                  </div>
                </div>
              ) : null}

              {gmailConnected && gmailFrom ? (
                <p className="text-[11px] text-brand-ink-tertiary">
                  Sending from{" "}
                  <span className="font-semibold text-brand-ink-secondary">{gmailFrom}</span>
                </p>
              ) : null}

              {isCustomer && customerContacts.length === 0 ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    No customer email was found on this order. Add a coach or
                    billing email in the order details first.
                  </p>
                </div>
              ) : null}

              {isCustomer && allFields.length === 0 ? (
                <div className="rounded-xl border border-brand-line/60 bg-brand-bg/40 px-3.5 py-3 text-[12px] leading-relaxed text-brand-ink-secondary">
                  No missing API data is flagged on this order right now.
                </div>
              ) : null}

              {isCustomer && isCustomerResend ? (
                <div className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3.5 py-3 text-[12px] leading-relaxed text-brand-ink-secondary">
                  A missing-data email was already sent
                  {record.missingDataEmailSentAt
                    ? ` on ${new Date(record.missingDataEmailSentAt).toLocaleString()}`
                    : ""}
                  . Use this follow-up to ask the customer to resubmit anything
                  that came back incorrect.
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {recipientLabel}
                </p>
                {isCustomer ? (
                  <select
                    value={customerContactId}
                    onChange={(event) => setCustomerContactId(event.target.value)}
                    disabled={customerContacts.length === 0}
                    className="mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15 disabled:opacity-60"
                  >
                    {customerContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.role} · {contact.name} · {contact.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={editorId}
                    onChange={(event) => setEditorId(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-signature/50 focus:ring-2 focus:ring-brand-signature/15"
                  >
                    {producers.map((producer) => (
                      <option key={producer.id} value={producer.id}>
                        {producer.name} · {producer.email}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isCustomer && needsSubmissionDeadline ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                    Submission deadline
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
                    This date fills the{" "}
                    {customerTemplateUsesDay && customerTemplateUsesCompleteDate
                      ? "Day and Complete date variables"
                      : customerTemplateUsesDay
                        ? "Day variable"
                        : "Complete date variable"}{" "}
                    in your template. Defaults from the mix schedule; change if
                    needed.
                  </p>
                  <div className="mt-1.5">
                    <InlineDateInput
                      value={customerDeadlineIso}
                      onChange={setCustomerDeadlineIso}
                      className="w-full"
                      menuZIndex={110}
                      displayValue={customerDeadlineDisplay ?? undefined}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                    {includeLabel}
                  </p>
                  {allFields.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedKeys(
                          selectedKeys.length === allFields.length
                            ? []
                            : defaultSelectedForwardMailKeys(fieldGroups)
                        )
                      }
                      className="text-[12px] font-medium text-brand-signature hover:underline"
                    >
                      {selectedKeys.length === allFields.length
                        ? "Clear all"
                        : "Select all"}
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {fieldGroups.map((group) => {
                    const groupKeys = group.fields.map((field) => field.key);
                    const allGroupSelected = groupKeys.every((key) =>
                      selectedKeys.includes(key)
                    );
                    const someGroupSelected =
                      !allGroupSelected &&
                      groupKeys.some((key) => selectedKeys.includes(key));

                    return (
                      <div
                        key={group.title}
                        className="overflow-hidden rounded-xl border border-brand-line/70 bg-brand-bg/35"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(group.fields)}
                          className="flex w-full items-center justify-between gap-3 border-b border-brand-line/50 px-3 py-2.5 text-left transition hover:bg-brand-bg/60"
                        >
                          <span className="text-[12px] font-semibold text-brand-ink">
                            {group.title}
                          </span>
                          <span
                            className={clsx(
                              "text-[11px] font-medium",
                              allGroupSelected
                                ? "text-brand-signature"
                                : someGroupSelected
                                  ? "text-brand-ink-secondary"
                                  : "text-brand-ink-tertiary"
                            )}
                          >
                            {groupKeys.filter((key) => selectedKeys.includes(key)).length}/
                            {groupKeys.length}
                          </span>
                        </button>
                        <ul className="divide-y divide-brand-line/40">
                          {group.fields.map((field) => {
                            const active = selectedKeys.includes(field.key);
                            return (
                              <li key={field.key}>
                                <button
                                  type="button"
                                  onClick={() => toggleField(field.key)}
                                  className={clsx(
                                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/50",
                                    active && "bg-brand-signature/5"
                                  )}
                                >
                                  <span
                                    className={clsx(
                                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                      active
                                        ? "border-brand-signature bg-brand-signature text-white"
                                        : "border-brand-line bg-white"
                                    )}
                                  >
                                    {active ? (
                                      <Check className="h-3 w-3" strokeWidth={3} />
                                    ) : null}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-[12px] font-medium text-brand-ink">
                                      {field.label}
                                    </span>
                                    <span className="mt-0.5 block truncate text-[11px] text-brand-ink-secondary">
                                      {field.value}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isCustomer && eightCountAttachment ? (
                <button
                  type="button"
                  onClick={() => setPdfPreviewOpen(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-brand-line/60 bg-brand-bg/40 px-3.5 py-2.5 text-left transition hover:border-brand-orange/35 hover:bg-brand-orange-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25"
                  aria-label={`View ${eightCountAttachment}`}
                >
                  <Paperclip
                    className="h-4 w-4 shrink-0 text-brand-orange"
                    strokeWidth={2}
                  />
                  <p className="min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary">
                    <span className="font-semibold text-brand-ink underline-offset-2 hover:underline">
                      {eightCountAttachment}
                    </span>{" "}
                    will be included when this email is sent. Click to view.
                  </p>
                </button>
              ) : null}
            </div>
          ) : sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/25">
                <Check className="h-7 w-7" strokeWidth={2} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-brand-ink">
                Email sent to {draft.toName}
              </p>
              <p className="mt-1 text-[13px] text-brand-ink-secondary">{draft.to}</p>
            </div>
          ) : (
            <>
              {sendError ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-danger/25 bg-brand-danger/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">{sendError}</p>
                </div>
              ) : null}
              <MailPreview
                draft={draft}
                attachmentFilename={eightCountAttachment}
                onViewAttachment={() => setPdfPreviewOpen(true)}
              />
            </>
          )}
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          {isCompose ? (
            <button
              type="button"
              onClick={() => setStep("confirm")}
              disabled={!canContinue}
              className="py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
            >
              Review email
            </button>
          ) : sent ? (
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
                onClick={() => {
                  setSendError(null);
                  setStep("compose");
                }}
                className="inline-flex items-center justify-center gap-2 border-t border-black/[0.08] py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to fields
              </button>
            </>
          )}
        </div>
      </div>
    </div>

      {pdfPreviewOpen ? (
        <EightCountSheetsPdfOverlay onClose={() => setPdfPreviewOpen(false)} />
      ) : null}
    </>,
    document.body
  );
}
