"use client";

import type { DiscountCode, Order } from "@/types";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { CouponCodeField } from "@/components/mtd/CouponCodeField";
import { DetailInput, DetailTextarea } from "@/components/mtd/InlineFields";
import clsx from "clsx";

type MTDOrderDetailsProps = {
  order: Order;
  discountCodes?: DiscountCode[];
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
};

export function formatDetailDisplay(value: string): string {
  if (!value?.trim() || value === "—") return "";
  return value.replace(/\s*[—–]\s*/g, ", ").trim();
}

function fieldSpanClass(key: string, label: string): string {
  const haystack = `${key} ${label}`;
  if (
    /address|street|songList|suggestions|routineNotes|script|copies/i.test(
      haystack
    )
  ) {
    return "sm:col-span-2 lg:col-span-3";
  }
  if (/howDidYouFindOut|find out/i.test(haystack)) {
    return "sm:col-span-2";
  }
  return "";
}

export function MTDOrderDetails({
  order,
  discountCodes = [],
  editable = false,
  onFieldChange,
}: MTDOrderDetailsProps) {
  const sections = getOrderDetailSections(order);

  if (sections.length === 0) {
    return (
      <p className="text-[13px] text-brand-ink-secondary">
        No order form fields available for this record.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section
          key={section.title}
          className="overflow-hidden rounded-xl border border-brand-line/45 bg-white ring-1 ring-inset ring-brand-line/10"
        >
          <div className="border-b border-brand-line/35 bg-brand-bg-subtle/60 px-3 py-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              {section.title}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.fields.map((field) => {
              const rawValue = rawFieldValue(order, field.key);
              const displayValue = formatDetailDisplay(field.value);
              const spanClass = fieldSpanClass(field.key, field.label);
              const useTextarea = Boolean(field.multiline);

              if (field.key === "couponCode") {
                return (
                  <div key={field.key} className="min-w-0">
                    <CouponCodeField
                      value={rawValue}
                      discountCodes={discountCodes}
                      editable={editable}
                      onChange={
                        onFieldChange
                          ? (value) => onFieldChange(field.key, value)
                          : undefined
                      }
                    />
                  </div>
                );
              }

              return (
                <div
                  key={field.key}
                  className={clsx("flex min-w-0 flex-col", spanClass)}
                >
                  <p className="min-h-[28px] text-[10px] font-bold uppercase leading-snug tracking-[0.06em] text-brand-ink-tertiary">
                    {field.label}
                  </p>
                  <div className="mt-1">
                    {editable && onFieldChange ? (
                      useTextarea ? (
                        <DetailTextarea
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                          rows={spanClass.includes("lg:col-span-3") ? 3 : 2}
                        />
                      ) : (
                        <DetailInput
                          value={rawValue}
                          onChange={(value) => onFieldChange(field.key, value)}
                        />
                      )
                    ) : displayValue ? (
                      <p
                        className={
                          useTextarea
                            ? "whitespace-pre-wrap text-[13px] font-normal leading-snug text-brand-ink"
                            : "text-[13px] font-normal text-brand-ink"
                        }
                      >
                        {displayValue}
                      </p>
                    ) : (
                      <p className="text-[13px] text-brand-ink-tertiary">
                        Not set
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
