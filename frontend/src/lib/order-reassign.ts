import type { MTDRecord } from "@/types";

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
    status: "active",
    ...completeDataFields(),
  };
}

/** Clear assignment after deleting the producer immediately (no pending-delete token). */
export function patchForReassignProducerRemoved(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: "Reassign: producer deleted",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
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
