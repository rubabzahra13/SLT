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
