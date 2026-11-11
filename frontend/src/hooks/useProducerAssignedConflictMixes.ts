"use client";

import { useMemo } from "react";
import { useOpenAssignedBookings } from "@/hooks/useOpenAssignedBookings";
import {
  collectAssignedMixesForProducer,
  collectUnpaidPayrollMixesForProducer,
  type AssignedMixForProducer,
} from "@/lib/producer-assigned-mixes";
import type { MTDRecord, Order, Producer } from "@/types";

/**
 * Assigned Orders + live MTD for one producer (leave / delete / category).
 * Shares the Assign/Schedule hydrate so Producers stay cold until a modal opens.
 */
export function useProducerAssignedConflictMixes(
  producer: Producer | null | undefined,
  enabled: boolean
): {
  assignedMixes: AssignedMixForProducer[];
  unpaidPayrollMixes: MTDRecord[];
  conflictOrders: Order[];
  mtdRecords: MTDRecord[];
  ready: boolean;
} {
  const {
    conflictOrders,
    mtdRecords,
    ready,
  } = useOpenAssignedBookings(enabled && Boolean(producer), {
    // Partial board cache can miss mixes for this producer (early-exit when
    // any assigned hit exists). Delete / category / leave need the full list.
    alwaysFetch: true,
  });

  const assignedMixes = useMemo(() => {
    if (!producer || !enabled || !ready) return [];
    return collectAssignedMixesForProducer(
      producer,
      conflictOrders,
      mtdRecords
    );
  }, [producer, enabled, ready, conflictOrders, mtdRecords]);

  const unpaidPayrollMixes = useMemo(() => {
    if (!producer || !enabled || !ready) return [];
    return collectUnpaidPayrollMixesForProducer(producer, mtdRecords);
  }, [producer, enabled, ready, mtdRecords]);

  return {
    assignedMixes,
    unpaidPayrollMixes,
    conflictOrders,
    mtdRecords,
    ready,
  };
}
