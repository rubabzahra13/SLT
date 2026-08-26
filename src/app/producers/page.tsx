"use client";

import { useState } from "react";
import { CalendarOff, Mail, Music, Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeleteProducerModal } from "@/components/producers/DeleteProducerModal";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { useAppState } from "@/context/AppStateContext";
import { formatTimeOffRange } from "@/lib/producers";
import type { Producer, ProducerTimeOff, Weekday } from "@/types";

export default function ProducersPage() {
  const { producers, addProducer, updateProducer, removeProducer } =
    useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);
  const [deleting, setDeleting] = useState<Producer | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(producer: Producer) {
    setEditing(producer);
    setModalOpen(true);
  }

  function handleSave(producer: Producer) {
    if (editing) {
      updateProducer(producer.id, producer);
    } else {
      addProducer(producer);
    }
  }

  function handleSaveAvailability(patch: {
    workDays: Weekday[];
    timeOff: ProducerTimeOff[];
    maxMixesPerDay: number | null;
    overtimeDays: string[];
  }) {
    if (!availabilityProducer) return;
    updateProducer(availabilityProducer.id, patch);
  }

  function confirmDelete() {
    if (!deleting) return;
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

  return (
    <>
      <PageHeader
        title="Producer Roster"
        badge={`${producers.length} producers`}
        subtitle="Manage producers, add, edit, or remove without dev help"
        action={{ label: "Add Producer", onClick: openAdd }}
      />

      <div className="grid gap-4 px-6 pb-6 pt-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-8 xl:grid-cols-4">
        {producers.map((producer) => (
          <article
            key={producer.id}
            className="dashboard-panel relative flex flex-col"
          >
            <div className="dashboard-panel-head dashboard-panel-head-accent flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <span className="dashboard-panel-title truncate text-[11px] uppercase tracking-[0.06em]">
                {producer.specialty}
              </span>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => openEdit(producer)}
                  className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-blue-soft/25 hover:text-brand-ink"
                  aria-label={`Edit ${producer.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(producer)}
                  className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger"
                  aria-label={`Delete ${producer.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="dashboard-panel-body flex flex-1 flex-col p-6 pt-4">
            <div className="flex flex-col items-center text-center">
              <div
                className={clsx(
                  producer.status === "available" && "ring-available",
                  producer.status === "limited" && "ring-limited",
                  producer.status === "unavailable" && "ring-unavailable"
                )}
              >
                <Avatar src={producer.avatar} alt={producer.name} size="lg" />
              </div>
              <h3 className="text-display mt-4 text-[15px]">{producer.name}</h3>
              <p className="mt-0.5 text-[12px] font-medium text-brand-ink-tertiary">
                {producer.initials}
              </p>
            </div>

            <div className="mt-5 space-y-2.5 border-t border-brand-line pt-5">
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
              {producer.timeOff.length > 0 ? (
                <div className="rounded-xl border border-brand-line bg-brand-bg/60 px-3 py-2.5 text-left">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-brand-ink-tertiary">
                    <CalendarOff className="h-3 w-3" strokeWidth={2} />
                    Time off
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {producer.timeOff.slice(0, 2).map((entry) => (
                      <li key={entry.id} className="text-[11px] leading-snug">
                        <span className="font-medium text-brand-ink">
                          {formatTimeOffRange(entry)}
                        </span>
                        <span className="text-brand-ink-tertiary">
                          {" "}
                          · {entry.type === "holiday" ? "Holiday" : "Personal"}
                        </span>
                        <p className="text-brand-ink-secondary">{entry.reason}</p>
                      </li>
                    ))}
                    {producer.timeOff.length > 2 ? (
                      <li className="text-[11px] text-brand-ink-tertiary">
                        +{producer.timeOff.length - 2} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setAvailabilityProducer(producer)}
              className="mt-5 w-full rounded-xl border border-brand-line/50 bg-white/80 py-2.5 text-[13px] font-semibold text-brand-ink-secondary transition hover:border-brand-blue/30 hover:bg-brand-blue-soft/20 hover:text-brand-ink"
            >
              Days & schedule
            </button>
            </div>
          </article>
        ))}

        <button
          type="button"
          onClick={openAdd}
          className="dashboard-panel dashboard-panel-dashed flex min-h-[300px] flex-col border-dashed !border-brand-line/45 bg-brand-bg-subtle/30 text-brand-ink-tertiary transition hover:!border-brand-blue/35 hover:bg-brand-blue-soft/15 hover:text-brand-ink"
        >
          <div
            className="dashboard-panel-head flex shrink-0 items-center justify-between gap-2 px-4 py-3"
            aria-hidden
          >
            <span className="dashboard-panel-title pointer-events-none text-[11px] uppercase tracking-[0.06em] opacity-0">
              Add producer
            </span>
            <div className="flex shrink-0 items-center opacity-0">
              <span className="rounded-lg p-1.5">
                <span className="block h-3.5 w-3.5" />
              </span>
              <span className="rounded-lg p-1.5">
                <span className="block h-3.5 w-3.5" />
              </span>
            </div>
          </div>
          <span className="dashboard-panel-body flex flex-1 flex-col items-center justify-center">
            <Plus className="h-6 w-6" strokeWidth={1.5} />
            <span className="mt-2 text-[13px] font-medium">Add producer</span>
          </span>
        </button>
      </div>

      <ProducerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        producer={editing}
        onSave={handleSave}
      />

      <ProducerAvailabilityModal
        open={Boolean(availabilityProducer)}
        onClose={() => setAvailabilityProducer(null)}
        producer={availabilityProducer}
        onSave={handleSaveAvailability}
      />

      <DeleteProducerModal
        open={Boolean(deleting)}
        producer={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
