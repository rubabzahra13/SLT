function isoFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const PERSONAL_TIME_OFF_REASONS = [
  "Vacation",
  "Family",
  "Medical",
  "Personal appointment",
  "Travel",
  "Bereavement",
  "Other",
] as const;

export const OTHER_PERSONAL_REASON_NAME = "Other";

export function isOtherPersonalReason(name: string): boolean {
  return name.trim().toLowerCase() === OTHER_PERSONAL_REASON_NAME.toLowerCase();
}

/** Built-in holiday names used to seed studio holiday settings. */
export const DEFAULT_HOLIDAY_NAMES = [
  "New Year's Day",
  "Martin Luther King Jr. Day",
  "Presidents' Day",
  "Memorial Day",
  "Juneteenth",
  "Independence Day",
  "Labor Day",
  "Columbus Day / Indigenous Peoples' Day",
  "Veterans Day",
  "Thanksgiving",
  "Day after Thanksgiving",
  "Christmas Eve",
  "Christmas Day",
  "New Year's Eve",
  "Other holiday",
] as const;

export const OTHER_PUBLIC_HOLIDAY_NAME = "Other";

/**
 * Searchable catalog of common U.S. public / widely observed holidays.
 * Month/day defaults are typical; admins can override. Year is applied when assigning.
 */
export const US_PUBLIC_HOLIDAY_CATALOG: ReadonlyArray<{
  name: string;
  startDate?: string;
  endDate?: string;
}> = [
  { name: "New Year's Day", startDate: "01-01", endDate: "01-01" },
  { name: "Martin Luther King Jr. Day", startDate: "01-19", endDate: "01-19" },
  { name: "Valentine's Day", startDate: "02-14", endDate: "02-14" },
  { name: "Presidents' Day", startDate: "02-16", endDate: "02-16" },
  { name: "St. Patrick's Day", startDate: "03-17", endDate: "03-17" },
  { name: "Easter Sunday", startDate: "04-05", endDate: "04-05" },
  { name: "Good Friday", startDate: "04-03", endDate: "04-03" },
  { name: "Mother's Day", startDate: "05-10", endDate: "05-10" },
  { name: "Memorial Day", startDate: "05-25", endDate: "05-25" },
  { name: "Juneteenth", startDate: "06-19", endDate: "06-19" },
  { name: "Father's Day", startDate: "06-21", endDate: "06-21" },
  { name: "Independence Day", startDate: "07-04", endDate: "07-04" },
  { name: "Labor Day", startDate: "09-07", endDate: "09-07" },
  { name: "Columbus Day / Indigenous Peoples' Day", startDate: "10-12", endDate: "10-12" },
  { name: "Halloween", startDate: "10-31", endDate: "10-31" },
  { name: "Veterans Day", startDate: "11-11", endDate: "11-11" },
  { name: "Thanksgiving", startDate: "11-26", endDate: "11-26" },
  { name: "Day after Thanksgiving", startDate: "11-27", endDate: "11-27" },
  { name: "Christmas Eve", startDate: "12-24", endDate: "12-24" },
  { name: "Christmas Day", startDate: "12-25", endDate: "12-25" },
  { name: "New Year's Eve", startDate: "12-31", endDate: "12-31" },
  { name: OTHER_PUBLIC_HOLIDAY_NAME },
];

export function findUsPublicHoliday(
  name: string
): (typeof US_PUBLIC_HOLIDAY_CATALOG)[number] | undefined {
  const needle = name.trim().toLowerCase();
  return US_PUBLIC_HOLIDAY_CATALOG.find(
    (entry) => entry.name.toLowerCase() === needle
  );
}

export function isOtherPublicHoliday(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === OTHER_PUBLIC_HOLIDAY_NAME.toLowerCase() || n === "other holiday";
}

/** @deprecated Prefer studio holidays from settings; kept for fallbacks. */
export const US_HOLIDAYS = DEFAULT_HOLIDAY_NAMES;

