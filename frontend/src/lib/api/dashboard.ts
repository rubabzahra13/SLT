import { apiClient } from "@/lib/api/client";

export type DashboardOrdersInDay = {
  iso: string;
  count: number;
  is_today?: boolean;
};

export type DashboardCategoryPipeline = {
  category: string;
  count: number;
};

export type DashboardMixOpsApi = {
  overdue: number;
  starting_today: number;
  due_this_week: number;
  missing_data: number;
  on_track: number;
};

/** Slim assigned span — enough for team / week capacity without full MTD. */
export type DashboardOpenBooking = {
  producer: string;
  start?: string;
  end?: string;
  /** "yes" = Music To Do / live MTD; "no" = Orders-tab Assigned (pre-MTD). */
  in_mtd?: "yes" | "no" | string;
};

export type DashboardPulseApi = {
  unassigned: number;
  /** Pre-MTD Orders tab total (exclude open flags) — sidebar badge. */
  orders_tab?: number;
  in_queue: number;
  todays_mixes: number;
  outsourced: number;
  mtd_open?: number;
  /** MTD open + Orders-tab Assigned with dates (capacity / timeline / today's mixes). */
  open_assigned?: number;
  /** Unpaid payroll rows — sidebar badge. */
  payroll_open?: number;
  orders_in_total?: number;
  orders_in_by_day?: DashboardOrdersInDay[];
  overdue?: number;
  starting_today?: number;
  due_this_week?: number;
  mix_ops?: DashboardMixOpsApi;
  category_pipeline?: DashboardCategoryPipeline[];
  open_bookings?: DashboardOpenBooking[];
  cached?: boolean;
  as_of_day?: string;
};

/** Soft-refresh window — still paint after this, then revalidate. */
const PULSE_FRESH_MS = 60_000;
/** Keep last pulse for return-to-Dashboard / sidebar (no blank KPIs). */
const PULSE_GC_MS = 5 * 60_000;
const PULSE_SS_KEY = "slt_dashboard_pulse_v1";

let pulseMem: { at: number; pulse: DashboardPulseApi } | null = null;
let pulseInflight: Promise<DashboardPulseApi> | null = null;

function readSessionPulse(): { at: number; pulse: DashboardPulseApi } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PULSE_SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; pulse?: DashboardPulseApi };
    if (!parsed?.pulse || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > PULSE_GC_MS) return null;
    return { at: parsed.at, pulse: parsed.pulse };
  } catch {
    return null;
  }
}

function writeSessionPulse(pulse: DashboardPulseApi, at: number) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PULSE_SS_KEY, JSON.stringify({ at, pulse }));
  } catch {
    /* quota */
  }
}

function hydratePulseMem(): typeof pulseMem {
  if (pulseMem) {
    if (Date.now() - pulseMem.at > PULSE_GC_MS) {
      pulseMem = null;
      return null;
    }
    return pulseMem;
  }
  const session = readSessionPulse();
  if (!session) return null;
  pulseMem = session;
  return pulseMem;
}

/**
 * Last known pulse within GC window (may be stale).
 * Sidebar uses this so board visits don't re-hit /pulse every time.
 */
export function readDashboardPulseCache(): DashboardPulseApi | null {
  return hydratePulseMem()?.pulse ?? null;
}

export function isDashboardPulseFresh(): boolean {
  const hit = hydratePulseMem();
  return Boolean(hit && Date.now() - hit.at < PULSE_FRESH_MS);
}

/**
 * Instant Dashboard paint helper — includes freshness for soft revalidate.
 */
export function readDashboardPulseForPaint(): {
  pulse: DashboardPulseApi;
  fresh: boolean;
} | null {
  const hit = hydratePulseMem();
  if (!hit) return null;
  return {
    pulse: hit.pulse,
    fresh: Date.now() - hit.at < PULSE_FRESH_MS,
  };
}

/**
 * Drop one assigned span from the cached pulse (no refetch).
 * Schedule view paints these stubs; clearing the Orders row is not enough.
 */
export function dropDashboardPulseOpenBooking(span: {
  producer: string;
  start?: string;
  end?: string;
}): () => void {
  const noop = () => undefined;
  const pulse = readDashboardPulseCache();
  if (!pulse?.open_bookings?.length) return noop;
  const producer = span.producer.trim().toUpperCase();
  const start = (span.start || "").trim();
  const end = (span.end || "").trim();
  if (!producer || !start) return noop;
  let removedBooking: DashboardOpenBooking | null = null;
  const open_bookings = pulse.open_bookings.filter((booking) => {
    if (removedBooking) return true;
    const same =
      (booking.producer || "").trim().toUpperCase() === producer &&
      (booking.start || "").trim() === start &&
      (booking.end || "").trim() === end;
    if (!same) return true;
    removedBooking = booking;
    return false;
  });
  if (!removedBooking) return noop;
  const dropped = removedBooking;
  writeDashboardPulseCache({
    ...pulse,
    open_bookings,
    ...(typeof pulse.open_assigned === "number"
      ? { open_assigned: Math.max(0, pulse.open_assigned - 1) }
      : {}),
  });
  return () => {
    const current = readDashboardPulseCache();
    if (!current) return;
    writeDashboardPulseCache({
      ...current,
      open_bookings: [...(current.open_bookings || []), dropped],
      ...(typeof current.open_assigned === "number"
        ? { open_assigned: current.open_assigned + 1 }
        : {}),
    });
  };
}

export function writeDashboardPulseCache(pulse: DashboardPulseApi): void {
  const at = Date.now();
  pulseMem = { at, pulse };
  writeSessionPulse(pulse, at);
}

export function invalidateDashboardPulseCache(): void {
  pulseMem = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(PULSE_SS_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** Home KPIs + chart aggregates — server-cached; invalidate on order/MTD writes. */
export async function fetchDashboardPulseApi(): Promise<DashboardPulseApi> {
  if (pulseInflight) return pulseInflight;
  // Pulse can wait behind Magento/board traffic; don't use the 20s default abort.
  pulseInflight = apiClient
    .get<DashboardPulseApi>("/api/dashboard/pulse", {
      timeoutMs: 45_000,
    })
    .then((pulse) => {
      writeDashboardPulseCache(pulse);
      return pulse;
    })
    .finally(() => {
      pulseInflight = null;
    });
  return pulseInflight;
}

/** Hover/sidebar warm — no-op when fresh. */
export function warmDashboardPulse(): void {
  if (isDashboardPulseFresh()) return;
  void fetchDashboardPulseApi().catch(() => {
    /* best-effort */
  });
}
