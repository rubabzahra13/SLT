import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { DottedScroll } from "@/components/ui/DottedScroll";
import { getData, formatPrice } from "@/lib/data";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import {
  buildCategoryPipeline,
  buildDashboardPulse,
  buildPriorityQueue,
} from "@/lib/dashboard";
import clsx from "clsx";

const TODAY_LABEL = "Wednesday, August 19, 2026";

const PANEL_SCROLL_HEIGHT = "max-h-[18.5rem]";

const toneDot = {
  blocked: "bg-brand-danger",
  match: "bg-brand-blue",
  assign: "bg-brand-orange",
} as const;

export default function DashboardPage() {
  const { orders, producers, mtdRecords } = getData();

  const mtdByOrderId = new Map(
    mtdRecords
      .filter((record) => record.orderId)
      .map((record) => [record.orderId as string, record.id])
  );

  const pulse = buildDashboardPulse(orders, mtdRecords, producers);
  const priority = buildPriorityQueue(orders, mtdRecords, mtdByOrderId);
  const pipeline = buildCategoryPipeline(orders);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={TODAY_LABEL} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 p-6 lg:gap-7 lg:p-8">
        {/* 1 · Studio pulse */}
        <section aria-label="Studio overview">
          <PanelHeader
            step="1"
            title="Overview"
            detail="Current studio load"
          />
          <div className="mt-3 overflow-hidden rounded-xl border border-brand-line bg-brand-surface">
            <div className="grid grid-cols-2 divide-x divide-y divide-brand-line lg:grid-cols-4 lg:divide-y-0">
              <InsightCell
                href="/orders"
                value={pulse.toAssign}
                label="To assign"
              />
              <InsightCell
                href="/mtd"
                value={pulse.blocked}
                label="Blocked"
                highlight={pulse.blocked > 0}
              />
              <InsightCell
                href="/mtd"
                value={pulse.inProduction}
                label="In production"
              />
              <InsightCell
                href="/schedule"
                value={`${pulse.availableProducers}/${pulse.totalProducers}`}
                label="Team open"
              />
            </div>
          </div>
        </section>

        {/* 2 · Team availability */}
        <section aria-label="Team availability">
          <PanelHeader
            step="2"
            title="Team"
            detail="Who is open right now"
            action={{ label: "Open schedule", href: "/schedule" }}
          />
          <div className="mt-3 overflow-hidden rounded-xl border border-brand-line bg-brand-surface px-4 py-4">
            <div className="dashboard-marquee group flex w-max gap-5 pb-1">
              {[...producers, ...producers].map((producer, index) => (
                <Link
                  key={`${producer.id}-${index}`}
                  href={`/schedule?producer=${producer.initials}`}
                  className="group flex w-[76px] shrink-0 flex-col items-center gap-2"
                >
                  <div
                    className={clsx(
                      producer.status === "available" && "ring-available",
                      producer.status === "limited" && "ring-limited",
                      producer.status === "unavailable" && "ring-unavailable"
                    )}
                  >
                    <Avatar
                      src={producer.avatar}
                      alt={producer.name}
                      size="lg"
                    />
                  </div>
                  <div className="w-full text-center">
                    <p className="truncate text-[12px] font-semibold text-brand-ink">
                      {producer.initials}
                    </p>
                    <p className="truncate text-[10px] text-brand-ink-tertiary">
                      {producer.nextAvailable}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 3 · Work queue + pipeline */}
        <div className="grid gap-6 xl:grid-cols-12 xl:items-start">
          <section className="xl:col-span-8" aria-label="Priority queue">
            <PanelHeader
              step="3"
              title="Needs attention"
              detail="Blocked items, new orders, and First Available matches"
              action={{ label: "Open MTD", href: "/mtd" }}
            />
            <DashboardScrollPanel
              isEmpty={priority.length === 0}
              empty={
                <p className="flex items-center justify-center px-4 py-12 text-[13px] text-brand-ink-secondary">
                  You&apos;re all caught up.
                </p>
              }
            >
              <ul className="divide-y divide-brand-line">
                {priority.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-brand-accent-soft/40 active:bg-brand-accent-soft/60"
                    >
                      <span
                        className={clsx(
                          "h-2 w-2 shrink-0 rounded-full",
                          toneDot[item.tone]
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-brand-ink">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-brand-ink-secondary">
                          {item.reason}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-brand-ink-tertiary">
                          {item.meta}
                          {item.price != null
                            ? ` · ${formatPrice(item.price)}`
                            : ""}
                        </p>
                      </div>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-brand-ink-tertiary"
                        strokeWidth={2}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardScrollPanel>
          </section>

          <section className="xl:col-span-4" aria-label="Order pipeline">
            <PanelHeader
              step="4"
              title="Pipeline"
              detail="Open orders by category"
              action={{ label: "All orders", href: "/orders" }}
            />
            <div
              className={clsx(
                "mt-3 overflow-hidden rounded-xl border border-brand-line bg-brand-surface",
                PANEL_SCROLL_HEIGHT,
                "h-[18.5rem]"
              )}
            >
              <PipelineChart pipeline={pipeline} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function DashboardScrollPanel({
  children,
  empty,
  isEmpty,
}: {
  children?: React.ReactNode;
  empty?: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div
      className={clsx(
        "mt-3 overflow-hidden rounded-xl border border-brand-line bg-brand-surface",
        !isEmpty && PANEL_SCROLL_HEIGHT
      )}
    >
      {isEmpty ? (
        empty
      ) : (
        <DottedScroll
          className={PANEL_SCROLL_HEIGHT}
          scrollClassName={`${PANEL_SCROLL_HEIGHT} overflow-y-scroll scrollbar-hide`}
          indicatorPlacement="overlay"
        >
          {children}
        </DottedScroll>
      )}
    </div>
  );
}

function PanelHeader({
  step,
  title,
  detail,
  action,
}: {
  step: string;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-accent-soft text-[11px] font-semibold tabular-nums text-brand-ink-secondary">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-brand-ink">{title}</h2>
          <p className="mt-0.5 text-[12px] text-brand-ink-secondary">{detail}</p>
        </div>
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-[13px] font-semibold text-brand-blue hover:text-brand-blue-hover"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function InsightCell({
  href,
  value,
  label,
  highlight,
}: {
  href: string;
  value: number | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center px-3 py-5 transition hover:bg-brand-accent-soft/40 active:bg-brand-accent-soft/60"
    >
      <p
        className={clsx(
          "text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em] lg:text-[24px]",
          highlight ? "text-brand-danger" : "text-brand-ink"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-center text-[12px] text-brand-ink-secondary">
        {label}
      </p>
    </Link>
  );
}
