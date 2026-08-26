import type { Producer, ScheduleEntry } from "@/types";
import { parseFlexibleDate } from "@/lib/dates";
import { parsePackage } from "@/lib/package";

export function getNextAvailableSlot(
  producerInitials: string,
  producers: Producer[],
  schedule: ScheduleEntry[]
): { date: string; label: string } | null {
  const producer = producers.find(
    (p) => p.initials === producerInitials || p.name.toUpperCase() === producerInitials
  );

  const entries = schedule.filter((s) => s.producer === producerInitials);
  const availableEntry = entries.find((e) => e.status === "available");

  if (availableEntry) {
    return { date: availableEntry.day, label: availableEntry.day };
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
