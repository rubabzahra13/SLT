import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { OrdersIncomingChart } from "@/components/dashboard/OrdersIncomingChart";
import { ScheduleWeekChart } from "@/components/dashboard/ScheduleWeekChart";
import { MixOpsChart } from "@/components/dashboard/MixOpsChart";
import { getData, formatPrice } from "@/lib/data";
import {
  buildCategoryPipeline,
  buildDashboardPulse,
  buildIncomingOrdersSeries,
  buildMixOpsSlices,
  buildWeeklyCapacity,
  sortProducersForCapacity,
} from "@/lib/dashboard";
import type { Producer } from "@/types";

const TODAY_LABEL = "Wednesday, August 19, 2026";

const statusLabel = {
  available: "Open",
  limited: "Limited",
  unavailable: "Booked",
} as const;

export default function DashboardPage() {
  const { orders, pastOrders, producers, mtdRecords, schedule } = getData();

  const pulse = buildDashboardPulse(mtdRecords, producers, schedule);
  const pipeline = buildCategoryPipeline(mtdRecords);
  const team = sortProducersForCapacity(producers);
  const incomingOrders = buildIncomingOrdersSeries(orders, pastOrders);
  const weekCapacity = buildWeeklyCapacity(producers, schedule, mtdRecords);
  const mixOps = buildMixOpsSlices(pulse);

  const kpis = [
    { href: "/mtd", label: "Unassigned", value: pulse.toAssign, accent: true },
    { href: "/mtd", label: "In queue", value: pulse.blocked },
    { href: "/outsourced", label: "Outgoing", value: pulse.outgoing },
    { href: "/outsourced", label: "Outsourced", value: pulse.outsourced },
    {
      href: "/payroll",
      label: "In payroll",
      value: pulse.payrollCount,
      detail: formatPrice(pulse.payrollValue),
    },
  ] as const;

  const pipelineTotal = pipeline.reduce((sum, slice) => sum + slice.count, 0);
  const incomingTotal = incomingOrders.reduce((sum, point) => sum + point.count, 0);

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3.25rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.25rem)]">
      <div className="shrink-0">
        <PageHeader
          compact
          title="Dashboard"
          badge={`${mtdRecords.length} mixes`}
          subtitle={TODAY_LABEL}
        />
      </div>

      <div className="dashboard-fit px-6 pb-3 pt-2 lg:px-8">
        <section className="dashboard-kpi-strip shrink-0">
          <div className="grid grid-cols-2 divide-y divide-brand-line/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="dashboard-kpi-cell group block min-w-0"
              >
                <p
                  className={clsx(
                    "text-[22px] font-bold leading-none tabular-nums tracking-[-0.04em] text-brand-ink",
                    "accent" in kpi && kpi.accent && "text-brand-orange"
                  )}
                >
                  {kpi.value}
                </p>
                <p className="text-label mt-1.5">{kpi.label}</p>
                {"detail" in kpi && kpi.detail ? (
                  <p className="mt-0.5 truncate text-[10px] font-medium text-brand-ink-tertiary">
                    {kpi.detail}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>

        <div className="dashboard-body-grid min-h-0">
          <div className="dashboard-ops-col min-h-0">
            <DashboardPanel
              className="min-h-0"
              title="All team"
              count={pulse.totalProducers}
              href="/producers"
              linkLabel="Manage team"
            >
              <div className="flex min-h-0 flex-1 p-3">
                <TeamRosterMarquee team={team} />
              </div>
            </DashboardPanel>

            <DashboardPanel fill className="min-h-0" title="Week capacity" href="/schedule" linkLabel="Schedule">
              <ScheduleWeekChart days={weekCapacity} compact />
            </DashboardPanel>
          </div>

          <div className="dashboard-insights-col min-h-0">
            <DashboardPanel
              fill
              className="min-h-0"
              title="Music to do"
              count={pipelineTotal}
              href="/mtd"
              linkLabel="MTD"
            >
              <PipelineChart pipeline={pipeline} compact limit={4} />
            </DashboardPanel>

            <DashboardPanel
              fill
              className="min-h-0"
              title="Orders in"
              subtitle={`${incomingTotal} last 14 days`}
              href="/orders"
              linkLabel="Orders"
            >
              <OrdersIncomingChart points={incomingOrders} compact />
            </DashboardPanel>

            <DashboardPanel fill className="min-h-0" title="Mix timeline" href="/mtd" linkLabel="MTD">
              <MixOpsChart slices={mixOps} compact />
            </DashboardPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamRosterMarquee({ team }: { team: Producer[] }) {
  const roster = [...team, ...team];

  return (
    <div className="dashboard-team-track relative flex min-h-[180px] flex-1 overflow-hidden rounded-xl border">
      <div
        className="dashboard-team-fade-left pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
        aria-hidden
      />
      <div
        className="dashboard-team-fade-right pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
        aria-hidden
      />
      <div className="flex min-h-[180px] flex-1 items-center py-2">
        <div className="dashboard-marquee flex w-max items-stretch gap-5 px-4">
          {roster.map((producer, index) => (
            <Link
              key={`${producer.id}-${index}`}
              href={`/schedule?producer=${producer.initials}`}
              className="dashboard-team-card group flex w-[152px] shrink-0 flex-col items-center gap-3 rounded-xl px-4 py-5 text-center transition-colors hover:border-brand-signature/35"
            >
              <div
                className={clsx(
                  "rounded-full ring-2 ring-offset-2 ring-offset-white",
                  producer.status === "available" && "ring-brand-signature",
                  producer.status === "limited" && "ring-brand-orange",
                  producer.status === "unavailable" && "ring-brand-line"
                )}
              >
                <Avatar src={producer.avatar} alt={producer.name} size="xl" />
              </div>
              <div className="min-w-0 w-full">
                <p className="truncate text-[15px] font-bold tracking-[-0.03em] text-brand-ink">
                  {producer.initials}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-brand-ink-secondary">
                  {producer.name}
                </p>
                <span
                  className={clsx(
                    "mt-2.5 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em]",
                    producer.status === "available" && "bg-brand-blue-soft text-brand-signature",
                    producer.status === "limited" && "bg-brand-orange-soft text-brand-orange",
                    producer.status === "unavailable" && "bg-brand-bg-subtle text-brand-ink-tertiary"
                  )}
                >
                  {statusLabel[producer.status]}
                </span>
                <p className="mt-2 truncate text-[10px] font-semibold text-brand-ink-tertiary">
                  {producer.nextAvailable}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  subtitle,
  count,
  href,
  linkLabel,
  children,
  className,
  fill = false,
}: {
  title: string;
  subtitle?: string;
  count?: string | number;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  fill?: boolean;
}) {
  const showCount =
    count != null && (typeof count === "string" || count !== 0);

  return (
    <section
      className={clsx(
        "dashboard-panel flex min-h-0 flex-col",
        fill && "h-full min-h-0",
        className
      )}
    >
      <div className="dashboard-panel-head flex shrink-0 items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[13px] font-bold tracking-[-0.02em] text-brand-ink">
            {title}
          </h2>
          {showCount ? (
            <span className="dashboard-panel-count shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
              {count}
            </span>
          ) : null}
          {subtitle ? (
            <span className="hidden truncate text-[10px] font-medium text-brand-ink-tertiary lg:inline">
              {subtitle}
            </span>
          ) : null}
        </div>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-brand-signature transition hover:text-brand-signature-hover"
          >
            {linkLabel}
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
