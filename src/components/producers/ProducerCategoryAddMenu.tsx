"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import {
  getAvailableProducerCategoryGroups,
  hasAvailableProducerCategories,
} from "@/lib/producer-category-groups";

type PanelPosition = {
  top: number;
  left: number;
  width: number;
};

type ProducerCategoryAddMenuProps = {
  assignedCategories: string[];
  onAdd: (category: string) => void;
  portalZIndex?: number;
};

function computePanelPosition(trigger: HTMLButtonElement): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(window.innerWidth - 16, 280);
  const maxLeft = Math.max(8, window.innerWidth - width - 8);

  return {
    top: rect.bottom + 8,
    left: Math.min(Math.max(8, rect.right - width), maxLeft),
    width,
  };
}

export function ProducerCategoryAddMenu({
  assignedCategories,
  onAdd,
  portalZIndex = 60,
}: ProducerCategoryAddMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const availableGroups = getAvailableProducerCategoryGroups(assignedCategories);
  const canAdd = hasAvailableProducerCategories(assignedCategories);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

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
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!canAdd) return null;

  const panel =
    mounted && open && position
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed max-h-[min(320px,70dvh)] overflow-y-auto rounded-2xl border border-brand-line bg-brand-elevated py-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.08]"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: portalZIndex,
            }}
            role="listbox"
            aria-label="Select producer category"
          >
            {availableGroups.map((group) => (
              <div key={group.id} className="px-2">
                <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
                  {group.label}
                </p>
                {group.subcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onAdd(subcategory.id);
                      setOpen(false);
                    }}
                    className="flex w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-brand-ink transition hover:bg-brand-bg-subtle"
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-elevated px-3 text-[12px] font-semibold text-brand-blue ring-1 ring-inset ring-black/[0.06] transition hover:bg-brand-bg-subtle"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add
      </button>
      {panel}
    </div>
  );
}
