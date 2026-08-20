import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

type FilterPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  accent?: BrandAccent;
};

const activeStyles: Record<BrandAccent, string> = {
  blue:
    "border-brand-blue-muted bg-brand-blue-soft text-brand-signature shadow-sm",
  orange:
    "border-brand-orange-muted bg-brand-orange-soft text-brand-orange shadow-sm",
};

export function FilterPill({
  label,
  active,
  onClick,
  accent = "blue",
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-200",
        active
          ? activeStyles[accent]
          : "border-brand-line bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-accent-soft hover:text-brand-ink"
      )}
    >
      {label}
    </button>
  );
}
