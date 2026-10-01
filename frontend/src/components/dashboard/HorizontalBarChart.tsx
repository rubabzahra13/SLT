import Link from "next/link";
import type { BarChartRow } from "@/lib/dashboard";
import { chartGradient } from "@/lib/brand-colors";

type HorizontalBarChartProps = {
  rows: BarChartRow[];
  max?: number;
  href?: string;
  valueSuffix?: string;
  barHeight?: number;
};

export function HorizontalBarChart({
  rows,
  max,
  href,
  valueSuffix = "",
  barHeight = 6,
}: HorizontalBarChartProps) {
  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-[11px] text-brand-ink-tertiary">
        No data
      </p>
    );
  }

  const peak = max ?? Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const width = peak > 0 ? (row.value / peak) * 100 : 0;
        const content = (
          <>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] font-medium text-brand-ink-secondary">
                {row.label}
              </span>
              <span className="shrink-0 text-[11px] font-semibold tabular-nums text-brand-ink">
                {row.value}
                {valueSuffix}
              </span>
            </div>
            <div
              className="overflow-hidden rounded-full bg-brand-line/15"
              style={{ height: barHeight }}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(width, row.value > 0 ? 6 : 0)}%`,
                  backgroundImage: chartGradient(row.color ?? "#1f8fb3"),
                }}
              />
            </div>
          </>
        );

        return (
          <li key={row.label}>
            {href ? (
              <Link
                href={href}
                className="block rounded-md px-0.5 py-0.5 transition-colors hover:bg-brand-blue-soft/10"
              >
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
