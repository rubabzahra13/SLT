import type { MTDRecord, Order } from "@/types";
import { producerKeysMatch } from "@/lib/producer-keys";

/** True when orderStatus still carries a Reassign:* reason label. */
export function isReassignOrderStatus(
  orderStatus?: string | null
): boolean {
  const raw = String(orderStatus || "").trim().toLowerCase();
  return Boolean(raw) && raw.startsWith("reassign");
}

/**
 * MTD → Orders reassign (and other reassign returns) clear producerEmailSentAt.
 * After a producer is assigned, mark-as-sent must stay available until mail is
 * stamped for *that* producer — even when a stale stamp for a prior producer
 * survived the move (or Assign cleared isReassigned but left Reassign:* status).
 */
export function orderAllowsProducerMailMarkAsSent(
  record: Pick<
    MTDRecord,
    | "isReassigned"
    | "orderStatus"
    | "producerEmailSentAt"
    | "producerEmailSentTo"
    | "assignedProducer"
  > | null
    | undefined,
  assignedProducerKey?: string | null
): boolean {
  if (!record) return false;
  const isReassignReturn =
    Boolean(record.isReassigned) || isReassignOrderStatus(record.orderStatus);
  if (!isReassignReturn) return false;

  const assigned = String(
    assignedProducerKey || record.assignedProducer || ""
  ).trim();
  const sentTo = String(record.producerEmailSentTo || "").trim();
  // Stamped for the current producer — mark-as-sent is done.
  if (
    record.producerEmailSentAt &&
    assigned &&
    sentTo &&
    producerKeysMatch(assigned, sentTo)
  ) {
    return false;
  }
  // Reassign return: show mark-as-sent whenever current producer isn't stamped
  // (including stale BE stamp after assigning CH).
  return true;
}

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
    // Clear sent stamp only; keep producerEmailSentTo so same-producer
    // reassign can mark-as-sent without a redundant email.
    producerEmailSentAt: null,
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
 * - Incoming reassign wins when it is at least as new as local (or local has
 *   no stamp yet).
 * - Local completed assign wins over a stale awaiting peer (post-assign flicker).
 * - Local awaiting wins over a stale peer that still has the old producer.
 * - Completing reassign only when peer cleared the flag, set a producer, and
 *   is at least as new as the local row (or local has no stamp).
 */
export function mergeIncomingOrderReassignFields(
  incoming: Order,
  local: Order
): Partial<Order> {
  const incomingAssigned = String(incoming.assignedProducer || "").trim();
  const localAssigned = String(local.assignedProducer || "").trim();
  const incomingAwaiting = Boolean(incoming.isReassigned);
  const localAwaiting = Boolean(local.isReassigned);
  const incomingMs = orderUpdatedAtMs(incoming);
  const localMs = orderUpdatedAtMs(local);
  // Missing local stamp → accept peer. Optimistic local stamps block older SSE.
  const incomingAsNewAsLocal = localMs === 0 || incomingMs >= localMs;

  if (incomingAwaiting) {
    // Fresh assign on this client: keep CH / dates until a newer awaiting
    // event (real Move-to-Orders) arrives.
    if (!localAwaiting && localAssigned && !incomingAsNewAsLocal) {
      return {
        isReassigned: false,
        assignedProducer: localAssigned,
        mixStartDate: local.mixStartDate || "",
        mixEndDate: local.mixEndDate || undefined,
        orderStatus: local.orderStatus,
        producerEmailSentAt: local.producerEmailSentAt ?? null,
        producerEmailSentTo: local.producerEmailSentTo ?? null,
        updatedAt: local.updatedAt ?? null,
      };
    }
    return {
      isReassigned: true,
      assignedProducer: null,
      mixStartDate: incoming.mixStartDate || "",
      mixEndDate: incoming.mixEndDate || undefined,
      orderStatus: incoming.orderStatus || local.orderStatus,
      status: "active",
      producerEmailSentAt: null,
      // Preserve last emailed producer unless the peer cleared it (deletion).
      producerEmailSentTo:
        incoming.producerEmailSentTo !== undefined
          ? incoming.producerEmailSentTo
          : local.producerEmailSentTo ?? null,
    };
  }

  if (localAwaiting) {
    // Stale pre-reassign echoes often still say status=in_mtd with the old
    // producer; that must not "complete" a local Move-to-Orders.
    const peerStillInMtd =
      String(incoming.status || "").toLowerCase() === "in_mtd";
    const peerCompleted =
      Boolean(incomingAssigned) && incomingAsNewAsLocal && !peerStillInMtd;
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
      // Drop stale in_mtd so Match / pre-MTD soft gate still see this manual.
      status: "active",
      producerEmailSentAt: null,
      producerEmailSentTo: local.producerEmailSentTo ?? null,
      updatedAt: local.updatedAt ?? null,
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
