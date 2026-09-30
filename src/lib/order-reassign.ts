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
    collection_states: collectionStates,
    haveSongs: "HAVE SONGS",
    eightCountSheet: "HAVE CS",
  } as Partial<MTDRecord>;
}

/** Clear assignment/schedule and flag Orders as Reassign: leave. */
export function patchForReassignLeave(): Partial<MTDRecord> {
  return {
    inMTD: false,
    isReassigned: true,
    orderStatus: "Reassign: leave",
    order_status: "Reassign: leave",
    assignedProducer: null,
    editorRequest: "FA",
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
    order_status: "Reassign: rush order",
    assignedProducer: null,
    editorRequest: "FA",
    mixStartDate: "",
    mixEndDate: "",
    producerEmailSentAt: null,
    status: "active",
    ...completeDataFields(),
  };
}
