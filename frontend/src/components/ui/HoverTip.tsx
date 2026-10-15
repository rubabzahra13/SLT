"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HoverTipProps = {
  label?: string;
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  placement?: "bottom" | "top" | "right" | "left";
  /** Stacking for portaled tip (keep above date menus / modals). */
  zIndex?: number;
  /**
   * Allow pointer interaction (scroll, hover). Keeps the tip open while the
   * cursor is over the tip itself — needed for scrollable content.
   */
  interactive?: boolean;
  /** Extra classes on the portaled tooltip (e.g. wider card). */
  tooltipClassName?: string;
};

const VIEWPORT_MARGIN = 8;

function MultilineLabelTip({ label }: { label: string }) {
  const blocks = label.split("\n\n");
  return (
    <span className="flex flex-col gap-2.5">
      {blocks.map((block, i) => {
        const isExtraDay = block.trim() === "Extra day";
        return (
          <span
            key={i}
            className={
              isExtraDay
                ? "font-bold tracking-wide"
                : "whitespace-pre-line font-medium"
            }
          >
            {block}
          </span>
        );
      })}
    </span>
  );
}

export function HoverTip({
  label,
  content,
  children,
  className = "",
  placement = "bottom",
  zIndex = 200,
  interactive = false,
  tooltipClassName = "",
}: HoverTipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    transform: "translateX(-50%)",
  });

  const isMultilineLabel = Boolean(
    !content && label && (label.includes("\n") || label.length > 48)
  );
  const tip =
    content ??
    (label ? (
      isMultilineLabel ? (
        <MultilineLabelTip label={label} />
      ) : (
        <span>{label}</span>
      )
    ) : null);
  const hasTip = Boolean(tip);

  const show = () => {
    const el = ref.current;
    if (!el || !hasTip) return;
    const rect = el.getBoundingClientRect();

    if (placement === "right") {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
        transform: "translateY(-50%)",
      });
    } else if (placement === "left") {
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.left - 14,
        transform: "translate(-100%, -50%)",
      });
    } else if (placement === "top") {
      setCoords({
        top: rect.top - (interactive ? 2 : 8),
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      });
    } else {
      setCoords({
        top: rect.bottom + (interactive ? 2 : 8),
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      });
    }
    setOpen(true);
  };

  // Keep portaled tips fully on-screen (Actions / MTD sit at the table’s right edge).
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return;
    const tipRect = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let dx = 0;
    let dy = 0;
    if (tipRect.right > vw - VIEWPORT_MARGIN) {
      dx = vw - VIEWPORT_MARGIN - tipRect.right;
    } else if (tipRect.left < VIEWPORT_MARGIN) {
      dx = VIEWPORT_MARGIN - tipRect.left;
    }
    if (tipRect.bottom > vh - VIEWPORT_MARGIN) {
      dy = vh - VIEWPORT_MARGIN - tipRect.bottom;
    } else if (tipRect.top < VIEWPORT_MARGIN) {
      dy = VIEWPORT_MARGIN - tipRect.top;
    }
    if (dx === 0 && dy === 0) return;
    setCoords((prev) => ({
      ...prev,
      left: prev.left + dx,
      top: prev.top + dy,
    }));
  }, [open, tip, placement]);

  const hide = (e?: { relatedTarget?: EventTarget | null }) => {
    if (interactive) {
      const next = e?.relatedTarget;
      if (next instanceof Node) {
        if (tipRef.current?.contains(next)) return;
        if (ref.current?.contains(next)) return;
      }
    }
    setOpen(false);
  };

  const baseDisplay =
    className.includes("flex") || className.includes("block")
      ? ""
      : "inline-flex ";

  const tipClassName = content
    ? `${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      } fixed max-w-[240px] rounded-xl border border-brand-line/80 bg-brand-elevated px-3 py-2.5 text-left shadow-[var(--shadow-premium)] ${tooltipClassName}`.trim()
    : isMultilineLabel
      ? `pointer-events-none fixed w-max max-w-[17rem] rounded-lg bg-brand-accent px-3.5 py-3 text-left text-[11px] leading-[1.45] tracking-tight text-white shadow-lg ${tooltipClassName}`.trim()
      : `pointer-events-none fixed w-max max-w-[11.5rem] whitespace-pre-line rounded-md bg-brand-accent px-2.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-white shadow-md ${tooltipClassName}`.trim();

  return (
    <span
      ref={ref}
      className={`${baseDisplay}${className}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && tip
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              className={tipClassName}
              style={{
                top: coords.top,
                left: coords.left,
                transform: coords.transform,
                zIndex,
              }}
              onMouseEnter={interactive ? show : undefined}
              onMouseLeave={interactive ? hide : undefined}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
