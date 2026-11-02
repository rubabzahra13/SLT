import type { MTDRecord, Order } from "@/types";

/** Mark all collection toggles collected so Data lands as Complete on Orders. */
function completeDataFields(): Partial<MTDRecord> {
  const collectionStates = {
    mix: true,
    time_of_mix: true,
    cs: true,
    eight_count: true,
    video: true,
    songs: true,
    notes: true,
    compliancy: true,
    form: true,
  };
  return {
    collectionStates,
    haveSongs: "HAVE SONGS",
    eightCountSheet: "HAVE CS",
  };
}

/** Clear assignment/schedule and flag Orders as Reassign: extra day removed. */
export function patchForReassignExtraDayRemoved(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: "Reassign: Extra day removed",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    status: "active",
    ...completeDataFields(),
  };
}

/** Clear assignment/schedule and flag Orders as Reassign: leave. */
export function patchForReassignLeave(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: "Reassign: Off day",
    assignedProducer: null,
    editorRequest: "FA",
    // Empty clears local UI; API layers coerce "" → null for Date columns.
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    producerEmailSentTo: null,
    status: "active",
    ...completeDataFields(),
  };
}

/** Clear assignment/schedule and flag Orders as Reassign: rush order. */
export function patchForReassignRush(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: "Reassign: rush order",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    producerEmailSentTo: null,
    status: "active",
    ...completeDataFields(),
  };
}

export type PendingDeletedProducer = {
  id: string;
  name: string;
  initials: string;
};

const DELETE_PRODUCER_STATUS_PREFIX = "Reassign: Delete producer";

function encodePendingDeletedProducer(
  producer: PendingDeletedProducer
): string {
  const token = [producer.id, producer.name, producer.initials]
    .map((part) => encodeURIComponent(part || ""))
    .join("|");
  return `${DELETE_PRODUCER_STATUS_PREFIX}|${token}`;
}

/** Parse the producer pending deletion encoded in orderStatus. */
export function parsePendingDeletedProducer(
  orderStatus?: string | null
): PendingDeletedProducer | null {
  const raw = String(orderStatus || "").trim();
  if (!raw.toLowerCase().startsWith(DELETE_PRODUCER_STATUS_PREFIX.toLowerCase())) {
    return null;
  }
  const payload = raw.slice(DELETE_PRODUCER_STATUS_PREFIX.length).replace(/^\|/, "");
  if (!payload) return null;
  const [id = "", name = "", initials = ""] = payload
    .split("|")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
  if (!id && !name) return null;
  return { id, name, initials };
}

/** Clear assignment/schedule when the assigned producer is queued for deletion. */
export function patchForReassignProducerDeletion(
  producer: PendingDeletedProducer
): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: encodePendingDeletedProducer(producer),
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    producerEmailSentTo: null,
    status: "active",
    ...completeDataFields(),
  };
}

/** Clear assignment after deleting the producer immediately (no pending-delete token). */
export function patchForReassignProducerRemoved(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    // Must match ORDER_REASSIGN_STATUS.producer_deletion / parseReassignReason.
    orderStatus: "Reassign: Producer deleted",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    producerEmailSentTo: null,
    status: "active",
    ...completeDataFields(),
  };
}

/** Clear assignment when a producer category/rate row is removed. */
export function patchForReassignCategoryRemoved(
  category?: string
): Partial<MTDRecord> {
  const label = category?.trim();
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: label
      ? `Reassign: category removed (${label})`
      : "Reassign: category removed",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    producerEmailSentTo: null,
    status: "active",
    ...completeDataFields(),
  };
}

function orderUpdatedAtMs(order: Order): number {
  const raw = (order as Order & { updatedAt?: string | null }).updatedAt;
  if (!raw) return 0;
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * SSE / peer / boot merges must not flicker Reassign rows.
 * - Incoming reassign wins (cleared producer + flag).
 * - Local reassign wins over a stale peer that still has the old producer.
 * - Completing reassign only when peer cleared the flag, set a producer, and
 *   is at least as new as the local row.
 */
export function mergeIncomingOrderReassignFields(
  incoming: Order,
  local: Order
): Partial<Order> {
  const incomingAssigned = String(incoming.assignedProducer || "").trim();
  const incomingAwaiting = Boolean(incoming.isReassigned);
  const localAwaiting = Boolean(local.isReassigned);

  if (incomingAwaiting) {
    return {
      isReassigned: true,
      assignedProducer: null,
      mixStartDate: incoming.mixStartDate || "",
      mixEndDate: incoming.mixEndDate || undefined,
      orderStatus: incoming.orderStatus || local.orderStatus,
      producerEmailSentAt: null,
      producerEmailSentTo: null,
    };
  }

  if (localAwaiting) {
    const peerCompleted =
      Boolean(incomingAssigned) &&
      orderUpdatedAtMs(incoming) >= orderUpdatedAtMs(local);
    if (peerCompleted) {
      return {
        isReassigned: false,
        assignedProducer: incomingAssigned,
        mixStartDate: incoming.mixStartDate || "",
        mixEndDate: incoming.mixEndDate || undefined,
        orderStatus: incoming.orderStatus,
      };
    }
    return {
      isReassigned: true,
      assignedProducer: null,
      mixStartDate: "",
      mixEndDate: undefined,
      orderStatus: local.orderStatus || incoming.orderStatus,
      producerEmailSentAt: null,
      producerEmailSentTo: null,
    };
  }

  return {
    isReassigned: false,
    assignedProducer: incomingAssigned || null,
    mixStartDate:
      incoming.mixStartDate !== undefined && incoming.mixStartDate !== null
        ? incoming.mixStartDate
        : local.mixStartDate,
    mixEndDate:
      incoming.mixEndDate !== undefined && incoming.mixEndDate !== null
        ? incoming.mixEndDate
        : local.mixEndDate,
    orderStatus: incoming.orderStatus ?? local.orderStatus,
  };
}
