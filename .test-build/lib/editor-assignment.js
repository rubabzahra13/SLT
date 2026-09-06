"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.producerKeysMatch = exports.producerAssignmentKey = exports.normalizeProducerKey = void 0;
exports.isFirstAvailableRequest = isFirstAvailableRequest;
exports.findLinkedOrder = findLinkedOrder;
exports.resolveProducerKey = resolveProducerKey;
exports.getRequestedEditorFromRecord = getRequestedEditorFromRecord;
exports.formatRequestedEditorLabel = formatRequestedEditorLabel;
exports.pickDefaultEditor = pickDefaultEditor;
exports.editorRequestForAssignment = editorRequestForAssignment;
exports.findProducerByAssignmentKey = findProducerByAssignmentKey;
exports.specialtyMatchesCategory = specialtyMatchesCategory;
exports.getProducersForCategory = getProducersForCategory;
exports.getEditorNamesForCategory = getEditorNamesForCategory;
exports.getEditorWorkload = getEditorWorkload;
exports.getEditorBookedUntilIso = getEditorBookedUntilIso;
exports.isEditorBooked = isEditorBooked;
exports.isRequestedEditorUnavailableForMixWindow = isRequestedEditorUnavailableForMixWindow;
exports.getAssignedEditors = getAssignedEditors;
exports.getUnassignedEditors = getUnassignedEditors;
exports.inferAssignmentMode = inferAssignmentMode;
exports.getSuggestedEditors = getSuggestedEditors;
const types_1 = require("../types");
const producer_availability_1 = require("./producer-availability");
const dates_1 = require("./dates");
const producer_keys_1 = require("./producer-keys");
const scheduling_1 = require("./scheduling");
var producer_keys_2 = require("./producer-keys");
Object.defineProperty(exports, "normalizeProducerKey", { enumerable: true, get: function () { return producer_keys_2.normalizeProducerKey; } });
Object.defineProperty(exports, "producerAssignmentKey", { enumerable: true, get: function () { return producer_keys_2.producerAssignmentKey; } });
Object.defineProperty(exports, "producerKeysMatch", { enumerable: true, get: function () { return producer_keys_2.producerKeysMatch; } });
function isFirstAvailableRequest(value) {
    if (!value?.trim())
        return true;
    const v = value.trim().toLowerCase();
    return (v === "fa" ||
        v === "first available" ||
        v === "editors choice" ||
        v === "editor's choice" ||
        v === "-");
}
function findLinkedOrder(record, orders) {
    if (!record || !orders || orders.length === 0)
        return undefined;
    const targetId = record.orderId || record.id;
    if (targetId) {
        const matched = orders.find((order) => order.id === targetId ||
            order.legacyId === targetId ||
            order.uuid === targetId ||
            order.mtdId === record.id ||
            order.id === record.id ||
            order.legacyId === record.id);
        if (matched)
            return matched;
    }
    return orders.find((order) => order.mtdId === record.id ||
        (order.contactName &&
            record.contactName &&
            order.contactName.trim().toLowerCase() === record.contactName.trim().toLowerCase() &&
            order.package === record.package));
}
function resolveProducerKey(raw, producers, category) {
    const normalized = (0, producer_keys_1.normalizeProducerKey)(raw);
    if (!normalized || isFirstAvailableRequest(normalized))
        return null;
    const eligible = getProducersForCategory(producers, category);
    for (const producer of eligible) {
        const key = (0, producer_keys_1.producerAssignmentKey)(producer);
        if (key === normalized ||
            producer.name.toUpperCase() === normalized ||
            producer.initials.toUpperCase() === normalized) {
            return key;
        }
    }
    for (const producer of eligible) {
        const key = (0, producer_keys_1.producerAssignmentKey)(producer);
        if ((key.startsWith(normalized) || normalized.startsWith(key)) &&
            Math.min(key.length, normalized.length) >= 3) {
            return key;
        }
    }
    return null;
}
function getRequestedEditorFromRecord(record, producers, linkedOrder) {
    const candidates = [];
    if (linkedOrder) {
        if (linkedOrder.requestedEditor) {
            candidates.push(linkedOrder.requestedEditor);
        }
        if (linkedOrder.requestedProducer) {
            candidates.push(linkedOrder.requestedProducer);
        }
        if (linkedOrder.editorRequest &&
            !isFirstAvailableRequest(linkedOrder.editorRequest)) {
            candidates.push(linkedOrder.editorRequest);
        }
    }
    if (record.editorRequest && !isFirstAvailableRequest(record.editorRequest)) {
        candidates.push(record.editorRequest);
    }
    for (const raw of candidates) {
        const resolved = resolveProducerKey(raw, producers, record.category);
        if (resolved)
            return resolved;
    }
    return null;
}
function formatRequestedEditorLabel(record, producers, linkedOrder) {
    const requested = getRequestedEditorFromRecord(record, producers, linkedOrder);
    if (requested)
        return requested;
    return "FA";
}
function pickDefaultEditor(record, producers, mtdRecords, schedule, linkedOrder) {
    const category = record.category;
    const eligible = getEditorNamesForCategory(producers, category);
    const available = getSuggestedEditors(mtdRecords, producers, schedule, category, record.id, record).map((suggestion) => suggestion.name);
    const requestedEditor = getRequestedEditorFromRecord(record, producers, linkedOrder);
    if (record.assignedProducer &&
        eligible.includes(record.assignedProducer.toUpperCase())) {
        return {
            editor: record.assignedProducer.toUpperCase(),
            requestedEditor,
            reason: "assigned",
        };
    }
    if (requestedEditor) {
        if (available.includes(requestedEditor)) {
            return {
                editor: requestedEditor,
                requestedEditor,
                reason: "requested_available",
            };
        }
        if (eligible.includes(requestedEditor)) {
            return {
                editor: available[0] || "",
                requestedEditor,
                reason: "requested_busy",
            };
        }
    }
    return {
        editor: available[0] || "",
        requestedEditor,
        reason: "first_available",
    };
}
function editorRequestForAssignment(selectedEditor, requestedEditor, availableNames) {
    if (!selectedEditor)
        return "NA";
    if (requestedEditor && selectedEditor === requestedEditor) {
        return requestedEditor;
    }
    if (!requestedEditor)
        return "FA";
    if (availableNames.includes(selectedEditor))
        return "FA";
    return "FA";
}
function findProducerByAssignmentKey(key, producers) {
    if (!key)
        return undefined;
    const normalized = (0, producer_keys_1.normalizeProducerKey)(key);
    if (!normalized)
        return undefined;
    return producers.find((producer) => {
        const assignmentKey = (0, producer_keys_1.producerAssignmentKey)(producer);
        return (assignmentKey === normalized ||
            producer.initials.toUpperCase() === normalized ||
            producer.name.toUpperCase() === normalized);
    });
}
/**
 * Match order category to a producer's mastered genre (specialty).
 * Hip-Hop producers can take Dance work; School specialty maps to Cheer.
 */
