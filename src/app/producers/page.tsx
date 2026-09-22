"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, Music, Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeleteProducerModal } from "@/components/producers/DeleteProducerModal";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { useAppState } from "@/context/AppStateContext";
import { getProducerCategories } from "@/lib/producers";
import type { Producer, Weekday } from "@/types";

function getProducerHeaderLabel(categories: string[]): string {
  if (categories.length === 0) return "Producer";
  if (categories.length === 1) return categories[0];
  if (categories.length === 2) return `${categories[0]} · ${categories[1]}`;
  return `${categories.length} categories`;
}

export default function ProducersPage() {
  const { producers, activeOrders, mtdRecords, addProducer, updateProducer, removeProducer, isViewOnly } =
    useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);
  const [deleting, setDeleting] = useState<Producer | null>(null);

  const assignedMixesCount = useMemo(() => {
    if (!deleting) return 0;
    let count = 0;
    const pName = (deleting.name || "").toLowerCase().trim();
    const pInit = (deleting.initials || "").toLowerCase().trim();
    const pId = (deleting.id || "").toLowerCase().trim();

    for (const order of activeOrders) {
      const editor = (order.requestedEditor || order.requestedProducer || "").toLowerCase().trim();
      const assigned = (order.assignedProducer || "").toLowerCase().trim();
      if (
        (editor && (editor === pName || editor === pInit || editor === pId)) ||
        (assigned && (assigned === pName || assigned === pInit || assigned === pId))
      ) {
        count++;
      }
    }

    for (const rec of mtdRecords) {
      const assigned = (rec.assignedProducer || "").toLowerCase().trim();
      const initials = (rec.editorInitials || "").toLowerCase().trim();
      if (
        (assigned && (assigned === pName || assigned === pInit || assigned === pId)) ||
        (initials && (initials === pName || initials === pInit || initials === pId))
      ) {
        count++;
      }
    }

    return count;
  }, [deleting, activeOrders, mtdRecords]);

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

  function handleSaveAvailability(patch: {
    workDays: Weekday[];
    timeOff: Producer["timeOff"];
    maxMixesPerDay: number | null;
    maxProducerCostPerDay: number | null;
    overtimeDays: string[];
    categories: string[];
    specialty: string;
    ratesByCategory: Record<string, number>;
  }) {
    if (isViewOnly || !availabilityProducer) return;
    void updateProducer(availabilityProducer.id, patch).catch((err) => {
      console.warn("Failed to save producer availability:", err);
    });
  }

  function confirmDelete() {
    if (isViewOnly || !deleting) return;
    const producer = deleting;
    removeProducer(producer.id);
    setDeleting(null);
    if (editing?.id === producer.id) {
      setModalOpen(false);
      setEditing(null);
    }
    if (availabilityProducer?.id === producer.id) {
      setAvailabilityProducer(null);
    }
  }

  const uniqueProducers = useMemo(() => {
    const seen = new Set<string>();
    return producers.filter((p) => {
      const key = (p.id || p.name).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [producers]);

  return (
    <>
      <PageHeader
        title="Producer Roster"
        badge={`${uniqueProducers.length} producers`}
        subtitle="Manage producers, add, edit, or remove without dev help"
        action={isViewOnly ? undefined : { label: "Add Producer", onClick: openAdd }}
      />

      <div className="grid auto-rows-fr items-stretch gap-4 px-6 pb-6 pt-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-8 xl:grid-cols-4">
        {uniqueProducers.map((producer, idx) => {
          const categories = getProducerCategories(producer);

          return (
          <article
            key={`${producer.id}-${idx}`}
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
              <div
                className={clsx(
                  producer.status === "available" && "ring-available",
                  producer.status === "limited" && "ring-limited",
                  producer.status === "unavailable" && "ring-unavailable"
                )}
              >
                <Avatar producer={producer} size="lg" />
              </div>
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
                <span>{producer.mixesThisWeek} mixes this week</span>
              </div>

              <button
                type="button"
                onClick={() => setAvailabilityProducer(producer)}
                className="mt-1 w-full rounded-xl border border-brand-line/50 bg-white/80 py-2.5 text-[13px] font-semibold text-brand-ink-secondary transition hover:border-brand-blue/30 hover:bg-brand-blue-soft/20 hover:text-brand-ink"
              >
                Days & schedule
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
        producer={availabilityProducer}
        onSave={handleSaveAvailability}
        readOnly={isViewOnly}
      />

      <DeleteProducerModal
        open={Boolean(deleting)}
        producer={deleting}
        assignedMixesCount={assignedMixesCount}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
