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
};

const accentDot: Record<BrandAccent, string> = {
  blue: "bg-brand-blue",
  orange: "bg-brand-orange",
};

export function FilterMenu({
  label,
  value,
  options,
  onChange,
  accent = "blue",
  className,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] font-medium shadow-sm transition",
          open
            ? "border-brand-line-strong bg-brand-bg text-brand-ink"
            : "border-brand-line bg-brand-elevated text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-accent-soft hover:text-brand-ink"
        )}
      >
        <span
          className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", accentDot[accent])}
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
          {label}
        </span>
        <span className="max-w-[160px] truncate text-brand-ink">
          {selected?.label ?? "—"}
          {selected?.count !== undefined ? ` (${selected.count})` : ""}
        </span>
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
