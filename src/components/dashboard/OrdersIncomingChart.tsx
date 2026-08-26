import Link from "next/link";
import type { IncomingOrdersPoint } from "@/lib/dashboard";
import {
  BRAND_BLUE,
  BRAND_ORANGE,
  BRAND_SIGNATURE,
  chartGradientStops,
} from "@/lib/brand-colors";

type OrdersIncomingChartProps = {
  points: IncomingOrdersPoint[];
  href?: string;
  compact?: boolean;
};

type PlotPoint = IncomingOrdersPoint & { x: number; y: number };

function buildSmoothLinePath(plotPoints: PlotPoint[]) {
  if (plotPoints.length === 0) return "";
  if (plotPoints.length === 1) {
    const p = plotPoints[0];
    return `M ${p.x} ${p.y}`;
  }

  let path = `M ${plotPoints[0].x} ${plotPoints[0].y}`;
  for (let i = 0; i < plotPoints.length - 1; i++) {
    const current = plotPoints[i];
    const next = plotPoints[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function buildAreaPath(plotPoints: PlotPoint[], baseline: number) {
  if (plotPoints.length === 0) return "";
  const line = buildSmoothLinePath(plotPoints);
  const last = plotPoints[plotPoints.length - 1];
  const first = plotPoints[0];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export function OrdersIncomingChart({
  points,
  href = "/orders",
  compact = false,
}: OrdersIncomingChartProps) {
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const todayCount = points.find((point) => point.isToday)?.count ?? 0;

  if (total <= 0) {
    return (
      <p className="px-4 py-5 text-center text-[11px] text-brand-ink-tertiary">
        No orders in this period
      </p>
    );
  }

  const width = 320;
  const height = compact ? 88 : 132;
  const pad = { top: 10, right: 10, bottom: 24, left: 6 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const baseline = pad.top + plotHeight;
  const max = Math.max(...points.map((point) => point.count), 1);
  const [lineFrom, lineTo] = chartGradientStops(BRAND_SIGNATURE);
  const [areaFrom] = chartGradientStops(BRAND_BLUE);

  const plotPoints: PlotPoint[] = points.map((point, index) => ({
    ...point,
    x:
      pad.left +
      (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: pad.top + plotHeight - (point.count / max) * plotHeight,
  }));

  const linePath = buildSmoothLinePath(plotPoints);
  const areaPath = buildAreaPath(plotPoints, baseline);
  const labelStride = compact ? 3 : 2;

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col px-3 py-2" : "px-5 py-4"}>
      <div className="mb-1.5 flex shrink-0 items-end justify-between gap-3">
        <div>
          <p className="text-[18px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink">
            {total}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            last 14 days
          </p>
        </div>
        <div className="text-right">
          <p className="text-[16px] font-bold leading-none tabular-nums tracking-[-0.03em] text-brand-orange">
            {todayCount}
          </p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
            today
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="group block min-h-0 flex-1 overflow-hidden transition-opacity hover:opacity-95"
        aria-label={`${total} orders in the last 14 days`}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          role="img"
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="orders-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={lineFrom} />
              <stop offset="100%" stopColor={lineTo} />
            </linearGradient>
            <linearGradient id="orders-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={areaFrom} stopOpacity={0.28} />
              <stop offset="100%" stopColor={areaFrom} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((fraction) => {
            const y = pad.top + plotHeight * (1 - fraction);
            return (
              <line
                key={fraction}
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="rgba(15, 30, 45, 0.06)"
                strokeWidth={1}
              />
            );
          })}

          <path d={areaPath} fill="url(#orders-area-gradient)" />
          <path
            d={linePath}
            fill="none"
            stroke="url(#orders-line-gradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {plotPoints.map((point) => (
            <g key={point.iso}>
              {point.isToday ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={6}
                  fill="rgba(240, 120, 64, 0.14)"
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={point.isToday ? 3.5 : 2.5}
                fill={point.isToday ? BRAND_ORANGE : BRAND_SIGNATURE}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          ))}

          {plotPoints.map((point, index) =>
            index % labelStride === 0 || point.isToday ? (
              <text
                key={`${point.iso}-label`}
                x={point.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-brand-ink-tertiary text-[9px] font-semibold"
              >
                {point.isToday ? "Today" : point.shortLabel}
              </text>
            ) : null
          )}
        </svg>
      </Link>
    </div>
  );
}
