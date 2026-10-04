"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { MTDRecord, Producer } from "@/types";
import type { AssignedMixForProducer } from "@/lib/producer-assigned-mixes";
import { Avatar } from "@/components/ui/Avatar";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { resolveMTDFormMeta } from "@/lib/mtd-filters";

type RemoveCategoryModalProps = {
  open: boolean;
  producer: Producer | null;
  category: string | null;
  assignedMixes?: AssignedMixForProducer[];
  unpaidPayrollMixes?: MTDRecord[];
  onClose: () => void;
  /** Move category mixes to Reassign and remove the category. */
  onSendToReassign?: () => void;
  busy?: boolean;
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

function hrefForAssignedMix(rec: AssignedMixForProducer): string {
  const focus = encodeURIComponent(rec.id);
  if (rec.onMtdBoard) {
    return `/mtd?focus=${focus}`;
  }
  const { formType } = resolveMTDFormMeta(rec, new Map());
  const params = new URLSearchParams({
    focus: rec.id,
    form: formType,
    range: "assigned",
  });
  return `/orders?${params.toString()}`;
}

function MixListItem({
  rec,
  badge,
  badgeTone = "amber",
  href,
  linkLabel,
}: {
  rec: MTDRecord;
  badge?: string;
  badgeTone?: "amber" | "blue" | "green";
  href?: string;
  linkLabel?: string;
}) {
  const badgeClass =
    badgeTone === "blue"
      ? "shrink-0 rounded-full bg-brand-blue-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-blue"
      : badgeTone === "green"
        ? "shrink-0 rounded-full bg-brand-success/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-success"
        : "shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900";

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] font-semibold text-brand-ink">
          {rec.programName?.trim() || "Untitled mix"}
        </p>
        {badge ? <span className={badgeClass}>{badge}</span> : null}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
        {[rec.category?.trim() || null, formatMixDateRange(rec)]
          .filter(Boolean)
          .join(" · ")}
        {rec.invoice?.trim() ? ` · #${rec.invoice}` : ""}
      </p>
    </>
  );

  const cardClass =
    "block rounded-lg bg-white px-3 py-2.5 ring-1 ring-inset ring-black/[0.06] transition hover:ring-brand-blue/35";

  if (href && linkLabel) {
    return (
      <li>
        <Link href={href} className={cardClass}>
          {body}
          <p className="mt-1 text-[11px] font-semibold text-brand-blue">
            {linkLabel}
          </p>
        </Link>
      </li>
    );
  }

  return <li className={cardClass}>{body}</li>;
}

