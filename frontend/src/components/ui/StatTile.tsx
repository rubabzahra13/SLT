import Link from "next/link";
import clsx from "clsx";
import type { BrandAccent } from "@/lib/brand-colors";

type StatTileProps = {
  href: string;
  label: string;
  value: number | string;
  action: string;
  accent?: BrandAccent | "green" | "purple";
};

const accentDot = {
  blue: "bg-brand-blue",
  orange: "bg-brand-orange",
  green: "bg-brand-success",
  purple: "bg-brand-grey",
};

const actionLinkClass: Record<BrandAccent, string> = {
  blue: "text-brand-blue group-hover:text-brand-blue-hover",
  orange: "text-brand-orange group-hover:text-brand-orange-hover",
};

export function StatTile({
  href,
  label,
  value,
  action,
  accent = "blue",
}: StatTileProps) {
  return (
    <Link
      href={href}
      className="group surface-premium rounded-xl p-4 transition hover:shadow-[var(--shadow-premium)]"
    >
      <div className="flex items-center gap-2">
        <span className={clsx("h-2 w-2 rounded-full", accentDot[accent])} />
        <span className="text-[13px] text-brand-ink-secondary">{label}</span>
      </div>
      <p className="text-display mt-2 text-2xl tabular-nums">{value}</p>
      <p
        className={clsx(
          "mt-1 text-[13px] font-medium transition",
          accent === "orange" || accent === "blue"
            ? actionLinkClass[accent]
            : "text-brand-blue group-hover:text-brand-blue-hover"
        )}
      >
        {action}
      </p>
    </Link>
  );
}
