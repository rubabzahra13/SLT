/**
 * Parse stored mix length into minutes / seconds for time inputs.
 * Accepts:
 * - `2:00` / `1:45`
 * - Magento bare minutes (`1`, `3`, `4` → 1:00 / 3:00 / 4:00)
 * - Over-seconds Magento typos (`1:60` → 2:00)
 */
export function parseMixDurationParts(value: string): {
  minutes: string;
  seconds: string;
} {
  const trimmed = String(value || "").trim();
  if (!trimmed) return { minutes: "", seconds: "" };

  // Magento marching-band / SE / dance sometimes send minutes only ("1", "4").
  const bareMinutes = trimmed.match(/^(\d{1,3})$/);
  if (bareMinutes) {
    const mins = Number(bareMinutes[1]);
    if (!Number.isFinite(mins) || mins <= 0) {
      return { minutes: "", seconds: "" };
    }
    return { minutes: String(mins), seconds: "00" };
  }

  const match = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
  if (!match) return { minutes: "", seconds: "" };
  let mins = Number(match[1]);
  let secondsNum = Number(match[2]);
  if (!Number.isFinite(mins) || !Number.isFinite(secondsNum)) {
    return { minutes: "", seconds: "" };
  }
  // Carry Magento typos like 1:60 → 2:00.
  if (secondsNum > 59) {
    mins += Math.floor(secondsNum / 60);
    secondsNum = secondsNum % 60;
  }
  if (mins < 0 || secondsNum < 0) return { minutes: "", seconds: "" };
  if (mins === 0 && secondsNum === 0) return { minutes: "", seconds: "" };
  return {
    minutes: String(mins),
    seconds: String(secondsNum).padStart(2, "0"),
  };
}

/** Build mix length string from minutes + seconds (`2` + `00` → `2:00`). */
export function formatMixDuration(minutes: string, seconds: string): string {
  const minsRaw = minutes.trim();
  const secsRaw = seconds.trim();
  if (!minsRaw && !secsRaw) return "";
  const mins = minsRaw === "" ? 0 : Number(minsRaw);
  const secs = secsRaw === "" ? 0 : Number(secsRaw);
  if (!Number.isFinite(mins) || !Number.isFinite(secs)) return "";
  if (mins < 0 || secs < 0 || secs > 59) return "";
  // Cleared / zero duration must not persist as "0:00" (keeps Mix Time green).
  if (mins === 0 && secs === 0) return "";
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Canonical `m:ss` when Magento sent bare minutes or fixable m:ss;
 * TBD / Other / free-text left unchanged.
 */
export function normalizeMixDurationValue(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^tbd$/i.test(trimmed)) return "TBD";
  if (/^other\b/i.test(trimmed)) return trimmed;
  const parts = parseMixDurationParts(trimmed);
  if (!parts.minutes && !parts.seconds) return trimmed;
  return formatMixDuration(parts.minutes, parts.seconds);
}

export function isValidMixDuration(value: string): boolean {
  const parts = parseMixDurationParts(value);
  if (!parts.minutes && !parts.seconds) return false;
  const total =
    Number(parts.minutes || 0) * 60 + Number(parts.seconds || 0);
  return total > 0;
}

/**
 * Forms that use freeform min:sec inputs (no SoftSelect catalog).
 * Magento often sends bare minutes for these.
 */
export function mixLengthUsesDurationInputsOnly(
  formType?: string | null
): boolean {
  const ft = String(formType || "")
    .trim()
    .toLowerCase();
  return (
    ft === "marching-band" ||
    ft.includes("marching") ||
    ft === "sports-entertainment" ||
    (ft.includes("sports") && ft.includes("entertain"))
  );
}

/** SoftSelect sentinel for custom mix length (opens min:sec UI). */
export const MIX_LENGTH_OTHER_OPTION = "Other";

/**
 * Table / read-only label for Length of Mix.
 * Bare Magento minutes ("1") → "1:00"; TBD / Other / free text unchanged.
 */
export function displayMixLengthLabel(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  const normalized = normalizeMixDurationValue(trimmed);
  return isValidMixDuration(normalized) ? normalized : trimmed;
}
