"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  MONTHS,
  todayIso,
  type DateFilterValue,
} from "@/lib/date-filters";
import { getDateFilterLabel } from "@/lib/date-filters";

type DateFilterProps = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
};

const VIEW_MAIN = "main";
const VIEW_MONTH = "month";
const VIEW_YEAR = "year";
const VIEW_CUSTOM = "custom";

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(VIEW_MAIN);
  const [navDate, setNavDate] = useState(() => new Date());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView(VIEW_MAIN);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const currentLabel = useMemo(() => getDateFilterLabel(value), [value]);
  const hasFilter = value.type !== "all";

  function handleSelectType(
    type: DateFilterValue["type"],
    val: DateFilterValue["value"] = null
  ) {
    setOpen(false);
    setView(VIEW_MAIN);
    onChange({ type, value: val });
  }

  function renderMainMenu() {
    const presets: { label: string; type: DateFilterValue["type"] }[] = [
      { label: "All time", type: "all" },
      { label: "This week", type: "thisWeek" },
      { label: "Last 30 days", type: "last30Days" },
      { label: "This month", type: "thisMonth" },
    ];

    return (
      <div className="min-w-[200px] py-1">
        {presets.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => handleSelectType(opt.type)}
            className={clsx(
              "block w-full px-4 py-2 text-left text-[13px] font-medium transition hover:bg-brand-bg",
              value.type === opt.type
                ? "bg-brand-accent-soft text-brand-ink"
                : "text-brand-ink-secondary"
            )}
          >
            {opt.label}
          </button>
        ))}
        <div className="my-1 border-t border-brand-line/70" />
        {[
          { label: "Month", nextView: VIEW_MONTH },
          { label: "Year", nextView: VIEW_YEAR },
          { label: "Custom date range", nextView: VIEW_CUSTOM },
        ].map((opt) => (
          <button
            key={opt.nextView}
            type="button"
            onClick={() => setView(opt.nextView)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-[13px] font-medium text-brand-ink-secondary transition hover:bg-brand-bg"
          >
            <span>{opt.label}</span>
            <ChevronRight className="h-4 w-4 text-brand-ink-tertiary" />
          </button>
        ))}
      </div>
    );
  }

  function renderMonthMenu() {
    const navYear = navDate.getFullYear();

    return (
      <div className="min-w-[240px] p-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView(VIEW_MAIN)}
            className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg hover:text-brand-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold">{navYear}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setNavDate(new Date(navYear - 1, navDate.getMonth(), 1))
              }
              className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={navYear >= currentYear}
              onClick={() =>
                setNavDate(new Date(navYear + 1, navDate.getMonth(), 1))
              }
              className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((label, i) => {
            const key = `${navYear}-${String(i + 1).padStart(2, "0")}`;
            const disabled = navYear === currentYear && i > currentMonth;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectType("month", key)}
                className={clsx(
                  "rounded-md px-2 py-1.5 text-[12px] font-medium transition",
                  disabled && "cursor-not-allowed text-brand-ink-tertiary/40",
                  !disabled &&
                    value.type === "month" &&
                    value.value === key &&
                    "bg-brand-accent text-white",
                  !disabled &&
                    !(value.type === "month" && value.value === key) &&
                    "text-brand-ink-secondary hover:bg-brand-bg"
                )}
              >
                {label.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderYearMenu() {
    const startDecade = Math.floor(navDate.getFullYear() / 10) * 10;
    const years = Array.from({ length: 12 }, (_, i) => startDecade - 1 + i);

    return (
      <div className="min-w-[240px] p-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView(VIEW_MAIN)}
            className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold">
            {years[1]} - {years[10]}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setNavDate(new Date(startDecade - 10, 0, 1))
              }
              className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={startDecade + 10 > currentYear}
              onClick={() =>
                setNavDate(new Date(startDecade + 10, 0, 1))
              }
              className="rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              disabled={y > currentYear}
              onClick={() => handleSelectType("year", String(y))}
              className={clsx(
                "rounded-md px-2 py-1.5 text-[12px] font-medium transition",
                y > currentYear && "cursor-not-allowed text-brand-ink-tertiary/40",
                y <= currentYear &&
                  value.type === "year" &&
                  value.value === String(y) &&
                  "bg-brand-accent text-white",
                y <= currentYear &&
                  !(value.type === "year" && value.value === String(y)) &&
                  "text-brand-ink-secondary hover:bg-brand-bg"
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderCustomMenu() {
    return (
      <div className="min-w-[260px] p-3">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView(VIEW_MAIN)}
            className="-ml-1 rounded p-1 text-brand-ink-tertiary hover:bg-brand-bg"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[13px] font-semibold">Custom range</span>
        </div>
        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
              Start date
            </label>
            <input
              type="date"
              max={todayIso()}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
              End date
            </label>
            <input
              type="date"
              max={todayIso()}
              min={customStart}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full rounded-lg border border-brand-line/80 bg-brand-surface px-3 py-2 text-[13px] outline-none focus:border-brand-info/60 focus:ring-2 focus:ring-brand-info/15"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!customStart || !customEnd || customStart > customEnd}
          onClick={() =>
            handleSelectType("custom", { start: customStart, end: customEnd })
          }
          className="w-full rounded-lg bg-brand-cta py-2 text-[13px] font-semibold text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45"
        >
          Apply range
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium transition",
          hasFilter
            ? "border-brand-info/40 bg-brand-info/8 text-brand-ink"
            : "border-brand-line bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"
        )}
      >
        <Calendar
          className={clsx(
            "h-3.5 w-3.5 shrink-0",
            hasFilter ? "text-brand-info" : "text-brand-ink-tertiary"
          )}
        />
        <span className="max-w-[180px] truncate">{currentLabel}</span>
        {hasFilter ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleSelectType("all");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                handleSelectType("all");
              }
            }}
            className="rounded p-0.5 text-brand-ink-tertiary hover:text-brand-warning"
            aria-label="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]">
          {view === VIEW_MAIN && renderMainMenu()}
          {view === VIEW_MONTH && renderMonthMenu()}
          {view === VIEW_YEAR && renderYearMenu()}
          {view === VIEW_CUSTOM && renderCustomMenu()}
        </div>
      ) : null}
    </div>
  );
}

export type { DateFilterValue };
