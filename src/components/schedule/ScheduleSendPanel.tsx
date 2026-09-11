"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertCircle, Download, Loader2, Send } from "lucide-react";
import { ProducerSchedulePreview } from "@/components/schedule/ProducerSchedulePreview";
import {
  ScheduleSendMailModal,
  type ScheduleSendPreviewItem,
} from "@/components/schedule/ScheduleSendMailModal";
import { useAuth } from "@/context/AuthContext";
import { todayIso } from "@/lib/date-filters";
import { ApiClientError } from "@/lib/api/client";
import { getGmailStatus, sendGmailEmail } from "@/lib/api/gmail";
import {
  generateScheduleCsv,
  getProducerFacingScheduleRows,
  triggerCsvDownload,
} from "@/lib/export-csv";
import {
  buildScheduleMailDraft,
  generateScheduleExcelAttachment,
  renderScheduleMailHtml,
  renderScheduleMailPlainText,
  stringToBase64,
} from "@/lib/producer-schedule-mail";
import type { MTDRecord, Order, Producer } from "@/types";

type ScheduleSendPanelProps = {
  categoryLabel: string;
  producerNames: string[];
  categoryProducers: Producer[];
  selectedSendEditor: string;
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
};

type SendFeedback = {
  type: "success" | "error" | "warning";
  message: string;
};

function findProducerByName(name: string, producers: Producer[]): Producer | undefined {
  return producers.find(
    (producer) => producer.name.toUpperCase() === name.toUpperCase()
  );
}

function resolveSelectedProducerName(
  selectedSendEditor: string,
  producerNames: string[],
  producers: Producer[]
): string | null {
  if (selectedSendEditor === "all") return null;

  const byName = producerNames.find(
    (name) => name.toUpperCase() === selectedSendEditor.toUpperCase()
  );
  if (byName) return byName;

  const producer = producers.find(
    (entry) =>
      entry.id === selectedSendEditor ||
      entry.name.toUpperCase() === selectedSendEditor.toUpperCase()
  );
  if (!producer) return null;

  return producerNames.find(
    (name) => name.toUpperCase() === producer.name.toUpperCase()
  ) ?? null;
}

