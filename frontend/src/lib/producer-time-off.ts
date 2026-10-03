/** Fixed leave reason prefix — admin fills in the rest (e.g. "wedding"). */
export const OFF_WORK_FOR_PREFIX = "Off work for ";

export function formatOffWorkReason(detail: string): string {
  const trimmed = detail.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const prefixLower = OFF_WORK_FOR_PREFIX.trim().toLowerCase();
  if (lower.startsWith(prefixLower)) {
    const rest = trimmed.slice(OFF_WORK_FOR_PREFIX.trim().length).trim();
    return rest ? `${OFF_WORK_FOR_PREFIX}${rest}` : "";
  }
  return `${OFF_WORK_FOR_PREFIX}${trimmed}`;
}

/** Detail portion after "Off work for " for editing in the input. */
export function offWorkReasonDetail(reason: string): string {
  const trimmed = reason.trim();
  const prefixLower = OFF_WORK_FOR_PREFIX.trim().toLowerCase();
  if (trimmed.toLowerCase().startsWith(prefixLower)) {
    return trimmed.slice(OFF_WORK_FOR_PREFIX.trim().length).trim();
  }
  // Legacy preset names (Vacation, etc.) — treat whole string as detail for editing.
  return trimmed;
}

export function isValidOffWorkReason(reason: string): boolean {
  return (
    formatOffWorkReason(offWorkReasonDetail(reason)).length >
    OFF_WORK_FOR_PREFIX.length
  );
}

/** @deprecated Leave names settings removed — kept for API/bootstrap compat. */
export type StudioPersonalReason = {
  id: string;
  name: string;
  enabled: boolean;
  isOther?: boolean;
};

/** @deprecated */
export function createDefaultPersonalReasons(): StudioPersonalReason[] {
  return [
    {
      id: "personal-other-1",
      name: "Other",
      enabled: true,
      isOther: true,
    },
  ];
}

/** @deprecated */
export function normalizeStudioPersonalReason(
  raw: Partial<StudioPersonalReason> & { name: string }
): StudioPersonalReason {
  return {
    id:
      raw.id ||
      `personal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: (raw.name || "").trim() || "Other",
    enabled: raw.enabled !== false,
    isOther: Boolean(raw.isOther) || undefined,
  };
}

/** @deprecated */
export function ensurePersonalReasonsList(
  reasons: StudioPersonalReason[]
): StudioPersonalReason[] {
  return reasons.map((entry) => normalizeStudioPersonalReason(entry));
}
