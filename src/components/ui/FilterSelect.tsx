import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import type { BrandAccent } from "@/lib/brand-colors";

export type FilterSelectOption = {
  value: string;
  label: string;
  count?: number;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  accent?: BrandAccent;
};

const accentDot: Record<BrandAccent, string> = {
  blue: "bg-brand-blue",
  orange: "bg-brand-orange",
};

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
  accent = "blue",
}: FilterSelectProps) {
  return (
    <label
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg border border-brand-line bg-brand-surface px-2.5 py-1",
        className
      )}
    >
      <span
        className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", accentDot[accent])}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-ink-tertiary">
        {label}
      </span>
      <span className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent pr-5 text-[12px] font-medium text-brand-ink outline-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.count !== undefined ? ` (${opt.count})` : ""}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-0 h-3 w-3 text-brand-ink-tertiary"
          strokeWidth={2}
        />
      </span>
    </label>
  );
}
