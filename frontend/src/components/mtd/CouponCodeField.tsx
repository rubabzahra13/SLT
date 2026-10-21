"use client";

import { BadgeCheck, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { DetailInput } from "@/components/mtd/InlineFields";
import { evaluateCouponCode } from "@/lib/discount-codes";
import type { DiscountCode } from "@/types";

type CouponCodeFieldProps = {
  value: string;
  discountCodes: DiscountCode[];
  editable?: boolean;
  onChange?: (value: string) => void;
};

function MatchedFeedback({ match }: { match: DiscountCode }) {
  return (
    <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-brand-success/25 bg-brand-success/8 px-3 py-2.5">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-brand-success"
        strokeWidth={2}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[12px] font-semibold text-brand-ink">
            Matches configured coupon
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-success/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success ring-1 ring-inset ring-brand-success/20">
            <BadgeCheck className="h-3 w-3" strokeWidth={2.25} />
            {match.code}
          </span>
        </div>
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
  const showMatched = evaluation.status === "matched";

  return (
    <div className="flex min-w-0 flex-col">
      <span className="min-h-[28px] text-[10px] font-bold uppercase leading-snug tracking-[0.06em] text-brand-ink">
        Coupon code
      </span>
      {editable && onChange ? (
        <div className="mt-1">
          <DetailInput
            value={value}
            onChange={onChange}
            placeholder="Enter coupon code"
            className={clsx(
              showMatched &&
                "border-brand-success/45 bg-brand-success/5 focus:border-brand-success/60"
            )}
          />
        </div>
      ) : trimmed ? (
        <p className="mt-1.5 text-[13px] font-semibold tracking-wide text-brand-ink">
          {trimmed}
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-brand-ink-tertiary">Not set</p>
      )}
      {showMatched && evaluation.match ? (
        <MatchedFeedback match={evaluation.match} />
      ) : null}
    </div>
  );
}