export function ScheduleSendPanel({
  categoryLabel,
  producerNames,
  categoryProducers,
  selectedSendEditor,
  mtdRecords,
  allOrders,
  producers,
}: ScheduleSendPanelProps) {
  const { token, isViewOnly } = useAuth();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailFrom, setGmailFrom] = useState<string | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<SendFeedback | null>(null);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentSummary, setSentSummary] = useState<string | null>(null);

  const viewingAll = selectedSendEditor === "all";
  const sendLayout = viewingAll ? "together" : "separate";

  const targetProducerNames = useMemo(() => {
    if (viewingAll) return producerNames;
    const resolved = resolveSelectedProducerName(
      selectedSendEditor,
      producerNames,
      producers
    );
    return resolved ? [resolved] : producerNames;
  }, [viewingAll, selectedSendEditor, producerNames, producers]);

  const targetCount = targetProducerNames.length;
  const canExport = targetCount > 0;

  const categoryEditorCount = categoryProducers.length;
  const onScheduleCount = producerNames.length;

  const activeProducerName = viewingAll
    ? producerNames[0] ?? ""
    : targetProducerNames[0] ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadGmailStatus() {
      try {
        setLoadingGmail(true);
        const status = await getGmailStatus(token);
        if (!cancelled) {
          setGmailConnected(status.connected);
          setGmailFrom(status.email);
        }
      } catch {
        if (!cancelled) {
          setGmailConnected(false);
          setGmailFrom(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingGmail(false);
        }
      }
    }

    void loadGmailStatus();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canSend = canExport && gmailConnected && !isViewOnly && !isSending;

  const mixCountByProducer = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of producerNames) {
      const rows = getProducerFacingScheduleRows(
        mtdRecords,
        allOrders,
        producers,
        name
      );
      counts.set(name, rows.length);
    }
    return counts;
  }, [producerNames, mtdRecords, allOrders, producers]);

  const previewItems = useMemo<ScheduleSendPreviewItem[]>(() => {
    return targetProducerNames.flatMap((producerName) => {
      const producer = findProducerByName(producerName, producers);
      if (!producer) return [];

      const mixCount = mixCountByProducer.get(producerName) ?? 0;
      const rows = getProducerFacingScheduleRows(
        mtdRecords,
        allOrders,
        producers,
        producerName
      );
      const draft = buildScheduleMailDraft(producer, mixCount, categoryLabel);

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
    categoryLabel,
    mtdRecords,
    allOrders,
  ]);

  const missingEmailNames = useMemo(
    () => previewItems.filter((item) => !item.email).map((item) => item.producerName),
    [previewItems]
  );

  const downloadTargets = useCallback(
    (targets: string[]) => {
      if (targets.length === 0) {
        if (typeof window !== "undefined") {
          alert("No ongoing scheduled mixes found for the current send filters.");
        }
        return;
      }

      targets.forEach((targetName) => {
        const csv = generateScheduleCsv(
          mtdRecords,
          allOrders,
          producers,
          targetName
        );
        triggerCsvDownload(
          `Schedule_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
          csv
        );
      });
    },
    [mtdRecords, allOrders, producers]
  );

  const handleDownload = useCallback(() => {
    downloadTargets(targetProducerNames);
  }, [downloadTargets, targetProducerNames]);

  const sendScheduleToProducer = useCallback(
    async (producerName: string) => {
      const producer = findProducerByName(producerName, producers);
      if (!producer?.email) {
        throw new Error(`${producerName} has no email on file.`);
      }

      const mixCount = mixCountByProducer.get(producerName) ?? 0;
      const rows = getProducerFacingScheduleRows(
        mtdRecords,
        allOrders,
        producers,
        producerName
      );
      const draft = buildScheduleMailDraft(producer, mixCount, categoryLabel);
      const excelAttachment = generateScheduleExcelAttachment(rows);

      await sendGmailEmail(
        {
          to_email: draft.to,
          subject: draft.subject,
          body: renderScheduleMailPlainText(draft, rows),
          html_body: renderScheduleMailHtml(draft, rows),
          attachments: [
            {
              filename: draft.attachmentFilename,
              content_base64: stringToBase64(excelAttachment),
              mime_type: "application/vnd.ms-excel",
            },
          ],
        },
        token
      );
    },
    [
      producers,
      mixCountByProducer,
      mtdRecords,
      allOrders,
      categoryLabel,
      token,
    ]
  );

  const handleSendTargets = useCallback(
    async (targets: string[]) => {
      if (!canSend || targets.length === 0) return;

      setIsSending(true);
      setSendError(null);
      setFeedback(null);

      const sentNames: string[] = [];
      const failed: string[] = [];

      for (const targetName of targets) {
        try {
          await sendScheduleToProducer(targetName);
          sentNames.push(targetName);
        } catch (err) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Email could not be sent.";
          failed.push(`${targetName}: ${message}`);
        }
      }

      if (failed.length === 0) {
        const summary =
          sentNames.length === 1
            ? `Schedule sent to ${sentNames[0]}.`
            : `Schedules sent to ${sentNames.length} editors separately.`;
        setSent(true);
        setSentSummary(summary);
      } else if (sentNames.length === 0) {
        setSendError(failed.join(" "));
      } else {
        setSendError(`Sent ${sentNames.length} of ${targets.length}. ${failed.join(" ")}`);
        setSentSummary(`Sent ${sentNames.length} of ${targets.length} schedules.`);
      }

      setIsSending(false);
    },
    [canSend, sendScheduleToProducer]
  );

  const openSendModal = useCallback(() => {
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

  const closeSendModal = useCallback(() => {
    if (isSending) return;
    setMailModalOpen(false);
    setSendError(null);
    setSent(false);
    setSentSummary(null);
    setFeedback(null);
  }, [isSending]);

  const handleConfirmSend = useCallback(() => {
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

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {canExport ? (
          <div className="mb-4 shrink-0 space-y-3 border-b border-brand-line/60 pb-4">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-brand-ink">
              Schedule of {onScheduleCount} editor{onScheduleCount === 1 ? "" : "s"}
            </h2>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary">
                <span className="font-semibold tabular-nums text-brand-orange">
                  {onScheduleCount}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-brand-ink">
                  {categoryEditorCount}
                </span>{" "}
                {categoryLabel} producers are assigned to ongoing mixes.
                {!viewingAll && activeProducerName ? (
                  <>
                    {" "}
                    Viewing{" "}
                    <span className="font-semibold text-brand-ink">
                      {activeProducerName}
                    </span>
                    .
                  </>
                ) : null}
              </p>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-white px-3.5 text-[12px] font-semibold text-brand-ink transition hover:border-brand-orange/35 hover:text-brand-orange active:scale-[0.98]"
                >
                  <Download className="h-3.5 w-3.5 text-brand-orange" strokeWidth={2} />
                  {downloadLabel}
                  <span className="tabular-nums text-brand-ink-tertiary">({targetCount})</span>
                </button>
                <button
                  type="button"
                  onClick={openSendModal}
                  disabled={isViewOnly || !gmailConnected || isSending || targetCount === 0}
                  title={sendDisabledReason}
                  className={clsx(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[12px] font-semibold transition active:scale-[0.98]",
                    canSend
                      ? "bg-brand-signature text-white hover:bg-brand-signature/90"
                      : "cursor-not-allowed bg-brand-signature/45 text-white/90"
                  )}
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  ) : (
                    <Send className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {sendLabel}
                  <span
                    className={clsx(
                      "tabular-nums",
                      canSend ? "text-white/80" : "text-white/60"
                    )}
                  >
                    ({targetCount})
                  </span>
                </button>
              </div>
            </div>

            {!loadingGmail && !gmailConnected ? (
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-brand-ink-secondary">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-warning" />
                <p>
                  Connect Gmail in{" "}
                  <Link
                    href="/settings"
                    className="font-semibold text-brand-signature hover:underline"
                  >
                    Settings
                  </Link>{" "}
                  to send schedules directly.
                </p>
              </div>
            ) : null}

            {feedback ? (
              <p
                className={clsx(
                  "text-[11px] leading-relaxed",
                  feedback.type === "success" && "text-brand-success",
                  feedback.type === "warning" && "text-brand-warning",
                  feedback.type === "error" && "text-brand-danger"
                )}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {canExport ? (
            <ProducerSchedulePreview
              embedded
              sendLayout={sendLayout}
              selectedProducer={viewingAll ? "all" : selectedSendEditor}
              onProducerChange={() => {}}
              allowedProducerNames={targetProducerNames}
              mtdRecords={mtdRecords}
              allOrders={allOrders}
              producers={producers}
            />
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning">
                <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  No schedules to send
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-secondary">
                  No ongoing mixes match {categoryLabel}. Adjust the category
                  filters above.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScheduleSendMailModal
        open={mailModalOpen}
        onClose={closeSendModal}
        items={previewItems}
        gmailFrom={gmailFrom}
        canSend={canSend && missingEmailNames.length === 0}
        isSending={isSending}
        onSend={handleConfirmSend}
        sendError={sendError}
        sent={sent}
        sentSummary={sentSummary}
      />
    </>
  );
}
