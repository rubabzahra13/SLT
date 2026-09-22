"use client";

import { useAppState } from "@/context/AppStateContext";
import { getOrderStatus } from "@/lib/order-requirements";
import { FilterMenu, type FilterMenuOption } from "@/components/ui/FilterMenu";
import type { MTDRecord, Order } from "@/types";

const STATUS_OPTIONS: FilterMenuOption[] = [
  { value: "Waiting for Data", label: "Waiting for Data" },
  { value: "Need to be Scheduled", label: "Need to be Scheduled" },
];

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
    if (nextStatus !== "Waiting for Data" && nextStatus !== "Need to be Scheduled") return;

    const oldStatus = status;
    if (oldStatus === nextStatus) return;

    updateMTD(record.id, {
      orderStatus: nextStatus,
      order_status: nextStatus,
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
        hideLabel
        portal
        portalZIndex={100}
        className="!h-7 text-[11px]"
      />
    </div>
  );
}

