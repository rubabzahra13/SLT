"use client";

import type { Order } from "@/types";
import { getOrderDetailFields } from "@/lib/order-detail-fields";

type MTDOrderDetailsProps = {
  order: Order;
};

export function MTDOrderDetails({ order }: MTDOrderDetailsProps) {
  const fields = getOrderDetailFields(order);

  if (fields.length === 0) {
    return (
      <p className="text-[13px] text-brand-ink-secondary">
        No order form fields available for this record.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.label}
          className={field.multiline ? "sm:col-span-2" : undefined}
        >
          <span className="text-label">{field.label}</span>
          <p
            className={
              field.multiline
                ? "mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-brand-ink-secondary"
                : "mt-1.5 text-[13px] font-semibold"
            }
          >
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}