function specialtyMatchesCategory(specialty, category) {
    const s = specialty.trim().toLowerCase().replace(/\s+/g, "-");
    const c = category.trim().toLowerCase().replace(/\s+/g, "-");
    if (!c || c === "all")
        return true;
    if (s === c)
        return true;
    if (c === "dance" && (s === "hip-hop" || s === "hiphop"))
        return true;
    if (c === "cheer" && s === "school")
        return true;
    if (c === "marching-band" && (s === "marching-band" || s === "band")) {
        return true;
    }
    return false;
}
function getProducersForCategory(producers, category) {
    return producers.filter((p) => specialtyMatchesCategory(p.specialty, category));
}
function getEditorNamesForCategory(producers, category) {
    const keys = getProducersForCategory(producers, category).map(producer_keys_1.producerAssignmentKey);
    // Prefer stable EDITOR_NAMES order when present, then any extra roster keys.
    const fromRoster = new Set(keys);
    const ordered = [];
    for (const name of types_1.EDITOR_NAMES) {
        if (fromRoster.has(name)) {
            ordered.push(name);
            fromRoster.delete(name);
        }
    }
    for (const key of keys) {
        if (fromRoster.has(key)) {
            ordered.push(key);
            fromRoster.delete(key);
        }
    }
    return ordered;
}
function getEditorWorkload(mtdRecords, excludeRecordId) {
    const counts = new Map();
    for (const rec of mtdRecords) {
        if (rec.id === excludeRecordId)
            continue;
        if (!rec.assignedProducer)
            continue;
        const key = (0, producer_keys_1.normalizeProducerKey)(rec.assignedProducer);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}
/** Latest mix end date across an editor's assigned MTD records. */
function getEditorBookedUntilIso(editor, mtdRecords, excludeRecordId) {
    const editorKey = (0, producer_keys_1.normalizeProducerKey)(editor);
    let latestEnd = null;
    let latestIso = "";
    for (const rec of mtdRecords) {
        if (rec.id === excludeRecordId)
            continue;
        if (!rec.assignedProducer)
            continue;
        if (!(0, producer_keys_1.producerKeysMatch)(rec.assignedProducer, editorKey))
            continue;
        const endIso = (0, producer_availability_1.mixEndIsoForRecord)(rec);
        if (!endIso)
            continue;
        const end = (0, dates_1.parseFlexibleDate)(endIso);
        if (!end)
            continue;
        if (!latestEnd || end > latestEnd) {
            latestEnd = end;
            latestIso = endIso;
        }
    }
    return latestIso;
}
function isEditorBooked(editor, mtdRecords, excludeRecordId) {
    return getEditorWorkload(mtdRecords, excludeRecordId).has((0, producer_keys_1.normalizeProducerKey)(editor));
}
function mixWindowForRecord(rec) {
    return (0, producer_availability_1.mixWindowForRecord)(rec);
}
function mixWindowsOverlap(a, b) {
    return a.start <= b.end && b.start <= a.end;
}
/** True when the requested editor cannot take this mix (overlap, schedule, or capacity). */
function isRequestedEditorUnavailableForMixWindow(rec, requestedEditor, mtdRecords, producers = []) {
    const editorKey = (0, producer_keys_1.normalizeProducerKey)(requestedEditor);
    if (!editorKey || isFirstAvailableRequest(editorKey))
        return false;
    const producer = findProducerByAssignmentKey(requestedEditor, producers);
    if (producer && (0, producer_availability_1.isProducerUnavailableForRecord)(producer, rec, mtdRecords)) {
        return true;
    }
    const window = mixWindowForRecord(rec);
    if (!window) {
        return isEditorBooked(requestedEditor, mtdRecords, rec.id);
    }
    for (const other of mtdRecords) {
        if (other.id === rec.id)
            continue;
        if (!other.assignedProducer)
            continue;
        if ((0, producer_keys_1.normalizeProducerKey)(other.assignedProducer) !== editorKey)
            continue;
        const otherWindow = mixWindowForRecord(other);
        if (otherWindow && mixWindowsOverlap(window, otherWindow)) {
            return true;
        }
    }
    return false;
}
function getAssignedEditors(mtdRecords, excludeRecordId) {
    return new Set(getEditorWorkload(mtdRecords, excludeRecordId).keys());
}
function getUnassignedEditors(mtdRecords, producers, category, excludeRecordId) {
    const assigned = getAssignedEditors(mtdRecords, excludeRecordId);
    return getEditorNamesForCategory(producers, category).filter((name) => !assigned.has((0, producer_keys_1.normalizeProducerKey)(name)));
}
function inferAssignmentMode(record) {
    if (record.editorRequest === "NA")
        return "na";
    if (record.editorRequest === "FA")
        return "fa";
    return "specific";
}
function getSuggestedEditors(mtdRecords, producers, schedule, category, excludeRecordId, record) {
    return getUnassignedEditors(mtdRecords, producers, category, excludeRecordId)
        .map((name) => {
        const producer = producers.find((p) => (0, producer_keys_1.producerAssignmentKey)(p) === name.toUpperCase() ||
            p.name.toUpperCase() === name.toUpperCase());
        return {
            name,
            slotLabel: (0, scheduling_1.formatSlotForDisplay)(name, producers, schedule),
            producer,
        };
    })
        .filter((suggestion) => {
        if (!record?.mixStartDate || !suggestion.producer)
            return true;
        return !(0, producer_availability_1.isProducerUnavailableForRecord)(suggestion.producer, record, mtdRecords);
    });
}
