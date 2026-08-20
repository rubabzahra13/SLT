import Link from "next/link";
import type { CategorySlice } from "@/lib/dashboard";
import { chartSegmentColor } from "@/lib/brand-colors";

type PipelineChartProps = {
  pipeline: CategorySlice[];
  href?: string;
};

export function PipelineChart({ pipeline, href = "/orders" }: PipelineChartProps) {
  const total = pipeline.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13px] text-brand-ink-secondary">
        No open orders right now.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-[18.5rem] flex-col items-center justify-center gap-3 px-4 py-3">
      <div className="relative shrink-0">
        <PipelineDonut pipeline={pipeline} total={total} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[28px] font-semibold leading-none tabular-nums text-brand-ink">
            {total}
          </p>
          <p className="mt-0.5 text-[10px] text-brand-ink-tertiary">open</p>
        </div>
      </div>

      <ul className="grid w-full grid-cols-3 gap-x-2 gap-y-2.5">
        {pipeline.map((slice, index) => (
          <li key={slice.category} className="min-w-0">
            <Link
              href={href}
              className="flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:bg-brand-accent-soft/40"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: chartSegmentColor(index),
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[10px] leading-tight text-brand-ink-secondary">
                {slice.category}
              </span>
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-brand-ink">
                {slice.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PipelineDonut({
  pipeline,
  total,
}: {
  pipeline: CategorySlice[];
  total: number;
}) {
  const size = 144;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let angle = -90;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Open orders by category, ${total} total`}
      className="block"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {pipeline.map((slice, index) => {
        const fraction = slice.count / total;
        const dash = fraction * circumference;
        const segment = (
          <circle
            key={slice.category}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={chartSegmentColor(index)}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="butt"
            transform={`rotate(${angle} ${center} ${center})`}
          />
        );
        angle += fraction * 360;
        return segment;
      })}
    </svg>
  );
}
