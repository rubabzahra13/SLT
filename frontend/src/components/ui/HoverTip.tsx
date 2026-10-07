"use client";

import { useEffect, useRef, useState } from "react";
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
};

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
}: HoverTipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const show = () => {
    const el = ref.current;
    if (!el || !hasTip) return;
    clearCloseTimer();
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
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      });
    } else {
      setCoords({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      });
    }
    setOpen(true);
  };

  const hide = () => {
    if (!interactive) {
      setOpen(false);
      return;
    }
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 160);
  };

  const baseDisplay =
    className.includes("flex") || className.includes("block")
      ? ""
      : "inline-flex ";

  const tipClassName = content
    ? `${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      } fixed max-w-[240px] rounded-xl border border-brand-line/80 bg-brand-elevated px-3 py-2.5 text-left shadow-[var(--shadow-premium)]`
    : isMultilineLabel
      ? "pointer-events-none fixed w-max max-w-[17rem] rounded-lg bg-brand-accent px-3.5 py-3 text-left text-[11px] leading-[1.45] tracking-tight text-white shadow-lg"
      : "pointer-events-none fixed w-max max-w-[11.5rem] whitespace-pre-line rounded-md bg-brand-accent px-2.5 py-1.5 text-center text-[11px] font-semibold leading-snug text-white shadow-md";

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
