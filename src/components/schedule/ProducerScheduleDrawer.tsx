"use client";

import { X } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import {
  countUnavailable,
  statusLabel,
  type ScheduleCell,
  type ScheduleViewRange,
  type TeamScheduleRow,
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

export function ProducerScheduleDrawer({
  open,
  producer,
  cells,
  range,
  focusCell,
  onClose,
}: ProducerScheduleDrawerProps) {
  if (!open || !producer) return null;

  const unavailable = countUnavailable(cells);
  const available = cells.length - unavailable;

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
            <Avatar src={producer.avatar} alt={producer.name} size="md" />
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

        <div className="grid grid-cols-3 gap-3 border-b border-brand-line/70 p-5">
          <Stat label="Open" value={available} tone="success" />
          <Stat label="Unavailable" value={unavailable} tone="neutral" />
          <Stat
            label="Status"
            value={producer.status}
            tone={producer.status === "available" ? "success" : "warning"}
            text
          />
        </div>

        {focusCell ? (
          <div className="border-b border-brand-line/70 bg-brand-blue-soft/60 px-5 py-4">
            <p className="text-label">Selected day</p>
            <p className="mt-1 text-[15px] font-semibold">
              {focusCell.dayLabel}, {focusCell.dateLabel}
            </p>
            <p className="mt-1 text-[13px] text-brand-ink-secondary">
              {statusLabel(focusCell.status)}
              {focusCell.unavailable
                ? " — not available for new assignments"
                : " — open for booking"}
            </p>
          </div>
        ) : null}

        <DottedScroll
          className="min-h-0 flex-1"
          scrollClassName="h-full overflow-y-scroll scrollbar-hide p-5"
          indicatorPlacement="gutter"
          contentClassName="flex flex-col gap-1.5"
        >
          <p className="text-label mb-3">
            {range === "week" ? "This week" : range === "month" ? "Last 30 days" : "Last 90 days"}
          </p>
          {cells.map((cell) => (
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
                  </p>
                </div>
                <span
                  className={clsx(
                    "h-3 w-3 rounded-[3px]",
                    cell.unavailable
                      ? "bg-brand-signature"
                      : "bg-brand-surface ring-1 ring-inset ring-brand-line/80"
                  )}
                />
              </div>
            ))}
        </DottedScroll>
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  text,
}: {
  label: string;
  value: string | number;
  tone: "success" | "warning" | "neutral";
  text?: boolean;
}) {
  return (
    <div className="rounded-xl bg-brand-bg/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-brand-ink-tertiary">
        {label}
      </p>
      <p
        className={clsx(
          "mt-1 font-semibold capitalize",
          text ? "text-[12px]" : "text-[18px] tabular-nums",
          tone === "success" && "text-brand-success",
          tone === "warning" && "text-brand-warning",
          tone === "neutral" && "text-brand-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}
