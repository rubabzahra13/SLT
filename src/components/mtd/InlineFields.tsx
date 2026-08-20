"use client";

import { toIsoDateString } from "@/lib/dates";
import clsx from "clsx";

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
      className={clsx(
        "w-full rounded-lg border border-brand-line bg-brand-surface px-2 py-1.5 text-[11px] font-medium outline-none focus:border-brand-line-strong",
        className
      )}
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
};

export function InlineInput({
  value,
  onChange,
  placeholder,
  type = "text",
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
      className="w-full rounded-lg border border-brand-line bg-brand-surface px-2 py-1.5 text-[11px] font-medium tabular-nums outline-none focus:border-brand-line-strong"
    />
  );
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
  const displayValue = normalized || template || "";
  const showingTemplate = !normalized && Boolean(template);

  return (
    <input
      type="date"
      value={displayValue}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
      }}
      onBlur={() => {
        if (!normalized && template) onChange(template);
        else if (value && normalized && value !== normalized) {
          onChange(normalized);
        }
      }}
      className={clsx(
        "w-full min-w-[108px] rounded-lg border border-brand-line bg-brand-surface px-2 py-1.5 text-[11px] font-medium tabular-nums outline-none focus:border-brand-line-strong",
        showingTemplate && "text-brand-ink-tertiary"
      )}
      title={showingTemplate ? "Suggested mix date — click to edit" : undefined}
    />
  );
}
