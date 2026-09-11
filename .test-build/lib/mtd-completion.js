"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionRequirements = getCompletionRequirements;
exports.getStatusRequirements = getStatusRequirements;
exports.checkStatusRequirements = checkStatusRequirements;
exports.canCompleteForPayroll = canCompleteForPayroll;
exports.canSetOngoingOrOutsourced = canSetOngoingOrOutsourced;
exports.patchMoveToPayroll = patchMoveToPayroll;
exports.patchReturnFromPayroll = patchReturnFromPayroll;
exports.getPayrollRecords = getPayrollRecords;
exports.getMTDBoardRecords = getMTDBoardRecords;
exports.mergeLocalMtdRecordFields = mergeLocalMtdRecordFields;
exports.preserveLocalPayrollFields = preserveLocalPayrollFields;
const dates_1 = require("@/lib/dates");
const mtd_status_1 = require("@/lib/mtd-status");
function getCompletionRequirements(rec) {
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
            met: Boolean((0, dates_1.toIsoDateString)(rec.mixStartDate)),
        },
        {
            key: "mixEndDate",
            label: "Mix end date",
            met: Boolean((0, dates_1.toIsoDateString)(rec.mixEndDate ?? "")),
        },
    ];
}
function getStatusRequirements(rec, keys) {
    const keySet = new Set(keys);
    return getCompletionRequirements(rec).filter((item) => keySet.has(item.key));
}
function checkStatusRequirements(rec, keys) {
    const requirements = getStatusRequirements(rec, keys);
    const missing = requirements.filter((item) => !item.met).map((item) => item.label);
    return {
        ready: missing.length === 0,
        missing,
        requirements,
    };
}
const COMPLETED_STATUS_KEYS = [
    "editor",
    "invoice",
    "mixStartDate",
    "mixEndDate",
];
const ASSIGNMENT_STATUS_KEYS = [
    "editor",
    "mixStartDate",
    "mixEndDate",
];
function canCompleteForPayroll(rec) {
    return checkStatusRequirements(rec, COMPLETED_STATUS_KEYS);
}
function canSetOngoingOrOutsourced(rec) {
    return checkStatusRequirements(rec, ASSIGNMENT_STATUS_KEYS);
}
function patchMoveToPayroll() {
    return {
        ...(0, mtd_status_1.patchFromRecordStatus)("Completed"),
        inPayroll: true,
        completedAt: new Date().toISOString(),
    };
}
function patchReturnFromPayroll() {
    return {
        inPayroll: false,
        recordStatus: "Ongoing",
        status: "active",
        completedAt: undefined,
    };
}
function getPayrollRecords(records) {
    return records.filter((rec) => rec.inPayroll);
}
function getMTDBoardRecords(records) {
    return records.filter((rec) => !rec.inPayroll);
}
/** Keep local MTD edits when backend reload races or has not persisted yet. */
function mergeLocalMtdRecordFields(backendRecord, localRecord) {
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
            payrollFinalized: localRecord.payrollFinalized ?? merged.payrollFinalized,
            producerPayout: localRecord.producerPayout ?? merged.producerPayout,
            sltPortion: localRecord.sltPortion ?? merged.sltPortion,
            rateUsed: localRecord.rateUsed ?? merged.rateUsed,
            rateSource: localRecord.rateSource ?? merged.rateSource,
            finalCustomerPrice: localRecord.finalCustomerPrice ?? merged.finalCustomerPrice,
            systemCalculatedCustomerPrice: localRecord.systemCalculatedCustomerPrice ??
                merged.systemCalculatedCustomerPrice,
            finalCustomerPriceOverridden: localRecord.finalCustomerPriceOverridden ??
                merged.finalCustomerPriceOverridden,
            price: localRecord.price ?? merged.price,
            payrollBreakdown: localRecord.payrollBreakdown ?? merged.payrollBreakdown,
        };
    }
    if (localRecord) {
        merged = {
            ...merged,
            assignedProducer: merged.assignedProducer?.trim() ||
                localRecord.assignedProducer?.trim() ||
                null,
            editorRequest: localRecord.editorRequest ?? merged.editorRequest,
            mixStartDate: localRecord.mixStartDate || merged.mixStartDate,
            mixEndDate: localRecord.mixEndDate || merged.mixEndDate,
            invoice: localRecord.invoice || merged.invoice,
            status: localRecord.status ?? merged.status,
            recordStatus: localRecord.recordStatus ?? merged.recordStatus,
        };
    }
    return merged;
}
/** @deprecated Use mergeLocalMtdRecordFields */
function preserveLocalPayrollFields(backendRecord, localRecord) {
    return mergeLocalMtdRecordFields(backendRecord, localRecord);
}
