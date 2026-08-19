import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getData, formatPrice } from "@/lib/data";

export default function OutsourcedPage() {
  const { mtdRecords } = getData();
  const outsourced = mtdRecords.filter((r) => r.section === "OUTSOURCED MIXES" || r.status === "outsourced");
  const inProgress = mtdRecords.slice(0, 12).map((r) => ({
    ...r,
    deadline: "Aug 25, 2026",
    waitingOn: r.eightCountSheet.includes("NEED") ? "8-Count Sheet" : "Voiceover",
  }));

  const display = outsourced.length > 0 ? outsourced : inProgress;

  return (
    <>
      <PageHeader
        title="In Progress / Outsourced"
        subtitle="Mixes waiting on voiceovers, instrumentation, or custom work"
      />

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {display.map((rec) => (
          <Link
            key={rec.id}
            href={`/mtd/${rec.id}`}
            className="group rounded-2xl border border-ig-border bg-ig-surface p-5 transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <StatusBadge status="outsourced" />
              <span className="text-xs text-ig-text-secondary">
                Due Aug 25
              </span>
            </div>
            <h3 className="mt-3 font-semibold group-hover:text-ig-blue">
              {rec.programName}
            </h3>
            <p className="mt-1 text-sm text-ig-text-secondary">
              {rec.editorInitials} · {rec.package}
            </p>
            <div className="mt-4 rounded-xl bg-ig-bg p-3">
              <p className="text-xs font-medium text-ig-text-secondary">
                Waiting on
              </p>
              <p className="text-sm font-semibold text-ig-purple">
                {rec.eightCountSheet.includes("NEED")
                  ? "Materials & customization"
                  : "Voiceover / instrumentation"}
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold">{formatPrice(rec.price)}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
