"use client";

import clsx from "clsx";
import type { MTDRecord, Order } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import {
  getOrderRequirements,
  type OrderRequirementItem,
  type RequirementCategory,
} from "@/lib/order-requirements";

export function OrderRequirementPill({
  item,
  onToggle,
  disabled = false,
}: {
  item: OrderRequirementItem;
  onToggle?: (item: OrderRequirementItem) => void;
  disabled?: boolean;
}) {
  const isGreen = item.state === "green";
  const isRed = item.state === "red";
  const isWhite = item.state === "white";

  const isInteractive = !disabled && (isGreen || isRed);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInteractive && onToggle) {
      onToggle(item);
    }
  };

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={handleClick}
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none transition shadow-2xs select-none focus:outline-none focus:ring-1 focus:ring-slate-400/40",
        isGreen &&
          "bg-[#c2e7d9] text-[#0f5236] border border-[#9edbb8] hover:brightness-95 active:scale-95 cursor-pointer",
        isRed &&
          "bg-[#f9d7d7] text-[#901313] border border-[#ebafaf] hover:brightness-95 active:scale-95 cursor-pointer",
        isWhite &&
          "bg-white text-slate-400 border border-slate-200/80 cursor-default opacity-85",
        !isInteractive && "cursor-default"
      )}
      title={
        isWhite
          ? `${item.label}: Not applicable for this package`
          : `${item.label}: ${isGreen ? "Collected (Click to set RED)" : "Missing (Click to set GREEN)"}`
      }
    >
      <span>{item.label}</span>
    </button>
  );
}

export function OrderRequirementsCell({
  record,
  category,
}: {
  record: Order | MTDRecord;
  category: RequirementCategory;
}) {
  const { updateMTD, addNotification, isViewOnly } = useAppState();
  const reqs = getOrderRequirements(record);
  const items = category === "collections" ? reqs.collections : reqs.songsArea;

  if (!items || items.length === 0) {
    return <span className="text-[11px] text-brand-ink-tertiary">—</span>;
  }

  const handleToggle = (item: OrderRequirementItem) => {
    if (isViewOnly) return;
    const currentlyCollected = item.state === "green";
    const nextCollected = !currentlyCollected;

    const existingOverrides =
      (record as any).collectionStates || (record as any).collection_states || {};
    const updatedCollectionStates = {
      ...existingOverrides,
      [item.id]: nextCollected,
    };

    const oldStatus = getOrderRequirements(record).status;
    const simulatedRecord = {
      ...record,
      collectionStates: updatedCollectionStates,
      collection_states: updatedCollectionStates,
      orderStatus: undefined,
      order_status: undefined,
    };
    const newStatus = getOrderRequirements(simulatedRecord).status;
    const statusChanged = oldStatus !== newStatus;

    const patch: Record<string, any> = {
      collectionStates: updatedCollectionStates,
      collection_states: updatedCollectionStates,
    };

    if (statusChanged) {
      patch.orderStatus = newStatus;
      patch.order_status = newStatus;
    }

    // Synchronize legacy text flags if applicable
    if (item.id === "songs") {
      patch.haveSongs = nextCollected ? "HAVE SONGS" : "NEED SONGS";
    }
    if (item.id === "cs" || item.id === "eight_count") {
      patch.eightCountSheet = nextCollected ? "HAVE CS" : "NEED CS";
    }

    updateMTD(record.id, patch as Partial<MTDRecord>);

    if (statusChanged) {
      addNotification({
        type: "mtd_move",
        title: "Order status updated",
        message: `Order moved to ${newStatus}.`,
      });
    }
  };

  return (
    <div
      className="inline-flex items-center justify-center gap-1 rounded-full bg-[#f0f3f6] border border-[#e2e8f0] p-1 shadow-inner max-w-fit mx-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <OrderRequirementPill
          key={item.id}
          item={item}
          onToggle={handleToggle}
          disabled={isViewOnly}
        />
      ))}
    </div>
  );
}

