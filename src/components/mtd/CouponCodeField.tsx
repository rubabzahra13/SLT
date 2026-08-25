"use client";

import Link from "next/link";
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { DetailInput } from "@/components/mtd/InlineFields";
import {
  evaluateCouponCode,
  type CouponCodeSuggestion,
} from "@/lib/discount-codes";
import type { DiscountCode } from "@/types";

type CouponCodeFieldProps = {
  value: string;
  discountCodes: DiscountCode[];
  editable?: boolean;
  onChange?: (value: string) => void;
};

function ValidFeedback({ match }: { match: DiscountCode }) {
  return (
    <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-brand-success/25 bg-brand-success/8 px-3 py-2.5">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-success"
        strokeWidth={2}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-brand-ink">
            Valid discount code
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-success/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success ring-1 ring-inset ring-brand-success/20">
            <BadgeCheck className="h-3 w-3" strokeWidth={2.25} />
            {match.code}
          </span>
        </div>
        {match.description ? (
          <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
            {match.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function suggestionMessage(suggestion: CouponCodeSuggestion): string {
  if (suggestion.reason === "spacing") {
    return "Same code with different spacing.";
  }
  return "Very close spelling to a saved discount code.";
}

function PotentialFeedback({
  suggestions,
  editable,
  onApply,
}: {
  suggestions: CouponCodeSuggestion[];
  editable?: boolean;
  onApply?: (code: string) => void;
}) {
  const multiple = suggestions.length > 1;

  return (
    <div className="mt-2 rounded-xl border border-brand-info/25 bg-brand-info/8 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-signature"
          strokeWidth={2}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-brand-ink">
            {multiple
              ? `${suggestions.length} possible matches`
              : "Possible match found"}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
            {multiple
              ? "This entry is close to these saved discount codes."
              : "This looks close to a saved discount code."}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.code.id}
            className="rounded-lg border border-brand-line/70 bg-brand-surface/80 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-ink">
                  {suggestion.code.code}
                </p>
                <p className="mt-0.5 text-[11px] text-brand-ink-secondary">
                  {suggestionMessage(suggestion)}
                </p>
                {suggestion.code.description ? (
                  <p className="mt-1 text-[11px] leading-snug text-brand-ink-tertiary">
                    {suggestion.code.description}
                  </p>
                ) : null}
              </div>
              {editable && onApply ? (
                <button
                  type="button"
                  onClick={() => onApply(suggestion.code.code)}
                  className="shrink-0 rounded-lg bg-brand-signature px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-signature-hover"
                >
                  Use this code
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvalidFeedback() {
  return (
    <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2.5">
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-warning"
        strokeWidth={2}
      />
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-brand-ink">
          Code not recognized
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-brand-ink-secondary">
          This coupon isn&apos;t in the saved discount codes. Check the spelling or
          add it in{" "}
          <Link
            href="/settings/discount-codes"
            className="font-semibold text-brand-signature transition hover:text-brand-signature-hover"
          >
            Settings → Discount codes
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export function CouponCodeField({
  value,
  discountCodes,
  editable = false,
  onChange,
}: CouponCodeFieldProps) {
  const trimmed = value.trim();
  const evaluation = evaluateCouponCode(trimmed, discountCodes);
  const showValid = evaluation.status === "valid";
  const showPotential = evaluation.status === "potential";
  const showInvalid = evaluation.status === "invalid";

  return (
    <div>
      <span className="text-label">Coupon code</span>
      {editable && onChange ? (
        <div className="mt-1.5">
          <DetailInput
            value={value}
            onChange={onChange}
            placeholder="Enter coupon code"
            className={clsx(
              showValid &&
                "border-brand-success/45 bg-brand-success/5 focus:border-brand-success/60",
              showPotential &&
                "border-brand-info/45 bg-brand-info/5 focus:border-brand-info/60",
              showInvalid &&
                "border-brand-warning/45 bg-brand-warning/5 focus:border-brand-warning/60"
            )}
          />
        </div>
      ) : trimmed ? (
        <p className="mt-1.5 text-[13px] font-semibold uppercase tracking-wide text-brand-ink">
          {trimmed}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-brand-ink-tertiary">Not set</p>
      )}
      {showValid && evaluation.match ? (
        <ValidFeedback match={evaluation.match} />
      ) : null}
      {showPotential && evaluation.suggestions ? (
        <PotentialFeedback
          suggestions={evaluation.suggestions}
          editable={editable}
          onApply={onChange}
        />
      ) : null}
      {showInvalid ? <InvalidFeedback /> : null}
    </div>
  );
}
