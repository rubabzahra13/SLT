"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Link2 } from "lucide-react";
import clsx from "clsx";
import { titleCase } from "@/lib/data";
import { formatDisplayDateTime } from "@/lib/dates";
import { getOrderIdentityName } from "@/lib/order-detail-sections";
import { suggestionMatchedOnLabel } from "@/lib/manual-form-suggestions";
import type { MatchBeforeMtdCandidate } from "@/lib/manual-form-suggestions";
import type { MTDRecord } from "@/types";

type MatchBeforeMtdModalProps = {
  open: boolean;
  record: MTDRecord | null;
  suggestions: MatchBeforeMtdCandidate[];
  onClose: () => void;
  onOpenMatchOrders: () => void;
  onMoveToMtd: () => void;
};

export function MatchBeforeMtdModal({
  open,
  record,
  suggestions,
  onClose,
  onOpenMatchOrders,
  onMoveToMtd,
}: MatchBeforeMtdModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted || !open || !record) return null;

  const program = titleCase(record.programName || "This order");
  const lookingForForms = suggestions.some((s) => s.role === "form");
  const peerLabel = lookingForForms ? "Magento form" : "manual order";
  const peerLabelPlural = lookingForForms ? "Magento forms" : "manual orders";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-before-mtd-title"
        className="relative flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-[22px] bg-brand-elevated shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <div className="shrink-0 px-6 pb-4 pt-7 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-soft text-brand-signature ring-1 ring-inset ring-brand-blue/20">
            <Link2 className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h2
            id="match-before-mtd-title"
            className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-brand-ink"
          >
            Possible matches
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-secondary">
            {program} looks similar to{" "}
            {suggestions.length === 1
              ? `a ${peerLabel}`
              : `${suggestions.length} ${peerLabelPlural}`}
            . Open Match Orders to review and link, or move to MTD without
            linking.
          </p>
        </div>

        <div
          className={clsx(
            "min-h-0 space-y-2 overflow-y-auto overscroll-contain px-6 pb-4",
            // Cap at ~2 cards; extra suggestions scroll inside the modal.
            suggestions.length > 2 && "max-h-[15.5rem]"
          )}
        >
          {suggestions.map((suggestion) => {
            const peer = suggestion.order;
            const identity =
              getOrderIdentityName(peer).trim() ||
              suggestion.identityName ||
              (suggestion.role === "form" ? "Magento form" : "Manual order");
            const when = peer.createdAt
              ? formatDisplayDateTime(peer.createdAt)
              : null;
            const sourceLine =
              suggestion.role === "form" ? "Form order" : "Manual order";
            const detailLines = [
              sourceLine,
              when ? `Submitted: ${when}` : null,
              suggestionMatchedOnLabel(
                suggestion.identityName,
                suggestion.matchedFieldKey
              ),
            ].filter(Boolean) as string[];
            return (
              <div
                key={peer.id}
                className="flex w-full items-start gap-3 rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3.5 py-3 text-left"
              >
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft text-brand-signature">
                  <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-brand-ink">
                    {titleCase(identity)}
                  </span>
                  <span className="mt-1 block space-y-0.5 text-[11px] leading-snug text-brand-ink-tertiary">
                    {detailLines.map((line) => (
                      <span key={line} className="block truncate">
                        {line}
                      </span>
                    ))}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid shrink-0 grid-cols-2 border-t border-black/[0.08]">
          <button
            type="button"
            onClick={onOpenMatchOrders}
            className="border-r border-black/[0.08] py-3.5 text-[15px] font-semibold text-brand-signature transition hover:bg-brand-blue-soft/40"
          >
            Open Match Orders
          </button>
          <button
            type="button"
            onClick={() => {
              onMoveToMtd();
              onClose();
            }}
            className="inline-flex items-center justify-center gap-1.5 py-3.5 text-[15px] font-medium text-brand-ink transition hover:bg-brand-bg"
          >
            Move to MTD
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 border-t border-black/[0.08] py-3 text-[13px] font-medium text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
}
