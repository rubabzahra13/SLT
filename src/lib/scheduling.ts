import type { MTDRecord, Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import { parsePackage } from "@/lib/package";
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

function mixWindowDays(packageStr: string): number {
  const { tier, limit } = parsePackage(packageStr);
  const t = tier.toUpperCase();
  if (t.includes("PLATINUM")) return 7;
  if (t.includes("GOLD")) return 5;
  if (t.includes("SILVER")) return 4;
  if (t.includes("HOMECOMING")) return 3;
  if (limit === "TBD") return 6;
  return 5;
}

/** Estimate mix end from start date and package tier. */
export function suggestMixEndDate(
  mixStartDate: string,
  packageStr: string
): string {
  const start = parseFlexibleDate(mixStartDate);
  if (!start) return "";

  const end = new Date(start);
  end.setDate(end.getDate() + mixWindowDays(packageStr));
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
