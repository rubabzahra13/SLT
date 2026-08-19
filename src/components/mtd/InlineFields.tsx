"use client";

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
