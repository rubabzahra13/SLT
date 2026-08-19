import clsx from "clsx";
import { ChevronDown } from "lucide-react";

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
};

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: FilterSelectProps) {
  return (
    <label
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg border border-brand-line bg-brand-surface px-2.5 py-1",
        className
      )}
    >
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
