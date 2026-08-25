import { toIsoDateString } from "@/lib/dates";
import { patchFromRecordStatus } from "@/lib/mtd-status";
import type { MTDRecord } from "@/types";

export type CompletionRequirement = {
  key: "editor" | "invoice" | "mixStartDate" | "mixEndDate";
  label: string;
  met: boolean;
};

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

export function canCompleteForPayroll(rec: MTDRecord): {
  ready: boolean;
  missing: string[];
  requirements: CompletionRequirement[];
} {
  const requirements = getCompletionRequirements(rec);
  const missing = requirements.filter((item) => !item.met).map((item) => item.label);
  return {
    ready: missing.length === 0,
    missing,
    requirements,
  };
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
