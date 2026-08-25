"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import clsx from "clsx";

export type RowActionMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
};

type RowActionMenuProps = {
  items: RowActionMenuItem[];
  label?: string;
  className?: string;
};

export function RowActionMenu({
  items,
  label = "Row actions",
  className,
}: RowActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div ref={rootRef} className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        aria-label={label}
        aria-expanded={open}
        className={clsx(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-line/70 bg-brand-bg/60 text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/25",
          open && "border-brand-orange/40 bg-brand-orange-soft/35 text-brand-orange"
        )}
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[168px] overflow-hidden rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onSelect();
                setOpen(false);
              }}
              className={clsx(
                "flex w-full px-3 py-2 text-left text-[13px] transition hover:bg-brand-bg",
                item.tone === "danger"
                  ? "font-medium text-brand-danger"
                  : "text-brand-ink-secondary hover:text-brand-ink"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
