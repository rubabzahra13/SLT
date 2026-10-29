/**
 * Per-type toggles for the sidebar notification bell.
 * Stored per-browser (localStorage). Defaults: all on.
 */
import type { AppNotificationType } from "@/types";

export type NotificationPreferenceKey =
  | "new_order"
  | "flagged_order"
  | "leave_tomorrow"
  | "limit_full"
  | "gmail";

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export const NOTIFICATION_PREFERENCE_META: {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: "new_order",
    label: "New orders",
    description: "Incoming Magento / form orders",
  },
  {
    key: "flagged_order",
    label: "Flagged orders",
    description: "Multi-affiliate holds that need Resolve",
  },
  {
    key: "leave_tomorrow",
    label: "Producer leave tomorrow",
    description: "Off day starting tomorrow, with dates",
  },
  {
    key: "limit_full",
    label: "Limit full",
    description: "Producer daily mix/cost limit reached",
  },
  {
    key: "gmail",
    label: "Gmail connection",
    description: "Google account connected or disconnected",
  },
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  new_order: true,
  flagged_order: true,
  leave_tomorrow: true,
  limit_full: true,
  gmail: true,
};

const STORAGE_KEY = "slt_notification_preferences_v2";

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    const next = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as NotificationPreferenceKey[]) {
      if (typeof parsed[key] === "boolean") next[key] = parsed[key]!;
    }
    return next;
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function writeNotificationPreferences(
  prefs: NotificationPreferences
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}

/** Which preference gate applies to a bell notification type. */
export function preferenceKeyForNotificationType(
  type: AppNotificationType
): NotificationPreferenceKey | null {
  if (type === "gmail_connected" || type === "gmail_disconnected") {
    return "gmail";
  }
  if (type === "assignment") {
    // Assignments are alerts only: not a bell preference.
    return null;
  }
  return type;
}

export function isNotificationTypeEnabled(
  type: AppNotificationType,
  prefs: NotificationPreferences = readNotificationPreferences()
): boolean {
  if (type === "assignment") return false;
  const key = preferenceKeyForNotificationType(type);
  if (!key) return true;
  return prefs[key] !== false;
}
