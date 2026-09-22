"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

export type FilterMenuOption = {
  value: string;
  label: string;
  count?: number;
  isRed?: boolean;
};

export type FilterMenuAccent = BrandAccent | "red";

type FilterMenuProps = {
  label: string;
  value: string;
  options: FilterMenuOption[];
  onChange: (value: string) => void;
  accent?: FilterMenuAccent;
  className?: string;
  hideLabel?: boolean;
  grouped?: boolean;
  portal?: boolean;
  portalZIndex?: number;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

const accentActive: Record<FilterMenuAccent, string> = {
  blue: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
  orange: "border-brand-orange/35 bg-brand-orange-soft/70 text-brand-ink",
  red: "border-red-500/35 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold",
};

function computePanelPosition(trigger: HTMLButtonElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(window.innerWidth * 0.92, 248);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    top: rect.bottom + 6,
    left: Math.min(Math.max(8, rect.left), maxLeft),
    width,
  };
}

export function FilterMenu({
  label,
  value,
  options,
  onChange,
  accent = "blue",
  className,
  hideLabel = false,
  grouped = false,
  portal = false,
  portalZIndex = 100,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isActive = value !== options[0]?.value;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !portal || !buttonRef.current) return;

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
  }, [open, portal]);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (portal) {
        if (
          rootRef.current?.contains(target) ||
          panelRef.current?.contains(target)
        ) {
          return;
        }
      } else if (rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, portal]);

  const menuContent = (
    <>
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
              <span className={clsx("truncate", opt.isRed && "text-red-600 font-medium dark:text-red-400")}>
                {opt.label}
              </span>
            </span>
            {opt.count !== undefined ? (
              <span className="shrink-0 text-[12px] tabular-nums text-brand-ink-tertiary">
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );

  const panel =
    mounted && open ? (
      portal && position ? (
        createPortal(
          <div
            ref={panelRef}
            className="fixed max-h-[300px] overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: portalZIndex,
            }}
          >
            {menuContent}
          </div>,
          document.body
        )
      ) : !portal ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-[300px] w-[248px] overflow-y-auto rounded-xl border border-brand-line bg-brand-surface py-1 shadow-[var(--shadow-premium)]">
          {menuContent}
        </div>
      ) : null
    ) : null;

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        ref={buttonRef}
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
                      : accent === "red"
                        ? "bg-red-500/15 font-semibold text-red-700 dark:text-red-300 border border-red-500/30"
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

      {panel}
    </div>
  );
}
