"use client";

import { X } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { getCellBookings } from "@/components/schedule/schedule-legend";
import {
  statusLabel,
  type ScheduleCell,
  type ScheduleViewRange,
} from "@/lib/schedule-view";
import type { Producer } from "@/types";

type ProducerScheduleDrawerProps = {
  open: boolean;
  producer: Producer | null;
  cells: ScheduleCell[];
  range: ScheduleViewRange;
  focusCell?: ScheduleCell | null;
  onClose: () => void;
};

function rangeListLabel(range: ScheduleViewRange): string {
  if (range === "today") return "Today";
  if (range === "week") return "This week";
  if (range === "month") return "Last 30 days";
  if (range === "90days") return "Last 90 days";
  return "Last 6 months";
}

function TodayBookingsPanel({ cell }: { cell: ScheduleCell }) {
  const bookings = getCellBookings(cell);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-brand-blue-soft/60 px-5 py-4">
      <div className="shrink-0">
        <p className="text-label">Booked today</p>
        <p className="mt-1 text-[15px] font-semibold text-brand-ink">
          {cell.dayLabel}, {cell.dateLabel}
        </p>
      </div>

      {bookings.length > 0 ? (
        <DottedScroll
          className="mt-4 min-h-0 flex-1"
          scrollClassName="h-full overflow-y-auto pr-1 scrollbar-hide"
          indicatorPlacement="gutter"
          contentClassName="flex flex-col gap-2 pb-2"
        >
          {bookings.map((booking, index) => (
            <div
              key={booking.mixId ?? `${cell.key}-${index}`}
              className="rounded-xl border border-brand-line/70 bg-brand-surface/90 px-3 py-3"
            >
              <p className="text-[13px] font-semibold leading-snug text-brand-ink">
                {booking.work}
              </p>
              <p className="mt-1.5 text-[12px] text-brand-ink-secondary">
                Until {booking.until}
              </p>
            </div>
          ))}
        </DottedScroll>
      ) : (
        <div className="mt-4 rounded-xl border border-brand-line/70 bg-brand-surface/90 px-3 py-3">
          <p className="text-[13px] font-semibold text-brand-signature">
            {statusLabel(cell.status)}
          </p>
          <p className="mt-1 text-[12px] text-brand-ink-secondary">
            {cell.unavailable
              ? "Not available for new assignments today."
              : "Available for booking today."}
          </p>
        </div>
      )}
    </div>
  );
}

export function ProducerScheduleDrawer({
  open,
  producer,
  cells,
  range,
  focusCell,
  onClose,
}: ProducerScheduleDrawerProps) {
  if (!open || !producer) return null;

  const isTodayView = range === "today";
  const todayCell = focusCell ?? cells[0] ?? null;

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
          <div className="flex items-center gap-3">
            <Avatar producer={producer} size="md" />
            <div>
              <h2 className="text-display text-[17px]">{producer.name}</h2>
              <p className="mt-0.5 text-[12px] text-brand-ink-secondary">
                {producer.specialty} · Next {producer.nextAvailable}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isTodayView && todayCell ? <TodayBookingsPanel cell={todayCell} /> : null}

        {!isTodayView && focusCell ? (
          <div className="border-b border-brand-line/70 bg-brand-blue-soft/60 px-5 py-4">
            <p className="text-label">Selected day</p>
            <p className="mt-1 text-[15px] font-semibold">
              {focusCell.dayLabel}, {focusCell.dateLabel}
            </p>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {statusLabel(focusCell.status)}
              {focusCell.unavailable
                ? " — not available for new assignments"
                : " — available for booking"}
            </p>
          </div>
        ) : null}

        {!isTodayView ? (
          <DottedScroll
            className="min-h-0 flex-1"
            scrollClassName="h-full overflow-y-scroll scrollbar-hide p-5"
            indicatorPlacement="gutter"
            contentClassName="flex flex-col gap-1.5"
          >
            <p className="text-label mb-3">{rangeListLabel(range)}</p>
            {cells.map((cell) => {
              const bookings = getCellBookings(cell);
              return (
                <div
                  key={cell.key}
                  className={clsx(
                    "flex items-center justify-between rounded-xl px-3 py-2.5",
                    focusCell?.key === cell.key
                      ? "bg-brand-blue-soft ring-1 ring-brand-blue/25"
                      : "bg-brand-surface"
                  )}
                >
                  <div>
                    <p className="text-[13px] font-medium">
                      {cell.dayLabel}, {cell.dateLabel}
                    </p>
                    <p className="text-[11px] text-brand-ink-tertiary">
                      {statusLabel(cell.status)}
                      {bookings.length > 0 && bookings[0].work
                        ? ` · ${bookings.map((b) => b.work).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "h-3 w-3 rounded-[3px]",
                      cell.status === "off"
                        ? "bg-brand-orange"
                        : cell.unavailable
                          ? "bg-brand-signature"
                          : "bg-emerald-500 ring-1 ring-emerald-600/30"
                    )}
                  />
                </div>
              );
            })}
          </DottedScroll>
        ) : null}
      </aside>
    </div>
  );
}
