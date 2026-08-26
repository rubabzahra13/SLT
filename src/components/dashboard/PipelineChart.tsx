import Link from "next/link";
import type { CategorySlice } from "@/lib/dashboard";
import {
  BRAND_BLUE,
  BRAND_BLUE_DEEP,
  BRAND_ORANGE,
  BRAND_ORANGE_DEEP,
  BRAND_SIGNATURE,
  chartGradientStops,
} from "@/lib/brand-colors";

const PREMIUM_PIPELINE_COLORS = [
  BRAND_SIGNATURE,
  BRAND_ORANGE,
  BRAND_BLUE,
  BRAND_ORANGE_DEEP,
  BRAND_BLUE_DEEP,
] as const;

function pipelineColor(index: number): string {
  return PREMIUM_PIPELINE_COLORS[index % PREMIUM_PIPELINE_COLORS.length];
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
) {
  if (endAngle - startAngle >= 359.99) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - 0.001} ${cy - outerR}`,
      `L ${cx - 0.001} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
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

  const size = compact ? 96 : 140;
  const stroke = compact ? 12 : 18;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - stroke;

  let cursor = 0;
  const arcs = pipeline.map((slice, index) => {
    const startAngle = cursor;
    const endAngle =
      index === pipeline.length - 1 ? 360 : cursor + slice.share * 360;
    cursor = endAngle;
    return { ...slice, startAngle, endAngle, index };
  });

  return (
    <div
      className={
        compact
          ? "flex h-full min-h-0 items-center justify-center gap-3 px-3 py-2"
          : "flex items-center justify-center gap-6 px-5 py-4"
      }
    >
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Pipeline breakdown, ${total} total mixes`}
        >
          <defs>
            {arcs.map(({ index }) => {
              const color = pipelineColor(index);
              const [from, to] = chartGradientStops(color);
              return (
                <linearGradient
                  key={`grad-${index}`}
                  id={`pipeline-grad-${index}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={from} />
                  <stop offset="100%" stopColor={to} />
                </linearGradient>
              );
            })}
          </defs>

          {arcs.map(({ category, count, startAngle, endAngle, index }) => (
            <path
              key={category}
              d={describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle)}
              fill={`url(#pipeline-grad-${index})`}
              className="transition-opacity hover:opacity-90"
            >
              <title>{`${category}: ${count}`}</title>
            </path>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={
              compact
                ? "text-[20px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
                : "text-[26px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink"
            }
          >
            {total}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            total
          </p>
        </div>
      </div>

      <ul className="min-h-0 min-w-0 max-w-[140px] flex-1 space-y-1 overflow-hidden">
        {visible.map((slice, index) => {
          const color = pipelineColor(index);
          const [from] = chartGradientStops(color);
          return (
            <li key={slice.category}>
              <Link
                href={href}
                className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-brand-blue-soft/12"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ring-offset-1"
                  style={{ backgroundColor: from }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-brand-ink group-hover:text-brand-signature">
                  {slice.category}
                </span>
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-brand-ink">
                  {slice.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