function SectionCard({
  tone,
  step,
  title,
  children,
}: {
  tone: "warn" | "info";
  step?: string;
  title: string;
  children: ReactNode;
}) {
  const shell =
    tone === "warn"
      ? "border-amber-200/90 bg-amber-50/70"
      : "border-brand-blue/20 bg-brand-blue-soft/25";
  const stepClass =
    tone === "warn"
      ? "bg-amber-200/80 text-amber-950"
      : "bg-brand-blue-soft text-brand-blue";
  const titleClass = tone === "warn" ? "text-amber-950" : "text-brand-ink";

  return (
    <div className={`mt-3 rounded-xl border p-3.5 text-left ${shell}`}>
      <div className="flex items-start gap-2.5">
        {step ? (
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${stepClass}`}
          >
            {step}
          </span>
        ) : null}
        <p
          className={`min-w-0 flex-1 text-[13px] font-semibold leading-snug ${titleClass}`}
        >
          {title}
        </p>
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

export function RemoveCategoryModal({
  open,
  producer,
  category,
  assignedMixes = [],
  unpaidPayrollMixes = [],
  onClose,
  onSendToReassign,
  busy = false,
}: RemoveCategoryModalProps) {
  if (!open || !producer || !category) return null;

  const payrollBlockCount = unpaidPayrollMixes.length;
  const assignedMixesCount = assignedMixes.length;
  const fromMtdCount = assignedMixes.filter((rec) => rec.onMtdBoard).length;
  const needsPayrollPaid = payrollBlockCount > 0;
  const hasAssignedMixes = assignedMixesCount > 0;
  const needsReassign = !needsPayrollPaid && hasAssignedMixes;
  const showSteps = needsPayrollPaid && hasAssignedMixes;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-brand-scrim backdrop-blur-sm"
        onClick={() => {
          if (!busy) onClose();
        }}
        aria-label="Close"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-category-title"
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="max-h-[min(70vh,640px)] overflow-y-auto px-6 pb-5 pt-7 text-center">
          <div className="flex justify-center">
            <Avatar producer={producer} size="xl" />
          </div>
          <h2
            id="remove-category-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            {needsPayrollPaid
              ? "Finish payroll first"
              : `Remove ${category}?`}
          </h2>
          {needsPayrollPaid ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
              {producer.name} already completed{" "}
              {payrollBlockCount === 1 ? "a mix" : "mixes"} on {category}. Mark{" "}
              {payrollBlockCount === 1 ? "it" : "them"} Paid on Payroll, then
              come back and remove the category.
            </p>
          ) : hasAssignedMixes ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
              Removes {category} from the draft. When you Save,{" "}
              {producer.name.charAt(0).toUpperCase() + producer.name.slice(1)}
              &apos;s {category} mixes on Orders and MTD move to Reassign.
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-secondary">
              Removes {category} from {producer.name}&apos;s compensation when
              you Save.
            </p>
          )}

          {needsPayrollPaid ? (
            <SectionCard
              tone="warn"
              step={showSteps ? "1" : undefined}
              title={
                payrollBlockCount === 1
                  ? "Mark this mix Paid on Payroll"
                  : `Mark these ${payrollBlockCount} mixes Paid on Payroll`
              }
            >
              <ul className="max-h-[140px] space-y-2 overflow-y-auto">
                {unpaidPayrollMixes.map((rec) => (
                  <MixListItem
                    key={rec.id}
                    rec={rec}
                    badge="Payroll"
                    badgeTone="green"
                    href={`/payroll?focus=${encodeURIComponent(rec.id)}`}
                    linkLabel="Open in Payroll →"
                  />
                ))}
              </ul>
            </SectionCard>
          ) : null}

          {hasAssignedMixes ? (
            <SectionCard
              tone="info"
              step={showSteps ? "2" : undefined}
              title={
                needsPayrollPaid
                  ? assignedMixesCount === 1
                    ? "Also moves to Reassign after payroll"
                    : `Also moves ${assignedMixesCount} mixes to Reassign after payroll`
                  : assignedMixesCount === 1
                    ? "Moves to Reassign when you Save"
                    : `Moves ${assignedMixesCount} mixes to Reassign when you Save`
              }
            >
              <ul className="max-h-[140px] space-y-2 overflow-y-auto">
                {assignedMixes.map((rec) => (
                  <MixListItem
                    key={rec.id}
                    rec={rec}
                    badge={rec.onMtdBoard ? "MTD" : "Orders"}
                    badgeTone={rec.onMtdBoard ? "blue" : "amber"}
                    href={hrefForAssignedMix(rec)}
                    linkLabel={
                      rec.onMtdBoard ? "Open in MTD →" : "Open in Orders →"
                    }
                  />
                ))}
              </ul>
              {fromMtdCount > 0 ? (
                <p className="mt-2 text-[11px] leading-snug text-brand-ink-tertiary">
                  {fromMtdCount} from MTD will return to Orders first.
                </p>
              ) : null}
            </SectionCard>
          ) : null}
        </div>

        <div className="flex flex-col border-t border-black/[0.08]">
          {needsPayrollPaid ? null : needsReassign ? (
            <button
              type="button"
              disabled={busy}
              onClick={onSendToReassign}
              className="border-b border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-blue transition hover:bg-brand-blue-soft/40 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Remove from draft"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg disabled:opacity-60"
          >
            {needsPayrollPaid ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
