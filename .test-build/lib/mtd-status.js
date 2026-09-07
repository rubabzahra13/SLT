"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferMTDRecordStatus = inferMTDRecordStatus;
exports.legacyStatusFromRecordStatus = legacyStatusFromRecordStatus;
exports.patchFromRecordStatus = patchFromRecordStatus;
const types_1 = require("@/types");
const VALID_RECORD_STATUSES = new Set(types_1.MTD_RECORD_STATUS_OPTIONS);
function normalizeRecordStatus(value) {
    if (!value)
        return undefined;
    if (value === "In Production" || value === "In Queue")
        return "Ongoing";
    if (VALID_RECORD_STATUSES.has(value))
        return value;
    return undefined;
}
function inferMTDRecordStatus(rec) {
    const normalized = normalizeRecordStatus(rec.recordStatus);
    if (normalized)
        return normalized;
    if (rec.status === "completed")
        return "Completed";
    if (rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES") {
        return "Outsourced";
    }
    if (rec.assignedProducer && rec.status === "active")
        return "Ongoing";
    if (rec.needsAttention || rec.status === "needs_attention") {
        return "Waiting for Data";
    }
    return "Waiting for Data";
}
function legacyStatusFromRecordStatus(recordStatus) {
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
function patchFromRecordStatus(recordStatus) {
    return {
        recordStatus,
        status: legacyStatusFromRecordStatus(recordStatus),
    };
}
