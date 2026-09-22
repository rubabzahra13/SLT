"use client";

import clsx from "clsx";
import type { MTDRecord, Order } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { getOrderStatus } from "@/lib/order-requirements";

export function OrderStatusDropdown({
  record,
  disabled = false,
}: {
  record: Order | MTDRecord;
  disabled?: boolean;
}) {
  const { updateMTD, isViewOnly } = useAppState();
  const { status, isWaitingForData } = getOrderStatus(record);
  const isDisabled = disabled || isViewOnly;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled) return;

    const nextStatus = e.target.value as "Waiting for Data" | "Need to be Scheduled";
    updateMTD(record.id, {
      orderStatus: nextStatus,
      order_status: nextStatus,
    } as Partial<MTDRecord>);
  };

  return (
    <div
      className="inline-flex items-center justify-center max-w-fit mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        value={status}
        disabled={isDisabled}
        onChange={handleChange}
        className={clsx(
          "inline-flex items-center justify-between rounded-full px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs whitespace-nowrap cursor-pointer appearance-none pr-6 focus:outline-none focus:ring-1 focus:ring-slate-400/40 select-none",
          isWaitingForData
            ? "bg-[#f9d7d7] text-[#901313] border border-[#ebafaf]"
            : "bg-[#c2e7d9] text-[#0f5236] border border-[#9edbb8]",
          isDisabled && "opacity-75 cursor-default"
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2.5' stroke='${
            isWaitingForData ? '%23901313' : '%230f5236'
          }'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.45rem center",
          backgroundSize: "0.7rem 0.7rem",
        }}
        title={`Status: ${status} (Click to change)`}
      >
        <option value="Waiting for Data" className="bg-white text-slate-800 font-medium py-1">
          Waiting for Data
        </option>
        <option value="Need to be Scheduled" className="bg-white text-slate-800 font-medium py-1">
          Need to be Scheduled
        </option>
      </select>
    </div>
  );
}
