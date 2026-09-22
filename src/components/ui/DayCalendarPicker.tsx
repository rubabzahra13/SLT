"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { HoverTip } from "@/components/ui/HoverTip";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type SelectOption = {
  value: number;
  label: string;
};

function MonthYearSelect({
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  className,
  open,
  onOpenChange,
}: {
  "aria-label": string;
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;

    let remove: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function onDocPointerDown(event: PointerEvent) {
        const target = event.target as Node;
        if (rootRef.current?.contains(target)) return;
        onOpenChange(false);
      }
      function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") onOpenChange(false);
      }
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKeyDown);
      remove = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKeyDown);
      };
    }, 0);

    return () => {
      window.clearTimeout(timer);
      remove?.();
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className={clsx("relative min-w-0", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={clsx(
          "inline-flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-full bg-brand-bg px-2.5 text-left text-[12px] font-semibold text-brand-ink outline-none transition",
          "hover:bg-brand-bg-subtle focus-visible:ring-2 focus-visible:ring-brand-blue/20",
          open &&
            "bg-brand-blue-soft/70 text-brand-signature ring-1 ring-inset ring-brand-blue/25"
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
            open && "rotate-180 text-brand-signature"
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-48 overflow-y-auto rounded-xl border border-brand-line/50 bg-white p-1 shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/10 scrollbar-hide"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(opt.value);
                  onOpenChange(false);
                }}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                  isSelected
                    ? "bg-brand-blue-soft text-brand-signature"
                    : "text-brand-ink-secondary hover:bg-brand-bg-subtle hover:text-brand-ink"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {isSelected ? (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-brand-signature"
                    strokeWidth={2.5}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function isoFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoToLocalDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Shift an ISO date by whole months (local calendar). */
export function addMonthsToIso(iso: string, months: number): string {
  const date = parseIsoToLocalDate(iso);
  if (!date) return iso;
  date.setMonth(date.getMonth() + months);
  return isoFromLocalDate(date);
}

/** Shift an ISO date by whole days (local calendar). */
export function addDaysToIso(iso: string, days: number): string {
  const date = parseIsoToLocalDate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return isoFromLocalDate(date);
}

/** Shift an ISO date by whole years (local calendar). */
export function addYearsToIso(iso: string, years: number): string {
  const date = parseIsoToLocalDate(iso);
  if (!date) return iso;
  date.setFullYear(date.getFullYear() + years);
  return isoFromLocalDate(date);
}

function buildCalendarCells(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  return cells;
}

type MenuPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
};

export type DayCalendarPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (iso: string) => void;
  /** Anchor for fixed positioning. */
  excludeRef?: React.RefObject<HTMLElement | null>;
  /** Highlighted / currently chosen date. */
  value?: string | null;
  /** Extra selected dates (e.g. already-added overtime). */
  selectedDays?: string[];
  /** Inclusive minimum selectable ISO date. Defaults to today. */
  minIso?: string;
  /** Inclusive maximum selectable ISO date. Defaults to today + 5 years. */
  maxIso?: string;
  /** Return true to disable a calendar day. */
  isDateDisabled?: (iso: string) => boolean;
  /** Optional title for a disabled day. */
  dayTitle?: (iso: string, disabled: boolean) => string | undefined;
  /**
   * Visual tone for a day cell. Keeps the day looking unavailable while
   * coloring leave / holiday / overtime clashes differently.
   */
  dayTone?: (
    iso: string,
    disabled: boolean
  ) => "overtime" | "holiday" | "leave" | undefined;
  /** Footer content (e.g. Today button / helper text). */
  footer?: ReactNode;
  /** Shown instead of the grid when true. */
  emptyMessage?: string | null;
  ariaLabel?: string;
  /**
   * Month/day only: hide year control, use a fixed leap year for the grid.
   * `onSelect` still receives YYYY-MM-DD (reference year); callers strip to MM-DD.
   */
  yearless?: boolean;
};

function monthStartIso(date: Date): string {
  return isoFromLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function DayCalendarPicker({
  open,
  onClose,
  onSelect,
  excludeRef,
  value = null,
  selectedDays = [],
  minIso,
  maxIso,
  isDateDisabled,
  dayTitle,
  dayTone,
  footer,
  emptyMessage = null,
  ariaLabel = "Choose date",
  yearless = false,
}: DayCalendarPickerProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [openSelect, setOpenSelect] = useState<"month" | "year" | null>(null);

  const setMonthSelectOpen = useMemo(
    () => (next: boolean) => setOpenSelect(next ? "month" : null),
    []
  );
  const setYearSelectOpen = useMemo(
    () => (next: boolean) => setOpenSelect(next ? "year" : null),
    []
  );

  useEffect(() => setMounted(true), []);

  const todayIso = isoFromLocalDate(new Date());
  const referenceYear = 2000;
  const effectiveMinIso = yearless
    ? `${referenceYear}-01-01`
    : (minIso ?? todayIso);
  const effectiveMaxIso = yearless
    ? `${referenceYear}-12-31`
    : (maxIso ?? addYearsToIso(todayIso, 5));

  const minBoundDate =
    parseIsoToLocalDate(effectiveMinIso) ?? new Date();
  const maxBoundDate =
    parseIsoToLocalDate(effectiveMaxIso) ??
    parseIsoToLocalDate(addYearsToIso(todayIso, 5)) ??
    new Date();
  const minYear = minBoundDate.getFullYear();
  const maxYear = maxBoundDate.getFullYear();
  const minMonthStart = monthStartIso(minBoundDate);
  const maxMonthStart = monthStartIso(maxBoundDate);

  const resolveValueDate = (raw: string | null | undefined): Date | null => {
    if (!raw) return null;
    if (/^\d{2}-\d{2}$/.test(raw)) {
      return parseIsoToLocalDate(`${referenceYear}-${raw}`);
    }
    return parseIsoToLocalDate(raw);
  };

  const updatePosition = () => {
    const el = excludeRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const menuWidth = 280;
    const menuHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    setPosition({
      left: Math.round(Math.max(8, left)),
      width: menuWidth,
      ...(openUp
        ? { bottom: Math.round(window.innerHeight - rect.top + gap) }
        : { top: Math.round(rect.bottom + gap) }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const seed =
      resolveValueDate(value) ??
      parseIsoToLocalDate(effectiveMinIso) ??
      new Date();
    if (yearless) {
      setViewMonth(new Date(referenceYear, seed.getMonth(), 1));
    } else {
      const clamped = clampViewMonth(
        new Date(seed.getFullYear(), seed.getMonth(), 1)
      );
      setViewMonth(clamped);
    }
    setOpenSelect(null);
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, yearless, effectiveMinIso, effectiveMaxIso]);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (excludeRef?.current?.contains(target)) return;
      onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, excludeRef]);

  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);
  const highlightIso = useMemo(() => {
    const resolved = resolveValueDate(value);
    return resolved ? isoFromLocalDate(resolved) : null;
  }, [value]);
  const cells = buildCalendarCells(
    viewMonth.getFullYear(),
    viewMonth.getMonth()
  );

  const yearOptions = useMemo(() => {
    const years: SelectOption[] = [];
    for (let year = minYear; year <= maxYear; year += 1) {
      years.push({ value: year, label: String(year) });
    }
    return years;
  }, [minYear, maxYear]);

  const showYearSelect = !yearless && yearOptions.length > 1;

  const monthOptions = useMemo(() => {
    return MONTH_OPTIONS.map((label, index) => ({
      value: index,
      label,
    })).filter((opt) => {
      if (yearless) return true;
      const candidate = monthStartIso(
        new Date(viewMonth.getFullYear(), opt.value, 1)
      );
      return candidate >= minMonthStart && candidate <= maxMonthStart;
    });
  }, [yearless, viewMonth, minMonthStart, maxMonthStart]);

  function clampViewMonth(date: Date): Date {
    if (yearless) {
      return new Date(referenceYear, date.getMonth(), 1);
    }
    const candidate = new Date(date.getFullYear(), date.getMonth(), 1);
    const candidateIso = monthStartIso(candidate);
    if (candidateIso < minMonthStart) {
      return new Date(minBoundDate.getFullYear(), minBoundDate.getMonth(), 1);
    }
    if (candidateIso > maxMonthStart) {
      return new Date(maxBoundDate.getFullYear(), maxBoundDate.getMonth(), 1);
    }
    return candidate;
  }

  function shiftViewMonth(delta: number) {
    setViewMonth((prev) => {
      if (yearless) {
        const nextMonth = prev.getMonth() + delta;
        if (nextMonth < 0 || nextMonth > 11) return prev;
        return new Date(referenceYear, nextMonth, 1);
      }
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      return clampViewMonth(next);
    });
  }

  function isDayDisabled(iso: string): boolean {
    if (!yearless && iso < effectiveMinIso) return true;
    if (!yearless && iso > effectiveMaxIso) return true;
    if (isDateDisabled?.(iso)) return true;
    return false;
  }

  function selectDate(iso: string) {
    if (isDayDisabled(iso)) return;
    onSelect(iso);
    onClose();
  }

  const atMinMonth =
    yearless
      ? viewMonth.getMonth() === 0
      : monthStartIso(viewMonth) <= minMonthStart;
  const atMaxMonth =
    yearless
      ? viewMonth.getMonth() === 11
      : monthStartIso(viewMonth) >= maxMonthStart;

  if (!mounted || !open || !position) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="dialog"
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-[60] overflow-visible rounded-xl border border-brand-line/60 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/15"
      style={{
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        width: position.width,
      }}
    >
      <div className="relative z-10 flex items-center justify-between gap-1 rounded-t-xl border-b border-brand-line/40 bg-brand-bg-subtle/40 px-2 py-2">
        <button
          type="button"
          onClick={() => {
            setOpenSelect(null);
            shiftViewMonth(-1);
          }}
          disabled={atMinMonth}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-ink-secondary transition hover:bg-white hover:text-brand-ink disabled:pointer-events-none disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <MonthYearSelect
            aria-label="Month"
            value={viewMonth.getMonth()}
            options={monthOptions}
            onChange={(month) =>
              setViewMonth((prev) =>
                clampViewMonth(new Date(prev.getFullYear(), month, 1))
              )
            }
            open={openSelect === "month"}
            onOpenChange={setMonthSelectOpen}
            className={
              yearless || !showYearSelect
                ? "min-w-[8.5rem] flex-1"
                : "min-w-[7.5rem] flex-[1.45]"
            }
          />
          {showYearSelect ? (
            <MonthYearSelect
              aria-label="Year"
              value={Math.min(
                maxYear,
                Math.max(minYear, viewMonth.getFullYear())
              )}
              options={yearOptions}
              onChange={(year) =>
                setViewMonth((prev) =>
                  clampViewMonth(new Date(year, prev.getMonth(), 1))
                )
              }
              open={openSelect === "year"}
              onOpenChange={setYearSelectOpen}
              className="min-w-[4.75rem] flex-1"
            />
          ) : !yearless && yearOptions.length === 1 ? (
            <span className="shrink-0 px-1 text-[12px] font-semibold tabular-nums text-brand-ink">
              {yearOptions[0].label}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpenSelect(null);
            shiftViewMonth(1);
          }}
          disabled={atMaxMonth}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-ink-secondary transition hover:bg-white hover:text-brand-ink disabled:pointer-events-none disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {emptyMessage ? (
        <p className="px-4 py-6 text-center text-[12px] leading-relaxed text-brand-ink-secondary">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 px-3 pt-2">
            {WEEKDAY_LABELS.map((label) => (
              <span
                key={label}
                className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-brand-ink-tertiary"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-2 pt-1">
            {cells.map((iso, index) => {
              if (!iso) {
                return <span key={`empty-${index}`} aria-hidden />;
              }
              const disabled = isDayDisabled(iso);
              const tip =
                dayTitle?.(iso, disabled) ??
                (!yearless && iso < todayIso
                  ? "Past day"
                  : !yearless && !disabled && todayIso === iso
                    ? "Today"
                    : undefined);
              const tone = dayTone?.(iso, disabled);
              const dayButton = (
                <button
                  type="button"
                  aria-disabled={disabled}
                  aria-label={tip || undefined}
                  onClick={() => {
                    if (disabled) return;
                    selectDate(iso);
                  }}
                  className={clsx(
                    "h-8 w-full rounded-lg text-[12px] font-medium tabular-nums transition",
                    tone === "overtime"
                      ? "cursor-not-allowed bg-brand-blue-soft text-brand-blue-deep/70 opacity-70 ring-1 ring-inset ring-brand-blue/25 hover:bg-brand-blue-soft"
                      : tone === "holiday"
                        ? "cursor-not-allowed bg-brand-orange-soft/55 text-brand-orange/65 opacity-70 ring-1 ring-inset ring-brand-orange/20 hover:bg-brand-orange-soft/55"
                        : tone === "leave"
                          ? "cursor-not-allowed bg-brand-orange-muted text-brand-orange-deep opacity-80 ring-1 ring-inset ring-brand-orange-deep/35 hover:bg-brand-orange-muted"
                          : disabled
                            ? "cursor-not-allowed text-brand-ink-tertiary opacity-30 hover:bg-transparent"
                            : highlightIso === iso || selectedSet.has(iso)
                              ? "bg-brand-signature text-white shadow-sm"
                              : !yearless && todayIso === iso
                                ? "bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20"
                                : "text-brand-ink-secondary hover:bg-brand-bg-subtle hover:text-brand-ink"
                  )}
                >
                  {parseIsoToLocalDate(iso)?.getDate()}
                </button>
              );
              return tip ? (
                <HoverTip
                  key={iso}
                  label={tip}
                  placement="top"
                  className="block w-full"
                >
                  {dayButton}
                </HoverTip>
              ) : (
                <div key={iso}>{dayButton}</div>
              );
            })}
          </div>

          {footer != null ? (
            <div className="flex items-center justify-between gap-2 border-t border-brand-line/40 bg-brand-bg-subtle/50 px-3 py-2">
              {footer}
            </div>
          ) : null}
        </>
      )}
    </div>,
    document.body
  );
}
