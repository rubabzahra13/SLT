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
  hideLabel?: boolean;
};

const accentActive: Record<BrandAccent, string> = {
  blue: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
  orange: "border-brand-orange/35 bg-brand-orange-soft/70 text-brand-ink",
};

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
  accent = "blue",
  hideLabel = false,
}: FilterSelectProps) {
  const selected = options.find((o) => o.value === value);
  const isActive = value !== options[0]?.value;

  return (
    <label
      className={clsx(
        "inline-flex items-center gap-1.5 transition",
        hideLabel
          ? clsx(
              "h-8 rounded-full border px-3 shadow-sm",
              isActive
                ? accentActive[accent]
                : "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-elevated"
            )
          : "rounded-lg border border-brand-line bg-brand-elevated px-2.5 py-1 shadow-sm",
        className
      )}
    >
      {!hideLabel ? (
        <>
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            {label}
          </span>
        </>
      ) : null}
      <span className="relative inline-flex items-center gap-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={hideLabel ? label : undefined}
          className={clsx(
            "appearance-none bg-transparent outline-none",
            hideLabel
              ? "max-w-[148px] truncate pr-4 text-[12px] font-medium"
              : "pr-5 text-[12px] font-medium text-brand-ink"
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {hideLabel
                ? opt.label
                : `${opt.label}${opt.count !== undefined ? ` (${opt.count})` : ""}`}
            </option>
          ))}
        </select>
        {!hideLabel && selected?.count !== undefined ? null : hideLabel ? (
          <>
            {selected?.count !== undefined ? (
              <span className="shrink-0 text-[11px] tabular-nums text-brand-ink-tertiary">
                {selected.count}
              </span>
            ) : null}
          </>
        ) : null}
        <ChevronDown
          className={clsx(
            "pointer-events-none h-3 w-3 shrink-0 text-brand-ink-tertiary",
            hideLabel ? "absolute right-0" : "absolute right-0"
          )}
          strokeWidth={2}
        />
      </span>
    </label>
  );
}
