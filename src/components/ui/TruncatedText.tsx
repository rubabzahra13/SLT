"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type TruncatedTextProps = {
  text: string;
  className?: string;
  style?: React.CSSProperties;
};

export function TruncatedText({ text, className, style }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const showTooltip = () => {
    const el = ref.current;
    if (!el || !truncated) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
    setVisible(true);
  };

  const hideTooltip = () => setVisible(false);

  return (
    <>
      <span
        ref={ref}
        className={clsx("block min-w-0 truncate", className)}
        style={style}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {text}
      </span>
      {mounted && visible && truncated
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[9999] max-w-[260px] -translate-x-1/2 whitespace-normal rounded-lg border border-brand-line/25 bg-brand-ink px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white shadow-lg"
              style={{ top: position.top, left: position.left }}
            >
              {text}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
