"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DANCE_SUBTYPE = exports.DEFAULT_CHEER_SUBTYPE = void 0;
exports.resolveMTDFormMeta = resolveMTDFormMeta;
exports.matchesFormFilter = matchesFormFilter;
exports.countMTDByForm = countMTDByForm;
exports.countMTDByCheerSubtype = countMTDByCheerSubtype;
exports.countMTDByDanceSubtype = countMTDByDanceSubtype;
exports.isOngoingRecord = isOngoingRecord;
exports.isOutsourcedRecord = isOutsourcedRecord;
exports.isInProgressRecord = isInProgressRecord;
exports.getInProgressRecords = getInProgressRecords;
exports.getOngoingRecords = getOngoingRecords;
exports.getOutsourcedRecords = getOutsourcedRecords;
exports.getInProgressCount = getInProgressCount;
exports.matchesAssignedProducerFilter = matchesAssignedProducerFilter;
exports.matchesProducerFilter = matchesProducerFilter;
exports.matchesRequestedProducerFilter = matchesRequestedProducerFilter;
exports.matchesPackageTierFilter = matchesPackageTierFilter;
exports.matchesTimeLimitFilter = matchesTimeLimitFilter;
exports.matchesSplitFilter = matchesSplitFilter;
exports.buildPackageTierOptions = buildPackageTierOptions;
exports.buildTimeLimitOptions = buildTimeLimitOptions;
exports.buildSplitOptions = buildSplitOptions;
exports.buildAssignedProducerOptions = buildAssignedProducerOptions;
exports.buildRequestedProducerOptions = buildRequestedProducerOptions;
exports.matchesCategoryFilter = matchesCategoryFilter;
exports.matchesDateFilter = matchesDateFilter;
exports.hasMixStartDate = hasMixStartDate;
exports.matchesMixScheduleFilter = matchesMixScheduleFilter;
exports.matchesInfoFilter = matchesInfoFilter;
exports.buildInfoOptions = buildInfoOptions;
exports.filterMTDRecords = filterMTDRecords;
exports.matchesMTDSearch = matchesMTDSearch;
exports.isOrderScheduledAndAssigned = isOrderScheduledAndAssigned;
exports.isMTDRecord = isMTDRecord;
exports.isPreMTDOrderRecord = isPreMTDOrderRecord;
exports.getRecordMusicAffiliateInfo = getRecordMusicAffiliateInfo;
const date_filters_1 = require("./date-filters");
const dates_1 = require("./dates");
const editor_assignment_1 = require("./editor-assignment");
const data_1 = require("./data");
const pricing_engine_1 = require("./pricing-engine");
const order_form_1 = require("./order-form");
const package_1 = require("./package");
const types_1 = require("../types");
exports.DEFAULT_CHEER_SUBTYPE = "all-star-cheer";
exports.DEFAULT_DANCE_SUBTYPE = "all";
function resolveMTDFormMeta(rec, orderById) {
    const targetId = rec.orderId || rec.id;
    const linked = targetId
        ? orderById.get(targetId) ||
            (rec.legacyId ? orderById.get(rec.legacyId) : undefined) ||
            (rec.uuid ? orderById.get(rec.uuid) : undefined)
        : undefined;
    let formType = "school-all-star-cheer";
    let cheerFormSubtype = "all-star-cheer";
    let danceFormSubtype = "pom";
    if (linked) {
        formType = linked.formType || rec.formType || "school-all-star-cheer";
        cheerFormSubtype = linked.cheerFormSubtype || rec.cheerFormSubtype || "all-star-cheer";
        danceFormSubtype = linked.danceFormSubtype || rec.danceFormSubtype || "pom";
    }
    else if (rec.cheerFormSubtype || rec.formType) {
        formType = rec.formType || "school-all-star-cheer";
        cheerFormSubtype = rec.cheerFormSubtype || "all-star-cheer";
        danceFormSubtype = rec.danceFormSubtype || "pom";
    }
    else {
        const partial = {
            category: rec.category,
            package: rec.package,
            musicTheme: rec.musicTheme,
            division: rec.section,
        };
        formType = (0, order_form_1.inferFormType)(partial);
        cheerFormSubtype =
            rec.cheerFormSubtype ||
                (0, order_form_1.inferCheerFormSubtype)({ ...partial, formType }) ||
                "all-star-cheer";
        danceFormSubtype =
            rec.danceFormSubtype ||
                (0, order_form_1.inferDanceFormSubtype)({ ...partial, formType }) ||
                "pom";
    }
    const canonicalSubtypeId = formType === "school-all-star-cheer"
        ? cheerFormSubtype
        : formType === "school-all-star-dance"
            ? danceFormSubtype
            : formType;
    return {
        formType,
        cheerFormSubtype,
        danceFormSubtype,
        canonicalSubtypeId,
    };
}
function matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype) {
    const meta = resolveMTDFormMeta(rec, orderById);
    if (meta.formType !== form)
        return false;
    if (form === "school-all-star-cheer") {
        if (cheerSubtype === "all")
            return true;
        const targetId = rec.orderId || rec.id;
        const linked = targetId ? orderById.get(targetId) : undefined;
        const viroc = linked?.varsityVirocCustomer || rec.varsityVirocCustomer;
        if (cheerSubtype === "school-cheer-viroc-yes") {
            return (meta.cheerFormSubtype.startsWith("school-cheer") &&
                (viroc === "yes" || viroc === "Yes" || viroc === true));
        }
        if (cheerSubtype === "school-cheer-viroc-no") {
            return (meta.cheerFormSubtype.startsWith("school-cheer") &&
                viroc !== "yes" &&
                viroc !== "Yes" &&
                viroc !== true);
        }
        return meta.cheerFormSubtype === cheerSubtype;
    }
    if (form === "school-all-star-dance") {
        if (danceSubtype === "all")
            return true;
        if (danceSubtype === "team-performance-variety") {
            return (meta.danceFormSubtype.startsWith("team-performance"));
        }
        return meta.danceFormSubtype === danceSubtype;
    }
    return true;
}
function countMTDByForm(records, orderById) {
    const counts = Object.fromEntries(types_1.ORDER_FORM_TABS.map(({ id }) => [id, 0]));
    for (const rec of records) {
        const { formType } = resolveMTDFormMeta(rec, orderById);
        if (counts[formType] !== undefined)
            counts[formType] += 1;
    }
    return counts;
}
function countMTDByCheerSubtype(records, orderById) {
    const counts = {
        all: 0,
        ...Object.fromEntries(types_1.CHEER_FORM_SUBTABS.map(({ id }) => [id, 0])),
    };
    for (const rec of records) {
        const meta = resolveMTDFormMeta(rec, orderById);
        if (meta.formType !== "school-all-star-cheer")
            continue;
        counts.all += 1;
        if (meta.cheerFormSubtype.startsWith("school-cheer")) {
            const targetId = rec.orderId || rec.id;
            const linked = targetId ? orderById.get(targetId) : undefined;
            const viroc = linked?.varsityVirocCustomer || rec.varsityVirocCustomer;
            if (viroc === "yes" || viroc === "Yes" || viroc === true) {
                counts["school-cheer-viroc-yes"] += 1;
            }
            else {
                counts["school-cheer-viroc-no"] += 1;
            }
        }
        else if (counts[meta.cheerFormSubtype] !== undefined) {
            counts[meta.cheerFormSubtype] += 1;
        }
    }
    return counts;
}
function countMTDByDanceSubtype(records, orderById) {
    const counts = {
        all: 0,
        ...Object.fromEntries(types_1.DANCE_FORM_SUBTABS.map(({ id }) => [id, 0])),
    };
    for (const rec of records) {
        const meta = resolveMTDFormMeta(rec, orderById);
        if (meta.formType !== "school-all-star-dance")
            continue;
        counts.all += 1;
        const subKey = meta.danceFormSubtype.startsWith("team-performance")
            ? "team-performance-variety"
            : meta.danceFormSubtype;
        if (counts[subKey] !== undefined) {
            counts[subKey] += 1;
        }
    }
    return counts;
}
function isOngoingRecord(rec) {
    if (!rec.assignedProducer)
        return false;
    if (rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES") {
        return false;
    }
    return rec.status === "active";
}
function isOutsourcedRecord(rec) {
    return (rec.status === "outsourced" || rec.section === "OUTSOURCED MIXES");
}
function isInProgressRecord(rec) {
    return isOngoingRecord(rec) || isOutsourcedRecord(rec);
}
function getInProgressRecords(records) {
    return records.filter(isInProgressRecord);
}
function getOngoingRecords(records) {
    return records.filter(isOngoingRecord);
}
function getOutsourcedRecords(records) {
    return records.filter(isOutsourcedRecord);
}
function getInProgressCount(records) {
    return getInProgressRecords(records).length;
}
function matchesAssignedProducerFilter(rec, producer) {
    if (producer === "All")
        return true;
    if (producer === "Unassigned")
        return !rec.assignedProducer;
    if (producer === "Outsourced")
        return isOutsourcedRecord(rec);
    return (rec.assignedProducer?.toUpperCase() === producer.toUpperCase());
}
/** @deprecated Use matchesAssignedProducerFilter */
function matchesProducerFilter(rec, producer) {
    return matchesAssignedProducerFilter(rec, producer);
}
function matchesRequestedProducerFilter(rec, producer, producers, orderById) {
    if (producer === "All")
        return true;
    const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
    const requested = (0, editor_assignment_1.getRequestedEditorFromRecord)(rec, producers, linked);
    if (producer === "FA")
        return !requested;
    return requested?.toUpperCase() === producer.toUpperCase();
}
function matchesPackageTierFilter(rec, tier) {
    if (tier === "All")
        return true;
    const { tier: parsed } = (0, package_1.parsePackage)(rec.package);
    return parsed.toUpperCase() === tier.toUpperCase();
}
function matchesTimeLimitFilter(rec, limit) {
    if (limit === "All")
        return true;
    const { limit: parsed } = (0, package_1.parsePackage)(rec.package);
    return parsed === limit;
}
function matchesSplitFilter(rec, filter) {
    if (filter === "all")
        return true;
    const { split } = (0, package_1.parsePackage)(rec.package);
    if (filter === "split")
        return split === "Split";
    return split === "No Split";
}
const TIER_ORDER = [
    "TITANIUM",
    "PLATINUM",
    "GOLD",
    "SILVER",
    "BRONZE",
    "HOMECOMING",
];
function sortTiers(a, b) {
    const ai = TIER_ORDER.indexOf(a.toUpperCase());
    const bi = TIER_ORDER.indexOf(b.toUpperCase());
    if (ai !== -1 && bi !== -1)
        return ai - bi;
    if (ai !== -1)
        return -1;
    if (bi !== -1)
        return 1;
    return a.localeCompare(b);
}
function sortTimeLimits(a, b) {
    if (a === "TBD")
        return 1;
    if (b === "TBD")
        return -1;
    const parse = (value) => {
        const [m, s] = value.split(":").map(Number);
        return (m || 0) * 60 + (s || 0);
    };
    return parse(a) - parse(b);
}
function buildPackageTierOptions(records) {
    const counts = new Map();
    for (const rec of records) {
        const { tier } = (0, package_1.parsePackage)(rec.package);
        if (!tier || tier === "-")
            continue;
        const key = tier.toUpperCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [
        { value: "All", label: "All packages", count: records.length },
        ...Array.from(counts.entries())
            .sort(([a], [b]) => sortTiers(a, b))
            .map(([value, count]) => ({
            value,
            label: value.charAt(0) + value.slice(1).toLowerCase(),
            count,
        })),
    ];
}
function buildTimeLimitOptions(records) {
    const counts = new Map();
    for (const rec of records) {
        const { limit } = (0, package_1.parsePackage)(rec.package);
        if (!limit || limit === "-")
            continue;
        counts.set(limit, (counts.get(limit) ?? 0) + 1);
    }
    return [
        { value: "All", label: "All limits", count: records.length },
        ...Array.from(counts.entries())
            .sort(([a], [b]) => sortTimeLimits(a, b))
            .map(([value, count]) => ({
            value,
            label: value,
            count,
        })),
    ];
}
function buildSplitOptions(records) {
    let split = 0;
    let noSplit = 0;
    for (const rec of records) {
        const { split: parsed } = (0, package_1.parsePackage)(rec.package);
        if (parsed === "Split")
            split += 1;
        else if (parsed === "No Split")
            noSplit += 1;
    }
    return [
        { value: "all", label: "All", count: records.length },
        { value: "split", label: "Split", count: split },
        { value: "no_split", label: "No split", count: noSplit },
    ];
}
function buildAssignedProducerOptions(records, producerNames) {
    const counts = new Map();
    let unassigned = 0;
    let outsourced = 0;
    for (const rec of records) {
        if (isOutsourcedRecord(rec)) {
            outsourced += 1;
        }
        if (!rec.assignedProducer) {
            unassigned += 1;
        }
        else {
            counts.set(rec.assignedProducer, (counts.get(rec.assignedProducer) ?? 0) + 1);
        }
    }
    return [
        { value: "All", label: "All assigned", count: records.length },
        { value: "Unassigned", label: "Unassigned", count: unassigned },
        { value: "Outsourced", label: "Outsourced", count: outsourced },
        ...producerNames.map((name) => ({
            value: name,
            label: name,
            count: counts.get(name) ?? 0,
        })),
    ];
}
function buildRequestedProducerOptions(records, producerNames, producers, orderById) {
    const counts = new Map();
    let fa = 0;
    for (const rec of records) {
        const linked = rec.orderId ? orderById.get(rec.orderId) : undefined;
        const requested = (0, editor_assignment_1.getRequestedEditorFromRecord)(rec, producers, linked);
        if (!requested) {
            fa += 1;
        }
        else {
            counts.set(requested, (counts.get(requested) ?? 0) + 1);
        }
    }
    return [
        { value: "All", label: "All requests", count: records.length },
        { value: "FA", label: "First available", count: fa },
        ...producerNames.map((name) => ({
            value: name,
            label: name,
            count: counts.get(name) ?? 0,
        })),
    ];
}
function matchesCategoryFilter(rec, category) {
    if (category === "All")
        return true;
    if (category === "Outsourced")
        return rec.status === "outsourced";
    return rec.category === category;
}
function matchesDateFilter(rec, dateFilter) {
    if (dateFilter.type === "all")
        return true;
    const bounds = (0, date_filters_1.calculateDateBounds)(dateFilter.type, dateFilter.value);
    return (0, dates_1.doDateRangesOverlap)({ start: rec.mixStartDate, end: rec.mixEndDate }, bounds);
}
function hasMixStartDate(rec) {
    return Boolean((0, dates_1.toIsoDateString)(rec.mixStartDate));
}
function matchesMixScheduleFilter(rec, filter) {
    if (filter === "all")
        return true;
    const scheduled = hasMixStartDate(rec);
    if (filter === "scheduled")
        return scheduled;
    return !scheduled;
}
function matchesInfoFilter(rec, filter) {
    if (filter === "all")
        return true;
    if (filter === "missing")
        return rec.needsAttention;
    return !rec.needsAttention;
}
function buildInfoOptions(records) {
    let missing = 0;
    let complete = 0;
    for (const rec of records) {
        if (rec.needsAttention)
            missing += 1;
        else
            complete += 1;
    }
    return [
        { value: "all", label: "All", count: records.length },
        { value: "missing", label: "Missing info", count: missing },
        { value: "complete", label: "Complete", count: complete },
    ];
}
function filterMTDRecords(records, options) {
    const { category = "All", producer = "All", assignedProducer = producer, requestedProducer = "All", packageTier = "All", timeLimit = "All", split = "all", producers = [], dateFilter = { type: "all", value: null }, scheduleFilter = "all", infoFilter = "all", form, cheerSubtype = exports.DEFAULT_CHEER_SUBTYPE, danceSubtype = exports.DEFAULT_DANCE_SUBTYPE, orderById, } = options;
    const orderMap = orderById ?? new Map();
    return records.filter((rec) => {
        if (!matchesCategoryFilter(rec, category))
            return false;
        if (!matchesAssignedProducerFilter(rec, assignedProducer))
            return false;
        if (!matchesRequestedProducerFilter(rec, requestedProducer, producers, orderMap)) {
            return false;
        }
        if (!matchesPackageTierFilter(rec, packageTier))
            return false;
        if (!matchesTimeLimitFilter(rec, timeLimit))
            return false;
        if (!matchesSplitFilter(rec, split))
            return false;
        if (!matchesDateFilter(rec, dateFilter))
            return false;
        if (!matchesMixScheduleFilter(rec, scheduleFilter))
            return false;
        if (!matchesInfoFilter(rec, infoFilter))
            return false;
        if (form && orderById) {
            if (!matchesFormFilter(rec, orderById, form, cheerSubtype, danceSubtype)) {
                return false;
            }
        }
        return true;
    });
}
function matchesMTDSearch(rec, query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return true;
    const contact = (rec.contactName || rec.editorInitials || "").toLowerCase();
    const invoice = (rec.invoice || "").toLowerCase();
    const program = (rec.programName || "").toLowerCase();
    const id = (rec.id || "").toLowerCase();
    return contact.includes(q) || invoice.includes(q) || program.includes(q) || id.includes(q);
}
function isOrderScheduledAndAssigned(rec) {
    return Boolean(rec.assignedProducer &&
        (0, dates_1.toIsoDateString)(rec.mixStartDate) &&
        (0, dates_1.toIsoDateString)(rec.mixEndDate));
}
function isMTDRecord(rec) {
    // Outsourced mixes always live on the MTD board.
    if (isOutsourcedRecord(rec))
        return true;
    if (rec.inMTD === true)
        return true;
    if (rec.inMTD === false)
        return false;
    return Boolean(rec.assignedProducer &&
        (0, dates_1.toIsoDateString)(rec.mixStartDate) &&
        (0, dates_1.toIsoDateString)(rec.mixEndDate));
}
function isPreMTDOrderRecord(rec) {
    return !isMTDRecord(rec);
}
function getRecordMusicAffiliateInfo(rec, orderById, allOrders) {
    const linked = (0, editor_assignment_1.findLinkedOrder)(rec, allOrders);
    const affiliate = linked?.musicAffiliate ??
        rec.musicAffiliate;
    if (!affiliate?.trim())
        return null;
    const meta = resolveMTDFormMeta(rec, orderById);
    const compliance = (0, pricing_engine_1.determineComplianceStatus)(meta.formType === "school-all-star-dance"
        ? meta.danceFormSubtype
        : meta.cheerFormSubtype, affiliate);
    if (compliance === "unknown-no-affiliate-field")
        return null;
    return { affiliate: (0, data_1.titleCase)(affiliate), compliance };
}
