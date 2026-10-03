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
