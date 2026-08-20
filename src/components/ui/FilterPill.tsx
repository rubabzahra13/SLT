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
    "border-brand-line bg-gradient-to-b from-brand-blue-soft to-brand-bg-subtle/90 text-brand-ink-secondary shadow-sm",
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
          : "border-brand-line bg-brand-elevated text-brand-ink-secondary shadow-sm hover:border-brand-line-strong hover:bg-brand-accent-soft hover:text-brand-ink"
      )}
    >
      {label}
    </button>
  );
}
