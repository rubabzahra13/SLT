"use client";

import type { Order } from "@/types";
import { getOrderDetailSections } from "@/lib/order-detail-sections";
import { rawFieldValue } from "@/lib/order-detail-fields";
import { DetailInput, DetailTextarea } from "@/components/mtd/InlineFields";

type MTDOrderDetailsProps = {
  order: Order;
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
};

export function formatDetailDisplay(value: string): string {
  if (!value?.trim() || value === "—") return "";
  return value.replace(/\s*[—–]\s*/g, ", ").trim();
}

export function MTDOrderDetails({
  order,
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
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.title}>
          <h3 className="text-label mb-3">{section.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const rawValue = rawFieldValue(order, field.key);
              const displayValue = formatDetailDisplay(field.value);

              return (
                <div
                  key={field.key}
                  className={field.multiline ? "sm:col-span-2" : undefined}
                >
                  <span className="text-label">{field.label}</span>
                  {editable && onFieldChange ? (
                    <div className="mt-1.5">
                      {field.multiline ? (
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
                      )}
                    </div>
                  ) : displayValue ? (
                    <p
                      className={
                        field.multiline
                          ? "mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary"
                          : "mt-1.5 text-[13px] font-semibold text-brand-ink"
                      }
                    >
                      {displayValue}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-brand-ink-tertiary">
                      Not set
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
