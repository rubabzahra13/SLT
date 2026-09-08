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
  };
}

export function getPayrollRecords(records: MTDRecord[]): MTDRecord[] {
  return records.filter((rec) => rec.inPayroll);
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

  if (localRecord?.inPayroll && !backendRecord.inPayroll) {
    merged = {
      ...merged,
      inPayroll: true,
      recordStatus: localRecord.recordStatus ?? merged.recordStatus,
      status: localRecord.status ?? merged.status,
      completedAt: localRecord.completedAt ?? merged.completedAt,
      payrollFinalized:
        localRecord.payrollFinalized ?? merged.payrollFinalized,
      producerPayout: localRecord.producerPayout ?? merged.producerPayout,
      sltPortion: localRecord.sltPortion ?? merged.sltPortion,
      rateUsed: localRecord.rateUsed ?? merged.rateUsed,
      rateSource: localRecord.rateSource ?? merged.rateSource,
      finalCustomerPrice:
        localRecord.finalCustomerPrice ?? merged.finalCustomerPrice,
      systemCalculatedCustomerPrice:
        localRecord.systemCalculatedCustomerPrice ??
        merged.systemCalculatedCustomerPrice,
      finalCustomerPriceOverridden:
        localRecord.finalCustomerPriceOverridden ??
        merged.finalCustomerPriceOverridden,
      price: localRecord.price ?? merged.price,
      payrollBreakdown:
        localRecord.payrollBreakdown ?? merged.payrollBreakdown,
    };
  }

  if (localRecord?.assignedProducer?.trim() && !merged.assignedProducer?.trim()) {
    merged = {
      ...merged,
      assignedProducer: localRecord.assignedProducer,
      editorRequest: localRecord.editorRequest ?? merged.editorRequest,
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
