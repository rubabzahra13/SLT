"use client";

import type { ReactNode } from "react";
import { toIsoDateString } from "@/lib/dates";
import clsx from "clsx";

const inlineControlClass =
  "h-8 w-full rounded-lg border border-brand-line bg-brand-surface px-2 text-[11px] font-medium outline-none focus:border-brand-line-strong";

type InlineCellProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Keeps inline table controls on the same row baseline. */
export function InlineCell({ children, footer, className }: InlineCellProps) {
  return (
    <div
      className={clsx(
        "mx-auto flex w-full min-w-0 flex-col items-stretch",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
      <div className="mt-1 h-[13px] truncate text-[9px] leading-none">
        {footer ?? "\u00A0"}
      </div>
    </div>
  );
}

type InlineSelectProps = {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  className?: string;
};

export function InlineSelect({
  value,
  options,
  onChange,
  className,
}: InlineSelectProps) {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      className={clsx(inlineControlClass, className)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
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
        "w-full resize-y rounded-lg border border-brand-line bg-brand-surface px-3 py-2 text-[13px] text-brand-ink outline-none focus:border-brand-line-strong",
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
};

export function InlineDateInput({
  value,
  onChange,
  template,
}: InlineDateInputProps) {
  const normalized = toIsoDateString(value);
  const isUnset = !normalized;

  return (
    <input
      type="date"
      value={normalized}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      onBlur={() => {
        if (value && normalized && value !== normalized) {
          onChange(normalized);
        }
      }}
      className={clsx(
        inlineControlClass,
        "min-w-[108px] tabular-nums",
        isUnset &&
          "border-brand-line/50 bg-brand-bg/70 text-brand-ink-tertiary"
      )}
      title={
        isUnset && template ? `Suggested mix date: ${template}` : undefined
      }
    />
  );
}
