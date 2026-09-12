"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMTDRecord = transformMTDRecord;
exports.fetchMTDRecordsApi = fetchMTDRecordsApi;
exports.createMTDRecordApi = createMTDRecordApi;
exports.updateMTDRecordApi = updateMTDRecordApi;
const client_1 = require("./client");
function transformMTDRecord(bm) {
    return {
        id: bm.legacy_id || bm.id,
        legacyId: bm.legacy_id || undefined,
        uuid: bm.id,
        orderId: bm.order_id || undefined,
        section: bm.section || "CHEERLEADING MUSIC",
        assignedProducer: bm.assigned_producer && bm.assigned_producer !== "FA" && bm.assigned_producer !== "NA" ? bm.assigned_producer : null,
        category: bm.category || "Cheer",
        editorRequest: bm.editor_request || "FA",
        contactName: bm.contact_name || "",
        editorInitials: bm.editor_initials || bm.assigned_producer || "",
        programName: bm.program_name || "",
        package: bm.package || "",
        musicTheme: bm.music_theme || "",
        price: bm.price ?? 0,
        priceCompliance: bm.price_compliance || "compliant",
        invoice: bm.invoice || "",
        mixStartDate: bm.mix_start_date || "",
        mixEndDate: bm.mix_end_date || undefined,
        waitingOn: bm.waiting_on || null,
        eightCountSheet: bm.eight_count_sheet || "",
        haveSongs: bm.have_songs || "",
        needsAttention: Boolean(bm.needs_attention),
        status: bm.status || "active",
        recordStatus: bm.record_status || undefined,
        inMTD: Boolean(bm.in_mtd ?? bm.inMTD),
        inPayroll: Boolean(bm.in_payroll),
        completedAt: bm.completed_at || undefined,
        hasRallyMix: Boolean(bm.has_rally_mix ?? bm.hasRallyMix),
        hasExtend8ctAddon: Boolean(bm.has_extend_8ct_addon ?? bm.hasExtend8ctAddon),
        hasProcessing8ctSheetsAddon: Boolean(bm.has_processing_8ct_sheets_addon ?? bm.hasProcessing8ctSheetsAddon),
        systemCalculatedCustomerPrice: bm.system_calculated_customer_price ?? null,
        finalCustomerPrice: bm.final_customer_price ?? null,
        finalCustomerPriceOverridden: Boolean(bm.final_customer_price_overridden),
        pricingBreakdown: bm.pricing_breakdown || null,
        rateUsed: bm.rate_used ?? null,
        rateSource: bm.rate_source || null,
        producerPayout: bm.producer_payout ?? null,
        sltPortion: bm.slt_portion ?? null,
        payrollFinalized: Boolean(bm.payroll_finalized),
        payrollBreakdown: bm.payroll_breakdown || null,
    };
}
async function fetchMTDRecordsApi() {
    const backendMtd = await client_1.apiClient.get("/api/mtd");
    return backendMtd.map(transformMTDRecord);
}
async function createMTDRecordApi(record) {
    const payload = {
        order_id: record.orderId || null,
        section: record.section || "CHEERLEADING MUSIC",
        category: record.category || "Cheer",
        contact_name: record.contactName || "",
        program_name: record.programName || "",
        package: record.package || "",
        price: record.price ?? 0,
        music_theme: record.musicTheme || null,
        editor_request: record.editorRequest || "FA",
        assigned_producer: record.assignedProducer || null,
        invoice: record.invoice || "",
        mix_start_date: record.mixStartDate || null,
        mix_end_date: record.mixEndDate || null,
        record_status: record.recordStatus || (record.assignedProducer ? "Ongoing" : null),
        eight_count_sheet: record.eightCountSheet || "NEED CS",
        have_songs: record.haveSongs || "NEED SONGS",
        needs_attention: record.needsAttention ?? false,
        status: record.status || "active",
        in_mtd: Boolean(record.inMTD),
        has_rally_mix: Boolean(record.hasRallyMix),
        has_extend_8ct_addon: Boolean(record.hasExtend8ctAddon),
        has_processing_8ct_sheets_addon: Boolean(record.hasProcessing8ctSheetsAddon),
    };
    const res = await client_1.apiClient.post("/api/mtd", payload);
    return transformMTDRecord(res);
}
async function updateMTDRecordApi(id, patch) {
    const payload = {};
    if (patch.section !== undefined)
        payload.section = patch.section;
    if (patch.assignedProducer !== undefined)
        payload.assigned_producer = patch.assignedProducer;
    if (patch.category !== undefined)
        payload.category = patch.category;
    if (patch.editorRequest !== undefined)
        payload.editor_request = patch.editorRequest;
    if (patch.contactName !== undefined)
        payload.contact_name = patch.contactName;
    if (patch.editorInitials !== undefined)
        payload.editor_initials = patch.editorInitials;
    if (patch.programName !== undefined)
        payload.program_name = patch.programName;
    if (patch.package !== undefined)
        payload.package = patch.package;
    if (patch.musicTheme !== undefined)
        payload.music_theme = patch.musicTheme;
    if (patch.price !== undefined)
        payload.price = patch.price;
    if (patch.priceCompliance !== undefined)
        payload.price_compliance = patch.priceCompliance;
    if (patch.invoice !== undefined)
        payload.invoice = patch.invoice;
    if (patch.mixStartDate !== undefined)
        payload.mix_start_date = patch.mixStartDate || null;
    if (patch.mixEndDate !== undefined)
        payload.mix_end_date = patch.mixEndDate || null;
    if (patch.waitingOn !== undefined)
        payload.waiting_on = patch.waitingOn;
    if (patch.eightCountSheet !== undefined)
        payload.eight_count_sheet = patch.eightCountSheet;
    if (patch.haveSongs !== undefined)
        payload.have_songs = patch.haveSongs;
    if (patch.needsAttention !== undefined)
        payload.needs_attention = patch.needsAttention;
    if (patch.status !== undefined)
        payload.status = patch.status;
    if (patch.recordStatus !== undefined)
        payload.record_status = patch.recordStatus;
    if (patch.inMTD !== undefined)
        payload.in_mtd = patch.inMTD;
    if (patch.inPayroll !== undefined)
        payload.in_payroll = patch.inPayroll;
    if (patch.completedAt !== undefined)
        payload.completed_at = patch.completedAt;
    if (patch.hasRallyMix !== undefined)
        payload.has_rally_mix = patch.hasRallyMix;
    if (patch.hasExtend8ctAddon !== undefined)
        payload.has_extend_8ct_addon = patch.hasExtend8ctAddon;
    if (patch.hasProcessing8ctSheetsAddon !== undefined)
        payload.has_processing_8ct_sheets_addon = patch.hasProcessing8ctSheetsAddon;
    if (patch.systemCalculatedCustomerPrice !== undefined) {
        payload.system_calculated_customer_price = patch.systemCalculatedCustomerPrice;
    }
    if (patch.finalCustomerPrice !== undefined) {
        payload.final_customer_price = patch.finalCustomerPrice;
    }
    if (patch.finalCustomerPriceOverridden !== undefined) {
        payload.final_customer_price_overridden = patch.finalCustomerPriceOverridden;
    }
    if (patch.rateUsed !== undefined)
        payload.rate_used = patch.rateUsed;
    if (patch.rateSource !== undefined)
        payload.rate_source = patch.rateSource;
    if (patch.producerPayout !== undefined)
        payload.producer_payout = patch.producerPayout;
    if (patch.sltPortion !== undefined)
        payload.slt_portion = patch.sltPortion;
    if (patch.payrollFinalized !== undefined) {
        payload.payroll_finalized = patch.payrollFinalized;
    }
    if (patch.payrollBreakdown !== undefined) {
        payload.payroll_breakdown = patch.payrollBreakdown;
    }
    try {
        const res = await client_1.apiClient.patch(`/api/mtd/${id}`, payload);
        return transformMTDRecord(res);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError) {
            console.warn(`MTD Record ${id} update not persisted to backend (${err.message}). Local update retained.`);
            return { id, ...patch };
        }
        throw err;
    }
}
