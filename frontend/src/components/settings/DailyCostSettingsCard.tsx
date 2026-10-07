"use client";

import { useEffect, useState } from "react";
import {
  DAILY_COST_SETTINGS_CHANGED_EVENT,
  loadDailyCostSettings,
  saveDailyCostSettings,
  type DailyCostSettings,
} from "@/lib/daily-cost-settings";

/** Checkbox fields for daily cost — embeds inside Producers & Payroll. */
export function DailyCostSettingsFields() {
  const [settings, setSettings] = useState<DailyCostSettings>(() =>
    loadDailyCostSettings()
  );

  useEffect(() => {
    const sync = () => setSettings(loadDailyCostSettings());
    window.addEventListener(DAILY_COST_SETTINGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DAILY_COST_SETTINGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const patch = (next: Partial<DailyCostSettings>) => {
    const merged: DailyCostSettings = {
      includePackagePrice: true,
      includeCompliance:
        next.includeCompliance ?? settings.includeCompliance,
      includeProducerRate:
        next.includeProducerRate ?? settings.includeProducerRate,
    };
    setSettings(merged);
    saveDailyCostSettings(merged);
  };

  return (
    <div className="px-4 py-3.5">
      <p className="text-[11px] font-medium text-brand-ink-tertiary">
        What to include in daily cost calculation
      </p>

      <div className="mt-3 space-y-2.5">
        <label className="flex items-center gap-2.5 rounded-xl border border-brand-line/40 bg-brand-bg/40 px-3 py-2.5">
          <input
            type="checkbox"
            checked
            disabled
            className="h-3.5 w-3.5 rounded border-brand-line accent-brand-blue"
          />
          <span className="text-[13px] font-medium text-brand-ink">
            Package price
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-brand-line/40 bg-white px-3 py-2.5 transition hover:border-brand-blue/40">
          <input
            type="checkbox"
            checked={settings.includeCompliance}
            onChange={(e) => patch({ includeCompliance: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-brand-line accent-brand-blue"
          />
          <span className="text-[13px] font-medium text-brand-ink">
            Compliance cost
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-brand-line/40 bg-white px-3 py-2.5 transition hover:border-brand-blue/40">
          <input
            type="checkbox"
            checked={settings.includeProducerRate}
            onChange={(e) => patch({ includeProducerRate: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-brand-line accent-brand-blue"
          />
          <span className="text-[13px] font-medium text-brand-ink">
            Producer compensation
          </span>
        </label>
      </div>
    </div>
  );
}
