"use client";

import { useAppState } from "@/context/AppStateContext";
import { getOrderStatus } from "@/lib/order-requirements";
import { FilterMenu, type FilterMenuOption } from "@/components/ui/FilterMenu";
import type { MTDRecord, Order } from "@/types";

const STATUS_OPTIONS: FilterMenuOption[] = [
  { value: "Missing Data", label: "Missing Data" },
  { value: "Complete", label: "Complete" },
  { value: "Reassign", label: "Reassign", isRed: true },
];

const MANUAL_STATUSES = new Set([
  "Missing Data",
  "Complete",
  "Reassign",
]);

export function OrderStatusDropdown({
  record,
  disabled = false,
}: {
  record: Order | MTDRecord;
  disabled?: boolean;
}) {
  const { updateMTD, addNotification, isViewOnly } = useAppState();
  const { status } = getOrderStatus(record);
  const isDisabled = disabled || isViewOnly;

  const handleChange = (nextStatus: string) => {
    if (isDisabled) return;
    if (!MANUAL_STATUSES.has(nextStatus)) return;

    const oldStatus = status;
    if (oldStatus === nextStatus) return;

    updateMTD(record.id, {
      orderStatus: nextStatus,
      order_status: nextStatus,
      isReassigned: nextStatus === "Reassign",
    } as Partial<MTDRecord>);

    addNotification({
      type: "mtd_move",
      title: "Order status updated",
      message: `Order moved to ${nextStatus}.`,
    });
  };

  return (
    <div
      className="inline-flex items-center justify-center max-w-fit mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <FilterMenu
        label="Status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={handleChange}
        accent={status === "Reassign" ? "red" : "blue"}
        hideLabel
        alwaysActive
        portal
        portalZIndex={100}
        triggerWidth={118}
        triggerClassName="box-border shrink-0 justify-center"
        className="text-[11px]"
      />
    </div>
  );
}
