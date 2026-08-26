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

function OrderFieldTile({
  label,
  multiline,
  children,
}: {
  label: string;
  multiline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-3.5 ring-1 ring-inset ring-brand-line/10">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
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
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.title}
          className="overflow-hidden rounded-xl border border-brand-line/45 bg-white ring-1 ring-inset ring-brand-line/10"
        >
          <div className="border-b border-brand-line/35 bg-brand-bg-subtle/60 px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ink-tertiary">
              {section.title}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4">
            {section.fields.map((field) => {
              const rawValue = rawFieldValue(order, field.key);
              const displayValue = formatDetailDisplay(field.value);

              if (field.key === "couponCode") {
                return (
                  <div
                    key={field.key}
                    className="rounded-xl border border-brand-line/40 bg-brand-bg-subtle/40 px-4 py-3.5 ring-1 ring-inset ring-brand-line/10"
                  >
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
                <OrderFieldTile
                  key={field.key}
                  label={field.label}
                  multiline={field.multiline}
                >
                  {editable && onFieldChange ? (
                    field.multiline ? (
                      <DetailTextarea
                        value={rawValue}
                        onChange={(value) => onFieldChange(field.key, value)}
                        rows={4}
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
                        field.multiline
                          ? "whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink"
                          : "text-[13px] font-semibold text-brand-ink"
                      }
                    >
                      {displayValue}
                    </p>
                  ) : (
                    <p className="text-[13px] text-brand-ink-tertiary">Not set</p>
                  )}
                </OrderFieldTile>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
