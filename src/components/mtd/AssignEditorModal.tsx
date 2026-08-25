"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lock, X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { Avatar } from "@/components/ui/Avatar";
import {
  editorRequestForAssignment,
  findLinkedOrder,
  getEditorNamesForCategory,
  getEditorWorkload,
  getRequestedEditorFromRecord,
  getSuggestedEditors,
  findProducerByAssignmentKey,
  pickDefaultEditor,
  type SuggestedEditor,
} from "@/lib/editor-assignment";
import { normalizeProducerKey, producerKeysMatch } from "@/lib/producer-keys";
import { suggestMixStartDate } from "@/lib/scheduling";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { patchFromRecordStatus } from "@/lib/mtd-status";
import type { MTDRecord, MTDRecordStatus, Order, Producer, ScheduleEntry } from "@/types";

export type EditorAssignmentResult = {
  editorRequest: string;
  assignedProducer: string | null;
  mixStartDate?: string;
  mixEndDate?: string;
  recordStatus?: MTDRecordStatus;
  status?: MTDRecord["status"];
};

type AssignEditorModalProps = {
  open: boolean;
  record: MTDRecord | null;
  mtdRecords: MTDRecord[];
  allOrders: Order[];
  producers: Producer[];
  schedule: ScheduleEntry[];
  onClose: () => void;
  onAssign: (recordId: string, result: EditorAssignmentResult) => void;
};

type DateGroup = {
  key: string;
  sortTime: number;
  weekday: string;
  day: string;
  month: string;
  editors: SuggestedEditor[];
};

const inputClass =
  "w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] text-brand-ink outline-none transition focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15";

