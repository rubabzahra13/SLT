"use client";

import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Eye, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerDeleteHost } from "@/components/producers/ProducerDeleteHost";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { HoverTip } from "@/components/ui/HoverTip";
import { getProducerCategories, normalizeProducerList } from "@/lib/producers";
import { DISPLAY_TIME_ZONE } from "@/lib/dates";
import type { Producer, Weekday } from "@/types";
import { useAppProducers } from "@/context/AppStateContext";

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
    timeZone: DISPLAY_TIME_ZONE,
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  });
  return `${day} · ${time}`;
}

type ProducersRosterGridProps = {
  producers: Producer[];
  isViewOnly: boolean;
  onAdd: () => void;
  onEdit: (producer: Producer) => void;
  onDelete: (producer: Producer) => void;
  onOpenAvailability: (producer: Producer) => void;
};

const ProducersRosterGrid = memo(function ProducersRosterGrid({
  producers,
  isViewOnly,
  onAdd,
  onEdit,
  onDelete,
  onOpenAvailability,
}: ProducersRosterGridProps) {
  return (
    <div className="grid auto-rows-fr items-stretch gap-4 px-6 pb-6 pt-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-8 xl:grid-cols-4">
      {producers.map((producer) => {
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
                  onClick={() => onEdit(producer)}
                  className="rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-blue-soft/25 hover:text-brand-ink"
                  aria-label={
                    isViewOnly ? `View ${producer.name}` : `Edit ${producer.name}`
                  }
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
                    onClick={() => onDelete(producer)}
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
                  onClick={() => onOpenAvailability(producer)}
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
          onClick={onAdd}
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
  );
});

function ProducersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deleteParam = searchParams.get("delete");
  const { producers, addProducer, updateProducer, isViewOnly } =
    useAppProducers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);
  const [deleting, setDeleting] = useState<Producer | null>(null);
  /** Prevents ?delete= from reopening the modal while the URL is still clearing. */
  const deleteParamOpenedRef = useRef<string | null>(null);

  function clearDeleteQuery() {
    if (!deleteParam) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("delete");
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function closeDeleteModal() {
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

  const openAdd = useCallback(() => {
    if (isViewOnly) return;
    setEditing(null);
    setModalOpen(true);
  }, [isViewOnly]);

  const openEdit = useCallback((producer: Producer) => {
    setEditing(producer);
    setModalOpen(true);
  }, []);

  const openDelete = useCallback((producer: Producer) => {
    setDeleting(producer);
  }, []);

  const openAvailability = useCallback((producer: Producer) => {
    setAvailabilityProducer(producer);
  }, []);

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

  const uniqueProducers = useMemo(
    () => normalizeProducerList(producers),
    [producers]
  );

  const liveAvailabilityProducer = availabilityProducer
    ? producers.find(
        (p) =>
          p.id === availabilityProducer.id ||
          (p.uuid && p.uuid === availabilityProducer.uuid)
      ) ?? availabilityProducer
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title="Producer Roster"
        badge={`${uniqueProducers.length} producers`}
        subtitle="Manage producers"
        action={isViewOnly ? undefined : { label: "Add Producer", onClick: openAdd }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ProducersRosterGrid
          producers={uniqueProducers}
          isViewOnly={isViewOnly}
          onAdd={openAdd}
          onEdit={openEdit}
          onDelete={openDelete}
          onOpenAvailability={openAvailability}
        />
      </div>

      {modalOpen ? (
        <ProducerFormModal
          open
          onClose={() => setModalOpen(false)}
          producer={editing}
          onSave={handleSave}
          readOnly={isViewOnly}
        />
      ) : null}

      {liveAvailabilityProducer ? (
        <ProducerAvailabilityModal
          open
          onClose={() => setAvailabilityProducer(null)}
          producer={liveAvailabilityProducer}
          onSave={handleSaveAvailability}
          readOnly={isViewOnly}
        />
      ) : null}

      {deleting ? (
        <ProducerDeleteHost
          producer={deleting}
          onClose={closeDeleteModal}
          onDeleted={clearProducerUi}
        />
      ) : null}
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
