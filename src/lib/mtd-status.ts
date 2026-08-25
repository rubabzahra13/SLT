import type { MTDRecord, MTDRecordStatus } from "@/types";

export function inferMTDRecordStatus(rec: MTDRecord): MTDRecordStatus {
  if (rec.recordStatus) return rec.recordStatus;
  if (rec.status === "completed") return "Completed";
  if (rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES") {
    return "Outsourced";
  }
  if (rec.assignedProducer && rec.status === "active") return "Ongoing";
  if (rec.needsAttention || rec.status === "needs_attention") {
    return "Waiting for Data";
  }
  return "Waiting for Data";
}

export function legacyStatusFromRecordStatus(
  recordStatus: MTDRecordStatus
): MTDRecord["status"] {
  switch (recordStatus) {
    case "Completed":
      return "completed";
    case "Outsourced":
      return "outsourced";
    case "Ongoing":
      return "active";
    case "Waiting for Data":
    default:
      return "needs_attention";
  }
}

export function patchFromRecordStatus(
  recordStatus: MTDRecordStatus
): Pick<MTDRecord, "recordStatus" | "status"> {
  return {
    recordStatus,
    status: legacyStatusFromRecordStatus(recordStatus),
  };
}