export type StudioHoliday = {
  id: string;
  name: string;
  /** Inclusive annual start as MM-DD (year applied when assigning time off) */
  startDate: string;
  /** Inclusive annual end as MM-DD */
  endDate: string;
  /** When true (default), holiday applies to every producer */
  appliesToAll: boolean;
  /** Producer ids when appliesToAll is false */
  producerIds: string[];
};

/** Leap-year reference used for month/day calendar picking. */
export const HOLIDAY_MONTH_DAY_REF_YEAR = 2000;

const MONTH_DAY_RE = /^\d{2}-\d{2}$/;
const FULL_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toMonthDay(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (MONTH_DAY_RE.test(trimmed)) return trimmed;
  if (FULL_ISO_RE.test(trimmed)) return trimmed.slice(5);
  return "";
}

export function monthDayToReferenceIso(monthDay: string): string {
  const md = toMonthDay(monthDay) || "01-01";
  return `${HOLIDAY_MONTH_DAY_REF_YEAR}-${md}`;
}

/** Display month + day with no year (e.g. "Jan 1"). */
export function formatMonthDayLabel(monthDay: string): string {
  const md = toMonthDay(monthDay);
  if (!md) return "—";
  const [m, d] = md.split("-").map(Number);
  return new Date(HOLIDAY_MONTH_DAY_REF_YEAR, m - 1, d).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" }
  );
}

/** Personal time-off reason labels (no dates — chosen when assigning time off). */
export type StudioPersonalReason = {
  id: string;
  name: string;
  /** When false, hidden from the personal reason dropdown */
  enabled: boolean;
  /** Locked “Other” row — always available; cannot be removed or disabled */
  isOther?: boolean;
};

/** Reference month/day patterns (floating holidays use a typical occurrence). */
function defaultMonthDays(): Record<string, { start: string; end: string }> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = (month: number, day: number) => `${pad(month)}-${pad(day)}`;
  // Approximate floating holidays with common mid-month weekdays.
  return {
    "New Year's Day": { start: d(1, 1), end: d(1, 1) },
    "Martin Luther King Jr. Day": { start: d(1, 19), end: d(1, 19) },
    "Presidents' Day": { start: d(2, 16), end: d(2, 16) },
    "Memorial Day": { start: d(5, 25), end: d(5, 25) },
    Juneteenth: { start: d(6, 19), end: d(6, 19) },
    "Independence Day": { start: d(7, 4), end: d(7, 4) },
    "Labor Day": { start: d(9, 7), end: d(9, 7) },
    "Columbus Day / Indigenous Peoples' Day": { start: d(10, 12), end: d(10, 12) },
    "Veterans Day": { start: d(11, 11), end: d(11, 11) },
    Thanksgiving: { start: d(11, 26), end: d(11, 26) },
    "Day after Thanksgiving": { start: d(11, 27), end: d(11, 27) },
    "Christmas Eve": { start: d(12, 24), end: d(12, 24) },
    "Christmas Day": { start: d(12, 25), end: d(12, 25) },
    "New Year's Eve": { start: d(12, 31), end: d(12, 31) },
    "Other holiday": { start: d(1, 1), end: d(1, 1) },
  };
}

export function createDefaultStudioHolidays(): StudioHoliday[] {
  const dates = defaultMonthDays();
  return DEFAULT_HOLIDAY_NAMES.map((name, index) => {
    const range = dates[name] ?? { start: "01-01", end: "01-01" };
    return {
      id: `holiday-default-${index + 1}`,
      name,
      startDate: range.start,
      endDate: range.end,
      appliesToAll: true,
      producerIds: [],
    };
  });
}

