"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  AlertCircle,
  Check,
  FileSpreadsheet,
  Loader2,
  Mail,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import {
  PRODUCER_SCHEDULE_COLUMNS,
  type ProducerFacingScheduleRow,
} from "@/lib/export-csv";
import type { ScheduleMailDraft } from "@/lib/producer-schedule-mail";

export type ScheduleSendPreviewItem = {
  producerName: string;
  email: string;
  draft: ScheduleMailDraft;
  mixCount: number;
  rows: ProducerFacingScheduleRow[];
};

type ScheduleSendMailModalProps = {
  open: boolean;
  onClose: () => void;
  items: ScheduleSendPreviewItem[];
  gmailFrom?: string | null;
  canSend: boolean;
  isSending: boolean;
  onSend: () => void;
  sendError?: string | null;
  sent?: boolean;
  sentSummary?: string | null;
};

function ScheduleMailTablePreview({ rows }: { rows: ProducerFacingScheduleRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-line/60 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-brand-line/60 bg-brand-signature/8">
            {PRODUCER_SCHEDULE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-brand-ink-secondary"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-line/40">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={PRODUCER_SCHEDULE_COLUMNS.length}
                className="px-3 py-6 text-center text-[12px] text-brand-ink-tertiary"
              >
                No ongoing scheduled mixes.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={row.recId || index} className="bg-white even:bg-brand-bg/30">
                {PRODUCER_SCHEDULE_COLUMNS.map((column) => {
                  const value = String(row[column.key] ?? "—");
                  const isProgram = column.key === "programName";
                  const isStatus = column.key === "status";
                  return (
                    <td
                      key={column.key}
                      className={clsx(
                        "whitespace-nowrap px-3 py-2 text-[11px]",
                        isProgram && "font-semibold text-brand-ink",
                        isStatus && "font-semibold text-brand-orange",
                        !isProgram && !isStatus && "text-brand-ink-secondary"
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleMailPreview({
  draft,
  rows,
}: {
  draft: ScheduleMailDraft;
  rows: ProducerFacingScheduleRow[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-line/70 bg-white shadow-[var(--shadow-premium-sm)] ring-1 ring-inset ring-brand-line/15">
      <div className="bg-gradient-to-br from-brand-signature to-brand-blue px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/85">
          Sounds Like That
        </p>
        <h3 className="mt-1 text-[18px] font-bold tracking-[-0.02em] text-white">
          Producer Schedule
        </h3>
        <p className="mt-1 text-[13px] text-white/90">{draft.toName}</p>
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

        <div className="flex items-center gap-2 rounded-xl border border-brand-line/50 bg-brand-orange-soft/20 px-3 py-2.5">
          <Paperclip className="h-4 w-4 shrink-0 text-brand-orange" strokeWidth={2} />
          <span className="min-w-0 truncate text-[12px] font-medium text-brand-ink">
            {draft.attachmentFilename}
          </span>
        </div>

        <p className="text-[14px] font-semibold text-brand-ink">{draft.greeting}</p>
        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">{draft.intro}</p>
        <ScheduleMailTablePreview rows={rows} />
        <p className="text-[13px] leading-relaxed text-brand-ink-secondary">{draft.footer}</p>
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-brand-ink">
          {draft.signature}
        </p>
      </div>
    </div>
  );
}

export function ScheduleSendMailModal({
  open,
  onClose,
  items,
  gmailFrom,
  canSend,
  isSending,
  onSend,
  sendError,
  sent = false,
  sentSummary,
}: ScheduleSendMailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const activeItem = items[activeIndex] ?? items[0];
  const multiple = items.length > 1;

  const sendLabel = useMemo(() => {
    if (isSending) return "Sending…";
    if (multiple) return `Send ${items.length} separate emails`;
    return `Send to ${activeItem?.producerName ?? "editor"}`;
  }, [isSending, multiple, items.length, activeItem?.producerName]);

  if (!mounted || !open || items.length === 0) return null;

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
        aria-labelledby="schedule-send-mail-title"
        className="relative flex max-h-[90vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="border-b border-brand-line/60 bg-gradient-to-br from-brand-signature/10 via-brand-elevated to-brand-blue/8 px-6 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
                <Mail className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {sent ? "Emails sent" : "Review before sending"}
                </p>
                <h2
                  id="schedule-send-mail-title"
                  className="mt-0.5 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
                >
                  {sent ? "Schedules delivered" : "Schedule email preview"}
                </h2>
                <p className="mt-1 text-[13px] text-brand-ink-secondary">
                  {sent
                    ? sentSummary
                    : multiple
                      ? "Each editor receives their own email with the schedule table and an Excel attachment."
                      : "Confirm the schedule table and Excel attachment before sending."}
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
          {sent ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-success/12 text-brand-success ring-1 ring-inset ring-brand-success/25">
                <Check className="h-7 w-7" strokeWidth={2} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-brand-ink">{sentSummary}</p>
            </div>
          ) : (
            <>
              {gmailFrom ? (
                <p className="mb-4 text-[11px] text-brand-ink-tertiary">
                  Sending from{" "}
                  <span className="font-semibold text-brand-ink-secondary">{gmailFrom}</span>
                </p>
              ) : null}

              {sendError ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-brand-danger/25 bg-brand-danger/8 px-3.5 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                  <p className="text-[12px] leading-relaxed text-brand-ink-secondary">
                    {sendError}
                  </p>
                </div>
              ) : null}

              {multiple ? (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {items.map((item, index) => (
                    <button
                      key={item.producerName}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                        index === activeIndex
                          ? "bg-brand-signature/12 text-brand-signature ring-1 ring-inset ring-brand-signature/25"
                          : "bg-brand-bg/80 text-brand-ink-secondary hover:bg-brand-bg"
                      )}
                    >
                      <FileSpreadsheet className="h-3 w-3" strokeWidth={2} />
                      {item.producerName}
                      <span className="rounded bg-brand-orange/10 px-1 py-0.5 text-[9px] font-bold tabular-nums text-brand-orange">
                        {item.mixCount}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {activeItem ? (
                <ScheduleMailPreview draft={activeItem.draft} rows={activeItem.rows} />
              ) : null}
            </>
          )}
        </div>

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
                onClick={onSend}
                disabled={!canSend || isSending}
                className="inline-flex items-center justify-center gap-2 border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-signature/8 disabled:cursor-not-allowed disabled:text-brand-ink-tertiary disabled:hover:bg-transparent"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sendLabel}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
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
