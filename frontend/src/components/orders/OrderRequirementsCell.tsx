"use client";

import { useMemo } from "react";
import clsx from "clsx";
import type { MTDRecord, Order } from "@/types";
import { useAppState } from "@/context/AppStateContext";
import { findLinkedOrder } from "@/lib/editor-assignment";
import {
  getOrderRequirements,
  mergeOrderFormFieldsForRequirements,
  type OrderRequirementItem,
  type RequirementCategory,
} from "@/lib/order-requirements";
import { HoverTip } from "@/components/ui/HoverTip";

function requirementPillTip(
  item: OrderRequirementItem,
  opts: {
    isGreen: boolean;
    isWhite: boolean;
    lockedGreen: boolean;
    lockReason?: string | null;
  }
): string {
  const { isGreen, isWhite, lockedGreen, lockReason } = opts;
  if (item.label === "CS") {
    if (isWhite) {
      return "CS: Not applicable, client did not agree to send 8CS";
    }
    if (lockedGreen) {
      return `CS: Client agreed to send 8CS, collected. ${lockReason}`;
    }
    if (isGreen) {
      return "CS: Client agreed to send 8CS, collected";
    }
    return "CS: Client agreed to send 8CS, waiting for CS";
  }
  if (item.id === "songs") {
    if (isWhite) return `${item.label}: Not applicable`;
    if (lockedGreen) {
      return `${item.label}: Have. ${lockReason}`;
    }
    return `${item.label}: ${isGreen ? "Have" : "Not have"}`;
  }
  if (isWhite) return `${item.label}: Not applicable`;
  if (lockedGreen) return `${item.label}: Collected. ${lockReason}`;
  return `${item.label}: ${isGreen ? "Collected" : "Missing"}`;
}

export function OrderRequirementPill({
  item,
  onToggle,
  disabled = false,
  lockReason,
}: {
  item: OrderRequirementItem;
  onToggle?: (item: OrderRequirementItem) => void;
  disabled?: boolean;
  /** When set, green pills cannot be flipped to red. */
  lockReason?: string | null;
}) {
  const isGreen = item.state === "green";
  const isRed = item.state === "red";
  const isWhite = item.state === "white";
  const lockedGreen = Boolean(lockReason) && isGreen;

  const isInteractive =
    !disabled && !lockedGreen && (isGreen || isRed);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInteractive && onToggle) {
      onToggle(item);
    }
  };

  const tip = requirementPillTip(item, {
    isGreen,
    isWhite,
    lockedGreen,
    lockReason,
  });

  return (
    <HoverTip label={tip} placement="top" zIndex={300}>
      <button
        type="button"
        disabled={!isInteractive}
        onClick={handleClick}
        className={clsx(
          "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none transition shadow-2xs select-none focus:outline-none focus:ring-1 focus:ring-slate-400/40",
          isGreen &&
            "bg-[#c2e7d9] text-[#0f5236] border border-[#9edbb8]",
          isGreen &&
            isInteractive &&
            "hover:brightness-95 active:scale-95 cursor-pointer",
          isRed &&
            "bg-[#f9d7d7] text-[#901313] border border-[#ebafaf] hover:brightness-95 active:scale-95 cursor-pointer",
          isWhite &&
            "bg-white text-slate-400 border border-slate-200/80 cursor-default opacity-85",
          !isInteractive && "cursor-default"
        )}
      >
        <span>{item.label}</span>
      </button>
    </HoverTip>
  );
}

export function OrderRequirementsCell({
  record,
  category,
}: {
  record: Order | MTDRecord;
  category: RequirementCategory;
}) {
  const { updateMTD, addNotification, isViewOnly, allOrders } = useAppState();
  const requirementsRecord = useMemo(() => {
    const linked = findLinkedOrder(record as MTDRecord, allOrders);
    return mergeOrderFormFieldsForRequirements(record, linked);
  }, [record, allOrders]);
  const reqs = getOrderRequirements(requirementsRecord);
  const items = category === "collections" ? reqs.collections : reqs.songsArea;
  const isReassign = reqs.needsReassign;
  const reassignLockReason = isReassign
    ? "Can't mark missing on Reassign off day/rush orders"
    : null;

  if (!items || items.length === 0) {
    return <span className="text-[11px] text-brand-ink-tertiary">—</span>;
  }

  const handleToggle = (item: OrderRequirementItem) => {
    if (isViewOnly) return;
    // Reassign leave/rush: collected (green) data stays collected.
    if (isReassign && item.state === "green") return;
    if (item.state === "white") return;

    const nextCollected = item.state === "red";

    const existingOverrides =
      (record as any).collectionStates ||
      (record as any).collection_states ||
      {};
    const parsedOverrides =
      typeof existingOverrides === "string"
        ? (() => {
            try {
              return JSON.parse(existingOverrides);
            } catch {
              return {};
            }
          })()
        : existingOverrides;
    const updatedCollectionStates = {
      ...parsedOverrides,
      [item.id]: nextCollected,
    };

    const oldStatus = getOrderRequirements(requirementsRecord).status;
    const simulatedRecord = {
      ...requirementsRecord,
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

    // Data completeness is derived from collection pills — never write
    // Missing/Complete into orderStatus (that field holds Reassign leave/rush).

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
        title: "Data status updated",
        message: `Order marked as ${newStatus}.`,
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
          lockReason={reassignLockReason}
        />
      ))}
    </div>
  );
}
