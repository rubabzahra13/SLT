"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Pencil, UserRound } from "lucide-react";
import clsx from "clsx";
import type { Producer } from "@/types";

type AssignedProducerEditMenuProps = {
  producer: Producer;
  /** Existing assign / view-assignment control (Orders / MTD). */
  assignAction?: {
    label: string;
    onClick: () => void;
  };
  onEditProfile: (producer: Producer) => void;
  onEditSchedule: (producer: Producer) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  /** Accessible name for the trigger. */
  ariaLabel?: string;
  title?: string;
};

/**
 * Click the assigned-producer chip to edit full producer details
 * (same as Producers tab) or jump back into assign.
 */
export function AssignedProducerEditMenu({
  producer,
  assignAction,
  onEditProfile,
  onEditSchedule,
  disabled = false,
  children,
  className,
  ariaLabel,
  title,
}: AssignedProducerEditMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - menuWidth / 2),
      window.innerWidth - menuWidth - 8
    );
    const top = Math.min(rect.bottom + 6, window.innerHeight - 160);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title ?? `Edit ${producer.name}`}
        aria-label={ariaLabel ?? `Edit ${producer.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          setOpen((value) => !value);
        }}
        className={clsx(className, disabled && "pointer-events-none opacity-40")}
      >
        {children}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[120] w-[220px] overflow-hidden rounded-2xl bg-brand-elevated py-1 shadow-[0_16px_48px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.08]"
              style={{ top: pos.top, left: pos.left }}
            >
              <p className="truncate px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                {producer.name}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEditProfile(producer);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-brand-ink transition hover:bg-brand-bg"
              >
                <Pencil className="h-3.5 w-3.5 text-brand-ink-tertiary" strokeWidth={1.75} />
                Edit profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEditSchedule(producer);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-brand-ink transition hover:bg-brand-bg"
              >
                <CalendarDays
                  className="h-3.5 w-3.5 text-brand-ink-tertiary"
                  strokeWidth={1.75}
                />
                Schedule &amp; capacity
              </button>
              {assignAction ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    assignAction.onClick();
                  }}
                  className="flex w-full items-center gap-2.5 border-t border-black/[0.06] px-3 py-2.5 text-left text-[13px] font-medium text-brand-ink transition hover:bg-brand-bg"
                >
                  <UserRound
                    className="h-3.5 w-3.5 text-brand-ink-tertiary"
                    strokeWidth={1.75}
                  />
                  {assignAction.label}
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
