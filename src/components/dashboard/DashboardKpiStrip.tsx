"use client";

import Link from "next/link";
import { DashboardTip } from "@/components/dashboard/DashboardTip";
import { kpiInsight } from "@/lib/dashboard-tooltips";
import type { DashboardPulse } from "@/lib/dashboard";

type KpiItem = {
  href: string;
  label: string;
  value: number;
  detail?: string;
};

type DashboardKpiStripProps = {
  kpis: KpiItem[];
  pulse: DashboardPulse;
};

export function DashboardKpiStrip({ kpis, pulse }: DashboardKpiStripProps) {
  return (
    <section className="dashboard-kpi-strip shrink-0 w-full">
      <div className="flex w-full items-stretch gap-2 sm:gap-2.5">
        {kpis.map((kpi) => {
          const insight = kpiInsight(kpi.label, pulse, kpi.detail);
          return (
            <div key={kpi.label} className="flex-1 min-w-0 flex flex-col">
              <DashboardTip
                title={insight.title}
                body={insight.body}
                className="flex w-full h-full min-w-0 flex-col"
                placement="bottom"
              >
                <Link
                  href={kpi.href}
                  className="dashboard-surface-neutral group flex flex-col justify-between w-full h-full rounded-xl border border-brand-line/60 p-3 sm:p-3.5 shadow-sm transition-all hover:border-brand-line-strong hover:bg-brand-blue-soft/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 cursor-pointer min-w-0"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary group-hover:text-brand-ink-secondary transition-colors truncate">
                      {kpi.label}
                    </p>
                    <p className="mt-1.5 text-[20px] sm:text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-brand-ink">
                      {kpi.value}
                    </p>
                  </div>
                  {kpi.detail ? (
                    <p className="mt-1 truncate text-[11px] font-medium text-brand-ink-tertiary">
                      {kpi.detail}
                    </p>
                  ) : null}
                </Link>
              </DashboardTip>
            </div>
          );
        })}
      </div>
    </section>
  );
}