function parseSlotDate(label: string): Date | null {
  if (!label || label === "TBD" || label === "No slot found") return null;

  const short = label.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w+)\s+(\d{1,2})/i
  );
  if (short) {
    const parsed = new Date(`${short[1]} ${short[2]}, 2026`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const long = new Date(label);
  if (!Number.isNaN(long.getTime())) return long;

  return null;
}

function groupSuggestionsByDate(suggestions: SuggestedEditor[]): DateGroup[] {
  const groups = new Map<string, DateGroup>();

  for (const suggestion of suggestions) {
    const label = suggestion.slotLabel || "TBD";
    const parsed = parseSlotDate(label);
    const key = parsed
      ? parsed.toISOString().slice(0, 10)
      : label.toLowerCase();

    const existing = groups.get(key);
    if (existing) {
      existing.editors.push(suggestion);
      continue;
    }

    groups.set(key, {
      key,
      sortTime: parsed?.getTime() ?? Number.MAX_SAFE_INTEGER,
      weekday: parsed
        ? parsed.toLocaleDateString("en-US", { weekday: "short" })
        : "—",
      day: parsed
        ? parsed.toLocaleDateString("en-US", { day: "numeric" })
        : label,
      month: parsed
        ? parsed.toLocaleDateString("en-US", { month: "short" })
        : "",
      editors: [suggestion],
    });
  }

  return Array.from(groups.values()).sort((a, b) => a.sortTime - b.sortTime);
}

export function AssignEditorModal({
  open,
  record,
  mtdRecords,
  allOrders,
  producers,
  schedule,
  onClose,
  onAssign,
}: AssignEditorModalProps) {
  const categoryEditors = useMemo(
    () =>
      record
        ? getEditorNamesForCategory(producers, record.category)
        : [],
    [record, producers]
  );

  const [selectedEditor, setSelectedEditor] = useState<string>("");

  const isAssignmentLocked = Boolean(record?.assignedProducer?.trim());

  const suggestions = useMemo(
    () =>
      record
        ? getSuggestedEditors(
            mtdRecords,
            producers,
            schedule,
            record.category,
            record.id,
            record
          )
        : [],
    [record, mtdRecords, producers, schedule]
  );

  const suggestionsByDate = useMemo(
    () => groupSuggestionsByDate(suggestions),
    [suggestions]
  );

  const linkedOrder = useMemo(
    () => (record ? findLinkedOrder(record, allOrders) : undefined),
    [record, allOrders]
  );

  const requestedEditor = useMemo(
    () =>
      record
        ? getRequestedEditorFromRecord(record, producers, linkedOrder)
        : null,
    [record, producers, linkedOrder]
  );

  const availableNames = useMemo(
    () => suggestions.map((suggestion) => suggestion.name),
    [suggestions]
  );

  const editorWorkload = useMemo(
    () => getEditorWorkload(mtdRecords, record?.id),
    [mtdRecords, record?.id]
  );

  const availableEditorKeys = useMemo(
    () => new Set(availableNames.map((name) => normalizeProducerKey(name))),
    [availableNames]
  );

  const { availableEditors, bookedEditors } = useMemo(() => {
    const available: string[] = [];
    const booked: string[] = [];
    for (const name of categoryEditors) {
      if (availableEditorKeys.has(normalizeProducerKey(name))) {
        available.push(name);
      } else {
        booked.push(name);
      }
    }
    return { availableEditors: available, bookedEditors: booked };
  }, [categoryEditors, availableEditorKeys]);

  const currentAssignee = record?.assignedProducer ?? "";

  const assignedProducer = useMemo(
    () =>
      isAssignmentLocked && record?.assignedProducer
        ? findProducerByAssignmentKey(record.assignedProducer, producers)
        : undefined,
    [isAssignmentLocked, record?.assignedProducer, producers]
  );

  function pickEditorForOpen(active: MTDRecord): string {
    const pick = pickDefaultEditor(
      active,
      producers,
      mtdRecords,
      schedule,
      linkedOrder
    );

    let editor = pick.editor;
    const booked = getEditorWorkload(mtdRecords, active.id);
    const isCurrent = producerKeysMatch(active.assignedProducer ?? "", editor);
    if (editor && booked.has(normalizeProducerKey(editor)) && !isCurrent) {
      editor =
        getSuggestedEditors(
          mtdRecords,
          producers,
          schedule,
          active.category,
          active.id,
          active
        )[0]?.name || "";
    }

    return editor;
  }

  useEffect(() => {
    if (!record || !open) return;

    const assignedKey = record.assignedProducer?.trim() || null;

    if (assignedKey) {
      const match = categoryEditors.find((name) =>
        producerKeysMatch(name, assignedKey)
      );
      setSelectedEditor(match ?? assignedKey.toUpperCase());
    } else {
      setSelectedEditor(pickEditorForOpen(record));
    }
  }, [open, record, categoryEditors, mtdRecords, producers, schedule, linkedOrder]);

  const mixStartIso = toIsoDateString(record?.mixStartDate ?? "");
  const mixEndIso = toIsoDateString(record?.mixEndDate ?? "");
  const showProducerBooking = Boolean(mixStartIso && mixEndIso);

  if (!open || !record) return null;

  const activeRecord = record;
  const canSubmit = Boolean(selectedEditor) && !isAssignmentLocked;
  const genreLabel = activeRecord.category || "this";

  function handleUnassign(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onAssign(activeRecord.id, {
      editorRequest: "NA",
      assignedProducer: null,
      ...patchFromRecordStatus("Waiting for Data"),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const existingStart = toIsoDateString(activeRecord.mixStartDate);
    const mixStartDate =
      existingStart ||
      suggestMixStartDate(selectedEditor, producers, schedule);

    onAssign(activeRecord.id, {
      editorRequest: editorRequestForAssignment(
        selectedEditor,
        requestedEditor,
        availableNames
      ),
      assignedProducer: selectedEditor,
      ...(!existingStart && mixStartDate ? { mixStartDate } : {}),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="surface-premium relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl shadow-[var(--shadow-premium)]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-line/60 px-6 py-5">
          <div>
            <p className="text-label">Editor assignment</p>
            <h2 className="text-display mt-1 text-[18px]">Assign producer</h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {activeRecord.programName}
              <span className="text-brand-ink-tertiary">
                {" "}
                · {genreLabel} specialists
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="grid min-h-0 flex-1 lg:grid-cols-2">
            <div className="flex min-h-0 flex-col border-b border-brand-line/60 bg-brand-bg/30 lg:border-b-0 lg:border-r">
              <div className="flex shrink-0 items-center justify-between gap-3 px-6 pb-3 pt-5">
                <div>
                  <p className="text-label">Next availability</p>
                  <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                    {genreLabel} editors ·{" "}
                    {isAssignmentLocked
                      ? "locked while assigned"
                      : "tap to select"}
                  </p>
                </div>
                {suggestionsByDate.length > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-signature-soft px-2.5 py-1 text-[11px] font-semibold text-brand-signature">
                    <CalendarDays className="h-3 w-3" strokeWidth={2} />
                    {suggestionsByDate.length} date
                    {suggestionsByDate.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              <DottedScroll
                className="min-h-0 flex-1"
                scrollClassName="max-h-[min(52vh,420px)] overflow-y-scroll scrollbar-hide px-6 pb-5"
                indicatorPlacement="gutter"
              >
                {categoryEditors.length === 0 ? (
                  <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
                    No producers specialize in {genreLabel}. Update a
                    producer&apos;s category on the roster.
                  </p>
                ) : suggestionsByDate.length === 0 ? (
                  <p className="rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning">
                    All {genreLabel} editors are assigned. Pick from the list on
                    the right if you need to reassign.
                  </p>
                ) : (
                  <ol
                    className={clsx(
                      "relative isolate space-y-3 before:absolute before:bottom-3 before:left-[22px] before:top-3 before:-z-10 before:w-px before:bg-brand-line",
                      isAssignmentLocked && "pointer-events-none opacity-45"
                    )}
                  >
                    {suggestionsByDate.map((group, index) => (
                      <li key={group.key} className="relative pl-12">
                        <span
                          className={clsx(
                            "absolute left-0 top-3 z-10 flex h-11 w-11 flex-col items-center justify-center rounded-xl border bg-brand-elevated text-center shadow-sm",
                            index === 0
                              ? "border-brand-signature/40 ring-2 ring-brand-signature-soft"
                              : "border-brand-line/80"
                          )}
                        >
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                            {group.weekday}
                          </span>
                          <span className="text-[15px] font-bold leading-none tabular-nums text-brand-ink">
                            {group.day}
                          </span>
                          {group.month ? (
                            <span className="mt-0.5 text-[9px] font-medium text-brand-ink-tertiary">
                              {group.month}
                            </span>
                          ) : null}
                        </span>

                        <div className="rounded-2xl border border-brand-line/70 bg-brand-elevated/80 p-3 shadow-[var(--shadow-premium-sm)]">
                          <div className="mb-2.5 flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-brand-ink">
                              {group.editors.length} editor
                              {group.editors.length === 1 ? "" : "s"} free
                            </p>
                            {index === 0 ? (
                              <span className="rounded-full bg-brand-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success">
                                Soonest
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {group.editors.map((suggestion) => {
                              const selected =
                                selectedEditor === suggestion.name;
                              return (
                                <button
                                  key={suggestion.name}
                                  type="button"
                                  onClick={() =>
                                    setSelectedEditor(suggestion.name)
                                  }
                                  className={clsx(
                                    "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition",
                                    selected
                                      ? "border-brand-signature bg-brand-signature-soft shadow-sm"
                                      : "border-brand-line/70 bg-brand-bg/60 hover:border-brand-line hover:bg-brand-bg"
                                  )}
                                >
                                  {suggestion.producer?.avatar ? (
                                    <Avatar
                                      src={suggestion.producer.avatar}
                                      alt={suggestion.name}
                                      size="xs"
                                    />
                                  ) : (
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-bg-subtle text-[10px] font-bold text-brand-ink-secondary">
                                      {suggestion.name.slice(0, 2)}
                                    </span>
                                  )}
                                  <span className="text-[12px] font-semibold text-brand-ink">
                                    {suggestion.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </DottedScroll>
            </div>

            <div className="flex min-h-0 flex-col px-6 py-5">
              <div className="space-y-5">
                <div>
                  <label className="text-label" htmlFor="editor-select">
                    Editor
                  </label>
                  {requestedEditor ? (
                    <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                      Requested:{" "}
                      <span className="font-semibold text-brand-ink">
                        {requestedEditor}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                      Requested:{" "}
                      <span className="font-semibold text-brand-ink">
                        First available
                      </span>
                    </p>
                  )}
                  {isAssignmentLocked && activeRecord.assignedProducer ? (
                    <div className="mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {assignedProducer?.avatar ? (
                          <Avatar
                            src={assignedProducer.avatar}
                            alt={activeRecord.assignedProducer}
                            size="sm"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-signature-soft text-[11px] font-bold text-brand-signature">
                            {activeRecord.assignedProducer.slice(0, 2)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-brand-ink">
                            {activeRecord.assignedProducer}
                          </p>
                          <p className="text-[11px] text-brand-ink-tertiary">
                            Currently assigned
                          </p>
                        </div>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-ink-tertiary">
                          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-brand-ink-tertiary">
                        Unassign to choose a different editor.
                      </p>
                    </div>
                  ) : (
                    <select
                      id="editor-select"
                      value={selectedEditor}
                      onChange={(e) => setSelectedEditor(e.target.value)}
                      disabled={categoryEditors.length === 0}
                      className={clsx(inputClass, "mt-1.5")}
                    >
                      {categoryEditors.length === 0 ? (
                        <option value="">No matching editors</option>
                      ) : (
                        <>
                          {availableEditors.length > 0 ? (
                            <optgroup label="Available">
                              {availableEditors.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </optgroup>
                          ) : null}
                          {bookedEditors.length > 0 ? (
                            <optgroup label="Booked on other mixes">
                              {bookedEditors.map((name) => {
                                const count =
                                  editorWorkload.get(normalizeProducerKey(name)) ??
                                  0;
                                const isCurrent = producerKeysMatch(
                                  currentAssignee,
                                  name
                                );
                                return (
                                  <option
                                    key={name}
                                    value={name}
                                    disabled={!isCurrent}
                                  >
                                    {name} · {count} mix
                                    {count === 1 ? "" : "es"}
                                  </option>
                                );
                              })}
                            </optgroup>
                          ) : null}
                        </>
                      )}
                    </select>
                  )}
                </div>

                {showProducerBooking ? (
                  <div className="rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5">
                    <p className="text-label">Producer booking</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
                      Same as mix start &amp; end in the table. Edit those
                      columns to change this window.
                    </p>
                    <dl className="mt-2.5 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-[12px]">
                        <dt className="text-brand-ink-tertiary">From</dt>
                        <dd className="font-medium tabular-nums text-brand-ink">
                          {formatDisplayDate(mixStartIso)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 text-[12px]">
                        <dt className="text-brand-ink-tertiary">Until</dt>
                        <dd className="font-medium tabular-nums text-brand-ink">
                          {formatDisplayDate(mixEndIso)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>

              <div
                className={clsx(
                  "mt-auto flex flex-wrap items-center gap-2 border-t border-brand-line/60 pt-5",
                  isAssignmentLocked ? "justify-start" : "justify-end"
                )}
              >
                {isAssignmentLocked ? (
                  <button
                    type="button"
                    onClick={handleUnassign}
                    className="rounded-lg border border-brand-line px-4 py-2 text-[13px] font-semibold text-brand-danger transition hover:bg-brand-orange-soft"
                  >
                    Unassign editor
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Assign
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
