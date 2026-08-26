import Link from "next/link";
import type { CategorySlice } from "@/lib/dashboard";
import {
  BRAND_BLUE,
  BRAND_BLUE_DEEP,
  BRAND_ORANGE,
  BRAND_SIGNATURE,
  chartSegmentColor,
} from "@/lib/brand-colors";

const DASHBOARD_SEGMENT_COLORS = [
  BRAND_SIGNATURE,
  BRAND_BLUE,
  BRAND_BLUE_DEEP,
  BRAND_ORANGE,
] as const;

function segmentColor(index: number, compact: boolean): string {
  if (compact) {
    return DASHBOARD_SEGMENT_COLORS[index % DASHBOARD_SEGMENT_COLORS.length];
  }
  return chartSegmentColor(index);
}

type PipelineChartProps = {
  pipeline: CategorySlice[];
  href?: string;
  compact?: boolean;
  limit?: number;
};

export function PipelineChart({
  pipeline,
  href = "/mtd",
  compact = false,
  limit,
}: PipelineChartProps) {
  const total = pipeline.reduce((sum, slice) => sum + slice.count, 0);
  const visible = limit ? pipeline.slice(0, limit) : pipeline;

  if (total === 0) {
    return (
      <p
        className={
          compact
            ? "px-4 py-5 text-center text-[11px] text-brand-ink-tertiary"
            : "px-5 py-8 text-center text-[12px] text-brand-ink-tertiary"
        }
      >
        No open MTD entries.
      </p>
    );
  }

  return (
    <div className={compact ? "flex h-full flex-col px-4 py-3" : "px-5 py-4"}>
      <div
        className={
          compact
            ? "flex items-end justify-between gap-3"
            : "flex items-end justify-between gap-4 border-b border-brand-line/20 pb-4"
        }
      >
        <div>
          <p
            className={
              compact
                ? "text-[22px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
                : "text-display text-[32px] leading-none tabular-nums tracking-[-0.045em] text-brand-ink"
            }
          >
            {total}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-brand-ink-tertiary">
            open mixes
          </p>
        </div>
      </div>

      <div
        className={
          compact
            ? "mt-2.5 flex h-2 gap-px overflow-hidden rounded-md"
            : "mt-4 flex h-2 gap-px overflow-hidden rounded-md bg-brand-line/10"
        }
      >
        {pipeline.map((slice, index) => (
          <div
            key={slice.category}
            className="h-full min-w-[3px] first:rounded-l-md last:rounded-r-md"
            style={{
              width: `${slice.share * 100}%`,
              backgroundColor: segmentColor(index, compact),
            }}
            title={`${slice.category}: ${slice.count}`}
          />
        ))}
      </div>

      <ul className={compact ? "mt-2.5 min-h-0 flex-1 space-y-1.5 overflow-hidden" : "mt-4 space-y-2.5"}>
        {visible.map((slice, index) => (
          <li key={slice.category}>
            <Link
              href={href}
              className="group block rounded-md px-0.5 py-0.5 transition-colors hover:bg-brand-blue-soft/10"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11px] font-semibold text-brand-ink">
                  {slice.category}
                </span>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-brand-ink">
                  {slice.count}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-brand-line/15">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(slice.share * 100, slice.count > 0 ? 4 : 0)}%`,
                    backgroundColor: segmentColor(index, compact),
                  }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
