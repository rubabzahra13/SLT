"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteProducerModal,
  type AssignedMixForDelete,
} from "@/components/producers/DeleteProducerModal";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { Avatar } from "@/components/ui/Avatar";
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
  if (categories.length === 0) return "Producer";
  if (categories.length === 1) return categories[0];
  if (categories.length === 2) return `${categories[0]} · ${categories[1]}`;
  return `${categories.length} categories`;
}

export default function ProducersPage() {
  const {
    producers,
    mtdRecords,
    activeOrders,
    addProducer,
    updateProducer,
    updateMTD,
    removeProducer,
    isViewOnly,
  } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);
  const [deleting, setDeleting] = useState<Producer | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

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

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleting(null);
  }

  function clearProducerUi(producer: Producer) {
    setDeleting(null);
    if (editing?.id === producer.id) {
      setModalOpen(false);
      setEditing(null);
    }
    if (availabilityProducer?.id === producer.id) {
      setAvailabilityProducer(null);
    }
  }

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
    if (unpaidPayrollMixes.length > 0 || assignedMixRecords.length > 0) return;
    const producer = deleting;
    setDeleteBusy(true);
    try {
      await removeProducer(producer.id);
      clearProducerUi(producer);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleSendToReassignAndDelete() {
    if (isViewOnly || !deleting || deleteBusy) return;
    if (unpaidPayrollMixes.length > 0) return;
    const producer = deleting;
    const patch = patchForReassignProducerRemoved();
    setDeleteBusy(true);
    try {
      for (const rec of assignedMixRecords) {
        updateMTD(rec.id, patch);
      }
      await removeProducer(producer.id);
      clearProducerUi(producer);
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

          return (
          <article
            key={producer.uuid || producer.id}
            className="dashboard-panel relative flex w-full flex-col self-start"
          >
            <div className="dashboard-panel-head dashboard-panel-head-accent flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="dashboard-panel-title truncate">
                  {getProducerHeaderLabel(categories)}
                </span>
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
