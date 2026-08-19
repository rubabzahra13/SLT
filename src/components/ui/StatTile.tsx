import Link from "next/link";
import clsx from "clsx";

type StatTileProps = {
  href: string;
  label: string;
  value: number | string;
  action: string;
  accent?: "blue" | "orange" | "green" | "purple";
};

const accentDot = {
  blue: "bg-ig-blue",
  orange: "bg-ig-orange",
  green: "bg-ig-green",
  purple: "bg-ig-purple",
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
      className="group rounded-xl border border-ig-border bg-ig-surface p-4 transition hover:border-ig-text-secondary/30"
    >
      <div className="flex items-center gap-2">
        <span className={clsx("h-2 w-2 rounded-full", accentDot[accent])} />
        <span className="text-[13px] text-ig-text-secondary">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[13px] font-medium text-ig-blue group-hover:underline">
        {action}
      </p>
    </Link>
  );
}
