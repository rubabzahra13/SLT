import type { MTDRecord, Order } from "@/types";

type AssignPageSeed = {
  id: string;
  record: MTDRecord;
  order: Order | null;
  at: number;
};

const TTL_MS = 5 * 60 * 1000;
const SS_PREFIX = "slt_assign_seed_v1:";

let memory: AssignPageSeed | null = null;

function storageKey(id: string): string {
  return `${SS_PREFIX}${id}`;
}

/** Stash the board row before navigating to /orders/[id]/assign. */
export function seedAssignPage(
  id: string,
  record: MTDRecord,
  order: Order | null | undefined
): void {
  const next: AssignPageSeed = {
    id,
    record,
    order: order ?? null,
    at: Date.now(),
  };
  memory = next;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      storageKey(id),
      JSON.stringify({
        record,
        order: order ?? null,
        at: next.at,
      })
    );
  } catch {
    /* quota / private mode */
  }
}

/** Keep seed aligned after assign/unassign so remounts don't resurrect CH + dates. */
export function patchAssignPageSeed(
  id: string,
  patch: {
    record?: Partial<MTDRecord>;
    order?: Partial<Order> | null;
  }
): void {
  const prev = readAssignPageSeed(id);
  if (!prev) return;
  seedAssignPage(
    id,
    { ...prev.record, ...(patch.record || {}) },
    patch.order === null
      ? null
      : ({ ...(prev.order || {}), ...(patch.order || {}) } as Order)
  );
}

/** Instant paint for Assign — prefer memory, then sessionStorage. */
export function readAssignPageSeed(
  id: string
): { record: MTDRecord; order: Order | null } | null {
  const now = Date.now();
  if (memory && memory.id === id && now - memory.at < TTL_MS) {
    return { record: memory.record, order: memory.order };
  }
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      record?: MTDRecord;
      order?: Order | null;
      at?: number;
    };
    if (!parsed?.record || typeof parsed.at !== "number") return null;
    if (now - parsed.at >= TTL_MS) {
      sessionStorage.removeItem(storageKey(id));
      return null;
    }
    memory = {
      id,
      record: parsed.record,
      order: parsed.order ?? null,
      at: parsed.at,
    };
    return { record: parsed.record, order: parsed.order ?? null };
  } catch {
    return null;
  }
}
