import Link from "next/link";
import clsx from "clsx";
import type { MixOpsSlice } from "@/lib/dashboard";

type MixOpsChartProps = {
  slices: MixOpsSlice[];
  compact?: boolean;
};

function isOverdue(label: string) {
  return label === "Overdue";
}

export function MixOpsChart({ slices, compact = false }: MixOpsChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const urgent = slices.find((slice) => isOverdue(slice.label))?.count ?? 0;

  if (slices.length === 0) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-[11px] text-brand-ink-tertiary">
        No timeline data
      </p>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 flex-col justify-between px-3.5 py-3"
          : "flex flex-col px-5 py-4"
      }
    >
      <div className={clsx("flex items-baseline justify-between gap-3", !compact && "mb-4")}>
        <div>
          <p className="text-[22px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink">
            {total}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            on timeline
          </p>
        </div>
        {urgent > 0 ? (
          <p className="text-right text-[10px] font-semibold uppercase tracking-[0.05em] text-brand-orange">
            {urgent} overdue
          </p>
        ) : null}
      </div>

      <ol className={clsx("relative min-h-0", compact ? "flex-1 space-y-0" : "space-y-1")}>
        {slices.map((slice, index) => {
          const overdue = isOverdue(slice.label);
          const isLast = index === slices.length - 1;

          return (
            <li key={slice.label} className="relative">
              {!isLast ? (
                <span
                  className="absolute left-[6px] top-[26px] bottom-0 w-px bg-brand-line/35"
                  aria-hidden
                />
              ) : null}
              <Link
                href={slice.href}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-lg py-2 pl-0 pr-1 transition-colors",
                  compact ? "py-2" : "py-2.5",
                  "hover:bg-brand-blue-soft/12"
                )}
              >
                <span
                  className={clsx(
                    "relative z-[1] h-3 w-3 shrink-0 rounded-full ring-2 ring-white",
                    overdue ? "bg-brand-orange" : "bg-brand-signature"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-brand-ink-secondary group-hover:text-brand-ink">
                  {slice.label}
                </span>
                <span
                  className={clsx(
                    "shrink-0 text-[14px] font-bold tabular-nums tracking-[-0.03em]",
                    overdue
                      ? "text-brand-orange group-hover:text-brand-orange-deep"
                      : "text-brand-ink group-hover:text-brand-signature"
                  )}
                >
                  {slice.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
