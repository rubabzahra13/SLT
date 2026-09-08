"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { scheduleStatusSwatchClass } from "@/components/schedule/schedule-legend";
import {
  SCHEDULE_STATUS_FILTERS,
  type ScheduleStatusFilter,
} from "@/lib/schedule-view";

type ScheduleStatusFilterPanelProps = {
  value: ScheduleStatusFilter;
  onChange: (value: ScheduleStatusFilter) => void;
  grouped?: boolean;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

function statusSwatchClass(value: ScheduleStatusFilter): string | null {
  if (value === "all") return null;
  return scheduleStatusSwatchClass(value);
}

function computePanelPosition(trigger: HTMLButtonElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(window.innerWidth * 0.92, 280);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    top: rect.bottom + 8,
    left: Math.min(Math.max(8, rect.left), maxLeft),
    width,
  };
}

export function ScheduleStatusFilterPanel({
  value,
  onChange,
  grouped = false,
}: ScheduleStatusFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isActive = value !== "all";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      setPosition(computePanelPosition(buttonRef.current));
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const panel =
    mounted && open && position ? (
      <div
        ref={panelRef}
        className="fixed z-[100] rounded-2xl border border-brand-line bg-brand-surface p-4 shadow-[var(--shadow-premium)]"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-brand-ink">Filters</p>
          {isActive ? (
            <button
              type="button"
              onClick={() => onChange("all")}
              className="text-[12px] font-medium text-brand-signature hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          Status
        </p>
        <div className="overflow-hidden rounded-xl border border-brand-line/70">
          {SCHEDULE_STATUS_FILTERS.map(({ value: optionValue, label }) => {
            const active = value === optionValue;
            const swatchClass = statusSwatchClass(optionValue);

            return (
              <button
                key={optionValue}
                type="button"
                onClick={() => onChange(optionValue)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 border-b border-brand-line/50 px-3 py-2.5 text-left text-[13px] transition last:border-b-0 hover:bg-brand-bg",
                  active
                    ? "bg-brand-blue-soft/25 font-semibold text-brand-ink"
                    : "text-brand-ink-secondary"
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {active ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-brand-signature"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  {swatchClass ? (
                    <span
                      className={clsx("h-2.5 w-4 shrink-0 rounded-[3px]", swatchClass)}
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          "inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition",
          grouped
            ? clsx(
                "rounded-lg px-2.5",
                open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35",
                open || isActive
                  ? "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                  : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink",
                open && !isActive && "text-brand-ink"
              )
            : clsx(
                "rounded-full border px-3 shadow-sm",
                open || isActive
                  ? "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink"
                  : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated",
                open && "ring-2 ring-brand-blue/15"
              )
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        Filters
        {isActive ? (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-deep px-1 text-[10px] font-bold tabular-nums text-white">
            1
          </span>
        ) : null}
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
