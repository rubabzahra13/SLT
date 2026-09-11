"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { Producer } from "@/types";

type ProducerSelectProps = {
  producers: Producer[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  className?: string;
};

export function ProducerSelect({
  producers,
  value,
  onChange,
  label = "Editor:",
  allLabel = "All Editors",
  className,
}: ProducerSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const uniqueProducers = useMemo(() => {
    const seen = new Set<string>();
    return producers.filter((p) => {
      const key = (p.id || p.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [producers]);

  const selectedProducer = uniqueProducers.find(
    (p) =>
      p.name.toUpperCase() === value.toUpperCase() ||
      p.id.toUpperCase() === value.toUpperCase()
  );

  const displayLabel = selectedProducer ? selectedProducer.name : allLabel;
  const displayColor =
    value === "all"
      ? null
      : selectedProducer
      ? selectedProducer.color || "#94a3b8"
      : "#94a3b8";

  return (
    <div
      ref={rootRef}
      className={clsx(
        "relative inline-flex items-center gap-1.5",
        open && "z-[100]",
        className
      )}
    >
      {label && (
        <span className="text-[12px] font-semibold text-brand-ink-secondary">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-brand-line/80 bg-brand-elevated px-2.5 text-[12px] font-medium text-brand-ink shadow-sm transition hover:border-brand-line-strong focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
      >
        {displayColor ? (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
            style={{ backgroundColor: displayColor }}
            aria-hidden="true"
          />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-brand-ink-tertiary/40" aria-hidden="true" />
        )}
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[100] min-w-[170px] max-h-60 overflow-y-auto rounded-xl border border-brand-line bg-brand-surface p-1 shadow-[var(--shadow-premium)]">
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={clsx(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg",
              value === "all" ? "bg-brand-accent-soft text-brand-ink font-semibold" : "text-brand-ink-secondary"
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-brand-ink-tertiary/40" />
            <span>{allLabel}</span>
          </button>
          {uniqueProducers.map((p, idx) => {
            const isSelected =
              value === p.name ||
              value === p.id ||
              value.toUpperCase() === p.name.toUpperCase();
            const color = p.color || "#94a3b8"; // neutral fallback slate if unset

            return (
              <button
                key={`${p.id}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(p.name);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg",
                  isSelected
                    ? "bg-brand-accent-soft text-brand-ink font-semibold"
                    : "text-brand-ink-secondary"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
