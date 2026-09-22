"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

export type SoftSelectOption = {
  value: string;
  label: string;
};

type SoftSelectProps = {
  "aria-label": string;
  value: string;
  options: SoftSelectOption[];
  onChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
  placeholder?: string;
  /** Prefer menu above the trigger (default auto: flips up when space below is tight). */
  placement?: "auto" | "above" | "below";
  /** Show a search field at the top of the menu. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Larger trigger for forms (default compact pill). */
  size?: "sm" | "md";
};

type MenuPos = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

const MENU_MAX_HEIGHT = 208; // max-h-52
const GAP = 4;

export function SoftSelect({
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  open,
  onOpenChange,
  className,
  placeholder = "Select",
  placement = "auto",
  searchable = false,
  searchPlaceholder = "Search…",
  size = "sm",
}: SoftSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [query, setQuery] = useState("");
  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const updateMenuPos = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 180);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8
    );
    const listMax = searchable ? 280 : MENU_MAX_HEIGHT;
    const estimatedHeight = Math.min(
      listMax,
      Math.max(96, filteredOptions.length * 32 + (searchable ? 48 : 8))
    );
    const spaceBelow = window.innerHeight - rect.bottom - GAP - 8;
    const spaceAbove = rect.top - GAP - 8;
    const inLowerHalf = rect.top > window.innerHeight * 0.45;

    let openUp = false;
    if (placement === "above") {
      openUp = spaceAbove >= 72 || spaceAbove >= spaceBelow;
    } else if (placement === "below") {
      openUp = false;
    } else {
      openUp =
        (inLowerHalf && spaceAbove > 72) ||
        spaceBelow < estimatedHeight ||
        (spaceAbove > spaceBelow && spaceBelow < listMax);
    }

    const maxHeight = Math.max(
      72,
      Math.min(listMax, openUp ? spaceAbove : spaceBelow)
    );

    setMenuPos({
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(maxHeight),
      ...(openUp
        ? { bottom: Math.round(window.innerHeight - rect.top + GAP) }
        : { top: Math.round(rect.bottom + GAP) }),
    });
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    const handle = () => updateMenuPos();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filteredOptions.length, placement, searchable]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (searchable) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;

    let remove: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      function onDocPointerDown(event: PointerEvent) {
        const target = event.target as Node;
        if (rootRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        onOpenChange(false);
      }
      function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") onOpenChange(false);
      }
      document.addEventListener("pointerdown", onDocPointerDown, true);
      document.addEventListener("keydown", onKeyDown);
      remove = () => {
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        document.removeEventListener("keydown", onKeyDown);
      };
    }, 0);

    return () => {
      window.clearTimeout(timer);
      remove?.();
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className={clsx("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!open);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={clsx(
          "inline-flex w-full min-w-0 cursor-pointer items-center justify-between gap-1.5 text-left font-medium text-brand-ink outline-none transition",
          size === "md"
            ? "h-10 rounded-xl border border-brand-line/60 bg-brand-bg px-3 text-[13px] hover:border-brand-line-strong focus-visible:ring-2 focus-visible:ring-brand-blue/15"
            : "h-8 rounded-full bg-brand-bg px-3 text-[13px] hover:bg-brand-bg-subtle focus-visible:ring-2 focus-visible:ring-brand-blue/20",
          open &&
            (size === "md"
              ? "border-brand-blue/45 ring-2 ring-brand-blue/15"
              : "bg-brand-blue-soft/70 font-semibold text-brand-signature ring-1 ring-inset ring-brand-blue/25")
        )}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
            open && "rotate-180 text-brand-signature"
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label={ariaLabel}
              onMouseDown={(e) => e.stopPropagation()}
              className="fixed z-[9999] flex flex-col overflow-hidden rounded-xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/10"
              style={{
                left: menuPos.left,
                top: menuPos.top,
                bottom: menuPos.bottom,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
                zIndex: 9999,
              }}
            >
              {searchable ? (
                <div className="shrink-0 border-b border-brand-line/40 p-1.5">
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="h-8 w-full rounded-lg border border-brand-line/50 bg-brand-bg px-2.5 text-[12px] font-medium text-brand-ink outline-none placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                  />
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto p-1 scrollbar-hide">
                {filteredOptions.length === 0 ? (
                  <p className="px-2.5 py-2 text-[12px] text-brand-ink-tertiary">
                    No matches
                  </p>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onChange(opt.value);
                          onOpenChange(false);
                        }}
                        className={clsx(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                          isSelected
                            ? "bg-brand-blue-soft text-brand-signature"
                            : "text-brand-ink-secondary hover:bg-brand-bg-subtle hover:text-brand-ink"
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {opt.label}
                        </span>
                        {isSelected ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-brand-signature"
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
