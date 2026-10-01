"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import {
  getOrderAssignmentStatus,
  getOrderRequirements,
  ORDER_ASSIGNMENT_STATUS_LABEL,
  type OrderAssignmentStatus,
  type OrderDataStatus,
} from "@/lib/order-requirements";
import { HoverTip } from "@/components/ui/HoverTip";
import type { MTDRecord, Order } from "@/types";

const DATA_STATUS_LABEL: Record<OrderDataStatus, string> = {
  "Missing Data": "Missing data",
  "Complete data": "Complete data",
};

const DATA_PILL: Record<OrderDataStatus, string> = {
  "Missing Data":
    "border-red-500/35 bg-red-500/10 font-semibold text-red-600 dark:text-red-400",
  "Complete data":
    "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
};

const ASSIGNMENT_PILL: Record<OrderAssignmentStatus, string> = {
  not_assigned:
    "border-brand-line/55 bg-brand-elevated/90 text-brand-ink-secondary",
  assigned: "border-brand-blue/35 bg-brand-blue-soft/45 text-brand-ink",
  reassign_leave:
    "border-red-500/35 bg-red-500/10 font-semibold text-red-600 dark:text-red-400",
  reassign_rush:
    "border-red-500/35 bg-red-500/10 font-semibold text-red-600 dark:text-red-400",
};

function StatusCell({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center justify-center max-w-fit mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

function requirementLabels(
  record: Order | MTDRecord,
  state: "red" | "green"
): string[] {
  const reqs = getOrderRequirements(record);
  const labels = [
    ...reqs.collections
      .filter((item) => item.isApplicable && item.state === state)
      .map((item) => item.label),
    ...reqs.songsArea
      .filter((item) => item.isApplicable && item.state === state)
      .map((item) => item.label),
  ];
  if (state === "red" && !reqs.compliancyMet) {
    labels.push("Compliancy");
  }
  return labels;
}

function dataStatusTooltip(
  record: Order | MTDRecord,
  status: OrderDataStatus
): string {
  if (status === "Missing Data") {
    const labels = requirementLabels(record, "red");
    const guide = "Mark this data as available to complete data";
    if (labels.length === 0) return guide;
    return `${guide}:\n${labels.join(", ")}`;
  }
  const labels = requirementLabels(record, "green");
  if (labels.length === 0) return "We have all we need";
  return `We have all we need:\n${labels.join(", ")}`;
}

/** Derived from Mix/CS/Video + Songs/Notes — not manually editable. */
export function OrderDataStatusBadge({
  record,
}: {
  record: Order | MTDRecord;
}) {
  const reqs = getOrderRequirements(record);
  const status: OrderDataStatus =
    reqs.missingCount > 0 ? "Missing Data" : "Complete data";
  const label = DATA_STATUS_LABEL[status];
  const tip = dataStatusTooltip(record, status);

  return (
    <StatusCell>
      <HoverTip label={tip} placement="top">
        <span
          className={clsx(
            "inline-flex h-8 min-w-[118px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium shadow-sm",
            DATA_PILL[status]
          )}
        >
          {label}
        </span>
      </HoverTip>
    </StatusCell>
  );
}

/** @deprecated Prefer OrderDataStatusBadge */
export function OrderDataStatusDropdown({
  record,
}: {
  record: Order | MTDRecord;
  disabled?: boolean;
}) {
  return <OrderDataStatusBadge record={record} />;
}

export function OrderAssignmentStatusBadge({
  record,
}: {
  record: Order | MTDRecord;
}) {
  const status = getOrderAssignmentStatus(record);
  const label = ORDER_ASSIGNMENT_STATUS_LABEL[status];

  return (
    <StatusCell>
      <span
        className={clsx(
          "inline-flex h-8 max-w-[148px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium shadow-sm",
          ASSIGNMENT_PILL[status]
        )}
        title={label}
      >
        {label}
      </span>
    </StatusCell>
  );
}

/** @deprecated Prefer OrderAssignmentStatusBadge */
export function OrderReassignStatusDropdown({
  record,
}: {
  record: Order | MTDRecord;
  disabled?: boolean;
}) {
  return <OrderAssignmentStatusBadge record={record} />;
}

/** @deprecated Prefer OrderDataStatusBadge + OrderAssignmentStatusBadge */
export function OrderStatusDropdown(props: {
  record: Order | MTDRecord;
  disabled?: boolean;
}) {
  return <OrderDataStatusBadge {...props} />;
}
