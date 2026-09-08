"use client";

import clsx from "clsx";
import { HoverTip } from "@/components/ui/HoverTip";
import type { ScheduleCell } from "@/lib/schedule-view";
import { statusLabel } from "@/lib/schedule-view";

export const SCHEDULE_LEGEND_ITEMS = [
  {
    key: "booked",
    label: "Booked",
    swatchClass: "bg-brand-signature",
  },
  {
    key: "capacity",
    label: "Capacity Reached",
    swatchClass: "bg-amber-400/85",
  },
  {
    key: "off",
    label: "Off",
    swatchClass: "bg-brand-orange/80",
  },
  {
    key: "available",
    label: "Available",
    swatchClass:
      "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]",
  },
] as const;

export function scheduleStatusSwatchClass(status: ScheduleCell["status"]): string {
  if (status === "mix") return "bg-brand-signature";
  if (status === "off") return "bg-brand-orange/80";
  if (status === "capacity") return "bg-amber-400/85";
  return "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]";
}

export function scheduleStatusTextClass(status: ScheduleCell["status"]): string {
  if (status === "available") return "text-brand-signature";
  if (status === "mix") return "text-brand-signature";
  if (status === "off") return "text-brand-orange-deep";
  return "text-amber-700";
}

export function getCellBookings(cell: ScheduleCell) {
  return cell.bookings ?? (cell.booking ? [cell.booking] : []);
}

type ScheduleLegendProps = {
  className?: string;
};

export function ScheduleLegend({ className }: ScheduleLegendProps) {
  return (
    <div className={clsx("inline-flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        Legend
      </span>
      <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-brand-ink-secondary">
        {SCHEDULE_LEGEND_ITEMS.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className={clsx("h-2.5 w-4 shrink-0 rounded-[3px]", item.swatchClass)}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type ScheduleStatusIndicatorProps = {
  status: ScheduleCell["status"];
  showLabel?: boolean;
  className?: string;
};

export function ScheduleStatusIndicator({
  status,
  showLabel = true,
  className,
}: ScheduleStatusIndicatorProps) {
  return (
    <div className={clsx("inline-flex items-center gap-2", className)}>
      <span
        className={clsx(
          "h-2.5 w-4 shrink-0 rounded-[3px]",
          scheduleStatusSwatchClass(status)
        )}
        aria-hidden
      />
      {showLabel ? (
        <span className={clsx("text-[12px] font-semibold", scheduleStatusTextClass(status))}>
          {statusLabel(status)}
        </span>
      ) : null}
    </div>
  );
}

type ScheduleStatusTileProps = {
  status: ScheduleCell["status"];
  cell?: ScheduleCell;
  className?: string;
};

function scheduleStatusTooltipTone(status: ScheduleCell["status"]) {
  if (status === "off") return "text-brand-orange";
  if (status === "capacity") return "text-amber-600";
  return "text-brand-signature";
}

function ScheduleStatusTooltip({
  status,
  cell,
}: {
  status: ScheduleCell["status"];
  cell?: ScheduleCell;
}) {
  const bookings = cell ? getCellBookings(cell) : [];
  const booking = bookings[0];

  return (
    <div className="min-w-[160px]">
      <p
        className={clsx(
          "text-[10px] font-semibold uppercase tracking-[0.06em]",
          scheduleStatusTooltipTone(status)
        )}
      >
        {statusLabel(status)}
      </p>
      {booking ? (
        <>
          <p className="mt-1 text-[12px] font-medium leading-snug text-brand-ink">
            {booking.work}
          </p>
          <p className="mt-1.5 text-[11px] text-brand-ink-secondary">
            Until {booking.until}
          </p>
          {bookings.length > 1 ? (
            <p className="mt-1 text-[11px] text-brand-ink-tertiary">
              +{bookings.length - 1} more mix{bookings.length - 1 === 1 ? "" : "es"}
            </p>
          ) : null}
        </>
      ) : cell ? (
        <p className="mt-1 text-[11px] text-brand-ink-secondary">
          {cell.dayLabel}, {cell.dateLabel}
        </p>
      ) : null}
    </div>
  );
}

export function ScheduleStatusTile({ status, cell, className }: ScheduleStatusTileProps) {
  const isOff = status === "off";
  const isCapacity = status === "capacity";
  const isBooked = status === "mix";

  const tile = (
    <span
      role="img"
      aria-label={statusLabel(status)}
      className={clsx(
        "mx-auto block h-6 w-12 max-w-[48px] rounded-md",
        isOff && "bg-brand-orange/80 shadow-[0_1px_2px_rgba(240,120,64,0.16)]",
        isCapacity && "bg-amber-400/85 shadow-[0_1px_2px_rgba(245,158,11,0.20)]",
        isBooked &&
          "bg-gradient-to-b from-brand-blue to-brand-signature shadow-[0_1px_2px_rgba(15,30,45,0.18)]",
        status === "available" &&
          "bg-cyan-50/80 ring-1 ring-inset ring-cyan-400/60 shadow-[0_1px_2px_rgba(6,182,212,0.12)]",
        className
      )}
    />
  );

  return (
    <HoverTip
      className="mx-auto w-full justify-center"
      placement="top"
      content={<ScheduleStatusTooltip status={status} cell={cell} />}
    >
      {tile}
    </HoverTip>
  );
}
