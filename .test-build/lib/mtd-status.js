"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferMTDRecordStatus = inferMTDRecordStatus;
exports.legacyStatusFromRecordStatus = legacyStatusFromRecordStatus;
exports.patchFromRecordStatus = patchFromRecordStatus;
function inferMTDRecordStatus(rec) {
    if (rec.recordStatus)
        return rec.recordStatus;
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
