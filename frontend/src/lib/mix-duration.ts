/** Parse stored mix length (`2:00`) into minutes / seconds for time inputs. */
export function parseMixDurationParts(value: string): {
  minutes: string;
  seconds: string;
} {
  const match = value.trim().match(/^(\d{1,3}):(\d{1,2})$/);
  if (!match) return { minutes: "", seconds: "" };
  const secondsNum = Number(match[2]);
  if (!Number.isFinite(secondsNum) || secondsNum > 59) {
    return { minutes: "", seconds: "" };
  }
  return {
    minutes: String(Number(match[1])),
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

export function isValidMixDuration(value: string): boolean {
  const parts = parseMixDurationParts(value);
  if (!parts.minutes && !parts.seconds) return false;
  const total =
    Number(parts.minutes || 0) * 60 + Number(parts.seconds || 0);
  return total > 0;
}

/** SoftSelect sentinel for custom mix length (opens min:sec UI). */
export const MIX_LENGTH_OTHER_OPTION = "Other";
