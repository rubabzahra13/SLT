import type { MTDRecord, PayrollAddon } from "@/types";

export const MISC_ADJUSTMENT_LABEL = "Miscellaneous Adjustment";

/** One misc_adjustment per mix — keep the newest when duplicates exist. */
export function dedupePayrollAddons(addons: PayrollAddon[]): PayrollAddon[] {
  const miscNewest = new Map<string, PayrollAddon>();
  const rest: PayrollAddon[] = [];
  for (const addon of addons) {
    if (addon.addonType !== "misc_adjustment") {
      rest.push(addon);
      continue;
    }
    const key =
      (addon.mtdId && `mtd:${addon.mtdId}`) ||
      (addon.orderId && `ord:${addon.orderId}`) ||
      `id:${addon.id}`;
    const prev = miscNewest.get(key);
    if (!prev) {
      miscNewest.set(key, addon);
      continue;
    }
    const prevTime = Date.parse(prev.createdAt || "") || 0;
    const nextTime = Date.parse(addon.createdAt || "") || 0;
    if (nextTime >= prevTime) miscNewest.set(key, addon);
  }
  return [...rest, ...miscNewest.values()];
}

/** Find the single misc adjustment bound to a payroll mix row. */
export function miscAdjustmentAddonForRecord(
  recordId: string,
  orderId: string | null | undefined,
  addons: PayrollAddon[]
): PayrollAddon | null {
  const matches = addons.filter((addon) => {
    if (addon.addonType !== "misc_adjustment") return false;
    const aMtd = addon.mtdId ? String(addon.mtdId).trim() : "";
    const aOrd = addon.orderId ? String(addon.orderId).trim() : "";
    const rId = String(recordId).trim();
    const rOrd = orderId ? String(orderId).trim() : "";
    if (aMtd && (aMtd === rId || (rOrd && aMtd === rOrd))) return true;
    if (aOrd && ((rOrd && aOrd === rOrd) || aOrd === rId)) return true;
    return false;
  });
  if (matches.length === 0) return null;
  return matches.reduce((best, addon) => {
    const addonTime = Date.parse(addon.createdAt || "") || 0;
    const bestTime = Date.parse(best.createdAt || "") || 0;
    return addonTime >= bestTime ? addon : best;
  });
}

export function miscAdjustmentAmount(
  recordId: string,
  orderId: string | null | undefined,
  addons: PayrollAddon[]
): number {
  const addon = miscAdjustmentAddonForRecord(recordId, orderId, addons);
  if (!addon) return 0;
  const amount = Number(addon.amount);
  return Number.isFinite(amount) ? amount : 0;
}

/** Apply a signed misc adjustment to a mix payout exactly once. */
export function applyMiscAdjustmentToPayout(
  basePayout: number | null | undefined,
  adjustment: number
): number | null {
  if (basePayout == null || Number.isNaN(basePayout)) return null;
  if (!adjustment || Number.isNaN(adjustment)) return basePayout;
  return Math.round((basePayout + adjustment) * 100) / 100;
}

/** Display signed money for statement / UI cells (+$20.00 / -$10.00). */
export function formatSignedMiscAdjustment(amount: number): string {
  if (!amount) return "—";
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
}

export function categoryLabelForMiscAdjustment(formType?: string | null): string {
  switch (formType) {
    case "school-all-star-dance":
      return "Dance";
    case "school-all-star-cheer":
      return "Cheer";
    case "marching-band":
      return "Marching Band";
    case "sports-entertainment":
      return "Sports Entertainment";
    case "school-anthem":
      return "School Anthem";
    default:
      return "Other";
  }
}

export function recordHasMiscAdjustment(
  rec: MTDRecord,
  addons: PayrollAddon[]
): boolean {
  return miscAdjustmentAddonForRecord(rec.id, rec.orderId, addons) != null;
}
