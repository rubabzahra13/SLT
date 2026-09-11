"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import clsx from "clsx";
import { matchesProducerSearch, producerSearchScore } from "@/lib/producers";
import type { Producer } from "@/types";

type ProducerSelectProps = {
  producers: Producer[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

function computeMenuPosition(trigger: HTMLButtonElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(240, rect.width);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    top: rect.bottom + 4,
    left: Math.min(Math.max(8, rect.left), maxLeft),
    width,
  };
}

export function ProducerSelect({
  producers,
  value,
  onChange,
  label = "Editor:",
  allLabel = "All Editors",
  searchable = true,
  searchPlaceholder = "Search editors…",
  className,
}: ProducerSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      setPosition(computeMenuPosition(buttonRef.current));
    };

    const handleScroll = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (menuRef.current?.contains(target) || rootRef.current?.contains(target))
      ) {
        return;
      }
      updatePosition();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    if (searchable) {
      const frame = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (searchQuery.trim()) {
        event.preventDefault();
        setSearchQuery("");
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, searchQuery]);

  const uniqueProducers = useMemo(() => {
    const seen = new Set<string>();
    return producers.filter((p) => {
      const key = (p.id || p.name).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [producers]);

  const filteredProducers = useMemo(() => {
    const query = searchQuery.trim();
    const list =
      !searchable || !query
        ? uniqueProducers
        : uniqueProducers.filter((producer) =>
            matchesProducerSearch(producer, query)
          );

    if (!query) return list;

    return [...list].sort(
      (a, b) => producerSearchScore(b, query) - producerSearchScore(a, query)
    );
  }, [uniqueProducers, searchable, searchQuery]);

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

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const showAllOption =
    !normalizedQuery || allLabel.toLowerCase().includes(normalizedQuery);

  const selectProducer = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  const menu =
    mounted && open && position ? (
      <div
        ref={menuRef}
        className="fixed z-[200] flex max-h-72 flex-col overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]"
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
        }}
        onMouseDown={(event) => {
          const target = event.target;
          if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement
          ) {
            return;
          }
          event.preventDefault();
        }}
      >
        {searchable ? (
          <div className="border-b border-brand-line/50 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary"
                strokeWidth={2}
              />
              <input
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-8 w-full rounded-lg border border-brand-line/70 bg-brand-elevated pl-8 pr-2.5 text-[12px] text-brand-ink outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15"
                onMouseDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (showAllOption && normalizedQuery.length === 0) {
                      selectProducer("all");
                      return;
                    }
                    if (filteredProducers[0]) {
                      selectProducer(filteredProducers[0].name);
                    }
                  }
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="overflow-y-auto p-1">
          {showAllOption ? (
            <button
              type="button"
              onClick={() => selectProducer("all")}
              className={clsx(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg",
                value === "all"
                  ? "bg-brand-accent-soft text-brand-ink font-semibold"
                  : "text-brand-ink-secondary"
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-ink-tertiary/40" />
              <span>{allLabel}</span>
            </button>
          ) : null}

          {filteredProducers.map((p) => {
            const isSelected =
              value === p.name ||
              value === p.id ||
              value.toUpperCase() === p.name.toUpperCase();
            const color = p.color || "#94a3b8";

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectProducer(p.name)}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition hover:bg-brand-bg",
                  isSelected
                    ? "bg-brand-accent-soft text-brand-ink font-semibold"
                    : "text-brand-ink-secondary"
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                {p.initials ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
                    {p.initials}
                  </span>
                ) : null}
              </button>
            );
          })}

          {filteredProducers.length === 0 && !showAllOption ? (
            <p className="px-2.5 py-2 text-[12px] text-brand-ink-tertiary">
              No matching editors
            </p>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={clsx("relative inline-flex items-center gap-1.5", className)}>
      {label ? (
        <span className="text-[12px] font-semibold text-brand-ink-secondary">
          {label}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-brand-line/80 bg-brand-elevated px-2.5 text-[12px] font-medium text-brand-ink shadow-sm transition hover:border-brand-line-strong focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
      >
        {displayColor ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: displayColor }}
            aria-hidden="true"
          />
        ) : (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-ink-tertiary/40"
            aria-hidden="true"
          />
        )}
        <span className="max-w-[140px] truncate">{displayLabel}</span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary transition",
            open && "rotate-180"
          )}
        />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