export function normalizeStudioHoliday(
  raw: Partial<StudioHoliday> & { name: string }
): StudioHoliday {
  const todayMd = toMonthDay(isoFromLocalDate(new Date())) || "01-01";
  const start = toMonthDay(raw.startDate) || todayMd;
  const end = toMonthDay(raw.endDate) || start;
  const appliesToAll = raw.appliesToAll !== false;
  const producerIds = Array.isArray(raw.producerIds)
    ? [
        ...new Set(
          raw.producerIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        ),
      ]
    : [];
  return {
    id:
      raw.id ||
      `holiday-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: raw.name.trim(),
    startDate: start,
    endDate: end,
    appliesToAll,
    producerIds: appliesToAll ? [] : producerIds,
  };
}

export function createDefaultPersonalReasons(): StudioPersonalReason[] {
  return PERSONAL_TIME_OFF_REASONS.map((name, index) => ({
    id: `personal-default-${index + 1}`,
    name,
    enabled: true,
    isOther: name === OTHER_PERSONAL_REASON_NAME,
  }));
}

export function normalizeStudioPersonalReason(
  raw: Partial<StudioPersonalReason> & { name: string }
): StudioPersonalReason {
  const name = (raw.name || "").trim() || OTHER_PERSONAL_REASON_NAME;
  const isOther =
    Boolean(raw.isOther) ||
    name.toLowerCase() === OTHER_PERSONAL_REASON_NAME.toLowerCase();
  return {
    id:
      raw.id ||
      `personal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: isOther && !raw.name?.trim() ? OTHER_PERSONAL_REASON_NAME : name,
    enabled: isOther ? true : raw.enabled !== false,
    isOther: isOther || undefined,
  };
}

/** Ensure stored lists always include an enabled “Other” row. */
export function ensurePersonalReasonsList(
  reasons: StudioPersonalReason[]
): StudioPersonalReason[] {
  const normalized = reasons.map((entry) =>
    normalizeStudioPersonalReason(entry)
  );
  const hasOther = normalized.some((entry) => entry.isOther);
  if (hasOther) {
    return normalized.map((entry) =>
      entry.isOther ? { ...entry, enabled: true } : entry
    );
  }
  return [
    ...normalized,
    {
      id: `personal-other-${Date.now()}`,
      name: OTHER_PERSONAL_REASON_NAME,
      enabled: true,
      isOther: true,
    },
  ];
}

export function enabledPersonalReasonNames(
  reasons: StudioPersonalReason[]
): string[] {
  return ensurePersonalReasonsList(reasons)
    .filter((entry) => entry.enabled)
    .map((entry) => entry.name);
}

/**
 * Apply an annual MM-DD holiday range to concrete YYYY-MM-DD dates.
 * Uses the next occurrence relative to today (current year if still upcoming).
 */
