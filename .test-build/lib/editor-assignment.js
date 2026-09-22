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
exports.resolveValidProducerAssignment = resolveValidProducerAssignment;
exports.resolveAssignedProducerForPatch = resolveAssignedProducerForPatch;
exports.getDisplayAssignedProducer = getDisplayAssignedProducer;
exports.resolveSeederAssignment = resolveSeederAssignment;
exports.seedAssignedProducerForOrder = seedAssignedProducerForOrder;
exports.orderCategoryToProducerCategory = orderCategoryToProducerCategory;
exports.producerSupportsCategory = producerSupportsCategory;
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
const producer_schedule_calc_1 = require("./producer-schedule-calc");
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
        const matchedKey = eligible.find((name) => (0, producer_keys_1.producerKeysMatch)(name, requestedEditor));
        if (matchedKey) {
            const isAvailable = available.some((name) => (0, producer_keys_1.producerKeysMatch)(name, requestedEditor));
            return {
                editor: matchedKey,
                requestedEditor,
                reason: isAvailable ? "requested_available" : "requested_busy",
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
    if (!key?.trim())
        return undefined;
    const normalized = (0, producer_keys_1.normalizeProducerKey)(key);
    if (!normalized || isFirstAvailableRequest(normalized))
        return undefined;
    return producers.find((producer) => {
        const assignmentKey = (0, producer_keys_1.producerAssignmentKey)(producer);
        const firstName = producer.name.trim().split(/\s+/)[0].toUpperCase();
        return (producer.id.toUpperCase() === normalized ||
            assignmentKey === normalized ||
            producer.initials.toUpperCase() === normalized ||
            producer.name.toUpperCase() === normalized ||
            firstName === normalized);
    });
}
/**
 * Resolves an assigned producer key for a given order or MTD record.
 * 1. Checks if rawKey resolves to an existing registered producer in producers array (via ID, initials, name, or legacy key).
 * 2. Checks if that producer is eligible for the order's canonical category.
 * 3. Returns the producer's canonical initials/key (e.g., "CM", "JD", "MS") if valid and eligible.
 * 4. Returns null (Unassigned) if rawKey is null/FA/empty, or producer does not exist, or producer is not eligible for the category.
 */
function resolveValidProducerAssignment(rawKey, producers, category) {
    if (!rawKey?.trim())
        return null;
    const producer = findProducerByAssignmentKey(rawKey, producers);
    if (!producer)
        return null;
    const canonicalCategory = orderCategoryToProducerCategory(undefined, undefined, category);
    if (!producerSupportsCategory(producer, canonicalCategory)) {
        return null;
    }
    return (0, producer_keys_1.producerAssignmentKey)(producer);
}
/** Persist user-selected producer keys even when strict category validation fails. */
function resolveAssignedProducerForPatch(rawKey, producers, category) {
    const validated = resolveValidProducerAssignment(rawKey, producers, category);
    if (validated)
        return validated;
    const producer = findProducerByAssignmentKey(rawKey, producers);
    if (producer)
        return (0, producer_keys_1.producerAssignmentKey)(producer);
    const trimmed = rawKey?.trim();
    return trimmed ? trimmed.toUpperCase() : null;
}
/** Assigned producer shown in MTD / Orders tables. */
function getDisplayAssignedProducer(rec) {
    if (!rec)
        return null;
    const assigned = rec.assignedProducer?.trim();
    if (assigned)
        return assigned;
    const request = rec.editorRequest?.trim();
    if (request && request !== "FA" && request !== "NA")
        return request;
    return null;
}
/**
 * Seeder assignment rule helper.
 * Selects an eligible producer from registered producers for a given category.
 * If rawRequested is provided, validates and returns producer key if valid & category-eligible.
 * Returns null if no valid eligible producer found. Never invents arbitrary names or initials.
 */
function resolveSeederAssignment(rawRequested, producers, category) {
    return resolveValidProducerAssignment(rawRequested, producers, category);
}
/**
 * Seeder assignment rule helper.
 * Picks a realistic, category-aware assigned producer for demo seeding.
 * If rawRequested resolves to a valid, category-eligible registered producer, returns that producer.
 * Otherwise, deterministically selects from eligible registered producers for that category,
 * leaving ~20% of orders unassigned for realistic board state.
 * Never creates fake producers or assigns ineligible producers.
 */
function seedAssignedProducerForOrder(orderId, rawRequested, category, producers) {
    const requestedValid = resolveValidProducerAssignment(rawRequested, producers, category);
    if (requestedValid) {
        return requestedValid;
    }
    const canonicalCat = orderCategoryToProducerCategory(undefined, undefined, category);
    const eligible = getProducersForCategory(producers, canonicalCat);
    if (eligible.length === 0)
        return null;
    let hash = 0;
    for (let i = 0; i < orderId.length; i++) {
        hash = (hash << 5) - hash + orderId.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash);
    if (index % 5 === 0) {
        return null;
    }
    const selected = eligible[index % eligible.length];
    return (0, producer_keys_1.producerAssignmentKey)(selected);
}
/**
 * Maps an order's form type and subtype to the canonical producer category.
 * This is the authoritative mapping used for all producer assignment eligibility.
 */
function orderCategoryToProducerCategory(formType, subtype, legacyCategory) {
    // Use subtype-specific mapping first
    if (subtype) {
        const s = subtype.trim().toLowerCase();
        if (s === "all-star-cheer")
            return "All-Star Cheer";
        if (s === "school-cheer-viroc-yes" || s === "school-cheer-viroc-no")
            return "School Cheer";
        if (s === "youth-rec-cheer")
            return "Youth Rec Cheer";
        if (s === "pom")
            return "Pom";
        if (s === "hip-hop" || s === "hiphop")
            return "Hip Hop";
        if (s === "team-performance-variety" || s === "team-performance")
            return "Team Performance / Variety";
        if (s === "gameday")
            return "Gameday";
        if (s === "jazz-kick" || s === "jazz/kick")
            return "Jazz / Kick";
    }
    // Use form type mapping
    if (formType) {
        const f = formType.trim().toLowerCase();
        if (f === "marching-band")
            return "Marching Band";
        if (f === "sports-entertainment")
            return "Sports Entertainment";
        if (f === "school-anthem")
            return "School Anthem";
    }
    // Legacy category string fallback (used by MTD records which store plain strings)
    if (legacyCategory) {
        const c = legacyCategory.trim().toLowerCase();
        if (c === "cheer")
            return "All-Star Cheer";
        if (c === "dance")
            return "Pom";
        if (c === "marching band" || c === "marching-band")
            return "Marching Band";
        if (c === "hip-hop" || c === "hip hop")
            return "Hip Hop";
        if (c === "sports entertainment" || c === "sports-entertainment")
            return "Sports Entertainment";
        if (c === "school anthem" || c === "school-anthem")
            return "School Anthem";
        if (c === "school cheer" || c === "school-cheer")
            return "School Cheer";
        if (c === "all-star cheer" || c === "all star cheer")
            return "All-Star Cheer";
        if (c === "youth rec cheer" || c === "youth-rec-cheer")
            return "Youth Rec Cheer";
        if (c === "pom")
            return "Pom";
        if (c === "gameday")
            return "Gameday";
        if (c === "jazz / kick" || c === "jazz/kick" || c === "jazz-kick")
            return "Jazz / Kick";
        if (c === "team performance / variety" || c === "team performance")
            return "Team Performance / Variety";
        // Return the category as-is if no mapping found
        return legacyCategory;
    }
    return "";
}
/**
 * Checks whether a single producer category string matches the required category.
 * Handles spelling variations and legacy mappings.
 */
function producerCategoryMatchesRequired(producerCategory, requiredCategory) {
    const p = producerCategory.trim().toLowerCase();
    const r = requiredCategory.trim().toLowerCase();
    if (p === r)
        return true;
    // Normalize slash/hyphen variants
    const pn = p.replace(/[/\-\s]+/g, "-");
    const rn = r.replace(/[/\-\s]+/g, "-");
    if (pn === rn)
        return true;
    if (r === "cheer" && p.includes("cheer"))
        return true;
    if (r === "dance" &&
        (p === "pom" ||
            p === "hip hop" ||
            p.includes("jazz") ||
            p.includes("team performance") ||
            p === "gameday")) {
        return true;
    }
    if (rn === "school-anthem" && pn.includes("marching-band"))
        return true;
    return false;
}
/**
 * Returns true when the producer supports the required category.
 * Checks producer.categories[] (multi-category) first, falls back to specialty.
 */
function producerSupportsCategory(producer, requiredCategory) {
    if (!requiredCategory || requiredCategory === "all")
        return true;
    const cats = producer.categories?.length
        ? producer.categories
        : producer.specialty
            ? [producer.specialty]
            : [];
    return cats.some((c) => producerCategoryMatchesRequired(c, requiredCategory));
}
/**
 * @deprecated Use producerSupportsCategory instead.
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
    if (!category || category === "all")
        return producers;
    // Map the requested category string to a canonical producer category
    const canonicalCategory = orderCategoryToProducerCategory(undefined, undefined, category);
    return producers.filter((p) => producerSupportsCategory(p, canonicalCategory));
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
function getUnassignedEditors(mtdRecords, producers, category, excludeRecordId, record) {
    const targetRecord = record ||
        (excludeRecordId
            ? mtdRecords.find((r) => r.id === excludeRecordId)
            : undefined);
    const categoryEditors = getEditorNamesForCategory(producers, category);
    if (targetRecord && targetRecord.mixStartDate) {
        const available = categoryEditors.filter((name) => {
            const producer = findProducerByAssignmentKey(name, producers);
            if (!producer)
                return false;
            return !(0, producer_availability_1.isProducerUnavailableForRecord)(producer, targetRecord, mtdRecords);
        });
        if (available.length > 0)
            return available;
    }
    return categoryEditors;
}
function inferAssignmentMode(record) {
    if (record.editorRequest === "NA")
        return "na";
    if (record.editorRequest === "FA")
        return "fa";
    return "specific";
}
function getSuggestedEditors(mtdRecords, producers, schedule, category, excludeRecordId, record, anchorDateInput) {
    const targetRecord = record ||
        (excludeRecordId
            ? mtdRecords.find((r) => r.id === excludeRecordId)
            : undefined);
    const names = getUnassignedEditors(mtdRecords, producers, category, excludeRecordId, targetRecord);
    const anchorDate = anchorDateInput
        ? typeof anchorDateInput === "string"
            ? (0, dates_1.parseFlexibleDate)(anchorDateInput) ?? new Date()
            : anchorDateInput
        : targetRecord?.mixStartDate
            ? (0, dates_1.parseFlexibleDate)(targetRecord.mixStartDate) ?? new Date()
            : new Date();
    return names.map((name) => {
        const producer = findProducerByAssignmentKey(name, producers);
        const calc = producer
            ? (0, producer_schedule_calc_1.calculateProducerNextOpening)(producer, mtdRecords, schedule, anchorDate)
            : null;
        const nextAvailableDate = calc?.nextAvailableDate ?? anchorDate;
        const slotLabel = calc?.nextAvailable ?? (0, scheduling_1.formatSlotForDisplay)(name, producers, schedule, mtdRecords);
        return {
            name,
            slotLabel,
            nextAvailableDate,
            producer,
        };
    });
}
