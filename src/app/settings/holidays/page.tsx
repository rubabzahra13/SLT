"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DayCalendarPicker,
  addDaysToIso,
  isoFromLocalDate,
} from "@/components/ui/DayCalendarPicker";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { SoftSelect } from "@/components/ui/SoftSelect";
import { useAppState } from "@/context/AppStateContext";
import type {
  StudioHoliday,
  StudioPersonalReason,
} from "@/lib/producer-time-off";
import {
  findUsPublicHoliday,
  formatMonthDayLabel,
  isOtherPublicHoliday,
  monthDayToReferenceIso,
  normalizeStudioHoliday,
  OTHER_PUBLIC_HOLIDAY_NAME,
  toMonthDay,
  US_PUBLIC_HOLIDAY_CATALOG,
} from "@/lib/producer-time-off";

type HolidayDraft = {
  /** Selected catalog entry (or Other). */
  catalogName: string;
  /** Custom label when catalogName is Other. */
  customName: string;
  startDate: string;
  endDate: string;
  /** Single calendar day vs inclusive From–To range */
  dateMode: "single" | "range";
  appliesToAll: boolean;
  producerIds: string[];
};

type SettingsTab = "studio" | "personal";

const PUBLIC_HOLIDAY_OPTIONS = US_PUBLIC_HOLIDAY_CATALOG.map((entry) => ({
  value: entry.name,
  label: entry.name,
}));

function emptyDraft(): HolidayDraft {
  const todayMd = toMonthDay(isoFromLocalDate(new Date())) || "01-01";
  return {
    catalogName: "",
    customName: "",
    startDate: todayMd,
    endDate: todayMd,
    dateMode: "single",
    appliesToAll: true,
    producerIds: [],
  };
}

function draftDisplayName(draft: HolidayDraft): string {
  if (isOtherPublicHoliday(draft.catalogName)) {
    return draft.customName.trim();
  }
  return draft.catalogName.trim();
}

function shiftMonthDay(monthDay: string, days: number): string {
  const iso = monthDayToReferenceIso(monthDay);
  return toMonthDay(addDaysToIso(iso, days)) || monthDay;
}

/** Inclusive same-year range: From must be strictly before To. */
function isValidHolidayRange(startMd: string, endMd: string): boolean {
  return Boolean(startMd && endMd && startMd < endMd);
}

/** Ensure a From–To pair is valid after switching into range mode. */
function ensureDistinctRange(
  startMd: string,
  endMd: string
): { startDate: string; endDate: string } {
  if (isValidHolidayRange(startMd, endMd)) {
    return { startDate: startMd, endDate: endMd };
  }
  const next = shiftMonthDay(startMd, 1);
  if (next > startMd) {
    return { startDate: startMd, endDate: next };
  }
  const prev = shiftMonthDay(startMd, -1);
  return { startDate: prev, endDate: startMd };
}

