import type { Producer, ScheduleEntry } from "@/types";

export function getNextAvailableSlot(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[]
): { date: string; label: string } | null {
  const producer = producers.find(
    (p) => p.initials === producerInitials || p.name.toUpperCase() === producerInitials
  );

  const entries = schedule.filter((s) => s.producer === producerInitials);
  const open = entries.find((e) => e.status === "available");

  if (open) {
    return { date: open.day, label: `${open.day} (open slot)` };
  }

  if (producer?.nextAvailable) {
    return { date: producer.nextAvailable, label: producer.nextAvailable };
  }

  return null;
}

export function formatSlotForDisplay(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[]
): string {
  const slot = getNextAvailableSlot(producerInitials, producers, schedule);
  if (!slot) return "No slot found";
  return slot.label;
}

export function suggestMixStartDate(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[]
): string {
  const slot = getNextAvailableSlot(producerInitials, producers, schedule);
  if (!slot) return "";

  const dayMatch = slot.date.match(/Aug (\d+)/i);
  if (dayMatch) {
    return `2026-08-${dayMatch[1].padStart(2, "0")}`;
  }

  return new Date().toISOString().slice(0, 10);
}
