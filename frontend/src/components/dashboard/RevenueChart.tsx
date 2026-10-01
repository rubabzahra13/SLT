import Link from "next/link";
import type { RevenueStage } from "@/lib/dashboard";
import { formatPrice } from "@/lib/data";

type RevenueChartProps = {
  stages: RevenueStage[];
  compact?: boolean;
};

export function RevenueChart({ stages, compact = false }: RevenueChartProps) {
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);

  if (total <= 0) {
    return (
      <p className="px-4 py-5 text-center text-[11px] text-brand-ink-tertiary">
        No pipeline value yet
      </p>
    );
  }

  const peak = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className={compact ? "flex h-full flex-col justify-between px-4 py-3" : "px-5 py-4"}>
      <div className={compact ? "flex flex-1 items-end gap-2" : "flex h-24 items-end gap-3"}>
        {stages.map((stage) => {
          const height = Math.max(12, (stage.value / peak) * 100);
          return (
            <Link
              key={stage.label}
              href={stage.href}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className="w-full max-w-[40px] rounded-md transition-opacity group-hover:opacity-90"
                style={{
                  height: compact ? `${Math.max(height * 0.55, 18)}%` : `${height}%`,
                  minHeight: compact ? 28 : undefined,
                  backgroundColor: stage.color,
                }}
                title={`${stage.label}: ${formatPrice(stage.value)}`}
              />
              <span className="w-full truncate text-center text-[9px] font-semibold uppercase tracking-wide text-brand-ink-secondary">
                {stage.label}
              </span>
            </Link>
          );
        })}
      </div>
      <p
        className={
          compact
            ? "mt-2 text-center text-[11px] font-bold tabular-nums text-brand-ink"
            : "mt-2 text-center text-[11px] font-semibold tabular-nums text-brand-ink"
        }
      >
        {formatPrice(total)}
      </p>
    </div>
  );
}
