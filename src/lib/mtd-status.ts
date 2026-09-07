import type { MTDRecord, MTDRecordStatus } from "@/types";
import { MTD_RECORD_STATUS_OPTIONS } from "@/types";

const VALID_RECORD_STATUSES = new Set<string>(MTD_RECORD_STATUS_OPTIONS);

function normalizeRecordStatus(value: string | undefined): MTDRecordStatus | undefined {
  if (!value) return undefined;
  if (value === "In Production" || value === "In Queue") return "Ongoing";
  if (VALID_RECORD_STATUSES.has(value)) return value as MTDRecordStatus;
  return undefined;
}

export function inferMTDRecordStatus(rec: MTDRecord): MTDRecordStatus {
  const normalized = normalizeRecordStatus(rec.recordStatus);
  if (normalized) return normalized;
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
