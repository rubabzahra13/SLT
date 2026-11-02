/**
 * Invoice # continuity: once set on a manual booking, keep the first real
 * value across Orders / Match / MTD / Payroll (never let empty wipe it).
 */
export function pickInvoice(
  ...sources: Array<string | null | undefined>
): string {
  for (const raw of sources) {
    const v = String(raw ?? "").trim();
    if (v) return v;
  }
  return "";
}
