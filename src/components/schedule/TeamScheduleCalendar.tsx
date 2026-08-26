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
  type CalendarDayProducer,
  type ScheduleCell,
  type ScheduleViewRange,
  type TeamScheduleRow,
} from "@/lib/schedule-view";
import type { Producer } from "@/types";

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
      className={clsx("overflow-hidden", className)}
    >
      {/* weekday header */}
      <div className="schedule-chrome-header grid grid-cols-7 border-b border-brand-line/30">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d} className="border-r border-brand-line/30 px-2.5 py-2 text-center last:border-r-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
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
              <p className="text-[14px] font-medium text-brand-ink">Everyone is available.</p>
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
                    View producer
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

function UnavailableProducerAvatar({
  producer,
  cell,
  compact,
}: {
  producer: Producer;
  cell: ScheduleCell;
  compact?: boolean;
}) {
  const isOff = cell.status === "off";

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5"
      title={`${producer.name}${isOff ? " · Off" : " · Booked"}`}
    >
      <div className="relative">
        <div
          className={clsx(
            "rounded-full ring-1 ring-offset-1 ring-offset-brand-elevated",
            isOff ? "ring-brand-orange/55" : "ring-brand-blue/45"
          )}
        >
          <Avatar src={producer.avatar} alt={producer.name} size="xs" />
        </div>
        <div
          className={clsx(
            "pointer-events-none absolute inset-0 flex items-center justify-center rounded-full",
            isOff
              ? "bg-brand-orange/40"
              : "bg-gradient-to-b from-brand-blue/55 to-brand-signature/55"
          )}
        >
          <svg
            viewBox="0 0 10 10"
            className="h-3 w-3 text-white/90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden
          >
            <line x1="2" y1="2" x2="8" y2="8" />
            <line x1="8" y1="2" x2="2" y2="8" />
          </svg>
        </div>
      </div>
      <span
        className={clsx(
          "max-w-[2rem] truncate font-semibold leading-none",
          compact ? "text-[7.5px] tracking-[0.02em]" : "text-[8.5px] tracking-[0.03em]",
          isOff ? "text-brand-orange-deep" : "text-brand-signature"
        )}
      >
        {producer.initials}
      </span>
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
  const isOtherMonth = !day.isCurrentMonth;
  const unavailable = day.unavailableProducers;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isOtherMonth}
      className={clsx(
        "group flex min-h-[130px] flex-col bg-brand-elevated px-2.5 py-2.5 text-left transition",
        !isOtherMonth && "hover:bg-brand-blue-soft/40",
        isOtherMonth && "cursor-default bg-brand-bg/40 opacity-40",
        day.isToday && "bg-brand-blue-soft",
        selected && "bg-brand-blue-soft ring-1 ring-inset ring-brand-signature/40"
      )}
    >
      <div className="flex items-start">
        <span
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums leading-none",
            day.isToday ? "bg-brand-signature text-white" : "text-brand-ink"
          )}
        >
          {day.date.getDate()}
        </span>
      </div>

      {unavailable.length > 0 ? (
        <div
          className={clsx(
            "mt-auto flex flex-wrap content-end gap-1.5 pt-2",
            compact && "gap-1"
          )}
        >
          {unavailable.map(({ producer, cell }: CalendarDayProducer) => (
            <UnavailableProducerAvatar
              key={`${day.key}-${producer.id}`}
              producer={producer}
              cell={cell}
              compact={compact}
            />
          ))}
        </div>
      ) : null}
    </button>
  );
}
