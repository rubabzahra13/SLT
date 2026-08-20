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
import { formatTimeOffRange, formatWorkDays } from "@/lib/producers";
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
        subtitle="Manage producers, add, edit, or remove without dev help"
        action={{ label: "Add Producer", onClick: openAdd }}
      />

      <div className="grid gap-4 p-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {producers.map((producer) => (
          <article
            key={producer.id}
            className="surface-premium relative rounded-2xl p-6 transition hover:shadow-[var(--shadow-premium)]"
          >
            <button
              type="button"
              onClick={() => openEdit(producer)}
              className="absolute left-3 top-3 rounded-full p-2 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink"
              aria-label={`Edit ${producer.name}`}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(producer)}
              className="absolute right-3 top-3 rounded-full p-2 text-brand-ink-tertiary transition hover:bg-brand-orange-soft hover:text-brand-danger"
              aria-label={`Delete ${producer.name}`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>

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
              <span className="mt-3 rounded-full border border-brand-line bg-brand-bg px-3 py-1 text-[11px] font-medium text-brand-ink-secondary">
                {producer.specialty}
              </span>
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
              <p className="text-[12px] text-brand-ink-secondary">
                Works {formatWorkDays(producer.workDays)}
              </p>
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
              className="mt-5 w-full rounded-xl bg-brand-ink py-2.5 text-[13px] font-semibold text-white transition hover:bg-brand-accent-hover"
            >
              Days & time off
            </button>
          </article>
        ))}

        <button
          type="button"
          onClick={openAdd}
          className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-brand-line-strong bg-brand-bg/50 text-brand-ink-tertiary transition hover:border-brand-ink-tertiary hover:text-brand-ink"
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} />
          <span className="mt-2 text-[13px] font-medium">Add producer</span>
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
