"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardTip } from "@/components/dashboard/DashboardTip";
import { producerInsight } from "@/lib/dashboard-tooltips";
import type { Producer } from "@/types";

const statusLabel = {
  available: "Available",
  limited: "Limited",
  unavailable: "Booked",
} as const;

export function TeamRosterMarquee({ team }: { team: Producer[] }) {
  const roster = [...team, ...team];

  return (
    <div className="dashboard-team-track relative flex min-h-[180px] flex-1 overflow-hidden">
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
          {roster.map((producer, index) => {
            const insight = producerInsight(producer);
            return (
              <DashboardTip
                key={`${producer.id}-${index}`}
                title={insight.title}
                body={insight.body}
                className="shrink-0"
                placement="top"
              >
                <Link
                  href={`/schedule?producer=${producer.initials}`}
                  className="dashboard-team-card group flex w-[148px] shrink-0 flex-col items-center gap-2.5 rounded-xl px-3 py-4 text-center"
                >
                  <div className="rounded-full ring-2 ring-brand-line/35 ring-offset-2 ring-offset-white">
                    <Avatar src={producer.avatar} alt={producer.name} size="xl" />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="truncate text-[15px] font-bold tracking-[-0.03em] text-brand-ink">
                      {producer.initials}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-brand-ink-secondary">
                      {producer.name}
                    </p>
                    <span className="mt-2.5 inline-flex rounded-full border border-brand-line/45 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-brand-ink-secondary">
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
    </div>
  );
}
