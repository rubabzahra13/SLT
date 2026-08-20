import {
  DEFAULT_WORK_DAYS,
  type Producer,
  type ProducerTimeOff,
  type Weekday,
} from "@/types";
import { defaultAvatarSrc } from "@/lib/producer-avatars";

export function normalizeProducer(raw: Partial<Producer> & { id: string }): Producer {
  return {
    id: raw.id,
    name: raw.name || "Producer",
    initials: (raw.initials || "XX").toUpperCase().slice(0, 4),
    email: raw.email || "",
    specialty: raw.specialty || "Cheer",
    avatar: raw.avatar || defaultAvatarSrc(),
    mixesThisWeek: raw.mixesThisWeek ?? 0,
    nextAvailable: raw.nextAvailable || "TBD",
    status: raw.status || "available",
    workDays:
      raw.workDays && raw.workDays.length > 0
        ? raw.workDays
        : [...DEFAULT_WORK_DAYS],
    timeOff: Array.isArray(raw.timeOff) ? raw.timeOff : [],
  };
}

export function formatWorkDays(days: Weekday[]): string {
  const order: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const labels: Record<Weekday, string> = {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  };
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (sorted.length === 0) return "No work days";
  if (
    sorted.length === 5 &&
    DEFAULT_WORK_DAYS.every((d) => sorted.includes(d))
  ) {
    return "Mon–Fri";
  }
  return sorted.map((d) => labels[d]).join(", ");
}

export function formatTimeOffRange(entry: ProducerTimeOff): string {
  if (entry.startDate === entry.endDate) return entry.startDate;
  return `${entry.startDate} → ${entry.endDate}`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
