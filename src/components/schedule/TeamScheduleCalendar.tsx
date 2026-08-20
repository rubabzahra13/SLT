"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import {
  buildCalendarDays,
  buildMonthGrid,
  statusLabel,
  type CalendarDay,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ANCHOR_DATE = new Date(2026, 7, 19);

type TeamScheduleCalendarProps = {
  rows: TeamScheduleRow[];
  range: Extract<ScheduleViewRange, "week" | "month">;
  selectedDayKey?: string | null;
  onSelectDay: (day: CalendarDay) => void;
  className?: string;
};

type ScheduleDayDrawerProps = {
  open: boolean;
  day: CalendarDay | null;
  onClose: () => void;
  onSelectProducer: (producerId: string, dayKey: string) => void;
};

export function TeamScheduleCalendar({
  rows,
  range,
  selectedDayKey,
  onSelectDay,
  className,
}: TeamScheduleCalendarProps) {
  const weeks =
    range === "week"
      ? [buildCalendarDays(rows, "week", ANCHOR_DATE)]
      : buildMonthGrid(rows, ANCHOR_DATE);

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border border-brand-line/80 bg-brand-surface shadow-[var(--shadow-premium-sm)]",
        className
      )}
    >
      {/* weekday header */}
      <div className="grid grid-cols-7 border-b border-brand-line/60 bg-brand-accent-soft/40">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="border-r border-brand-line/30 px-2.5 py-2 text-center last:border-r-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-ink-tertiary">
              {d}
            </p>
          </div>
        ))}
      </div>

      <DottedScroll
        className="min-h-0"
        scrollClassName="max-h-[calc(100dvh-12rem)] overflow-y-scroll scrollbar-hide"
        indicatorPlacement="overlay"
        contentClassName="min-w-0"
      >
        {/* week rows separated by a 1px line */}
        <div className="divide-y divide-brand-line/40">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 divide-x divide-brand-line/30">
              {week.map((day) => (
                <CalendarDayCard
                  key={day.key}
                  day={day}
                  compact={range === "month"}
                  selected={selectedDayKey === day.key}
                  onClick={() => day.isCurrentMonth && onSelectDay(day)}
                />
              ))}
            </div>
          ))}
        </div>
      </DottedScroll>
    </div>
  );
}

export function ScheduleDayDrawer({
  open,
  day,
  onClose,
  onSelectProducer,
}: ScheduleDayDrawerProps) {
  if (!open || !day) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]">
        <div className="flex items-start justify-between gap-4 border-b border-brand-line/70 p-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-ink-tertiary">
              Schedule Day
            </p>
            <h2 className="mt-1 text-display text-[18px]">
              {day.dayLabel}, {day.dateLabel}
            </h2>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {day.unavailableCount} unavailable
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="h-full overflow-y-scroll scrollbar-hide p-5"
          indicatorPlacement="gutter"
          contentClassName="flex flex-col gap-2"
        >
          {day.unavailableProducers.length === 0 ? (
            <div className="rounded-2xl border border-brand-line/70 bg-brand-bg/40 px-4 py-5">
              <p className="text-[14px] font-medium text-brand-ink">Everyone is open.</p>
              <p className="mt-1 text-[12px] text-brand-ink-secondary">
                No producers are marked unavailable on this day.
              </p>
            </div>
          ) : (
            day.unavailableProducers.map(({ producer, cell }) => (
              <button
                key={producer.id}
                type="button"
                onClick={() => onSelectProducer(producer.id, day.key)}
                className="flex items-center justify-between gap-3 rounded-2xl border border-brand-line/70 bg-brand-bg/40 px-4 py-3 text-left transition hover:border-brand-line-strong hover:bg-brand-bg/70"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={producer.avatar} alt={producer.name} size="sm" />
                  <div>
                    <p className="text-[14px] font-semibold text-brand-ink">{producer.name}</p>
                    <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                      {producer.specialty}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-brand-warning">
                    {statusLabel(cell.status)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-brand-ink-tertiary">
                    Open producer
                  </p>
                </div>
              </button>
            ))
          )}
        </DottedScroll>
      </aside>
    </div>
  );
}

function CalendarDayCard({
  day,
  compact,
  selected,
  onClick,
}: {
  day: CalendarDay;
  compact: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const maxVisible = compact ? 4 : 5;
  const visibleProducers = day.unavailableProducers.slice(0, maxVisible);
  const moreCount = day.unavailableProducers.length - visibleProducers.length;
  const isOtherMonth = !day.isCurrentMonth;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isOtherMonth}
      className={clsx(
        "group flex min-h-[130px] flex-col gap-2.5 bg-brand-surface px-2.5 py-2.5 text-left transition",
        !isOtherMonth && "hover:bg-brand-bg/30",
        isOtherMonth && "cursor-default bg-brand-bg/25 opacity-40",
        day.isToday && "bg-brand-signature-soft",
        selected && "ring-1 ring-inset ring-brand-signature/40 bg-brand-signature-soft"
      )}
    >
      {/* date number + badge */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums leading-none",
            day.isToday
              ? "bg-brand-cta text-brand-cta-text"
              : "text-brand-ink"
          )}
        >
          {day.date.getDate()}
        </span>

        {day.unavailableCount > 0 ? (
          <span className="rounded-full bg-brand-accent-soft px-2 py-0.5 text-[10px] font-medium tabular-nums text-brand-ink-tertiary">
            {day.unavailableCount} off
          </span>
        ) : (
          <span className="rounded-full bg-brand-accent-soft px-2 py-0.5 text-[10px] font-medium text-brand-ink-tertiary">
            Open
          </span>
        )}
      </div>

      {/* crossed-out producer avatars */}
      {day.unavailableCount > 0 && (
        <div className="flex flex-wrap items-end gap-1.5">
          {visibleProducers.map(({ producer }) => (
            <div
              key={`${day.key}-${producer.id}`}
              className="flex flex-col items-center gap-0.5"
              title={producer.name}
            >
              <div className="relative">
                <Avatar src={producer.avatar} alt={producer.name} size="xs" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/25">
                  <svg viewBox="0 0 10 10" className="h-3 w-3 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="2" y1="2" x2="8" y2="8" />
                    <line x1="8" y1="2" x2="2" y2="8" />
                  </svg>
                </div>
              </div>
              <span className="text-[8.5px] font-semibold leading-none text-brand-ink-secondary">
                {producer.initials}
              </span>
            </div>
          ))}
          {moreCount > 0 && (
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-brand-line/70 bg-brand-bg text-[9px] font-semibold text-brand-ink-secondary">
                +{moreCount}
              </div>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
