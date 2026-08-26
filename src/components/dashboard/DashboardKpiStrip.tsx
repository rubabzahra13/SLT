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
    <section className="dashboard-kpi-strip dashboard-surface-neutral shrink-0 overflow-hidden rounded-xl">
      <div className="grid grid-cols-2 divide-y divide-brand-line/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const insight = kpiInsight(kpi.label, pulse, kpi.detail);
          return (
            <DashboardTip
              key={kpi.label}
              title={insight.title}
              body={insight.body}
              className="block min-w-0"
              placement="bottom"
            >
              <Link
                href={kpi.href}
                className="dashboard-kpi-cell group block min-w-0 transition-colors hover:bg-brand-blue-soft/20"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                  {kpi.label}
                </p>
                <p className="mt-1.5 text-[22px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-brand-ink">
                  {kpi.value}
                </p>
                {kpi.detail ? (
                  <p className="mt-1 truncate text-[11px] font-medium text-brand-ink-tertiary">
                    {kpi.detail}
                  </p>
                ) : null}
              </Link>
            </DashboardTip>
          );
        })}
      </div>
    </section>
  );
}
