"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatDisplayDate } from "@/lib/dates";
import type { Producer } from "@/types";

export type EditorSelectOption = {
  name: string;
  producer?: Producer;
  mixCount?: number;
  bookedUntil?: string;
  disabled?: boolean;
};

export type EditorSelectGroup = {
  label: string;
  tone: "available" | "booked";
  options: EditorSelectOption[];
};

type EditorSelectDropdownProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  groups: EditorSelectGroup[];
  disabled?: boolean;
  emptyLabel?: string;
  requestedEditor?: string | null;
};

type MenuPosition = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

function findOption(
  groups: EditorSelectGroup[],
  value: string
): EditorSelectOption | undefined {
  for (const group of groups) {
    const match = group.options.find((option) => option.name === value);
    if (match) return match;
  }
  return undefined;
}

function findGroupTone(
  groups: EditorSelectGroup[],
  value: string
): EditorSelectGroup["tone"] | undefined {
  for (const group of groups) {
    if (group.options.some((option) => option.name === value)) {
      return group.tone;
    }
  }
  return undefined;
}

function EditorInitials({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-bg-subtle text-[11px] font-bold text-brand-ink-secondary">
      {name.slice(0, 2)}
    </span>
  );
}

function EditorAvatar({
  name,
  producer,
}: {
  name: string;
  producer?: Producer;
}) {
  if (producer?.avatar) {
    return <Avatar src={producer.avatar} alt={name} size="sm" />;
  }
  return <EditorInitials name={name} />;
}

export function EditorSelectDropdown({
  id = "editor-select",
  value,
  onChange,
  groups,
  disabled = false,
  emptyLabel = "No matching editors",
  requestedEditor,
}: EditorSelectDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const selected = useMemo(() => findOption(groups, value), [groups, value]);
  const selectedTone = useMemo(() => findGroupTone(groups, value), [groups, value]);
  const hasOptions = groups.some((group) => group.options.length > 0);
  const displayName = selected?.name || value.trim();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (disabled || !hasOptions) {
      setOpen(false);
    }
  }, [disabled, hasOptions]);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    const menuWidth = rect.width;
    const menuHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - menuWidth - 8
    );

    setPosition({
      left: Math.round(left),
      width: Math.round(menuWidth),
      maxHeight: Math.min(menuHeight, openUp ? spaceAbove : spaceBelow),
      ...(openUp
        ? { bottom: Math.round(window.innerHeight - rect.top + gap) }
        : { top: Math.round(rect.bottom + gap) }),
    });
  };

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: 0 });
    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectEditor(name: string, optionDisabled?: boolean) {
    if (optionDisabled) return;
    onChange(name);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const triggerSubtitle = selected
    ? selectedTone === "booked"
      ? selected.bookedUntil
        ? `Booked till ${formatDisplayDate(selected.bookedUntil)}`
        : `${selected.mixCount ?? 0} active mix${
            selected.mixCount === 1 ? "" : "es"
          }`
      : "Available now"
    : hasOptions
      ? "Choose an editor"
      : emptyLabel;

  const menu =
    open && position && hasOptions ? (
      <div
        ref={menuRef}
        id={`${id}-listbox`}
        role="listbox"
        aria-label="Editors"
        style={{
          position: "fixed",
          left: position.left,
          width: position.width,
          maxHeight: position.maxHeight,
          ...(position.top !== undefined ? { top: position.top } : {}),
          ...(position.bottom !== undefined ? { bottom: position.bottom } : {}),
        }}
        className="z-[60] flex flex-col overflow-hidden rounded-2xl border border-brand-line/80 bg-brand-elevated shadow-[var(--shadow-premium)]"
      >
        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain p-2 scrollbar-hide"
          style={{ maxHeight: position.maxHeight }}
        >
          {groups.map((group, groupIndex) =>
            group.options.length === 0 ? null : (
              <div
                key={group.label}
                className={clsx(groupIndex > 0 && "mt-2 border-t border-brand-line/60 pt-2")}
              >
                <div
                  className={clsx(
                    "mb-1.5 flex items-center px-1",
                    group.tone === "available" ? "text-brand-success" : "text-brand-warning"
                  )}
                >
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                      group.tone === "available"
                        ? "bg-brand-success/10"
                        : "bg-brand-warning/10"
                    )}
                  >
                    {group.label}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {group.options.map((option) => {
                    const isSelected = value === option.name;
                    const isRequested =
                      requestedEditor?.toUpperCase() === option.name.toUpperCase();
                    return (
                      <li key={option.name}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          disabled={option.disabled}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectEditor(option.name, option.disabled);
                          }}
                          className={clsx(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                            option.disabled
                              ? "cursor-not-allowed opacity-45"
                              : "hover:bg-brand-bg/80",
                            isSelected &&
                              "bg-brand-signature-soft ring-1 ring-brand-signature/25"
                          )}
                        >
                          <EditorAvatar
                            name={option.name}
                            producer={option.producer}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13px] font-semibold text-brand-ink">
                                {option.name}
                              </span>
                              {isRequested ? (
                                <span className="rounded-full bg-brand-orange-soft px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-orange">
                                  Requested
                                </span>
                              ) : null}
                              {group.tone === "available" ? (
                                <span className="rounded-full bg-brand-success/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-success">
                                  Open
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-ink-tertiary">
                              {group.tone === "booked" ? (
                                <>
                                  <span>
                                    {option.mixCount ?? 0} mix
                                    {(option.mixCount ?? 0) === 1 ? "" : "es"}
                                  </span>
                                  {option.bookedUntil ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Calendar
                                        className="h-3 w-3 shrink-0"
                                        strokeWidth={2}
                                      />
                                      Till {formatDisplayDate(option.bookedUntil)}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span>Ready to assign</span>
                              )}
                            </span>
                          </span>
                          {isSelected ? (
                            <Check
                              className="h-4 w-4 shrink-0 text-brand-signature"
                              strokeWidth={2.5}
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={disabled || !hasOptions}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={clsx(
          "mt-1.5 flex w-full items-center gap-3 rounded-xl border border-brand-line/80 bg-brand-surface px-3 py-2.5 text-left outline-none transition",
          "focus-visible:border-brand-info/60 focus-visible:ring-2 focus-visible:ring-brand-info/15",
          (disabled || !hasOptions) && "cursor-not-allowed opacity-55",
          open && "border-brand-info/50 ring-2 ring-brand-info/10"
        )}
      >
        {displayName ? (
          selected ? (
            <EditorAvatar name={selected.name} producer={selected.producer} />
          ) : (
            <EditorInitials name={displayName} />
          )
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-brand-line-strong bg-brand-bg/60" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-brand-ink">
            {displayName || emptyLabel}
          </span>
          <span className="block truncate text-[11px] text-brand-ink-tertiary">
            {triggerSubtitle}
          </span>
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-150",
            open && "rotate-180"
          )}
          strokeWidth={2.25}
        />
      </button>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
