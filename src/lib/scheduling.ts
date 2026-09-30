import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import { calculateProducerNextOpening } from "@/lib/producer-schedule-calc";

export function getNextAvailableSlot(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[],
  mtdRecords: MTDRecord[] = []
): { date: string; label: string; dateObj: Date } | null {
  const producer = producers.find(
    (p) =>
      p.initials === producerInitials ||
      p.name.toUpperCase() === producerInitials.toUpperCase() ||
      p.id === producerInitials
  );

  if (producer) {
    const calc = calculateProducerNextOpening(producer, mtdRecords, schedule);
    return {
      date: calc.nextAvailable,
      label: calc.nextAvailable,
      dateObj: calc.nextAvailableDate,
    };
  }

  const entries = schedule.filter((s) => s.producer === producerInitials);
  const availableEntry = entries.find((e) => e.status === "available");

  if (availableEntry) {
    const dateObj = parseFlexibleDate(availableEntry.day) ?? new Date();
    return { date: availableEntry.day, label: availableEntry.day, dateObj };
  }

  return null;
}

export function formatSlotForDisplay(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[],
  mtdRecords: MTDRecord[] = []
): string {
  const slot = getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords);
  if (!slot) return "No slot found";
  return slot.label;
}

export function suggestMixStartDate(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[],
  mtdRecords: MTDRecord[] = []
): string {
  const slot = getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords);
  if (!slot || !slot.dateObj) return new Date().toISOString().slice(0, 10);

  const y = slot.dateObj.getFullYear();
  const m = String(slot.dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(slot.dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export { suggestMixEndDate } from "@/lib/producer-availability";
