"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AlertCircle, Download, Loader2, Send } from "lucide-react";
import { ProducerStatementPreview } from "@/components/payroll/ProducerStatementPreview";
import {
  PayrollSendMailModal,
  type PayrollSendPreviewItem,
} from "@/components/payroll/PayrollSendMailModal";
import { useAuth } from "@/context/AuthContext";
import { useAppEmailTemplates } from "@/context/AppStateContext";
import {
  calculateDateBounds,
  payPeriodRangeLabel,
  payPeriodRangeToDateFilter,
  todayIso,
  type PayPeriodRange,
} from "@/lib/date-filters";
import { toCanonicalIsoDate } from "@/lib/dates";
import { ApiClientError } from "@/lib/api/client";
import { getGmailStatus, sendGmailEmail } from "@/lib/api/gmail";
import {
  getProducerFacingPayrollRows,
  producerFacingPayrollRowsToCsv,
  triggerCsvDownload,
  type ProducerFacingPayrollRow,
} from "@/lib/export-csv";
import {
  buildPayrollMailDraft,
  generatePayrollExcelAttachment,
  renderPayrollMailHtml,
  renderPayrollMailPlainText,
  stringToBase64,
} from "@/lib/producer-payroll-mail";
import { findProducerByAssignmentKey } from "@/lib/editor-assignment";
import type { MTDSortBy } from "@/lib/mtd-filters";
import {
  sortPayrollSendProducerNames,
  sortPayrollSendProducerNamesLean,
} from "@/lib/payroll-send-sort";
import {
  pickStatementMailAttachment,
  shouldBuildStatementRowsEagerly,
  shouldConfirmBulkStatementSend,
} from "@/lib/statement-scale";
import type { MTDRecord, Order, Producer, PayrollAddon } from "@/types";

type PayrollSendPanelProps = {
  /** Optional scope label in the header (empty = all categories). */
  categoryLabel?: string;
  producerNames: string[];
  categoryProducers: Producer[];
  selectedSendEditor: string;
  payPeriod: PayPeriodRange;
  payrollRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
  payrollAddons?: PayrollAddon[];
  sortBy?: MTDSortBy;
};

type SendFeedback = {
  type: "success" | "error" | "warning";
  message: string;
};

function resolveSendProducer(
  name: string,
  producers: Producer[]
): Producer | undefined {
  // Statements may list full name or assignment initials (e.g. "DP").
  return findProducerByAssignmentKey(name, producers);
}

function producerHasSendEmail(producer: Producer | undefined): boolean {
  return Boolean(producer?.email?.trim());
}

