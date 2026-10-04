"use client";

import Link from "next/link";
import type { MTDRecord, Producer } from "@/types";
import type {
  AssignedMixForProducer,
  ProducerAddonRateKind,
} from "@/lib/producer-assigned-mixes";
import { Avatar } from "@/components/ui/Avatar";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";

type RemoveAddonRateModalProps = {
  open: boolean;
  producer: Producer | null;
  kind: ProducerAddonRateKind | null;
  mixes?: AssignedMixForProducer[];
  onClose: () => void;
};

const KIND_LABEL: Record<ProducerAddonRateKind, string> = {
  dance_voiceover: "Dance Voiceover",
  cheer_voiceover: "Cheer Voiceover",
  rush_fee: "Rush Fee",
};

function formatMixDateRange(rec: MTDRecord): string {
  const start = toIsoDateString(rec.mixStartDate);
  const end = toIsoDateString(rec.mixEndDate);
  if (start && end) {
    return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
  }
  if (start) return formatDisplayDate(start);
  if (end) return formatDisplayDate(end);
  return "No dates";
}

function isPayrollMix(rec: MTDRecord): boolean {
  return (
    Boolean(rec.inPayroll) ||
    String(rec.status || "").toLowerCase() === "completed" ||
    String(rec.status || "").toLowerCase() === "payroll"
  );
}

function hrefForMix(
  rec: AssignedMixForProducer
): { href: string; linkLabel: string; badge: string; badgeTone: "amber" | "blue" | "green" } {
  if (isPayrollMix(rec)) {
    return {
      href: `/payroll?focus=${encodeURIComponent(rec.id)}`,
      linkLabel: "Open in Payroll →",
      badge: "Payroll",
      badgeTone: "green",
    };
  }
  if (rec.onMtdBoard) {
    return {
      href: `/mtd?focus=${encodeURIComponent(rec.id)}`,
      linkLabel: "Open in MTD →",
      badge: "MTD",
      badgeTone: "blue",
    };
  }
  const { formType } = resolveMTDFormMeta(rec, new Map());
  const params = new URLSearchParams({
    focus: rec.id,
    form: formType,
    range: "assigned",
  });
  return {
    href: `/orders?${params.toString()}`,
    linkLabel: "Open in Orders →",
    badge: "Orders",
    badgeTone: "amber",
  };
}

export function RemoveAddonRateModal({
  open,
  producer,
  kind,
  mixes = [],
  onClose,
}: RemoveAddonRateModalProps) {
  if (!open || !producer || !kind) return null;

  const label = KIND_LABEL[kind];
  const feeWord = kind === "rush_fee" ? "rush fee" : "voiceover";
  const count = mixes.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-addon-rate-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 pb-5 pt-7 text-center">
          <div className="flex justify-center">
            <Avatar producer={producer} size="xl" />
          </div>
          <h2
            id="remove-addon-rate-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Unapply {label} first
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
            {producer.name} still has {feeWord} applied on{" "}
            {count === 1 ? "a mix" : `${count} mixes`}. Turn off the {feeWord}{" "}
            on {count === 1 ? "that mix" : "those mixes"}, then come back and
            remove {label} compensation.
          </p>

          <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/70 p-3.5 text-left">
            <p className="text-[13px] font-semibold leading-snug text-amber-950">
              {count === 1
                ? `Unapply ${label} on this mix`
                : `Unapply ${label} on these ${count} mixes`}
            </p>
            <ul className="mt-2.5 max-h-[180px] space-y-2 overflow-y-auto">
              {mixes.map((rec) => {
                const link = hrefForMix(rec);
                const badgeClass =
                  link.badgeTone === "blue"
                    ? "shrink-0 rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-blue"
                    : link.badgeTone === "green"
                      ? "shrink-0 rounded-full bg-brand-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-success"
                      : "shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900";
                return (
                  <li key={rec.id}>
                    <Link
                      href={link.href}
                      className="block rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-black/[0.06] transition hover:ring-brand-blue/35"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-[12px] font-semibold text-brand-ink">
                          {rec.programName?.trim() || "Untitled mix"}
                        </p>
                        <span className={badgeClass}>{link.badge}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
                        {[rec.category?.trim() || null, formatMixDateRange(rec)]
                          .filter(Boolean)
                          .join(" · ")}
                        {rec.invoice?.trim() ? ` · #${rec.invoice}` : ""}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-brand-blue">
                        {link.linkLabel}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
