"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toIsoDateString, isIsoDateAfter, isIsoDateBefore, formatDisplayDate } from "@/lib/dates";
import clsx from "clsx";

const inlineControlClass =
  "h-8 w-full rounded-lg border border-brand-line/60 bg-white px-2.5 text-[12px] font-medium text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15";

type InlineCellProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  centered?: boolean;
};

/** Keeps inline table controls aligned; optional footer below the control. */
export function InlineCell({
  children,
  footer,
  className,
  centered = false,
}: InlineCellProps) {
  const hasFooter = footer != null;

  return (
    <div
      className={clsx(
        "mx-auto flex w-full min-w-0 flex-col justify-center",
        centered ? "items-center" : "items-stretch",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      {hasFooter ? (
        <div
          className={clsx(
            "mt-1 w-full truncate text-[9px] leading-none",
            centered && "text-center"
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type InlineSelectProps = {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  className?: string;
  centered?: boolean;
};

type MenuPosition = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
};

export function InlineSelect({
  value,
  options,
  onChange,
  className,
  centered = false,
}: InlineSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.indexOf(value))
  );

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    setPosition({
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      maxHeight: Math.min(288, Math.max(120, openUp ? spaceAbove : spaceBelow)),
      ...(openUp
        ? { bottom: Math.round(window.innerHeight - rect.top + gap) }
        : { top: Math.round(rect.bottom + gap) }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    setActiveIndex(Math.max(0, options.indexOf(value)));
    const handle = () => updatePosition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((prev) => {
        const dir = e.key === "ArrowDown" ? 1 : -1;
        return (prev + dir + options.length) % options.length;
      });
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (!open) setOpen(true);
      else commit(options[activeIndex]);
      return;
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={handleKeyDown}
        className={clsx(
          inlineControlClass,
          centered
            ? "relative flex cursor-pointer items-center justify-center px-6 text-center"
            : "flex cursor-pointer items-center justify-between gap-1.5 pr-2 text-left",
          className
        )}
      >
        <span
          className={clsx(
            "min-w-0 truncate",
            centered ? "w-full text-center" : "flex-1"
          )}
        >
          {value}
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
            centered && "absolute right-2 top-1/2 -translate-y-1/2",
            open && "rotate-180"
          )}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>

      {mounted && open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="fixed z-[60] overflow-y-auto rounded-xl border border-brand-line/60 bg-white p-1 shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/10 scrollbar-hide"
              style={{
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                minWidth: position.width,
                maxHeight: position.maxHeight,
              }}
            >
              {options.map((opt, index) => {
                const selected = opt === value;
                const active = index === activeIndex;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={(e) => {
                      e.stopPropagation();
                      commit(opt);
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                      selected
                        ? "bg-brand-blue-soft text-brand-signature"
                        : active
                          ? "bg-brand-bg-subtle text-brand-ink"
                          : "text-brand-ink-secondary hover:bg-brand-bg-subtle"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{opt}</span>
                    {selected ? (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-brand-signature"
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

type InlineCheckOptionGroupProps = {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  getLabel?: (option: string) => string;
  className?: string;
};

/** Single-select options styled as compact checkbox rows. */
export function InlineCheckOptionGroup({
  value,
  options,
  onChange,
  getLabel = (option) => option,
  className,
}: InlineCheckOptionGroupProps) {
  return (
    <div
      className={clsx("flex flex-col gap-0.5", className)}
      role="radiogroup"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option}
            onClick={(e) => {
              e.stopPropagation();
              onChange(option);
            }}
            className={clsx(
              "inline-flex w-full items-start gap-1.5 rounded-md px-1 py-0.5 text-left transition",
              selected
                ? "bg-brand-signature-soft/70 ring-1 ring-inset ring-brand-signature/25"
                : "hover:bg-brand-bg/70"
            )}
          >
            <span
              className={clsx(
                "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition",
                selected
                  ? "border-brand-signature bg-brand-signature text-white"
                  : "border-brand-line/80 bg-brand-surface"
              )}
            >
              {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            <span className="min-w-0 whitespace-normal text-[10px] font-medium leading-snug text-brand-ink">
              {getLabel(option)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type InlineMultiCheckItem = {
  id: string;
  label: string;
  checked: boolean;
};

type InlineMultiCheckGroupProps = {
  items: InlineMultiCheckItem[];
  onToggle: (id: string, checked: boolean) => void;
  className?: string;
};

/** Horizontal segmented toggles for compact table cells. */
export function InlineMultiCheckGroup({
  items,
  onToggle,
  className,
}: InlineMultiCheckGroupProps) {
  const selectedCount = items.filter((item) => item.checked).length;

  return (
    <div
      className={clsx(
        "inline-flex max-w-full items-center gap-1 rounded-xl bg-brand-bg-subtle/90 p-1 ring-1 ring-inset ring-brand-line/40",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="checkbox"
          aria-checked={item.checked}
          title={item.label}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.id, !item.checked);
          }}
          className={clsx(
            "relative whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-semibold leading-none transition-all duration-150",
            item.checked
              ? "bg-brand-blue-deep text-white shadow-[0_1px_3px_rgba(42,143,176,0.35)] ring-1 ring-inset ring-brand-blue-deep/40"
              : clsx(
                  "bg-brand-elevated/90 text-brand-ink-tertiary ring-1 ring-inset ring-brand-line/45",
                  selectedCount > 0
                    ? "hover:bg-brand-elevated hover:text-brand-ink-secondary hover:ring-brand-blue-deep/30"
                    : "hover:bg-brand-elevated hover:text-brand-ink hover:ring-brand-line-strong"
                )
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type InlineInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
};

export function InlineInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: InlineInputProps) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      className={clsx(inlineControlClass, "tabular-nums", className)}
    />
  );
}

type InlineTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
};

export function InlineTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
}: InlineTextareaProps) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      className={clsx(
        "w-full resize-y rounded-lg border border-brand-line/60 bg-white px-3 py-2 text-[13px] text-brand-ink shadow-[0_1px_1px_rgba(15,30,45,0.04)] outline-none transition-colors hover:border-brand-line-strong focus:border-brand-blue/50 focus:ring-2 focus:ring-brand-blue/15",
        className
      )}
    />
  );
}

const detailInputClass =
  "h-auto min-h-[36px] rounded-lg px-3 py-2 text-[13px]";

export function DetailInput({
  className,
  ...props
}: Omit<InlineInputProps, "className"> & { className?: string }) {
  return <InlineInput {...props} className={clsx(detailInputClass, className)} />;
}

export function DetailTextarea(props: Omit<InlineTextareaProps, "className">) {
  return <InlineTextarea {...props} className={detailInputClass} />;
}

type InlineDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Pre-filled date shown when empty (YYYY-MM-DD). */
  template?: string;
  /** Earliest selectable date (YYYY-MM-DD). */
  min?: string;
  /** Latest selectable date (YYYY-MM-DD). */
  max?: string;
  className?: string;
};

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseIsoToLocalDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarCells(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  return cells;
}

function isDateDisabled(
  iso: string,
  minIso?: string,
  maxIso?: string
): boolean {
  if (minIso && isIsoDateBefore(iso, minIso)) return true;
  if (maxIso && isIsoDateAfter(iso, maxIso)) return true;
  return false;
}

export function InlineDateInput({
  value,
  onChange,
  template,
  min,
  max,
  className,
}: InlineDateInputProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const normalized = toIsoDateString(value);
  const minIso = toIsoDateString(min) || undefined;
  const maxIso = toIsoDateString(max) || undefined;
  const templateIso = toIsoDateString(template) || undefined;
  const isUnset = !normalized;

  const initialView = parseIsoToLocalDate(normalized || templateIso || "") ?? new Date();
  const [viewMonth, setViewMonth] = useState(
    () => new Date(initialView.getFullYear(), initialView.getMonth(), 1)
  );

  useEffect(() => setMounted(true), []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const menuWidth = 280;
    const menuHeight = 340;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - menuWidth - 8
    );
    setPosition({
      left: Math.round(left),
      width: menuWidth,
      maxHeight: menuHeight,
      ...(openUp
        ? { bottom: Math.round(window.innerHeight - rect.top + gap) }
        : { top: Math.round(rect.bottom + gap) }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const base = parseIsoToLocalDate(normalized || templateIso || "");
    if (base) {
      setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    }
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const todayIso = isoFromLocalDate(new Date());
  const cells = buildCalendarCells(
    viewMonth.getFullYear(),
    viewMonth.getMonth()
  );
  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function selectDate(iso: string) {
    if (isDateDisabled(iso, minIso, maxIso)) return;
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const displayLabel = isUnset
    ? templateIso
      ? formatDisplayDate(templateIso)
      : "Select date"
    : formatDisplayDate(normalized);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          isUnset && templateIso
            ? `Suggested mix date: ${templateIso}`
            : undefined
        }
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={clsx(
          inlineControlClass,
          "flex min-w-[108px] cursor-pointer items-center justify-between gap-1.5 pr-2 text-left tabular-nums",
          isUnset && "text-brand-ink-tertiary",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <Calendar
            className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary"
            strokeWidth={2}
          />
          <span className={clsx("truncate", !isUnset && "text-brand-ink")}>
            {displayLabel}
          </span>
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
          strokeWidth={2.25}
        />
      </button>

      {mounted && open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="dialog"
              aria-label="Choose date"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="fixed z-[60] overflow-hidden rounded-xl border border-brand-line/60 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/15"
              style={{
                left: position.left,
                top: position.top,
                bottom: position.bottom,
                width: position.width,
              }}
            >
              <div className="flex items-center justify-between border-b border-brand-line/40 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setViewMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg-subtle hover:text-brand-ink"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <p className="text-[13px] font-semibold text-brand-ink">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() =>
                    setViewMonth(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-ink-secondary transition hover:bg-brand-bg-subtle hover:text-brand-ink"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {templateIso && isUnset ? (
                <div className="border-b border-brand-line/35 bg-brand-blue-soft/25 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => selectDate(templateIso)}
                    disabled={isDateDisabled(templateIso, minIso, maxIso)}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] font-medium text-brand-signature transition hover:bg-white/80 disabled:opacity-40"
                  >
                    Suggested: {formatDisplayDate(templateIso)}
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-7 gap-1 px-3 pt-2">
                {WEEKDAY_LABELS.map((label) => (
                  <span
                    key={label}
                    className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-brand-ink-tertiary"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 px-3 pb-2 pt-1">
                {cells.map((iso, index) =>
                  iso ? (
                    <button
                      key={iso}
                      type="button"
                      disabled={isDateDisabled(iso, minIso, maxIso)}
                      onClick={() => selectDate(iso)}
                      className={clsx(
                        "h-8 rounded-lg text-[12px] font-medium tabular-nums transition",
                        normalized === iso
                          ? "bg-brand-signature text-white shadow-sm"
                          : todayIso === iso
                            ? "bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20"
                            : "text-brand-ink-secondary hover:bg-brand-bg-subtle hover:text-brand-ink",
                        isDateDisabled(iso, minIso, maxIso) &&
                          "cursor-not-allowed opacity-30 hover:bg-transparent"
                      )}
                    >
                      {parseIsoToLocalDate(iso)?.getDate()}
                    </button>
                  ) : (
                    <span key={`empty-${index}`} aria-hidden />
                  )
                )}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-brand-line/40 bg-brand-bg-subtle/50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => selectDate(todayIso)}
                  disabled={isDateDisabled(todayIso, minIso, maxIso)}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-signature transition hover:bg-white disabled:opacity-40"
                >
                  Today
                </button>
                {normalized ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-ink-secondary transition hover:bg-white hover:text-brand-ink"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