function formatMissingEmailMessage(names: string[]): string {
  const list = names.join(", ");
  return `Missing email for: ${list}. Open Producers, add their email, then send again.`;
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

export function PayrollSendPanel({
  categoryLabel = "",
  producerNames,
  categoryProducers,
  selectedSendEditor,
  payPeriod,
  payrollRecords,
  allOrders,
  producers,
  payrollAddons = [],
  sortBy = "newest",
}: PayrollSendPanelProps) {
  const { token, isViewOnly } = useAuth();
  const { emailTemplates } = useAppEmailTemplates();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailFrom, setGmailFrom] = useState<string | null>(null);
  const [loadingGmail, setLoadingGmail] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<SendFeedback | null>(null);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  /** null = use toolbar targets (Send all); otherwise one/few names from preview. */
  const [modalTargets, setModalTargets] = useState<string[] | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sentSummary, setSentSummary] = useState<string | null>(null);

  const payPeriodFilter = useMemo(
    () => payPeriodRangeToDateFilter(payPeriod),
    [payPeriod]
  );

  const periodLabel = useMemo(() => payPeriodRangeLabel(payPeriod), [payPeriod]);

  const filterPeriod = useMemo(() => {
    const bounds = calculateDateBounds(
      payPeriodFilter.type,
      payPeriodFilter.value
    );
    return {
      start: bounds.start ? toCanonicalIsoDate(bounds.start) : "",
      end: bounds.end ? toCanonicalIsoDate(bounds.end) : "",
    };
  }, [payPeriodFilter]);

  const viewingAll = selectedSendEditor === "all";
  const sendLayout = viewingAll ? "together" : "separate";
  const categoryEditorCount = categoryProducers.length;

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
        if (!cancelled) setLoadingGmail(false);
      }
    }

    void loadGmailStatus();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const orderById = useMemo(() => {
    const map = new Map<string, Order>();
    for (const order of allOrders) {
      if (order.id) map.set(order.id, order);
      if (order.uuid) map.set(order.uuid, order);
      if (order.legacyId) map.set(order.legacyId, order);
    }
    return map;
  }, [allOrders]);

  // 2-week boards can still be large — defer past a small producer count.
  const buildEagerly = shouldBuildStatementRowsEagerly(producerNames.length);

  // Eager map only for small periods — 1-year / many producers build on demand.
  const rowsByProducer = useMemo(() => {
    const map = new Map<string, ProducerFacingPayrollRow[]>();
    if (!buildEagerly) return map;
    for (const name of producerNames) {
      map.set(
        name,
        getProducerFacingPayrollRows(
          payrollRecords,
          allOrders,
          producers,
          name,
          filterPeriod,
          payrollAddons,
          orderById
        )
      );
    }
    return map;
  }, [
    buildEagerly,
    producerNames,
    payrollRecords,
    allOrders,
    producers,
    filterPeriod,
    payrollAddons,
    orderById,
  ]);

  const rowCacheRef = useRef(new Map<string, ProducerFacingPayrollRow[]>());

  useEffect(() => {
    rowCacheRef.current = new Map();
  }, [payrollRecords, allOrders, producers, filterPeriod, payrollAddons, orderById]);

  const getRowsForProducer = useCallback(
    (name: string): ProducerFacingPayrollRow[] => {
      if (buildEagerly) {
        return rowsByProducer.get(name) ?? [];
      }
      const cached = rowCacheRef.current.get(name);
      if (cached) return cached;
      const rows = getProducerFacingPayrollRows(
        payrollRecords,
        allOrders,
        producers,
        name,
        filterPeriod,
        payrollAddons,
        orderById
      );
      // Keep at most two producers’ rows so a 1-year Send all cannot OOM.
      if (rowCacheRef.current.size >= 2) {
        const oldest = rowCacheRef.current.keys().next().value;
        if (oldest !== undefined) rowCacheRef.current.delete(oldest);
      }
      rowCacheRef.current.set(name, rows);
      return rows;
    },
    [
      buildEagerly,
      rowsByProducer,
      payrollRecords,
      allOrders,
      producers,
      filterPeriod,
      payrollAddons,
      orderById,
    ]
  );

  const scopedProducerNames = useMemo(() => {
    if (!buildEagerly) {
      // Parent already scoped to period mixes/VO — skip N× row builds for filter.
      return sortPayrollSendProducerNamesLean(producerNames, sortBy);
    }
    return sortPayrollSendProducerNames(
      producerNames.filter(
        (name) => (rowsByProducer.get(name)?.length ?? 0) > 0
      ),
      rowsByProducer,
      sortBy
    );
  }, [buildEagerly, producerNames, rowsByProducer, sortBy]);

  const targetProducerNames = useMemo(() => {
    if (viewingAll) return scopedProducerNames;
    const resolved = resolveSelectedProducerName(
      selectedSendEditor,
      scopedProducerNames,
      producers
    );
    return resolved ? [resolved] : scopedProducerNames;
  }, [viewingAll, selectedSendEditor, scopedProducerNames, producers]);

  const targetCount = targetProducerNames.length;
  const canExport = targetCount > 0;
  const canSend = canExport && gmailConnected && !isViewOnly && !isSending;
  const statementCount = scopedProducerNames.length;
  const activeSendTargets = modalTargets ?? targetProducerNames;

  const activeProducerName = viewingAll
    ? scopedProducerNames[0] ?? ""
    : targetProducerNames[0] ?? "";

  const previewItems = useMemo<PayrollSendPreviewItem[]>(() => {
    // Bulk / deferred: draft-only preview — don’t materialize every statement.
    const leanPreview = !buildEagerly || activeSendTargets.length > 3;
    return activeSendTargets.flatMap((producerName) => {
      const producer = resolveSendProducer(producerName, producers);
      if (!producer) return [];

      const rows = leanPreview ? [] : getRowsForProducer(producerName);
      const mixCount = leanPreview ? 0 : rows.length;
      const draft = buildPayrollMailDraft(
        producer,
        mixCount,
        periodLabel,
        categoryLabel,
        emailTemplates.producer_payroll
      );

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
    activeSendTargets,
    producers,
    getRowsForProducer,
    buildEagerly,
    periodLabel,
    categoryLabel,
    emailTemplates.producer_payroll,
  ]);

  const downloadTargets = useCallback(
    async (targets: string[]) => {
      if (targets.length === 0) {
        if (typeof window !== "undefined") {
          alert("No completed records found for the selected pay period.");
        }
        return;
      }

      setIsDownloading(true);
      try {
        // One producer at a time — never hold every statement CSV in memory.
        for (let i = 0; i < targets.length; i += 1) {
          const targetName = targets[i];
          const rows = getRowsForProducer(targetName);
          const csv = producerFacingPayrollRowsToCsv(rows);
          triggerCsvDownload(
            `Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${todayIso()}.csv`,
            csv
          );
          if (i < targets.length - 1) {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, 120);
            });
          }
        }
      } finally {
        setIsDownloading(false);
      }
    },
    [getRowsForProducer]
  );

  const handleDownload = useCallback(() => {
    void downloadTargets(targetProducerNames);
  }, [downloadTargets, targetProducerNames]);

  const sendStatementToProducer = useCallback(
    async (producerName: string) => {
      const producer = resolveSendProducer(producerName, producers);
      if (!producer || !producerHasSendEmail(producer)) {
        throw new Error(
          `${producerName} has no email on file. Add it on the Producers page.`
        );
      }

      const rows = getRowsForProducer(producerName);
      const mixCount = rows.length;
      const draft = buildPayrollMailDraft(
        producer,
        mixCount,
        periodLabel,
        categoryLabel,
        emailTemplates.producer_payroll
      );
      const excelHtml = generatePayrollExcelAttachment(rows);
      const csvText = producerFacingPayrollRowsToCsv(rows);
      const csvFilename = draft.attachmentFilename.replace(
        /\.xls$/i,
        ".csv"
      );
      const attachment = pickStatementMailAttachment({
        producerName,
        excelHtml,
        csvText,
        excelFilename: draft.attachmentFilename,
        csvFilename,
        toBase64: stringToBase64,
      });

      const bodyNote =
        attachment === null
          ? `\n\n(Attachment omitted — statement too large for email. A CSV download was started in your browser.)\n`
          : attachment.mime_type === "text/csv"
            ? `\n\n(Full statement attached as CSV — Excel exceeded the email size limit.)\n`
            : "";

      if (attachment === null) {
        triggerCsvDownload(csvFilename, csvText);
      }

      await sendGmailEmail(
        {
          to_email: draft.to,
          subject: draft.subject,
          body: `${renderPayrollMailPlainText(draft, rows)}${bodyNote}`,
          html_body: renderPayrollMailHtml(draft, rows),
          attachments: attachment
            ? [
                {
                  filename: attachment.filename,
                  content_base64: attachment.content_base64,
                  mime_type: attachment.mime_type,
                },
              ]
            : [],
        },
        token
      );
    },
    [
      producers,
      getRowsForProducer,
      periodLabel,
      categoryLabel,
      token,
      emailTemplates.producer_payroll,
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

      for (let i = 0; i < targets.length; i += 1) {
        const targetName = targets[i];
        try {
          await sendStatementToProducer(targetName);
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
        // Brief pause between Gmail calls — keeps UI fluid on bulk 1-year sends.
        if (i < targets.length - 1) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 150);
          });
        }
      }

      if (failed.length === 0) {
        const summary =
          sentNames.length === 1
            ? `Statement sent to ${sentNames[0]}.`
            : `Statements sent to ${sentNames.length} editors separately.`;
        setSent(true);
        setSentSummary(summary);
      } else if (sentNames.length === 0) {
        setSendError(failed.join(" "));
      } else {
        setSendError(`Sent ${sentNames.length} of ${targets.length}. ${failed.join(" ")}`);
        setSentSummary(`Sent ${sentNames.length} of ${targets.length} statements.`);
      }

      setIsSending(false);
    },
    [canSend, sendStatementToProducer]
  );

  const openSendModalFor = useCallback(
    (names: string[]) => {
      setFeedback(null);
      const missing = names.filter(
        (name) => !producerHasSendEmail(resolveSendProducer(name, producers))
      );
      const sendable = names.filter((name) => !missing.includes(name));
      if (sendable.length === 0) {
        setFeedback({
          type: "error",
          message: formatMissingEmailMessage(missing),
        });
        return;
      }
      if (missing.length > 0) {
        setFeedback({
          type: "warning",
          message: `Sending ${sendable.length} of ${names.length}. ${formatMissingEmailMessage(missing)}`,
        });
      }
      setModalTargets(sendable);
      setSendError(null);
      setSent(false);
      setSentSummary(null);
      setMailModalOpen(true);
    },
    [producers]
  );

  const openSendModal = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      shouldConfirmBulkStatementSend(targetProducerNames.length)
    ) {
      const ok = window.confirm(
        `Send ${targetProducerNames.length} statements for Last 2 weeks? Emails go one at a time. Oversized Excel attachments fall back to CSV or a local download.`
      );
      if (!ok) return;
    }
    openSendModalFor(targetProducerNames);
  }, [openSendModalFor, targetProducerNames]);

  const closeSendModal = useCallback(() => {
    if (isSending) return;
    setMailModalOpen(false);
    setModalTargets(null);
    setSendError(null);
    setSent(false);
    setSentSummary(null);
    setFeedback(null);
  }, [isSending]);

  const handleConfirmSend = useCallback(() => {
    void handleSendTargets(activeSendTargets);
  }, [handleSendTargets, activeSendTargets]);

  const sendDisabledReason = isViewOnly
    ? "View-only users cannot send email"
    : !gmailConnected
      ? "Connect Gmail in Settings first"
      : undefined;

  const downloadLabel = viewingAll ? "Download all" : "Download";
  const sendLabel = viewingAll ? "Send all" : "Send";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {canExport ? (
          <div className="mb-4 shrink-0 space-y-3 border-b border-brand-line/60 pb-4">
            <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-brand-ink">
              Statements for {statementCount} editor{statementCount === 1 ? "" : "s"}
            </h2>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="min-w-0 text-[12px] leading-relaxed text-brand-ink-secondary">
                <span className="font-semibold tabular-nums text-brand-orange">
                  {statementCount}
                </span>{" "}
                of{" "}
                <span className="font-semibold tabular-nums text-brand-ink">
                  {categoryEditorCount}
                </span>{" "}
                {categoryLabel
                  ? `${categoryLabel} producers`
                  : "Producers"}{" "}
                have statements in {periodLabel}.
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
                  disabled={isDownloading || isSending || targetCount === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-line/80 bg-white px-3.5 text-[12px] font-semibold text-brand-ink transition hover:border-brand-orange/35 hover:text-brand-orange active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" strokeWidth={2} />
                  ) : (
                    <Download className="h-3.5 w-3.5 text-brand-orange" strokeWidth={2} />
                  )}
                  {isDownloading ? "Downloading…" : downloadLabel}
                  <span className="tabular-nums text-brand-ink-tertiary">({targetCount})</span>
                </button>
                <button
                  type="button"
                  onClick={openSendModal}
                  disabled={
                    isViewOnly ||
                    !gmailConnected ||
                    isSending ||
                    isDownloading ||
                    targetCount === 0
                  }
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
                  to send statements directly.
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
                {feedback.message.includes("Producers") ? (
                  <>
                    {feedback.message.replace(
                      /Open Producers, add their email, then send again\./,
                      ""
                    )}
                    Open{" "}
                    <Link
                      href="/producers"
                      className="font-semibold underline underline-offset-2"
                    >
                      Producers
                    </Link>
                    , add their email, then send again.
                  </>
                ) : (
                  feedback.message
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {canExport ? (
            <ProducerStatementPreview
              embedded
              sendLayout={sendLayout}
              selectedProducer={viewingAll ? "all" : selectedSendEditor}
              onProducerChange={() => {}}
              selectedPeriod={payPeriodFilter}
              onPeriodChange={() => {}}
              allowedProducerNames={targetProducerNames}
              payrollRecords={payrollRecords}
              allOrders={allOrders}
              producers={producers}
              payrollAddons={payrollAddons}
              sortBy={sortBy}
              deferRows={!buildEagerly}
              onSendToProducer={(name) => openSendModalFor([name])}
              canSendToProducer={canSend}
              isSending={isSending}
              sendDisabledReason={
                isViewOnly
                  ? "View-only users cannot send email"
                  : !gmailConnected
                    ? "Connect Gmail in Settings first"
                    : undefined
              }
            />
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-warning/25 bg-brand-warning/8 px-3.5 py-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-warning/15 text-brand-warning">
                <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-brand-ink">
                  No statements to send
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-brand-ink-secondary">
                  No completed mixes or voiceovers in {periodLabel}. Adjust the
                  producer or pay period, then try again.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <PayrollSendMailModal
        open={mailModalOpen}
        onClose={closeSendModal}
        items={previewItems}
        gmailFrom={gmailFrom}
        canSend={canSend && (modalTargets?.length ?? 0) > 0}
        isSending={isSending}
        onSend={handleConfirmSend}
        sendError={sendError}
        sent={sent}
        sentSummary={sentSummary}
      />
    </>
  );
}
