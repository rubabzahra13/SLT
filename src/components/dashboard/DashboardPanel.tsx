"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";
import { DashboardTip } from "@/components/dashboard/DashboardTip";

export function DashboardPanel({
  title,
  subtitle,
  count,
  href,
  linkLabel,
  tip,
  children,
  className,
  fill = false,
}: {
  title: string;
  subtitle?: string;
  count?: string | number;
  href?: string;
  linkLabel?: string;
  tip?: { title: string; body: string };
  children: React.ReactNode;
  className?: string;
  fill?: boolean;
}) {
  const showCount =
    count != null && (typeof count === "string" || count !== 0);

  const titleBlock = (
    <div className="flex min-w-0 items-center gap-2.5">
      <h2 className="dashboard-panel-title truncate">{title}</h2>
      {showCount ? (
        <span className="dashboard-panel-count shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
          {count}
        </span>
      ) : null}
      {subtitle ? (
        <span className="dashboard-panel-subtitle hidden truncate lg:inline">
          {subtitle}
        </span>
      ) : null}
    </div>
  );

  return (
    <section
      className={clsx(
        "dashboard-panel flex min-h-0 flex-col",
        fill && "h-full min-h-0",
        className
      )}
    >
      <div className="dashboard-panel-head flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        {tip ? (
          <DashboardTip title={tip.title} body={tip.body} className="min-w-0 flex-1">
            {titleBlock}
          </DashboardTip>
        ) : (
          titleBlock
        )}
        {href && linkLabel ? (
          <Link href={href} className="dashboard-panel-link inline-flex shrink-0 items-center gap-0.5">
            {linkLabel}
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
          </Link>
        ) : null}
      </div>
      <div className="dashboard-panel-body flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
