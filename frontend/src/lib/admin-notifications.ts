/**
 * Admin bell notifications: only these four events belong in the bell.
 * Everything else is an ephemeral alert (toast).
 */
import type { MTDRecord, Producer, ProducerTimeOff } from "@/types";
import { todayIso } from "@/lib/date-filters";
import { formatDisplayDate, toIsoDateString } from "@/lib/dates";
import { isProducerDailyLimitFull } from "@/lib/producer-availability";

export const BELL_NOTIFICATION_TYPES = [
  "new_order",
  "flagged_order",
  "leave_tomorrow",
  "limit_full",
  "assignment",
  "gmail_connected",
  "gmail_disconnected",
] as const;

export type BellNotificationType = (typeof BELL_NOTIFICATION_TYPES)[number];

export type AppAlertTone = "info" | "success" | "warning" | "error";

export function isBellNotificationType(
  type: string
): type is BellNotificationType {
  return (BELL_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

function addDaysToIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function leaveCoversDate(leave: ProducerTimeOff, iso: string): boolean {
  const start = toIsoDateString(leave.startDate);
  const end = toIsoDateString(leave.endDate) || start;
  if (!start || !iso) return false;
  return start <= iso && end >= iso;
}

export type LeaveTomorrowHit = {
  producer: Producer;
  leave: ProducerTimeOff;
  tomorrowIso: string;
  dedupeKey: string;
  title: string;
  message: string;
};

/** Producers whose off window starts tomorrow (not already off today). */
export function findLeavesStartingTomorrow(
  producers: Producer[],
  today: string = todayIso()
): LeaveTomorrowHit[] {
  const tomorrow = addDaysToIso(today, 1);
  const hits: LeaveTomorrowHit[] = [];

  for (const producer of producers) {
    for (const leave of producer.timeOff ?? []) {
      if (!leaveCoversDate(leave, tomorrow)) continue;
      if (leaveCoversDate(leave, today)) continue;

      const start = toIsoDateString(leave.startDate);
      const end = toIsoDateString(leave.endDate) || start;
      const dateLabel =
        start && end && start !== end
          ? `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`
          : formatDisplayDate(tomorrow);

      hits.push({
        producer,
        leave,
        tomorrowIso: tomorrow,
        dedupeKey: `leave_tomorrow:${producer.id}:${tomorrow}:${start}`,
        title: `${producer.name} has off tomorrow`,
        message:
          leave.reason?.trim()
            ? `${dateLabel} · ${leave.reason.trim()}`
            : dateLabel,
      });
    }
  }

  return hits;
}

export type LimitFullHit = {
  producer: Producer;
  dayIso: string;
  dedupeKey: string;
  title: string;
  message: string;
};

/** Producers at Limit full for the given day (default: today). */
export function findProducersAtLimitFull(
  producers: Producer[],
  mtdRecords: MTDRecord[],
  dayIso: string = todayIso()
): LimitFullHit[] {
  const [y, m, d] = dayIso.split("-").map(Number);
  if (!y || !m || !d) return [];
  const day = new Date(y, m - 1, d, 12, 0, 0, 0);
  const hits: LimitFullHit[] = [];

  for (const producer of producers) {
    if (
      !isProducerDailyLimitFull(producer, day, mtdRecords)
    ) {
      continue;
    }
    hits.push({
      producer,
      dayIso,
      dedupeKey: `limit_full:${producer.id}:${dayIso}`,
      title: `${producer.name}: Limit full`,
      message: `Daily mix/cost limit reached for ${formatDisplayDate(dayIso)}.`,
    });
  }

  return hits;
}

const DEDUPE_STORAGE_KEY = "slt_admin_bell_dedupe_v1";
const DEDUPE_MAX = 120;

export function claimNotificationDedupeKey(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.sessionStorage.getItem(DEDUPE_STORAGE_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (list.includes(key)) return false;
    const next = [...list, key].slice(-DEDUPE_MAX);
    window.sessionStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return true;
  }
}
