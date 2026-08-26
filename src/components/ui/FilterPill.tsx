import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

type FilterPillProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  accent?: BrandAccent;
  variant?: "solo" | "segmented" | "grouped";
};

const activeStyles: Record<BrandAccent, string> = {
  blue:
    "border-brand-blue/30 bg-gradient-to-b from-brand-blue-soft to-brand-bg-subtle/90 text-brand-ink shadow-sm ring-1 ring-inset ring-brand-blue/15",
  orange:
    "border-brand-orange/35 bg-brand-orange-soft text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20",
};

const segmentedActiveStyles: Record<BrandAccent, string> = {
  blue: "border-transparent bg-white text-brand-signature shadow-sm ring-1 ring-inset ring-brand-blue/15",
  orange:
    "border-transparent bg-white text-brand-orange shadow-sm ring-1 ring-inset ring-brand-orange/20",
};

const groupedActiveStyles: Record<BrandAccent, string> = {
  blue: "bg-brand-blue-soft/70 font-semibold text-brand-ink",
  orange: "bg-brand-orange-soft/80 font-semibold text-brand-ink",
};

export function FilterPill({
  label,
  active,
  onClick,
  accent = "blue",
  variant = "solo",
}: FilterPillProps) {
  const segmented = variant === "segmented";
  const grouped = variant === "grouped";
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 transition-all duration-200",
        grouped
          ? "rounded-lg px-2.5 py-1 text-[12px] font-medium"
          : "rounded-full border px-3 py-1 text-[11px] font-semibold",
        active
          ? grouped
            ? groupedActiveStyles[accent]
            : segmented
              ? segmentedActiveStyles[accent]
              : activeStyles[accent]
          : grouped
            ? "text-brand-ink-secondary hover:bg-brand-elevated/90 hover:text-brand-ink"
            : segmented
              ? "border-transparent text-brand-ink-tertiary hover:text-brand-ink"
              : "border-brand-line/50 bg-white/90 text-brand-ink-secondary shadow-sm hover:border-brand-line-strong hover:bg-white hover:text-brand-ink"
      )}
    >
      {label}
    </button>
  );
}
