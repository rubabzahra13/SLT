"use client";

import { useCallback, useMemo, useState } from "react";
import { ProducerAvailabilityModal } from "@/components/producers/ProducerAvailabilityModal";
import { ProducerFormModal } from "@/components/producers/ProducerFormModal";
import { useAppState } from "@/context/AppStateContext";
import type { Producer, Weekday } from "@/types";

/**
 * Shared Producers-tab edit surface (profile + schedule/capacity) for
 * Orders / MTD / Payroll assigned-producer cells.
 */
export function useProducerEditModals() {
  const { producers, updateProducer, isViewOnly } = useAppState();
  const [profileOpen, setProfileOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [availabilityProducer, setAvailabilityProducer] =
    useState<Producer | null>(null);

  const resolveLive = useCallback(
    (producer: Producer) =>
      producers.find(
        (p) =>
          p.id === producer.id ||
          (p.uuid && p.uuid === producer.uuid) ||
          (p.initials &&
            producer.initials &&
            p.initials.toUpperCase() === producer.initials.toUpperCase())
      ) ?? producer,
    [producers]
  );

  const openProfile = useCallback(
    (producer: Producer) => {
      setEditing(resolveLive(producer));
      setProfileOpen(true);
    },
    [resolveLive]
  );

  const openSchedule = useCallback(
    (producer: Producer) => {
      setAvailabilityProducer(resolveLive(producer));
    },
    [resolveLive]
  );

  const handleSaveProfile = useCallback(
    async (producer: Producer) => {
      if (isViewOnly) return;
      await updateProducer(producer.id, producer);
    },
    [isViewOnly, updateProducer]
  );

  const handleSaveAvailability = useCallback(
    async (patch: {
      workDays: Weekday[];
      timeOff: Producer["timeOff"];
      maxMixesPerDay: number | null;
      maxProducerCostPerDay: number | null;
      extraDays: string[];
    }) => {
      if (isViewOnly || !availabilityProducer) {
        throw new Error("Cannot save producer availability.");
      }
      await updateProducer(availabilityProducer.id, patch);
    },
    [availabilityProducer, isViewOnly, updateProducer]
  );

  const liveEditing = editing ? resolveLive(editing) : null;
  const liveAvailability = availabilityProducer
    ? resolveLive(availabilityProducer)
    : null;

  const modals = useMemo(
    () => (
      <>
        <ProducerFormModal
          open={profileOpen}
          onClose={() => {
            setProfileOpen(false);
            setEditing(null);
          }}
          producer={liveEditing}
          onSave={handleSaveProfile}
          readOnly={isViewOnly}
        />
        <ProducerAvailabilityModal
          open={Boolean(liveAvailability)}
          onClose={() => setAvailabilityProducer(null)}
          producer={liveAvailability}
          onSave={handleSaveAvailability}
          readOnly={isViewOnly}
        />
      </>
    ),
    [
      profileOpen,
      liveEditing,
      liveAvailability,
      handleSaveProfile,
      handleSaveAvailability,
      isViewOnly,
    ]
  );

  return {
    openProfile,
    openSchedule,
    modals,
    isViewOnly,
  };
}
