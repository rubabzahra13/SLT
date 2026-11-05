"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteProducerModal } from "@/components/producers/DeleteProducerModal";
import { useAppState } from "@/context/AppStateContext";
import { useProducerAssignedConflictMixes } from "@/hooks/useProducerAssignedConflictMixes";
import { patchForReassignProducerRemoved } from "@/lib/order-reassign";
import type { Producer } from "@/types";

type ProducerDeleteHostProps = {
  producer: Producer;
  onClose: () => void;
  onDeleted: (producer: Producer) => void;
};

/**
 * Mount only while a delete is in progress. Keeps MTD/orders scans off the
 * idle Producers roster (those boards change often; the grid should not).
 */
export function ProducerDeleteHost({
  producer,
  onClose,
  onDeleted,
}: ProducerDeleteHostProps) {
  const router = useRouter();
  const {
    mtdRecords,
    updateMTD,
    updateOrder,
    removeProducer,
    addAlert,
    isViewOnly,
  } = useAppState();
  const { assignedMixes: assignedMixRecords, unpaidPayrollMixes } =
    useProducerAssignedConflictMixes(producer, true);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (isViewOnly || busy) return;
    if (unpaidPayrollMixes.length > 0 || assignedMixRecords.length > 0) {
      addAlert({
        tone: "warning",
        title: "Cannot delete yet",
        message:
          unpaidPayrollMixes.length > 0
            ? "Mark unpaid payroll mixes Paid first."
            : "Send assigned mixes to Reassign before deleting.",
      });
      return;
    }
    setBusy(true);
    try {
      await removeProducer(producer.id);
      onDeleted(producer);
    } catch {
      // Toast + rollback come from removeProducer.
    } finally {
      setBusy(false);
    }
  }

  async function handleSendToReassignAndDelete() {
    if (isViewOnly || busy) return;
    if (unpaidPayrollMixes.length > 0) {
      addAlert({
        tone: "warning",
        title: "Finish payroll first",
        message: "Mark unpaid payroll mixes Paid, then delete again.",
      });
      return;
    }

    const mixes = [...assignedMixRecords];
    const patch = patchForReassignProducerRemoved();
    const mtdIds = new Set(
      mtdRecords.flatMap((r) =>
        [r.id, r.orderId, r.uuid, r.legacyId].filter(Boolean)
      )
    );

    setBusy(true);
    try {
      // Await sequentially: parallel updateMTD calls race on shared rollback
      // snapshots and can wipe each other's optimistic patches.
      for (const rec of mixes) {
        if (mtdIds.has(rec.id) || rec.onMtdBoard || rec.inMTD) {
          await updateMTD(rec.id, patch);
        } else {
          await updateOrder(rec.id, {
            assignedProducer: null,
            editorRequest: "FA",
            mixStartDate: "",
            mixEndDate: "",
            isReassigned: true,
            orderStatus: patch.orderStatus,
            producerEmailSentAt: null,
            status: "active",
            collectionStates: patch.collectionStates,
            haveSongs: patch.haveSongs,
            eightCountSheet: patch.eightCountSheet,
          });
        }
      }

      await removeProducer(producer.id);
      onDeleted(producer);

      const focusId = mixes[0]?.id;
      const params = new URLSearchParams();
      params.set("range", "reassigned");
      if (focusId) params.set("focus", focusId);
      router.push(`/orders?${params.toString()}`);
    } catch {
      // Toast + rollback come from updateMTD / updateOrder / removeProducer.
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeleteProducerModal
      open
      producer={producer}
      assignedMixes={assignedMixRecords}
      unpaidPayrollMixes={unpaidPayrollMixes}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      onConfirm={() => void confirmDelete()}
      onSendToReassign={() => void handleSendToReassignAndDelete()}
      busy={busy}
    />
  );
}
