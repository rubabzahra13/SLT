"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAppState } from "@/context/AppStateContext";
import { formatPrice } from "@/lib/data";
import { getInProgressRecords } from "@/lib/mtd-filters";

export default function OutsourcedPage() {
  const { mtdRecords } = useAppState();
  const display = getInProgressRecords(mtdRecords);

  return (
    <>
      <PageHeader
        title="In Progress / Outsourced"
        subtitle={`${display.length} assigned mixes in production or waiting on materials`}
      />

      {display.length === 0 ? (
        <p className="px-6 text-[13px] text-brand-ink-secondary">
          No in-progress mixes right now.
        </p>
      ) : (
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {display.map((rec) => (
            <Link
              key={rec.id}
              href={`/mtd/${rec.id}`}
              className="group rounded-2xl border border-brand-line bg-brand-surface p-5 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <StatusBadge
                  status={rec.status === "outsourced" ? "outsourced" : "active"}
                />
                {rec.mixStartDate ? (
                  <span className="text-xs text-brand-ink-secondary">
                    Mix {rec.mixStartDate}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 font-semibold group-hover:text-brand-info">
                {rec.programName}
              </h3>
              <p className="mt-1 text-sm text-brand-ink-secondary">
                {rec.assignedProducer} · {rec.package}
              </p>
              <div className="mt-4 rounded-xl bg-brand-bg p-3">
                <p className="text-xs font-medium text-brand-ink-secondary">
                  Waiting on
                </p>
                <p className="text-sm font-semibold text-brand-ink">
                  {rec.eightCountSheet.includes("NEED")
                    ? "Materials & customization"
                    : "Voiceover / instrumentation"}
                </p>
              </div>
              <p className="mt-3 text-sm font-semibold">{formatPrice(rec.price)}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
