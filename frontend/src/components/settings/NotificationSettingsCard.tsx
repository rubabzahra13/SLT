"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import clsx from "clsx";
import {
  NOTIFICATION_PREFERENCE_META,
  readNotificationPreferences,
  writeNotificationPreferences,
  type NotificationPreferenceKey,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

export function NotificationSettingsCard() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    readNotificationPreferences
  );

  useEffect(() => {
    setPrefs(readNotificationPreferences());
  }, []);

  const setPref = useCallback((key: NotificationPreferenceKey, on: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: on };
      writeNotificationPreferences(next);
      return next;
    });
  }, []);

  return (
    <section className="dashboard-panel flex flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-brand-line/30 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-blue-soft/80 text-brand-signature ring-1 ring-inset ring-brand-signature/20">
          <Bell className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-brand-ink">
            Notifications
          </h2>
          <p className="mt-1 truncate text-[11px] font-medium text-brand-ink-secondary">
            Choose what appears in the sidebar bell
          </p>
        </div>
      </div>

      <ul className="dashboard-panel-body divide-y divide-brand-line/30">
        {NOTIFICATION_PREFERENCE_META.map((item) => {
          const on = prefs[item.key];
          return (
            <li key={item.key}>
              <div className="flex w-full items-center justify-between gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-brand-ink">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-brand-ink-tertiary">
                    {item.description}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${item.label} notifications ${on ? "on" : "off"}`}
                  onClick={() => setPref(item.key, !on)}
                  className={clsx(
                    "relative h-7 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30",
                    on ? "bg-brand-signature" : "bg-brand-line"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition",
                      on && "translate-x-4"
                    )}
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
