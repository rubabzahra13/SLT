export type DateFilterValue = {
  type:
    | "all"
    | "thisWeek"
    | "last30Days"
    | "thisMonth"
    | "month"
    | "year"
    | "custom";
  value?: string | { start: string; end: string } | null;
};

export type DateBounds = {
  start: Date | null;
  end: Date | null;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  return startOfDay(start);
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

function parseIsoDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function calculateDateBounds(
  type: DateFilterValue["type"],
  value?: DateFilterValue["value"]
): DateBounds {
  const now = new Date();

  switch (type) {
    case "all":
      return { start: null, end: null };
    case "thisWeek":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "last30Days": {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      return { start: startOfDay(past), end: endOfDay(now) };
    }
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "month": {
      if (!value || typeof value !== "string") return { start: null, end: null };
      const [yearStr, monthStr] = value.split("-");
      const y = Number(yearStr);
      const m = Number(monthStr) - 1;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "year": {
      if (!value || typeof value !== "string") return { start: null, end: null };
      const y = Number(value);
      return {
        start: startOfDay(new Date(y, 0, 1)),
        end: endOfDay(new Date(y, 11, 31)),
      };
    }
    case "custom": {
      if (!value || typeof value !== "object" || !value.start || !value.end) {
        return { start: null, end: null };
      }
      const start = parseIsoDate(value.start);
      const end = parseIsoDate(value.end);
      if (!start || !end) return { start: null, end: null };
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    default:
      return { start: null, end: null };
  }
}

export function getDateFilterLabel(filter: DateFilterValue): string {
  if (!filter || filter.type === "all") return "All time";
  if (filter.type === "thisWeek") return "This week";
  if (filter.type === "last30Days") return "Last 30 days";
  if (filter.type === "thisMonth") return "This month";
  if (filter.type === "month" && typeof filter.value === "string") {
    const [y, m] = filter.value.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  if (filter.type === "year" && typeof filter.value === "string") {
    return filter.value;
  }
  if (
    filter.type === "custom" &&
    filter.value &&
    typeof filter.value === "object"
  ) {
    return `${formatDisplayDate(filter.value.start)} - ${formatDisplayDate(filter.value.end)}`;
  }
  return "Filter by date";
}

export function isDateInBounds(iso: string, bounds: DateBounds): boolean {
  if (!bounds.start && !bounds.end) return true;
  const date = parseIsoDate(iso);
  if (!date) return false;
  if (bounds.start && date < bounds.start) return false;
  if (bounds.end && date > bounds.end) return false;
  return true;
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export { MONTHS, parseIsoDate };
