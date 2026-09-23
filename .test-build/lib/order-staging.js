"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stagingRecordFromOrder = stagingRecordFromOrder;
exports.listPreMtdOrderRecords = listPreMtdOrderRecords;
const mtd_filters_1 = require("@/lib/mtd-filters");
const pricing_1 = require("@/lib/pricing");
function orderEligibleForStaging(order) {
    if (order.status === "completed")
        return false;
    if (order.status === "in_mtd")
        return false;
    return true;
}
function mtdRecordCoversOrder(rec, order) {
    // An order can be referenced by its legacy id, backend UUID, or plain id, and
    // an MTD record may carry any of those forms in orderId/id/legacyId/uuid.
    // Compare every combination so a linked record (order_id = order UUID) still
    // suppresses the synthetic staging row and we don't show the booking twice.
    const orderIds = [order.id, order.uuid, order.legacyId].filter(Boolean);
    const recIds = [rec.orderId, rec.id, rec.legacyId, rec.uuid].filter(Boolean);
    return recIds.some((value) => orderIds.includes(value));
}
function stagingRecordFromOrder(order, packagePrices) {
    const compliance = order.priceCompliance || (0, pricing_1.detectCompliance)(order.musicTheme || "");
    const price = order.price ||
        (0, pricing_1.getPriceForPackage)(order.package, compliance, order.price, packagePrices);
    return {
        id: order.id,
        orderId: order.id,
        legacyId: order.legacyId || order.id,
        uuid: order.uuid,
        section: order.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
        assignedProducer: order.assignedProducer ?? null,
        category: order.category || "Cheer",
        editorRequest: order.editorRequest || "FA",
        contactName: order.contactName || order.customerName || "",
        editorInitials: order.contactName || order.customerName || "",
        programName: order.programName,
        package: order.package,
        musicTheme: order.musicTheme || "",
        price,
        priceCompliance: compliance,
        invoice: "",
        mixStartDate: order.mixStartDate || "",
        mixEndDate: order.mixEndDate || "",
        eightCountSheet: order.eightCountSheet || "NEED CS",
        haveSongs: order.haveSongs || "NEED SONGS",
        needsAttention: order.needsAttention ?? true,
        status: order.needsAttention ? "needs_attention" : "active",
        inMTD: false,
        isReassigned: order.isReassigned,
        collectionStates: order.collectionStates || order.collection_states,
        orderStatus: order.orderStatus || order.order_status,
        musicAffiliate: order.musicAffiliate || order.music_affiliate,
        routineNotes: order.routineNotes,
        timeLengthOfMix: order.timeLengthOfMix,
        songListSuggestions: order.songListSuggestions,
        customVoiceovers: order.customVoiceovers,
    };
}
/** Orders-tab rows: persisted pre-MTD mtd_records plus open orders without a row yet. */
function listPreMtdOrderRecords(activeOrders, mtdRecords, packagePrices) {
    const fromMtd = mtdRecords.filter(mtd_filters_1.isPreMTDOrderRecord);
    const synthetic = [];
    for (const order of activeOrders) {
        if (!orderEligibleForStaging(order))
            continue;
        if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order)))
            continue;
        synthetic.push(stagingRecordFromOrder(order, packagePrices));
    }
    return [...fromMtd, ...synthetic];
}