function holidayAppliesLabel(
  holiday: StudioHoliday,
  producers: { id: string; name: string }[]
): string {
  if (holiday.appliesToAll !== false) return "All producers";
  const ids = new Set(holiday.producerIds ?? []);
  const names = producers
    .filter((p) => ids.has(p.id))
    .map((p) => p.name);
  if (names.length === 0) return "No producers";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names.length} producers`;
}

export default function HolidaysSettingsPage() {
  const {
    holidays,
    addHoliday,
    updateHoliday,
    removeHoliday,
    personalReasons,
    addPersonalReason,
    updatePersonalReason,
    removePersonalReason,
    producers,
    isViewOnly,
  } = useAppState();
  const [tab, setTab] = useState<SettingsTab>("studio");
  const [editing, setEditing] = useState<StudioHoliday | null>(null);
  const [draft, setDraft] = useState<HolidayDraft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [dateField, setDateField] = useState<"start" | "end" | null>(null);
  const [holidaySelectOpen, setHolidaySelectOpen] = useState(false);
  const [personalDraftName, setPersonalDraftName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const startRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);

  const sortedProducers = useMemo(
    () =>
      [...producers].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      ),
    [producers]
  );

  const sorted = useMemo(
    () =>
      [...holidays].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [holidays]
  );

  const enabledPersonalCount = useMemo(
    () => personalReasons.filter((entry) => entry.enabled).length,
    [personalReasons]
  );

  const showCustomName = isOtherPublicHoliday(draft.catalogName);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setDateField(null);
    setHolidaySelectOpen(false);
    setFormOpen(true);
  }

  function openEdit(holiday: StudioHoliday) {
    setEditing(holiday);
    const match = findUsPublicHoliday(holiday.name);
    const useOther = !match || isOtherPublicHoliday(match.name);
    const isSingle = holiday.startDate === holiday.endDate;
    const range = isSingle
      ? { startDate: holiday.startDate, endDate: holiday.endDate }
      : ensureDistinctRange(holiday.startDate, holiday.endDate);
    setDraft({
      catalogName: useOther ? OTHER_PUBLIC_HOLIDAY_NAME : match.name,
      customName: useOther ? holiday.name : "",
      startDate: range.startDate,
      endDate: range.endDate,
      dateMode: isSingle ? "single" : "range",
      appliesToAll: holiday.appliesToAll !== false,
      producerIds: [...(holiday.producerIds ?? [])],
    });
    setDateField(null);
    setHolidaySelectOpen(false);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setDraft(emptyDraft());
    setDateField(null);
    setHolidaySelectOpen(false);
  }

  function selectCatalogHoliday(name: string) {
    const entry = findUsPublicHoliday(name);
    const todayMd = toMonthDay(isoFromLocalDate(new Date())) || "01-01";
    const startDate = entry?.startDate || todayMd;
    const endDate = entry?.endDate || entry?.startDate || startDate;
    const isSingle = startDate === endDate;
    const range = isSingle
      ? { startDate, endDate }
      : ensureDistinctRange(startDate, endDate);
    setDraft((current) => ({
      ...current,
      catalogName: name,
      customName: isOtherPublicHoliday(name) ? current.customName : "",
      startDate: range.startDate,
      endDate: range.endDate,
      dateMode: isSingle ? "single" : "range",
    }));
    setHolidaySelectOpen(false);
    setDateField(null);
  }

  function saveForm() {
    if (isViewOnly) return;
    const name = draftDisplayName(draft);
    if (!name || !draft.startDate) return;
    if (!draft.appliesToAll && draft.producerIds.length === 0) return;
    if (
      draft.dateMode === "range" &&
      !isValidHolidayRange(draft.startDate, draft.endDate)
    ) {
      return;
    }
    const endDate =
      draft.dateMode === "single"
        ? draft.startDate
        : draft.endDate || draft.startDate;
    const payload = normalizeStudioHoliday({
      id: editing?.id,
      name,
      startDate: draft.startDate,
      endDate,
      appliesToAll: draft.appliesToAll,
      producerIds: draft.producerIds,
    });
    if (editing) {
      updateHoliday(editing.id, payload);
    } else {
      addHoliday(payload);
    }
    closeForm();
  }

  function toggleDraftProducer(producerId: string) {
    setDraft((current) => {
      const has = current.producerIds.includes(producerId);
      return {
        ...current,
        producerIds: has
          ? current.producerIds.filter((id) => id !== producerId)
          : [...current.producerIds, producerId],
      };
    });
  }

  function startRename(entry: StudioPersonalReason) {
    setRenamingId(entry.id);
    setRenameValue(entry.name);
  }

  function commitRename() {
    if (!renamingId || isViewOnly) {
      setRenamingId(null);
      return;
    }
    const name = renameValue.trim();
    if (name) {
      updatePersonalReason(renamingId, { name });
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function addPersonal() {
    if (isViewOnly) return;
    const name = personalDraftName.trim();
    if (!name) return;
    addPersonalReason({
      id: "",
      name,
      enabled: true,
    });
    setPersonalDraftName("");
  }

  const columns: Column<StudioHoliday>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Holiday",
        render: (entry) => (
          <span className="font-semibold text-brand-ink">{entry.name}</span>
        ),
      },
      {
        key: "startDate",
        header: "From",
        width: "140px",
        render: (entry) => (
          <span className="tabular-nums text-brand-ink-secondary">
            {formatMonthDayLabel(entry.startDate)}
          </span>
        ),
      },
      {
        key: "endDate",
        header: "To",
        width: "120px",
        render: (entry) => (
          <span className="tabular-nums text-brand-ink-secondary">
            {formatMonthDayLabel(entry.endDate)}
          </span>
        ),
      },
      {
        key: "applies",
        header: "Applies to",
        render: (entry) => (
          <span className="text-brand-ink-secondary">
            {holidayAppliesLabel(entry, sortedProducers)}
          </span>
        ),
      },
      ...(isViewOnly
        ? []
        : [
            {
              key: "actions",
              header: "",
              width: "96px",
              align: "right" as const,
              render: (entry: StudioHoliday) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(entry)}
                    className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
                    aria-label={`Edit ${entry.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHoliday(entry.id)}
                    className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-danger/10 hover:text-brand-danger"
                    aria-label={`Remove ${entry.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ),
            },
          ]),
    ],
    [isViewOnly, removeHoliday, sortedProducers]
  );

  return (
    <>
      <PageHeader
        title="Holidays"
        badge={
          tab === "studio"
            ? `${sorted.length} public`
            : `${enabledPersonalCount} categories`
        }
        subtitle={
          tab === "studio"
            ? "Public holidays for the current and next year"
            : "Add leave categories producers usually take off for."
        }
        tabs={
          <Tabs
            options={[
              {
                value: "studio",
                label: "Public holidays",
                count: sorted.length,
              },
              {
                value: "personal",
                label: "Leave categories",
                count: enabledPersonalCount,
              },
            ]}
            value={tab}
            onChange={(value) => setTab(value as SettingsTab)}
            accent="blue"
          />
        }
        action={
          isViewOnly || tab !== "studio"
            ? undefined
            : { label: "Add holiday", onClick: openCreate, showPlus: true }
        }
      />

      <div className="px-6 pb-6 pt-5 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/settings"
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-ink-secondary transition hover:text-brand-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Back to settings
          </Link>

          {tab === "studio" ? (
            <div className="surface-premium overflow-hidden rounded-2xl">
              <DataTable
                columns={columns}
                data={sorted}
                rowKey={(entry) => entry.id}
                emptyMessage="No holidays yet. Add one to use in producer time off."
              />
            </div>
          ) : (
            <div className="surface-premium overflow-hidden rounded-2xl">
              <ul className="divide-y divide-brand-line/40">
                {personalReasons.map((entry) => {
                  const isRenaming = renamingId === entry.id;
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={entry.enabled}
                        disabled={isViewOnly || entry.isOther}
                        onClick={() =>
                          updatePersonalReason(entry.id, {
                            enabled: !entry.enabled,
                          })
                        }
                        aria-label={
                          entry.isOther
                            ? `${entry.name} (always available)`
                            : `Allow ${entry.name}`
                        }
                        className={clsx(
                          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/25",
                          entry.enabled
                            ? "bg-brand-blue text-white shadow-sm ring-1 ring-inset ring-brand-blue-deep/30"
                            : "bg-brand-elevated text-transparent ring-1 ring-inset ring-brand-line/70 hover:ring-brand-blue/40",
                          (isViewOnly || entry.isOther) &&
                            "cursor-default opacity-70"
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </button>

                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename();
                              }
                              if (e.key === "Escape") {
                                setRenamingId(null);
                                setRenameValue("");
                              }
                            }}
                            className="h-9 w-full rounded-lg border border-brand-line/60 bg-brand-bg px-2.5 text-[13px] font-semibold text-brand-ink outline-none focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                            aria-label="Rename category"
                          />
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={
                                entry.enabled
                                  ? "truncate text-[13px] font-semibold text-brand-ink"
                                  : "truncate text-[13px] font-semibold text-brand-ink-tertiary line-through"
                              }
                            >
                              {entry.name}
                            </span>
                            {entry.isOther ? (
                              <span className="shrink-0 rounded-md bg-brand-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-ink-tertiary">
                                Always on
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {!isViewOnly ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              isRenaming ? commitRename() : startRename(entry)
                            }
                            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
                            aria-label={`Rename ${entry.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                          {!entry.isOther ? (
                            <button
                              type="button"
                              onClick={() => removePersonalReason(entry.id)}
                              className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-danger/10 hover:text-brand-danger"
                              aria-label={`Remove ${entry.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {!isViewOnly ? (
                <div className="flex items-center gap-2 border-t border-brand-line/40 px-4 py-3">
                  <input
                    type="text"
                    value={personalDraftName}
                    onChange={(e) => setPersonalDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPersonal();
                      }
                    }}
                    placeholder="Add a leave category…"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                  />
                  <button
                    type="button"
                    onClick={addPersonal}
                    disabled={!personalDraftName.trim()}
                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3 text-[13px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Add
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-brand-scrim"
            aria-label="Close"
            onClick={closeForm}
          />
          <div className="relative flex max-h-[min(92dvh,720px)] w-full max-w-[440px] flex-col overflow-hidden rounded-t-[24px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:rounded-[24px]">
            <div className="flex shrink-0 items-center justify-between border-b border-brand-line/40 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-brand-ink">
                {editing ? "Edit holiday" : "Add holiday"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
              <div className="relative z-[60]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                  Holiday
                </span>
                <SoftSelect
                  aria-label="U.S. public holiday"
                  className="mt-1.5"
                  size="md"
                  searchable
                  searchPlaceholder="Search U.S. holidays…"
                  placeholder="Search or select a holiday"
                  placement="above"
                  value={draft.catalogName}
                  options={PUBLIC_HOLIDAY_OPTIONS}
                  open={holidaySelectOpen}
                  onOpenChange={(next) => {
                    if (next) setDateField(null);
                    setHolidaySelectOpen(next);
                  }}
                  onChange={selectCatalogHoliday}
                />
              </div>

              {showCustomName ? (
                <label className="relative z-0 block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                    Custom name
                  </span>
                  <input
                    type="text"
                    value={draft.customName}
                    onChange={(e) =>
                      setDraft((current) => ({
                        ...current,
                        customName: e.target.value,
                      }))
                    }
                    placeholder="e.g. Studio closed"
                    className="mt-1.5 h-10 w-full rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-[13px] font-medium text-brand-ink outline-none transition focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </label>
              ) : null}

              <div className="relative z-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                  Dates
                </span>
                <div className="mt-1.5 inline-flex w-full rounded-xl bg-brand-bg p-1 ring-1 ring-inset ring-brand-line/45">
                  <button
                    type="button"
                    onClick={() => {
                      setDateField(null);
                      setDraft((current) => ({
                        ...current,
                        dateMode: "single",
                        endDate: current.startDate,
                      }));
                    }}
                    className={clsx(
                      "flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
                      draft.dateMode === "single"
                        ? "bg-brand-elevated font-semibold text-brand-ink shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    Single day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateField(null);
                      setDraft((current) => {
                        const range = ensureDistinctRange(
                          current.startDate,
                          current.endDate || current.startDate
                        );
                        return {
                          ...current,
                          dateMode: "range",
                          startDate: range.startDate,
                          endDate: range.endDate,
                        };
                      });
                    }}
                    className={clsx(
                      "flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
                      draft.dateMode === "range"
                        ? "bg-brand-elevated font-semibold text-brand-ink shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    Date range
                  </button>
                </div>

                {draft.dateMode === "single" ? (
                  <div className="mt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                      Date
                    </span>
                    <button
                      ref={startRef}
                      type="button"
                      onClick={() => {
                        setHolidaySelectOpen(false);
                        setDateField((current) =>
                          current === "start" ? null : "start"
                        );
                      }}
                      className="mt-1.5 flex h-10 w-full items-center rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-left text-[13px] font-semibold text-brand-ink transition hover:border-brand-line-strong"
                    >
                      {formatMonthDayLabel(draft.startDate)}
                    </button>
                    <DayCalendarPicker
                      open={dateField === "start"}
                      onClose={() => setDateField(null)}
                      excludeRef={startRef}
                      value={draft.startDate}
                      yearless
                      ariaLabel="Holiday date"
                      onSelect={(iso) => {
                        const md = toMonthDay(iso);
                        if (!md) return;
                        setDraft((current) => ({
                          ...current,
                          startDate: md,
                          endDate: md,
                        }));
                      }}
                    />
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                          From
                        </span>
                        <button
                          ref={startRef}
                          type="button"
                          onClick={() => {
                            setHolidaySelectOpen(false);
                            setDateField((current) =>
                              current === "start" ? null : "start"
                            );
                          }}
                          className="mt-1.5 flex h-10 w-full items-center rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-left text-[13px] font-semibold text-brand-ink transition hover:border-brand-line-strong"
                        >
                          {formatMonthDayLabel(draft.startDate)}
                        </button>
                        <DayCalendarPicker
                          open={dateField === "start"}
                          onClose={() => setDateField(null)}
                          excludeRef={startRef}
                          value={draft.startDate}
                          yearless
                          ariaLabel="Holiday start date"
                          isDateDisabled={(iso) => {
                            const md = toMonthDay(iso);
                            if (!md || !draft.endDate) return false;
                            // From must be before To (not same, not after).
                            return md >= draft.endDate;
                          }}
                          dayTitle={(iso, disabled) =>
                            disabled
                              ? "Must be before the end date"
                              : undefined
                          }
                          onSelect={(iso) => {
                            const md = toMonthDay(iso);
                            if (!md) return;
                            if (draft.endDate && md >= draft.endDate) return;
                            setDraft((current) => ({
                              ...current,
                              startDate: md,
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                          To
                        </span>
                        <button
                          ref={endRef}
                          type="button"
                          onClick={() => {
                            setHolidaySelectOpen(false);
                            setDateField((current) =>
                              current === "end" ? null : "end"
                            );
                          }}
                          className="mt-1.5 flex h-10 w-full items-center rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-left text-[13px] font-semibold text-brand-ink transition hover:border-brand-line-strong"
                        >
                          {formatMonthDayLabel(draft.endDate)}
                        </button>
                        <DayCalendarPicker
                          open={dateField === "end"}
                          onClose={() => setDateField(null)}
                          excludeRef={endRef}
                          value={draft.endDate}
                          yearless
                          ariaLabel="Holiday end date"
                          isDateDisabled={(iso) => {
                            const md = toMonthDay(iso);
                            if (!md || !draft.startDate) return false;
                            // To must be after From (not same, not before).
                            return md <= draft.startDate;
                          }}
                          dayTitle={(iso, disabled) =>
                            disabled
                              ? "Must be after the start date"
                              : undefined
                          }
                          onSelect={(iso) => {
                            const md = toMonthDay(iso);
                            if (!md) return;
                            if (draft.startDate && md <= draft.startDate)
                              return;
                            setDraft((current) => ({
                              ...current,
                              endDate: md,
                            }));
                          }}
                        />
                      </div>
                    </div>
                    {!isValidHolidayRange(draft.startDate, draft.endDate) ? (
                      <p className="text-[11px] text-brand-orange-deep">
                        End date must be after the start date.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="relative z-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                  Applies to
                </span>
                <div className="mt-1.5 inline-flex w-full rounded-xl bg-brand-bg p-1 ring-1 ring-inset ring-brand-line/45">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        appliesToAll: true,
                      }))
                    }
                    className={clsx(
                      "flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
                      draft.appliesToAll
                        ? "bg-brand-elevated font-semibold text-brand-ink shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    All producers
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        appliesToAll: false,
                      }))
                    }
                    className={clsx(
                      "flex-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
                      !draft.appliesToAll
                        ? "bg-brand-elevated font-semibold text-brand-ink shadow-sm"
                        : "text-brand-ink-secondary hover:text-brand-ink"
                    )}
                  >
                    Some producers
                  </button>
                </div>

                {!draft.appliesToAll ? (
                  <div className="mt-2 max-h-48 overflow-y-auto overscroll-contain rounded-xl ring-1 ring-inset ring-brand-line/45">
                    {sortedProducers.length === 0 ? (
                      <p className="px-3 py-3 text-[12px] text-brand-ink-tertiary">
                        No producers in the roster yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-brand-line/35">
                        {sortedProducers.map((producer) => {
                          const checked = draft.producerIds.includes(
                            producer.id
                          );
                          return (
                            <li key={producer.id}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                onClick={() =>
                                  toggleDraftProducer(producer.id)
                                }
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-brand-bg/70"
                              >
                                <span
                                  className={clsx(
                                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition",
                                    checked
                                      ? "bg-brand-blue text-white shadow-sm ring-1 ring-inset ring-brand-blue-deep/30"
                                      : "bg-brand-elevated ring-1 ring-inset ring-brand-line/70"
                                  )}
                                >
                                  {checked ? (
                                    <Check
                                      className="h-3 w-3"
                                      strokeWidth={2.5}
                                    />
                                  ) : null}
                                </span>
                                <span className="min-w-0 truncate text-[13px] font-medium text-brand-ink">
                                  {producer.name}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
                {!draft.appliesToAll && draft.producerIds.length === 0 ? (
                  <p className="mt-1.5 text-[11px] text-brand-orange-deep">
                    Select at least one producer.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-brand-line/40 px-5 py-4">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-full py-2.5 text-[13px] font-semibold text-brand-ink-secondary transition hover:bg-brand-bg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveForm}
                disabled={
                  !draftDisplayName(draft) ||
                  !draft.startDate ||
                  (!draft.appliesToAll && draft.producerIds.length === 0) ||
                  (draft.dateMode === "range" &&
                    !isValidHolidayRange(draft.startDate, draft.endDate))
                }
                className="flex-1 rounded-full bg-brand-blue py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-40"
              >
                {editing ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
