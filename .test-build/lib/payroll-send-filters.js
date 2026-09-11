"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayrollSendProducerNames = getPayrollSendProducerNames;
exports.resolvePayrollSendEditorProducers = resolvePayrollSendEditorProducers;
const dates_1 = require("@/lib/dates");
const editor_assignment_1 = require("@/lib/editor-assignment");
const mtd_filters_1 = require("@/lib/mtd-filters");
function getPayrollSendProducerNames(payrollRecords, orderById, producers, form, cheerSubtype, danceSubtype, filterPeriod) {
    const set = new Set();
    for (const rec of payrollRecords) {
        if (!(0, mtd_filters_1.matchesFormFilter)(rec, orderById, form, cheerSubtype, danceSubtype)) {
            continue;
        }
        const recStart = rec.completedAt || rec.mixStartDate || "";
        const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
        if (!(0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod)) {
            continue;
        }
        if (!rec.assignedProducer)
            continue;
        const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
        const name = prodObj?.name || rec.assignedProducer;
        if (name)
            set.add(name);
    }
    return Array.from(set).sort();
}
function resolvePayrollSendEditorProducers(producers, sendProducerNames) {
    const allowed = new Set(sendProducerNames.map((name) => name.toUpperCase()));
    return producers.filter((producer) => allowed.has(producer.name.toUpperCase()));
}
