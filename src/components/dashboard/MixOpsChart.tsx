"use client";

import Link from "next/link";
import clsx from "clsx";
import type { MixOpsSlice } from "@/lib/dashboard";
import { mixOpsInsight } from "@/lib/dashboard-tooltips";
import { DashboardTip } from "@/components/dashboard/DashboardTip";

type MixOpsChartProps = {
  slices: MixOpsSlice[];
  compact?: boolean;
  summary?: { dueThisWeek: number; overdue: number; startingToday: number };
};

function isOverdue(label: string) {
  return label === "Overdue";
}

export function MixOpsChart({
  slices,
  compact = false,
  summary,
}: MixOpsChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const urgent = slices.find((slice) => isOverdue(slice.label))?.count ?? 0;

  if (slices.length === 0) {
    return (
      <p className="flex h-full items-center justify-center px-4 text-[11px] text-brand-ink-tertiary">
        No timeline data
      </p>
    );
  }

  const summaryBody = summary
    ? `${summary.dueThisWeek} due this week · ${summary.overdue} overdue · ${summary.startingToday} starting today.`
    : "Active mixes grouped by schedule milestone.";

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 flex-col justify-center px-3 py-2"
          : "flex flex-col px-5 py-4"
      }
    >
      <div
        className={clsx(
          "flex shrink-0 items-baseline justify-between gap-3",
          compact ? "mb-1.5" : "mb-4"
        )}
      >
        <DashboardTip title="On timeline" body={summaryBody} placement="top">
          <div className="cursor-default">
            <p
              className={
                compact
                  ? "text-[18px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
                  : "text-[22px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
              }
            >
              {total}
            </p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
              on timeline
            </p>
          </div>
        </DashboardTip>
        {urgent > 0 ? (
          <DashboardTip
            title="Overdue"
            body={`${urgent} mix${urgent === 1 ? "" : "es"} past end date — review MTD priorities.`}
            placement="left"
          >
            <p className="cursor-default text-right text-[9px] font-semibold uppercase tracking-[0.05em] text-brand-orange">
              {urgent} overdue
            </p>
          </DashboardTip>
        ) : null}
      </div>

      <ol
        className={clsx(
          compact ? "shrink-0" : "min-h-0 flex-1",
          compact
            ? "grid grid-cols-2 content-start gap-x-2 gap-y-1"
            : "relative space-y-1"
        )}
      >
        {slices.map((slice, index) => {
          const overdue = isOverdue(slice.label);
          const isLast = index === slices.length - 1;
          const insight = mixOpsInsight(slice);

          return (
            <li key={slice.label} className={compact ? "" : "relative"}>
              {!compact && !isLast ? (
                <span
                  className="absolute left-[6px] top-[26px] bottom-0 w-px bg-brand-line/35"
                  aria-hidden
                />
              ) : null}
              <DashboardTip
                title={insight.title}
                body={insight.body}
                className="block w-full"
                placement="left"
              >
                <Link
                  href={slice.href}
                  className={clsx(
                    "group relative flex items-center gap-2 rounded-lg py-1 pl-0 pr-1 transition-colors hover:bg-[#f6f8fa]",
                    !compact && "gap-3 py-2.5"
                  )}
                >
                  <span
                    className={clsx(
                      "relative z-[1] h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white",
                      !compact && "h-3 w-3",
                      overdue ? "bg-brand-orange" : "bg-brand-line-strong/55"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-brand-ink-secondary group-hover:text-brand-ink">
                    {slice.label}
                  </span>
                  <span
                    className={clsx(
                      "shrink-0 text-[12px] font-bold tabular-nums tracking-[-0.03em]",
                      !compact && "text-[14px]",
                      overdue
                        ? "text-brand-orange"
                        : "text-brand-ink group-hover:text-brand-ink"
                    )}
                  >
                    {slice.count}
                  </span>
                </Link>
              </DashboardTip>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
