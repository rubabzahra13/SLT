"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

export type MailRecipientOption = {
  id: string;
  name: string;
  email: string;
  /** Short role label, e.g. Billing / Coach / Editor */
  role?: string;
};

type MailRecipientSelectProps = {
  "aria-label": string;
  value: string;
  options: MailRecipientOption[];
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function MailRecipientSelect({
  "aria-label": ariaLabel,
  value,
  options,
  onChange,
  disabled = false,
  className,
  placeholder = "Select recipient",
}: MailRecipientSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.max(rect.width, 240);
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8
      );
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
      const maxHeight = Math.min(280, Math.max(120, spaceBelow));
      setMenuPos({
        left,
        top: rect.bottom + gap,
        width,
        maxHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          "flex w-full items-center gap-3 rounded-xl border bg-brand-surface px-3 py-2.5 text-left outline-none transition",
          open
            ? "border-brand-signature/50 ring-2 ring-brand-signature/15"
            : "border-brand-line/80 hover:border-brand-line-strong focus-visible:border-brand-signature/50 focus-visible:ring-2 focus-visible:ring-brand-signature/15",
          (disabled || options.length === 0) && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="flex min-w-0 items-center gap-2">
                {selected.role ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-signature">
                    {selected.role}
                  </span>
                ) : null}
                <span className="min-w-0 truncate text-[13px] font-semibold text-brand-ink">
                  {selected.name}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-brand-ink-secondary">
                {selected.email}
              </span>
            </>
          ) : (
            <span className="text-[13px] font-medium text-brand-ink-tertiary">
              {placeholder}
            </span>
          )}
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
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
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className="fixed z-[9999] overflow-hidden rounded-xl border border-brand-line/50 bg-white shadow-[var(--shadow-premium)] ring-1 ring-inset ring-brand-line/10"
              style={{
                left: menuPos.left,
                top: menuPos.top,
                width: menuPos.width,
                maxHeight: menuPos.maxHeight,
              }}
            >
              <div className="max-h-[inherit] overflow-y-auto p-1.5 scrollbar-hide">
                {options.map((opt) => {
                  const isSelected = opt.id === value;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition",
                        isSelected
                          ? "bg-brand-signature/8"
                          : "hover:bg-brand-bg/70"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          {opt.role ? (
                            <span
                              className={clsx(
                                "shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em]",
                                isSelected
                                  ? "text-brand-signature"
                                  : "text-brand-ink-tertiary"
                              )}
                            >
                              {opt.role}
                            </span>
                          ) : null}
                          <span
                            className={clsx(
                              "min-w-0 truncate text-[13px] font-semibold",
                              isSelected
                                ? "text-brand-signature"
                                : "text-brand-ink"
                            )}
                          >
                            {opt.name}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-brand-ink-secondary">
                          {opt.email}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-signature"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : (
                        <span className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
