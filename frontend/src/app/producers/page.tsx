"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Eye, Mail, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteProducerModal,
  type AssignedMixForDelete,
} from "@/components/producers/DeleteProducerModal";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { HoverTip } from "@/components/ui/HoverTip";
import { patchForReassignProducerRemoved } from "@/lib/order-reassign";
import {
  collectAssignedMixesForProducer,
  collectUnpaidPayrollMixesForProducer,
} from "@/lib/producer-assigned-mixes";
import { getProducerCategories, normalizeProducerList } from "@/lib/producers";
import { countProducerMixesThisWeek } from "@/lib/producer-availability";
import type { MTDRecord, Producer, Weekday } from "@/types";
import { useAppState } from "@/context/AppStateContext";

function getProducerHeaderLabel(categories: string[]): string {
  if (categories.length === 0) return "No categories";
  if (categories.length === 1) return categories[0];
  if (categories.length === 2) return `${categories[0]} · ${categories[1]}`;
  return `${categories.length} categories`;
}

function formatProducerAddedAt(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

function ProducersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deleteParam = searchParams.get("delete");
  const {
    producers,
    mtdRecords,
    activeOrders,
    addProducer,
    updateProducer,
    updateMTD,
    updateOrder,
    removeProducer,
    addAlert,
    isViewOnly,
  } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);
  const [deleting, setDeleting] = useState<Producer | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  /** Prevents ?delete= from reopening the modal while the URL is still clearing. */
  const deleteParamOpenedRef = useRef<string | null>(null);

  const assignedMixRecords = useMemo(() => {
    if (!deleting) return [] as AssignedMixForDelete[];
    return collectAssignedMixesForProducer(
      deleting,
      activeOrders,
      mtdRecords
    );
  }, [deleting, mtdRecords, activeOrders]);

  const unpaidPayrollMixes = useMemo(() => {
    if (!deleting) return [] as MTDRecord[];
    return collectUnpaidPayrollMixesForProducer(deleting, mtdRecords);
  }, [deleting, mtdRecords]);

  function clearDeleteQuery() {
    if (!deleteParam) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("delete");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleting(null);
    clearDeleteQuery();
  }

  function clearProducerUi(producer: Producer) {
    setDeleting(null);
    clearDeleteQuery();
    if (editing?.id === producer.id) {
      setModalOpen(false);
      setEditing(null);
    }
    if (availabilityProducer?.id === producer.id) {
      setAvailabilityProducer(null);
    }
  }

  // Deep-link from MTD/Orders/Payroll "Back to delete producer".
  useEffect(() => {
    if (!deleteParam) {
      deleteParamOpenedRef.current = null;
      return;
    }
    if (deleteParamOpenedRef.current === deleteParam && !deleting) {
      return;
    }
    const match = producers.find(
      (p) => p.id === deleteParam || p.uuid === deleteParam
    );
    if (match) {
      deleteParamOpenedRef.current = deleteParam;
      setDeleting(match);
      return;
    }
    clearDeleteQuery();
    // Intentionally omit clearDeleteQuery from deps: it closes over searchParams.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteParam, producers, deleting]);

  function openAdd() {
    if (isViewOnly) return;
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(producer: Producer) {
    setEditing(producer);
    setModalOpen(true);
  }

  async function handleSave(producer: Producer) {
    if (isViewOnly) return;
    if (editing) {
      await updateProducer(producer.id, producer);
    } else {
      await addProducer(producer);
    }
  }

  async function handleSaveAvailability(patch: {
    workDays: Weekday[];
    timeOff: Producer["timeOff"];
    maxMixesPerDay: number | null;
    maxProducerCostPerDay: number | null;
    extraDays: string[];
  }): Promise<void> {
    if (isViewOnly || !availabilityProducer) {
      throw new Error("Cannot save producer availability.");
    }
    await updateProducer(availabilityProducer.id, patch);
  }

  async function confirmDelete() {
    if (isViewOnly || !deleting || deleteBusy) return;
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
    const producer = deleting;
    setDeleteBusy(true);
    try {
      await removeProducer(producer.id);
      clearProducerUi(producer);
    } catch {
      // Toast + rollback come from removeProducer.
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleSendToReassignAndDelete() {
    if (isViewOnly || !deleting || deleteBusy) return;
    if (unpaidPayrollMixes.length > 0) {
      addAlert({
        tone: "warning",
        title: "Finish payroll first",
        message: "Mark unpaid payroll mixes Paid, then delete again.",
      });
      return;
    }

    const producer = deleting;
    const mixes = [...assignedMixRecords];
    const patch = patchForReassignProducerRemoved();
    const mtdIds = new Set(
      mtdRecords.flatMap((r) =>
        [r.id, r.orderId, r.uuid, r.legacyId].filter(Boolean)
      )
    );

    setDeleteBusy(true);
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
      clearProducerUi(producer);

      const focusId = mixes[0]?.id;
      const params = new URLSearchParams();
      params.set("range", "reassigned");
      if (focusId) params.set("focus", focusId);
      router.push(`/orders?${params.toString()}`);
    } catch {
      // Toast + rollback come from updateMTD / updateOrder / removeProducer.
    } finally {
      setDeleteBusy(false);
    }
  }

  const uniqueProducers = useMemo(
    () => normalizeProducerList(producers),
    [producers]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Producer Roster"
        badge={`${uniqueProducers.length} producers`}
        subtitle="Manage producers"
        action={isViewOnly ? undefined : { label: "Add Producer", onClick: openAdd }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="grid auto-rows-fr items-stretch gap-4 px-6 pb-6 pt-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-8 xl:grid-cols-4">
        {uniqueProducers.map((producer) => {
          const categories = getProducerCategories(producer);
          const headerLabel = getProducerHeaderLabel(categories);
          const categoryTip =
            categories.length >= 2 ? categories.join("\n") : undefined;
          const addedAtLabel = formatProducerAddedAt(producer.createdAt);

          return (
          <article
            key={producer.uuid || producer.id}
            className="dashboard-panel relative flex w-full flex-col self-start"
          >
            <div className="dashboard-panel-head dashboard-panel-head-accent flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {categoryTip ? (
                  <HoverTip
                    label={categoryTip}
                    placement="top"
                    className="min-w-0 max-w-full"
                  >
                    <span className="dashboard-panel-title block truncate">
                      {headerLabel}
                    </span>
                  </HoverTip>
                ) : (
                  <span className="dashboard-panel-title truncate">
                    {headerLabel}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => openEdit(producer)}
                  className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-blue-soft/25 hover:text-brand-ink"
                  aria-label={isViewOnly ? `View ${producer.name}` : `Edit ${producer.name}`}
                  title={isViewOnly ? "View Profile" : "Edit Profile"}
                >
                  {isViewOnly ? (
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>
                {!isViewOnly ? (
                  <button
                    type="button"
                    onClick={() => setDeleting(producer)}
                    className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger"
                    aria-label={`Delete ${producer.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="dashboard-panel-body flex flex-col p-4 pt-3">
            <div className="flex flex-col items-center text-center">
              <Avatar producer={producer} size="lg" />
              <h3 className="text-display mt-3 text-[15px]">{producer.name}</h3>
            </div>

            <div className="mt-4 space-y-3 border-t border-brand-line pt-4">
              <div className="flex items-center gap-2.5 text-[12px] text-brand-ink-secondary">
                <Mail
                  className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary"
                  strokeWidth={1.75}
                />
                <span className="truncate">{producer.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[12px] text-brand-ink-secondary">
                <Music
                  className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary"
                  strokeWidth={1.75}
                />
                <span>
                  {countProducerMixesThisWeek(producer, mtdRecords)} mixes this
                  week
                </span>
              </div>
              {addedAtLabel ? (
                <div className="flex items-center gap-2.5 text-[12px] text-brand-ink-secondary">
                  <CalendarClock
                    className="h-3.5 w-3.5 shrink-0 text-brand-ink-tertiary"
                    strokeWidth={1.75}
                  />
                  <span className="truncate">Added {addedAtLabel}</span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setAvailabilityProducer(producer)}
                className="mt-1 w-full rounded-xl border border-brand-line/50 bg-white/80 py-2.5 text-[13px] font-semibold text-brand-ink-secondary transition hover:border-brand-blue/30 hover:bg-brand-blue-soft/20 hover:text-brand-ink"
              >
                Schedule and capacity
              </button>
            </div>
            </div>
          </article>
          );
        })}

        {!isViewOnly ? (
          <button
            type="button"
            onClick={openAdd}
            className="dashboard-panel dashboard-panel-dashed flex h-full min-h-[300px] w-full flex-col text-brand-ink-tertiary transition hover:text-brand-ink"
          >
            <div className="dashboard-panel-head flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <span className="dashboard-panel-title truncate text-[11px] uppercase tracking-[0.06em]">
                Add producer
              </span>
              <div className="flex shrink-0 items-center" aria-hidden>
                <span className="rounded-lg p-1.5 opacity-0">
                  <span className="block h-3.5 w-3.5" />
                </span>
                <span className="rounded-lg p-1.5 opacity-0">
                  <span className="block h-3.5 w-3.5" />
                </span>
              </div>
            </div>
            <span className="dashboard-panel-body flex flex-1 flex-col items-center justify-center px-6 py-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-brand-line-strong/80 bg-brand-bg/40">
                <Plus className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="mt-3 text-[13px] font-medium">Add producer</span>
            </span>
          </button>
        ) : null}
      </div>
      </div>

      <ProducerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        producer={editing}
        onSave={handleSave}
        readOnly={isViewOnly}
      />

      <ProducerAvailabilityModal
        open={Boolean(availabilityProducer)}
        onClose={() => setAvailabilityProducer(null)}
        producer={
          availabilityProducer
            ? producers.find(
                (p) =>
                  p.id === availabilityProducer.id ||
                  (p.uuid && p.uuid === availabilityProducer.uuid)
              ) ?? availabilityProducer
            : null
        }
        onSave={handleSaveAvailability}
        readOnly={isViewOnly}
      />

      <DeleteProducerModal
        open={Boolean(deleting)}
        producer={deleting}
        assignedMixes={assignedMixRecords}
        unpaidPayrollMixes={unpaidPayrollMixes}
        onClose={closeDeleteModal}
        onConfirm={() => void confirmDelete()}
        onSendToReassign={() => void handleSendToReassignAndDelete()}
        busy={deleteBusy}
      />
    </div>
  );
}

export default function ProducersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-10 text-[13px] text-brand-ink-tertiary lg:px-8">
          Loading producers…
        </div>
      }
    >
      <ProducersPageContent />
    </Suspense>
  );
}
