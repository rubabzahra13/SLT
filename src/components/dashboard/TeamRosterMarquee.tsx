"use client";

import Link from "next/link";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardTip } from "@/components/dashboard/DashboardTip";
import { producerInsight } from "@/lib/dashboard-tooltips";
import type { Producer } from "@/types";

const statusLabel = {
  available: "Available",
  limited: "Unavailable",
  unavailable: "Booked",
} as const;

const statusRingClass = {
  available: "ring-available",
  limited: "ring-limited",
  unavailable: "ring-unavailable",
} as const;

const statusBadgeClass = {
  available:
    "border-emerald-200/70 bg-emerald-50/90 text-emerald-800",
  limited: "border-amber-200/70 bg-amber-50/90 text-amber-800",
  unavailable:
    "border-brand-line/45 bg-brand-bg-subtle/90 text-brand-ink-secondary",
} as const;

export function TeamRosterMarquee({ team }: { team: Producer[] }) {
  return (
    <div className="dashboard-team-track relative flex min-h-[180px] flex-1 overflow-x-auto">
      <div className="flex min-h-[180px] flex-1 items-center gap-4 px-2 py-2">
        {team.map((producer) => {
          const insight = producerInsight(producer);
          return (
            <DashboardTip
              key={producer.id}
              title={insight.title}
              body={insight.body}
              className="shrink-0"
              placement="top"
            >
              <Link
                href={`/schedule?producer=${producer.initials}`}
                className="dashboard-team-card group flex w-[140px] shrink-0 flex-col items-center gap-2.5 rounded-xl px-3 py-4 text-center"
              >
                <div
                  className={clsx(
                    "rounded-full",
                    statusRingClass[producer.status]
                  )}
                >
                  <div className="rounded-full bg-white p-0.5">
                    <Avatar producer={producer} size="xl" />
                  </div>
                </div>
                <div className="min-w-0 w-full">
                  <p className="truncate text-[15px] font-bold tracking-[-0.03em] text-brand-ink">
                    {producer.name}
                  </p>
                  <span
                    className={clsx(
                      "mt-2.5 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em]",
                      statusBadgeClass[producer.status]
                    )}
                  >
                    {statusLabel[producer.status]}
                  </span>
                  <p className="mt-2 truncate text-[10px] font-semibold text-brand-ink-tertiary">
                    {producer.nextAvailable}
                  </p>
                </div>
              </Link>
            </DashboardTip>
          );
        })}
      </div>
    </div>
  );
}
