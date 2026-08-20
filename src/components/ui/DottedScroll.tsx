"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import clsx from "clsx";

const DOT_COUNT = 3;

const DEFAULT_SCROLL_CLASS = {
  vertical: "h-full overflow-y-scroll scrollbar-hide",
  horizontal: "w-full overflow-x-scroll scrollbar-hide",
} as const;

type DottedScrollProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollClassName?: string;
  orientation?: "vertical" | "horizontal";
  indicatorPlacement?: "overlay" | "below" | "gutter";
  indicatorClassName?: string;
  tone?: "light" | "dark";
};

export function DottedScroll({
  children,
  className = "",
  contentClassName,
  scrollClassName,
  orientation = "vertical",
  indicatorPlacement,
  indicatorClassName = "",
  tone = "light",
}: DottedScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const isHorizontal = orientation === "horizontal";
  const resolvedIndicatorPlacement =
    indicatorPlacement ?? (isHorizontal ? "below" : "overlay");
  const indicatorsBelow = resolvedIndicatorPlacement === "below";
  const indicatorsGutter = resolvedIndicatorPlacement === "gutter";
  const baseScrollClass =
    scrollClassName ??
    DEFAULT_SCROLL_CLASS[isHorizontal ? "horizontal" : "vertical"];
  const resolvedScrollClass =
    indicatorsGutter && !isHorizontal && !/\bpr-\d/.test(baseScrollClass)
      ? `${baseScrollClass} pr-4`.trim()
      : baseScrollClass;
  const resolvedContentClass =
    contentClassName ??
    (isHorizontal ? "block w-max min-w-full leading-[0]" : "flex flex-col");
  const bounded = isHorizontal
    ? !resolvedScrollClass.includes("w-full")
    : !resolvedScrollClass.includes("h-full");

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (isHorizontal) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = scrollWidth - clientWidth;
      const scrollable = maxScroll > 4;
      setCanScroll(scrollable);
      if (!scrollable) {
        setActiveIndex(0);
        return;
      }
      const progress = scrollLeft / maxScroll;
      setActiveIndex(Math.round(progress * (DOT_COUNT - 1)));
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const maxScroll = scrollHeight - clientHeight;
    const scrollable = maxScroll > 4;
    setCanScroll(scrollable);
    if (!scrollable) {
      setActiveIndex(0);
      return;
    }
    const progress = scrollTop / maxScroll;
    setActiveIndex(Math.round(progress * (DOT_COUNT - 1)));
  }, [isHorizontal]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    if (el.firstElementChild) {
      resizeObserver.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const dotMarks = (
    <>
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <span
          key={index}
          className={clsx(
            "rounded-full transition-all duration-150",
            index === activeIndex
              ? "h-2 w-2 bg-brand-signature"
              : tone === "dark"
                ? "h-1.5 w-1.5 bg-white/20"
                : "h-1.5 w-1.5 bg-brand-line-strong"
          )}
        />
      ))}
    </>
  );

  const dots = canScroll ? (
    <div
      className={clsx(
        "pointer-events-none",
        indicatorsBelow &&
          "mt-2 flex items-center justify-center gap-2",
        isHorizontal &&
          !indicatorsBelow &&
          "absolute bottom-1.5 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2",
        !isHorizontal &&
          indicatorsGutter &&
          "absolute inset-y-0 right-0 z-[2] flex w-4 flex-col items-center justify-center gap-2",
        !isHorizontal &&
          !indicatorsGutter &&
          "absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 py-3",
        indicatorClassName,
        !isHorizontal && !indicatorsGutter && !indicatorClassName && "right-1"
      )}
      aria-hidden="true"
    >
      {dotMarks}
    </div>
  ) : null;

  return (
    <div
      className={clsx(
        "relative",
        bounded
          ? "w-full shrink-0"
          : isHorizontal
            ? "min-w-0 w-full"
            : "min-h-0 flex-1",
        className
      )}
    >
      <div ref={containerRef} className={resolvedScrollClass}>
        <div className={resolvedContentClass}>{children}</div>
      </div>
      {dots}
    </div>
  );
}
