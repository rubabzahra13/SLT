"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProducerKey = normalizeProducerKey;
exports.producerKeysMatch = producerKeysMatch;
exports.producerAssignmentKey = producerAssignmentKey;
/** Legacy spreadsheet / order-form codes mapped to current producer initials. */
const LEGACY_PRODUCER_KEYS = {
    MATT: "MS",
    NATE: "NC",
    JUSTIN: "JD",
    JUST: "JD",
    MARK: "MM",
    GRIFFIN: "GP",
    GRIF: "GP",
    G: "GP",
    GP: "GP",
    JOSH: "JM",
    JOEL: "JOP",
    BRENT: "BV",
    BREN: "BV",
    RILEY: "R",
    RILE: "R",
    STEVE: "SS",
    STEV: "SS",
    CASEY: "CM",
    CM: "CM",
    ANNE: "AJ",
    LAUREN: "LV",
    RORY: "RF",
    JOHN: "JP",
    MAX: "MT",
    CHRIS: "CC",
    JOE: "JB",
};
function normalizeProducerKey(raw) {
    const normalized = raw.trim().toUpperCase();
    return LEGACY_PRODUCER_KEYS[normalized] ?? normalized;
}
function producerKeysMatch(assigned, key) {
    return normalizeProducerKey(assigned) === normalizeProducerKey(key);
}
/** Assignment key used in MTD (initials / uppercase name). */
function producerAssignmentKey(producer) {
    const initials = producer.initials?.trim().toUpperCase();
    if (initials)
        return initials;
    return producer.name.trim().toUpperCase();
}