/** All calendar dates for one studio holiday in a given year (inclusive). */
export function expandStudioHolidayDatesForYear(
  holiday: StudioHoliday,
  year: number
): string[] {
  const startMd = toMonthDay(holiday.startDate);
  const endMd = toMonthDay(holiday.endDate || holiday.startDate);
  if (!startMd) return [];

  const crossesYear = Boolean(endMd && endMd < startMd);
  const endYear = crossesYear ? year + 1 : year;
  const startDate = parseIsoToLocalDate(`${year}-${startMd}`);
  const endDate = parseIsoToLocalDate(`${endYear}-${endMd || startMd}`);
  if (!startDate || !endDate) return [];

  const out: string[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(endDate);
  last.setHours(0, 0, 0, 0);
  let guard = 0;
  while (cursor <= last && guard < 400) {
    out.push(isoFromLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out;
}

function parseIsoToLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Studio holiday dates between minIso and maxIso (inclusive). */
export function studioHolidayIsoSetInRange(
  holidays: StudioHoliday[],
  minIso: string,
  maxIso: string,
  producerId?: string
): Set<string> {
  const minYear = Number(minIso.slice(0, 4));
  const maxYear = Number(maxIso.slice(0, 4));
  const set = new Set<string>();
  for (let year = minYear; year <= maxYear + 1; year += 1) {
    for (const holiday of holidays) {
      if (
        producerId &&
        !holidayAppliesToProducer(holiday, producerId)
      ) {
        continue;
      }
      for (const iso of expandStudioHolidayDatesForYear(holiday, year)) {
        if (iso >= minIso && iso <= maxIso) set.add(iso);
      }
    }
  }
  return set;
}

export function holidayAppliesToProducer(
  holiday: StudioHoliday,
  producerId: string
): boolean {
  if (holiday.appliesToAll !== false) return true;
  const id = producerId.trim();
  if (!id) return false;
  return (holiday.producerIds ?? []).includes(id);
}

export function holidaysForProducer(
  holidays: StudioHoliday[],
  producerId: string
): StudioHoliday[] {
  return holidays.filter((holiday) =>
    holidayAppliesToProducer(holiday, producerId)
  );
}

export function isStudioHolidayIso(
  iso: string,
  holidays: StudioHoliday[],
  producerId?: string
): boolean {
  return studioHolidayNamesForIso(iso, holidays, producerId).length > 0;
}

/** Holiday names that cover this calendar date (may be more than one). */
export function studioHolidayNamesForIso(
  iso: string,
  holidays: StudioHoliday[],
  producerId?: string
): string[] {
  const year = Number(iso.slice(0, 4));
  const names: string[] = [];
  for (const holiday of holidays) {
    if (
      producerId &&
      !holidayAppliesToProducer(holiday, producerId)
    ) {
      continue;
    }
    const covers =
      expandStudioHolidayDatesForYear(holiday, year).includes(iso) ||
      expandStudioHolidayDatesForYear(holiday, year - 1).includes(iso);
    if (covers) names.push(holiday.name);
  }
  return names;
}

export function resolveHolidayDatesForToday(
  holiday: StudioHoliday,
  todayIso = isoFromLocalDate(new Date())
): { startDate: string; endDate: string } {
  const startMd = toMonthDay(holiday.startDate);
  const endMd = toMonthDay(holiday.endDate || holiday.startDate);
  if (!startMd) {
    return { startDate: todayIso, endDate: todayIso };
  }

  const crossesYear = Boolean(endMd && endMd < startMd);
  const startRef = new Date(`${HOLIDAY_MONTH_DAY_REF_YEAR}-${startMd}T12:00:00`);
  const endRef = new Date(
    `${HOLIDAY_MONTH_DAY_REF_YEAR + (crossesYear ? 1 : 0)}-${endMd || startMd}T12:00:00`
  );
  const durationDays = Math.max(
    0,
    Math.round((endRef.getTime() - startRef.getTime()) / 86_400_000)
  );

  const todayYear = Number(todayIso.slice(0, 4));
  let year = todayYear;
  let start = `${year}-${startMd}`;
  while (start < todayIso) {
    year += 1;
    start = `${year}-${startMd}`;
  }

  const resolvedEnd = new Date(`${start}T12:00:00`);
  resolvedEnd.setDate(resolvedEnd.getDate() + durationDays);

  return {
    startDate: start,
    endDate: isoFromLocalDate(resolvedEnd),
  };
}

export function findStudioHolidayByName(
  holidays: StudioHoliday[],
  name: string
): StudioHoliday | undefined {
  const needle = name.trim().toLowerCase();
  return holidays.find((h) => h.name.trim().toLowerCase() === needle);
}

export function reasonsForTimeOffType(
  type: "holiday" | "personal",
  holidays?: StudioHoliday[],
  personalReasons?: StudioPersonalReason[]
): readonly string[] {
  if (type === "personal") {
    if (personalReasons && personalReasons.length > 0) {
      return enabledPersonalReasonNames(personalReasons);
    }
    return PERSONAL_TIME_OFF_REASONS;
  }
  if (holidays && holidays.length > 0) {
    return holidays.map((h) => h.name);
  }
  return DEFAULT_HOLIDAY_NAMES;
}

export function defaultReasonForTimeOffType(
  type: "holiday" | "personal",
  holidays?: StudioHoliday[],
  personalReasons?: StudioPersonalReason[]
): string {
  return reasonsForTimeOffType(type, holidays, personalReasons)[0] ?? "";
}

export function producerHasHoliday(
  producer: { timeOff: { type: string; reason: string }[] },
  holidayName: string
): boolean {
  const needle = holidayName.trim().toLowerCase();
  return producer.timeOff.some(
    (entry) =>
      entry.type === "holiday" && entry.reason.trim().toLowerCase() === needle
  );
}
