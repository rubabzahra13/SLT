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
function mtdRecordCoversOrder(rec, orderId) {
    if (rec.orderId === orderId)
        return true;
    if (rec.id === orderId)
        return true;
    if (rec.legacyId === orderId)
        return true;
    return false;
}
function stagingRecordFromOrder(order, packagePrices) {
    const compliance = order.priceCompliance || (0, pricing_1.detectCompliance)(order.musicTheme || "");
    const price = order.price ||
        (0, pricing_1.getPriceForPackage)(order.package, compliance, order.price, packagePrices);
    return {
        id: order.id,
        orderId: order.id,
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
        mixStartDate: "",
        mixEndDate: "",
        eightCountSheet: "NEED CS",
        haveSongs: "NEED SONGS",
        needsAttention: order.needsAttention ?? true,
        status: order.needsAttention ? "needs_attention" : "active",
        inMTD: false,
    };
}
/** Orders-tab rows: persisted pre-MTD mtd_records plus open orders without a row yet. */
function listPreMtdOrderRecords(activeOrders, mtdRecords, packagePrices) {
    const fromMtd = mtdRecords.filter(mtd_filters_1.isPreMTDOrderRecord);
    const synthetic = [];
    for (const order of activeOrders) {
        if (!orderEligibleForStaging(order))
            continue;
        if (mtdRecords.some((rec) => mtdRecordCoversOrder(rec, order.id)))
            continue;
        synthetic.push(stagingRecordFromOrder(order, packagePrices));
    }
    return [...fromMtd, ...synthetic];
}
