/**
 * How Assign Editor daily cost limits are estimated.
 *
 * Package price is always included. Add-ons (8ct / sheet / vocals / rush /
 * voiceover) are intentionally excluded — the client wants the day-cap to
 * track package + optional compliance / producer rate only.
 */

export const DAILY_COST_SETTINGS_CHANGED_EVENT = "slt-daily-cost-settings-changed";

const STORAGE_KEY = "slt-daily-cost-settings-v1";

export type DailyCostSettings = {
  /** Always true — package price is required in the day-cap math. */
  includePackagePrice: true;
  /**
   * When true, use the compliant / non-compliant payroll column for the
   * order's music affiliate. When false, use the customer package price.
   */
  includeCompliance: boolean;
  /**
   * When true, multiply by the producer's payout % for the category.
   * When false, count the full package/payroll dollars toward the day cap.
   */
  includeProducerRate: boolean;
};

export const DEFAULT_DAILY_COST_SETTINGS: DailyCostSettings = {
  includePackagePrice: true,
  includeCompliance: true,
  includeProducerRate: true,
};

export function loadDailyCostSettings(): DailyCostSettings {
  if (typeof window === "undefined") return { ...DEFAULT_DAILY_COST_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DAILY_COST_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<DailyCostSettings>;
    return {
      includePackagePrice: true,
      includeCompliance:
        typeof parsed.includeCompliance === "boolean"
          ? parsed.includeCompliance
          : DEFAULT_DAILY_COST_SETTINGS.includeCompliance,
      includeProducerRate:
        typeof parsed.includeProducerRate === "boolean"
          ? parsed.includeProducerRate
          : DEFAULT_DAILY_COST_SETTINGS.includeProducerRate,
    };
  } catch {
    return { ...DEFAULT_DAILY_COST_SETTINGS };
  }
}

export function saveDailyCostSettings(settings: DailyCostSettings): void {
  if (typeof window === "undefined") return;
  const next: DailyCostSettings = {
    includePackagePrice: true,
    includeCompliance: Boolean(settings.includeCompliance),
    includeProducerRate: Boolean(settings.includeProducerRate),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(DAILY_COST_SETTINGS_CHANGED_EVENT));
}

/**
 * Active mix-cost formula (one line).
 * Always starts from package price; compliance adjusts that amount when on;
 * producer compensation multiplies when on.
 */
export function describeDailyCostSettings(settings: DailyCostSettings): string {
  const base = settings.includeCompliance
    ? "package price (compliance if any)"
    : "package price";
  if (settings.includeProducerRate) {
    return `${base} × producer compensation`;
  }
  return base;
}

