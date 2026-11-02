import { toIsoDateString } from "@/lib/dates";
import { patchFromRecordStatus } from "@/lib/mtd-status";
import type { MTDRecord } from "@/types";

export type CompletionRequirement = {
  key: "editor" | "invoice" | "mixStartDate" | "mixEndDate";
  label: string;
  met: boolean;
};

export type StatusRequirementKey = CompletionRequirement["key"];

export function getCompletionRequirements(rec: MTDRecord): CompletionRequirement[] {
  return [
    {
      key: "editor",
      label: "Editor assigned",
      met: Boolean(rec.assignedProducer?.trim()),
    },
    {
      key: "invoice",
      label: "Invoice #",
      met: Boolean(rec.invoice?.trim()),
    },
    {
      key: "mixStartDate",
      label: "Mix start date",
      met: Boolean(toIsoDateString(rec.mixStartDate)),
    },
    {
      key: "mixEndDate",
      label: "Mix end date",
      met: Boolean(toIsoDateString(rec.mixEndDate ?? "")),
    },
  ];
}

export function getStatusRequirements(
  rec: MTDRecord,
  keys: StatusRequirementKey[]
): CompletionRequirement[] {
  const keySet = new Set(keys);
  return getCompletionRequirements(rec).filter((item) => keySet.has(item.key));
}

export function checkStatusRequirements(
  rec: MTDRecord,
  keys: StatusRequirementKey[]
): {
  ready: boolean;
  missing: string[];
  requirements: CompletionRequirement[];
} {
  const requirements = getStatusRequirements(rec, keys);
  const missing = requirements.filter((item) => !item.met).map((item) => item.label);
  return {
    ready: missing.length === 0,
    missing,
    requirements,
  };
}

const COMPLETED_STATUS_KEYS: StatusRequirementKey[] = [
  "editor",
  "invoice",
  "mixStartDate",
  "mixEndDate",
];

const ASSIGNMENT_STATUS_KEYS: StatusRequirementKey[] = [
  "editor",
  "mixStartDate",
  "mixEndDate",
];

export function canCompleteForPayroll(rec: MTDRecord): {
  ready: boolean;
  missing: string[];
  requirements: CompletionRequirement[];
} {
  return checkStatusRequirements(rec, COMPLETED_STATUS_KEYS);
}

export function canSetOngoingOrOutsourced(rec: MTDRecord): {
  ready: boolean;
  missing: string[];
  requirements: CompletionRequirement[];
} {
  return checkStatusRequirements(rec, ASSIGNMENT_STATUS_KEYS);
}

export function patchMoveToPayroll(): Partial<MTDRecord> {
  return {
    ...patchFromRecordStatus("Completed"),
    inPayroll: true,
    completedAt: new Date().toISOString(),
  };
}

export function patchReturnFromPayroll(): Partial<MTDRecord> {
  return {
    inPayroll: false,
    recordStatus: "Ongoing",
    status: "active",
    completedAt: undefined,
    paidAt: null,
  };
}

export function patchMarkPayrollPaid(): Partial<MTDRecord> {
  return {
    inPayroll: true,
    status: "completed",
    recordStatus: "Completed",
    paidAt: new Date().toISOString(),
  };
}

function isPayrollMember(rec: MTDRecord): boolean {
  return (
    Boolean(rec.inPayroll) ||
    Boolean((rec as { in_payroll?: boolean }).in_payroll) ||
    rec.status === "completed" ||
    (rec as { recordStatus?: string }).recordStatus === "Completed"
  );
}

function isPayrollPaid(rec: MTDRecord): boolean {
  return Boolean(rec.paidAt || (rec as { paid_at?: string }).paid_at);
}

/** Active payroll (ready for payout): excludes Paid / Archive. */
export function getPayrollRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter((rec) => isPayrollMember(rec) && !isPayrollPaid(rec));
}

/** Paid mixes archived from View Payroll. */
export function getArchivedPayrollRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter((rec) => isPayrollMember(rec) && isPayrollPaid(rec));
}

export function getMTDBoardRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter((rec) => !rec.inPayroll);
}

/** Keep local MTD edits when backend reload races or has not persisted yet. */
export function mergeLocalMtdRecordFields(
  backendRecord: MTDRecord,
  localRecord: MTDRecord | undefined
): MTDRecord {
  let merged = backendRecord;

  if (localRecord?.inMTD !== undefined && backendRecord.inMTD === undefined) {
    merged = {
      ...merged,
      inMTD: localRecord.inMTD,
    };
  }

  if (localRecord?.inPayroll && !backendRecord.inPayroll) {
    merged = {
      ...merged,
      inPayroll: true,
      recordStatus: localRecord.recordStatus ?? merged.recordStatus,
      status: localRecord.status ?? merged.status,
      completedAt: localRecord.completedAt ?? merged.completedAt,
      finalCustomerPrice:
        localRecord.finalCustomerPrice ?? merged.finalCustomerPrice,
      finalCustomerPriceOverridden:
        localRecord.finalCustomerPriceOverridden ??
        merged.finalCustomerPriceOverridden,
      price: localRecord.price ?? merged.price,
    };
  }

  if (localRecord) {
    // Assignment is Order SoT. While awaiting reassign, never resurrect a
    // stale local producer (Move to Orders / Unassign cleared it). Backend
    // completing reassign (flag cleared + producer set) wins over local flag.
    const backendAssigned = merged.assignedProducer?.trim() || null;
    const backendAwaiting = Boolean(merged.isReassigned);
    const localAwaiting = Boolean(localRecord.isReassigned);
    const backendCompletedReassign =
      localAwaiting && !backendAwaiting && Boolean(backendAssigned);
    const awaitingReassign =
      backendAwaiting || (localAwaiting && !backendCompletedReassign);
    merged = {
      ...merged,
      assignedProducer: awaitingReassign
        ? null
        : backendAssigned ||
          localRecord.assignedProducer?.trim() ||
          null,
      editorRequest: localRecord.editorRequest ?? merged.editorRequest,
      mixStartDate: awaitingReassign
        ? merged.mixStartDate || ""
        : localRecord.mixStartDate || merged.mixStartDate,
      mixEndDate: awaitingReassign
        ? merged.mixEndDate || undefined
        : localRecord.mixEndDate || merged.mixEndDate,
      isReassigned: awaitingReassign ? true : false,
      orderStatus: awaitingReassign
        ? merged.orderStatus || localRecord.orderStatus
        : merged.orderStatus ?? localRecord.orderStatus,
      // Invoice is mtd_records SoT: prefer backend when present so edits stick.
      // Fall back to local only when SSE/boot returns empty (anti-wipe).
      invoice:
        (merged.invoice || "").trim() ||
        (localRecord.invoice || "").trim() ||
        "",
      status: localRecord.status ?? merged.status,
      recordStatus: localRecord.recordStatus ?? merged.recordStatus,
    };
  }

  return merged;
}

/** @deprecated Use mergeLocalMtdRecordFields */
export function preserveLocalPayrollFields(
  backendRecord: MTDRecord,
  localRecord: MTDRecord | undefined
): MTDRecord {
  return mergeLocalMtdRecordFields(backendRecord, localRecord);
}
