"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

export type FilterMenuOption = {
  value: string;
  label: string;
  count?: number;
};

type FilterMenuProps = {
  label: string;
  value: string;
  options: FilterMenuOption[];
  onChange: (value: string) => void;
  accent?: BrandAccent;
  className?: string;
  hideLabel?: boolean;
  grouped?: boolean;
};

const accentActive: Record<BrandAccent, string> = {
  blue: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
  orange: "border-brand-orange/35 bg-brand-orange-soft/70 text-brand-ink",
};

export function FilterMenu({
  label,
  value,
  options,
  onChange,
  accent = "blue",
  className,
  hideLabel = false,
  grouped = false,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isActive = value !== options[0]?.value;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        type="button"
        aria-label={hideLabel ? label : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-8 items-center gap-1.5 text-[12px] font-medium transition",
          hideLabel
            ? grouped
              ? clsx(
                  "rounded-lg px-2.5",
                  open && "bg-brand-elevated shadow-sm ring-1 ring-brand-line/35",
                  isActive
                    ? accent === "orange"
                      ? "bg-brand-orange-soft/80 font-semibold text-brand-ink"
                      : "bg-brand-blue-soft/70 font-semibold text-brand-ink"
                    : "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink",
                  open && !isActive && "bg-brand-elevated text-brand-ink"
                )
              : clsx(
                  "rounded-full border px-3 shadow-sm",
                  open && "ring-2 ring-brand-blue/15",
                  isActive
                    ? accentActive[accent]
                    : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated",
                  open &&
                    !isActive &&
                    "border-brand-line-strong bg-brand-elevated text-brand-ink"
                )
            : clsx(
                "rounded-lg border px-3 shadow-sm",
                open
                  ? "border-brand-line-strong bg-brand-bg text-brand-ink"
                  : "border-brand-line bg-brand-elevated text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-accent-soft hover:text-brand-ink"
              )
        )}
      >
        {!hideLabel ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            {label}
          </span>
        ) : null}
        <span className="max-w-[148px] truncate text-brand-ink">
          {selected?.label ?? "—"}
        </span>
        {!hideLabel && selected?.count !== undefined ? (
          <span className="text-brand-ink-tertiary">({selected.count})</span>
        ) : null}
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[300px] w-[248px] overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] transition hover:bg-brand-bg",
                  active
                    ? "font-semibold text-brand-ink"
                    : "text-brand-ink-secondary"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {active ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-brand-signature"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{opt.label}</span>
                </span>
                {opt.count !== undefined ? (
                  <span className="shrink-0 text-[12px] tabular-nums text-brand-ink-tertiary">
                    {opt.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
