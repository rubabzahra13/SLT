"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawFieldValue = rawFieldValue;
exports.getOrderDetailFields = getOrderDetailFields;
exports.orderFromMTDRecord = orderFromMTDRecord;
const order_columns_1 = require("@/components/orders/order-columns");
const order_form_1 = require("@/lib/order-form");
const package_1 = require("@/lib/package");
const mtd_filters_1 = require("@/lib/mtd-filters");
const FIELD_GETTERS = {
    schoolProgramName: (o) => o.schoolProgramName,
    schoolAddress: (o) => o.schoolAddress,
    gymName: (o) => o.gymName || o.schoolProgramName,
    gymBillingAddress: (o) => o.gymBillingAddress || o.schoolAddress,
    schoolName: (o) => o.schoolName || o.schoolProgramName,
    schoolBillingAddress: (o) => o.schoolBillingAddress || o.schoolAddress,
    billingAddress: (o) => o.billingAddress || o.schoolAddress,
    city: (o) => o.city,
    stateProvince: (o) => o.stateProvince,
    zipPostalCode: (o) => o.zipPostalCode,
    country: (o) => o.country,
    teamName: (o) => o.teamName || o.programName,
    programName: (o) => o.programName,
    mascot: (o) => o.mascot || "",
    division: (o) => o.division,
    teamCoedAllGirl: (o) => o.teamCoedAllGirl || "",
    teamColors: (o) => o.teamColors || o.colors || "",
    colors: (o) => o.colors || o.teamColors || "",
    numberOfCopies: (o) => o.numberOfCopies,
    coachName: (o) => o.coachName || o.coachContactFullName || "",
    coachContactFullName: (o) => o.coachContactFullName || o.coachName,
    coachPhone: (o) => o.coachPhone,
    coachEmail: (o) => o.coachEmail || o.coachEmailAddress || "",
    coachEmailAddress: (o) => o.coachEmailAddress || o.coachEmail,
    emailAddress: (o) => o.emailAddress || o.billingPersonEmail,
    billingPersonName: (o) => o.billingPersonName,
    billingPersonEmail: (o) => o.billingPersonEmail,
    choreographerName: (o) => o.choreographerName,
    choreographerEmail: (o) => o.choreographerEmail,
    virocChoreographerName: (o) => o.virocChoreographerName || o.choreographerName,
    virocChoreographerEmail: (o) => o.virocChoreographerEmail || o.choreographerEmail,
    packageType: (o) => o.packageType,
    requestedEditor: (o) => o.requestedEditor,
    timeLengthOfMix: (o) => o.timeLengthOfMix,
    splitOrNoSplit: (o) => o.splitOrNoSplit || "",
    musicAffiliate: (o) => o.musicAffiliate,
    sendingEightCountSheets: (o) => o.sendingEightCountSheets || "",
    usingEightCountSheets: (o) => o.usingEightCountSheets || "",
    songListSuggestions: (o) => o.songListSuggestions || o.powerMusicCovers || o.musicTheme,
    powerMusicCovers: (o) => o.powerMusicCovers,
    routineNotes: (o) => o.routineNotes,
    couponCode: (o) => o.couponCode || "",
    howDidYouFindOut: (o) => o.howDidYouFindOut || "",
    customVoiceovers: (o) => o.customVoiceovers,
};
function rawFieldValue(order, key) {
    const getter = FIELD_GETTERS[key];
    if (getter)
        return getter(order) || "";
    const direct = order[key];
    if (direct === null || direct === undefined)
        return "";
    return String(direct);
}
function getOrderDetailFields(order) {
    const columns = (0, order_columns_1.getOrderFormColumns)(order);
    return columns
        .map((col) => {
        const raw = rawFieldValue(order, col.key);
        const multiline = col.nowrap === false;
        return {
            key: col.key,
            label: col.header,
            value: multiline ? (0, order_form_1.displayMultiline)(raw, 500) : (0, order_form_1.displayText)(raw),
            multiline,
        };
    })
        .filter((field) => field.value !== "—");
}
function enrichOrderFromMTD(rec) {
    const { limit } = (0, package_1.parsePackage)(rec.package);
    return {
        packageType: rec.package,
        timeLengthOfMix: limit !== "-" ? limit : "",
        teamName: rec.programName,
        gymName: rec.programName.split(" — ")[0]?.trim() || rec.programName,
        requestedEditor: rec.editorRequest === "FA" ? "First Available" : String(rec.editorRequest),
        songListSuggestions: rec.musicTheme,
        routineNotes: rec.musicTheme,
        sendingEightCountSheets: rec.eightCountSheet || "",
        musicAffiliate: "Power Music Covers",
        division: rec.section || rec.category,
    };
}
function orderFromMTDRecord(rec, linked, orderById) {
    if (linked)
        return linked;
    const meta = (0, mtd_filters_1.resolveMTDFormMeta)(rec, orderById ?? new Map());
    return (0, order_form_1.normalizeOrder)({
        id: rec.orderId || rec.id,
        formType: meta.formType,
        cheerFormSubtype: meta.cheerFormSubtype,
        danceFormSubtype: meta.danceFormSubtype,
        customerName: rec.contactName,
        contactName: rec.contactName,
        programName: rec.programName,
        schoolProgramName: rec.programName,
        schoolAddress: "",
        city: "",
        stateProvince: "",
        zipPostalCode: "",
        country: "United States",
        division: rec.section,
        coachName: rec.contactName,
        coachPhone: "",
        coachEmail: "",
        billingPersonName: rec.contactName,
        billingPersonEmail: "",
        choreographerName: "N/A",
        choreographerEmail: "N/A",
        numberOfCopies: "",
        packageType: rec.package,
        requestedEditor: rec.editorRequest === "FA" ? "First Available" : String(rec.editorRequest),
        timeLengthOfMix: "",
        musicAffiliate: "Power Music Covers",
        powerMusicCovers: rec.musicTheme,
        routineNotes: rec.musicTheme,
        customVoiceovers: "No - None",
        category: rec.category,
        package: rec.package,
        musicTheme: rec.musicTheme,
        editorRequest: rec.editorRequest,
        requestedProducer: String(rec.editorRequest),
        price: rec.price,
        status: "in_mtd",
        createdAt: "",
        needsAttention: rec.needsAttention,
        attentionReason: null,
        ...enrichOrderFromMTD(rec),
    });
}
