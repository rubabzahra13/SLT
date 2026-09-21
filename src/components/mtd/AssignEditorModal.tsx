"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lock, X } from "lucide-react";
import clsx from "clsx";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { Avatar } from "@/components/ui/Avatar";
import {
  EditorSelectDropdown,
  type EditorSelectGroup,
} from "@/components/mtd/EditorSelectDropdown";
import {
  editorRequestForAssignment,
  findLinkedOrder,
  getEditorNamesForCategory,
  getEditorWorkload,
  getEditorBookedUntilIso,
  getRequestedEditorFromRecord,
  getSuggestedEditors,
  findProducerByAssignmentKey,
  getDisplayAssignedProducer,
  pickDefaultEditor,
  type SuggestedEditor,
} from "@/lib/editor-assignment";
import { normalizeProducerKey, producerKeysMatch } from "@/lib/producer-keys";
import { formatDisplayDate, parseFlexibleDate, toCanonicalIsoDate, toIsoDateString } from "@/lib/dates";
import { suggestMixStartDate } from "@/lib/scheduling";
import {
  isProducerUnavailableForRecord,
  getProducerUnavailabilityReason,
} from "@/lib/producer-availability";
import {
  isProducerAvailableOnDate,
  calculateProducerNextOpening,
} from "@/lib/producer-schedule-calc";
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
  /** When true, show assignment details only (MTD tab after move). */
  readOnly?: boolean;
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

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function groupSuggestionsByDate(
  suggestions: SuggestedEditor[],
  today: Date = new Date()
): DateGroup[] {
  const groups = new Map<string, DateGroup>();

  for (const suggestion of suggestions) {
    const d = suggestion.nextAvailableDate || today;
    const isToday = isSameCalendarDay(d, today);
    const key = isToday ? "today" : d.toISOString().slice(0, 10);

    const existing = groups.get(key);
    if (existing) {
      existing.editors.push(suggestion);
      continue;
    }

    groups.set(key, {
      key,
      sortTime: isToday ? 0 : d.getTime(),
      weekday: isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
      day: isToday ? "Today" : d.toLocaleDateString("en-US", { day: "numeric" }),
      month: isToday ? "" : d.toLocaleDateString("en-US", { month: "short" }),
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
  readOnly = false,
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

  const displayAssigned = record ? getDisplayAssignedProducer(record) : null;
  const formalAssigned = record?.assignedProducer?.trim() || null;
  const isAssignmentLocked = Boolean(formalAssigned);

  const today = useMemo(() => new Date(), []);

  const suggestionsAnchorDate = useMemo(() => {
    if (!record?.mixStartDate) return today;
    return parseFlexibleDate(record.mixStartDate) ?? today;
  }, [record?.mixStartDate, today]);

  const suggestions = useMemo(
    () =>
      readOnly || !record
        ? []
        : getSuggestedEditors(
            mtdRecords,
            producers,
            schedule,
            record.category,
            record.id,
            record,
            suggestionsAnchorDate
          ),
    [readOnly, record, mtdRecords, producers, schedule, suggestionsAnchorDate]
  );

  const suggestionsByDate = useMemo(
    () => groupSuggestionsByDate(suggestions, today),
    [suggestions, today]
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

  const editorBookedUntil = useMemo(() => {
    const map = new Map<string, string>();
    for (const name of categoryEditors) {
      const until = getEditorBookedUntilIso(name, mtdRecords, record?.id);
      if (until) {
        map.set(normalizeProducerKey(name), until);
      }
    }
    return map;
  }, [categoryEditors, mtdRecords, record?.id]);

  const availableEditorKeys = useMemo(
    () => new Set(availableNames.map((name) => normalizeProducerKey(name))),
    [availableNames]
  );

  const currentAssignee = displayAssigned ?? "";

  const assignedProducer = useMemo(
    () =>
      isAssignmentLocked && formalAssigned
        ? findProducerByAssignmentKey(formalAssigned, producers)
        : undefined,
    [isAssignmentLocked, formalAssigned, producers]
  );

  const todayAvailableCount = useMemo(() => {
    return categoryEditors.filter((name) => {
      const producer = findProducerByAssignmentKey(name, producers);
      return producer ? isProducerAvailableOnDate(producer, today, mtdRecords, schedule) : false;
    }).length;
  }, [categoryEditors, producers, today, mtdRecords, schedule]);

  const editorSelectGroups = useMemo((): EditorSelectGroup[] => {
    if (!record) return [];

    const eligibleOptions: EditorSelectGroup["options"] = [];
    const unavailableOptions: EditorSelectGroup["options"] = [];

    const anchorDate = record.mixStartDate
      ? parseFlexibleDate(record.mixStartDate) ?? today
      : today;

    for (const name of categoryEditors) {
      const key = normalizeProducerKey(name);
      const producer = findProducerByAssignmentKey(name, producers);
      const mixCount = editorWorkload.get(key) ?? 0;
      const bookedUntil = editorBookedUntil.get(key);

      const isAvailableToday = producer
        ? isProducerAvailableOnDate(producer, today, mtdRecords, schedule)
        : false;

      const nextOpening = producer
        ? calculateProducerNextOpening(producer, mtdRecords, schedule, anchorDate)
        : null;

      const nextAvailableDateStr =
        nextOpening && !isAvailableToday
          ? formatDisplayDate(toCanonicalIsoDate(nextOpening.nextAvailableDate))
          : undefined;

      let isEligibleForMix = true;
      let unavailabilityReason: string | undefined = undefined;

      if (producer) {
        const isUnavailable = isProducerUnavailableForRecord(
          producer,
          record,
          mtdRecords
        );
        if (isUnavailable) {
          isEligibleForMix = false;
          unavailabilityReason =
            getProducerUnavailabilityReason(producer, record, mtdRecords, schedule) ||
            "Unavailable on mix dates";
        }
      }

      const option: EditorSelectGroup["options"][number] = {
        name,
        producer,
        mixCount,
        bookedUntil,
        nextAvailableDateStr,
        isAvailableToday,
        isEligibleForMix,
        unavailabilityReason,
        disabled: !isEligibleForMix,
      };

      if (isEligibleForMix) {
        eligibleOptions.push(option);
      } else {
        unavailableOptions.push(option);
      }
    }

    const groups: EditorSelectGroup[] = [
      {
        label: "Eligible for Mix",
        tone: "available",
        options: eligibleOptions,
      },
    ];

    if (unavailableOptions.length > 0) {
      groups.push({
        label: "Unavailable on Mix Dates",
        tone: "booked",
        options: unavailableOptions,
      });
    }

    return groups;
  }, [
    record,
    categoryEditors,
    producers,
    mtdRecords,
    schedule,
    today,
    editorWorkload,
    editorBookedUntil,
  ]);

  function pickEditorForOpen(active: MTDRecord): string {
    const pick = pickDefaultEditor(
      active,
      producers,
      mtdRecords,
      schedule,
      linkedOrder
    );

    return pick.editor;
  }

  useEffect(() => {
    if (!record || !open) return;

    const assignedKey = record.assignedProducer?.trim();

    if (assignedKey) {
      const match = categoryEditors.find((name) =>
        producerKeysMatch(name, assignedKey)
      );
      setSelectedEditor(match ?? assignedKey.toUpperCase());
      return;
    }

    let editor = pickEditorForOpen(record);
    const firstEligible = editorSelectGroups.find((g) => g.tone === "available")?.options[0]?.name;
    if (!editor) {
      editor =
        categoryEditors.find((name) =>
          requestedEditor ? producerKeysMatch(name, requestedEditor) : false
        ) ??
        firstEligible ??
        categoryEditors[0] ??
        "";
    }
    setSelectedEditor(editor);
  }, [
    open,
    record,
    categoryEditors,
    mtdRecords,
    producers,
    schedule,
    linkedOrder,
    availableEditorKeys,
    editorSelectGroups,
    requestedEditor,
  ]);

  const selectedProducer = useMemo(
    () =>
      selectedEditor
        ? findProducerByAssignmentKey(selectedEditor, producers)
        : undefined,
    [selectedEditor, producers]
  );

  const isSelectedEligible = useMemo(() => {
    if (!selectedEditor || !record) return false;
    if (!selectedProducer) return true;
    return !isProducerUnavailableForRecord(selectedProducer, record, mtdRecords);
  }, [selectedEditor, selectedProducer, record, mtdRecords]);

  const mixStartIso = toIsoDateString(record?.mixStartDate ?? "");
  const mixEndIso = toIsoDateString(record?.mixEndDate ?? "");
  const showProducerBooking = Boolean(mixStartIso && mixEndIso);

  if (!open || !record) return null;

  const activeRecord = record;
  const isViewOnly = readOnly;
  const showCompactAssigned = isViewOnly || isAssignmentLocked;

  const canSubmit =
    Boolean(selectedEditor) &&
    categoryEditors.some((name) => producerKeysMatch(name, selectedEditor)) &&
    isSelectedEligible &&
    !showCompactAssigned &&
    !isAssignmentLocked;

  const genreLabel = activeRecord.category || "this";

  function handleUnassign() {
    onAssign(activeRecord.id, {
      editorRequest: "FA",
      assignedProducer: null,
    });
    setSelectedEditor(pickEditorForOpen({ ...activeRecord, assignedProducer: null }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      if (selectedProducer && isProducerUnavailableForRecord(selectedProducer, activeRecord, mtdRecords)) {
        alert("This editor is not available for the selected mix dates.");
      }
      return;
    }

    const existingStart = toIsoDateString(activeRecord.mixStartDate);
    const mixStartDate =
      existingStart ||
      suggestMixStartDate(selectedEditor, producers, schedule, mtdRecords);

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
      <div
        className={clsx(
          "surface-premium relative flex max-h-[90vh] w-full flex-col rounded-2xl shadow-[var(--shadow-premium)]",
          showCompactAssigned ? "max-w-lg" : "max-w-3xl"
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-line/60 px-6 py-5">
          <div>
            <p className="text-label">Editor assignment</p>
            <h2 className="text-display mt-1 text-[18px]">
              {showCompactAssigned ? "View assignment" : "Assign producer"}
            </h2>
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
          {showCompactAssigned ? (
            <div className="flex min-h-0 flex-col px-6 py-5">
              <div className="space-y-5">
                <div>
                  <p className="text-label">Editor</p>
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
                  {displayAssigned ? (
                    <div className="mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          producer={assignedProducer}
                          initials={displayAssigned}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-brand-ink">
                            {displayAssigned}
                          </p>
                          <p className="text-[11px] text-brand-ink-tertiary">
                            {isViewOnly ? "Assigned on MTD" : "Currently assigned"}
                          </p>
                        </div>
                        {isViewOnly ? (
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-ink-tertiary">
                            <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleUnassign}
                            title="Unassign editor"
                            aria-label="Unassign editor"
                            className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-elevated px-2.5 text-[11px] font-semibold text-brand-ink-secondary transition hover:border-brand-warning/40 hover:bg-brand-warning/10 hover:text-brand-warning"
                          >
                            Unassign
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5">
                      <p className="text-[13px] font-medium text-brand-ink-tertiary">
                        No editor assigned
                      </p>
                      <p className="mt-1 text-[11px] text-brand-ink-tertiary">
                        Assign an editor on the Orders tab before moving to MTD.
                      </p>
                    </div>
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
            </div>
          ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-2">
            <div className="flex min-h-0 flex-col border-b border-brand-line/60 bg-brand-bg/30 lg:border-b-0 lg:border-r">
              <div className="flex shrink-0 items-center justify-between gap-3 px-6 pb-3 pt-5">
                <div>
                  <p className="text-label">Next availability</p>
                  <p className="mt-0.5 text-[12px] text-brand-ink-tertiary">
                    {genreLabel} editors ·{" "}
                    {isAssignmentLocked ? "locked while assigned" : "tap to select"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {todayAvailableCount === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-warning">
                      0 available today
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success">
                      {todayAvailableCount} available today
                    </span>
                  )}
                  {suggestionsByDate.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-signature-soft px-2.5 py-1 text-[11px] font-semibold text-brand-signature">
                      <CalendarDays className="h-3 w-3" strokeWidth={2} />
                      {suggestionsByDate.length} date
                      {suggestionsByDate.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
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
                      (isAssignmentLocked) &&
                        "pointer-events-none opacity-45"
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
                              {group.key === "today" ? "Available Today" : `Available ${group.weekday} ${group.month} ${group.day}`}
                            </p>
                            {index === 0 ? (
                              <span className="rounded-full bg-brand-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success">
                                Soonest
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {group.editors.map((suggestion: SuggestedEditor) => {
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
                                  <Avatar
                                    producer={suggestion.producer}
                                    initials={suggestion.name}
                                    size="xs"
                                  />
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
                  <EditorSelectDropdown
                    id="editor-select"
                    value={selectedEditor}
                    onChange={setSelectedEditor}
                    groups={editorSelectGroups}
                    requestedEditor={requestedEditor}
                    disabled={categoryEditors.length === 0}
                    emptyLabel="No matching editors"
                  />
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

              <div className="mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-brand-line/60 pt-5">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
