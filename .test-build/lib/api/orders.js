"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformOrder = transformOrder;
exports.fetchOrdersApi = fetchOrdersApi;
exports.createOrderApi = createOrderApi;
exports.updateOrderApi = updateOrderApi;
const client_1 = require("./client");
function transformOrder(bo) {
    return {
        id: bo.legacy_id || bo.id,
        legacyId: bo.legacy_id || undefined,
        uuid: bo.id,
        formType: bo.form_type || "school-all-star-cheer",
        cheerFormSubtype: bo.cheer_form_subtype,
        danceFormSubtype: bo.dance_form_subtype,
        schoolProgramName: bo.school_program_name || "",
        schoolAddress: bo.school_address || "",
        city: bo.city || "",
        stateProvince: bo.state_province || "",
        zipPostalCode: bo.zip_postal_code || "",
        country: bo.country || "United States",
        division: bo.division || "",
        coachName: bo.coach_name || "",
        coachPhone: bo.coach_phone || "",
        coachEmail: bo.coach_email || "",
        billingPersonName: bo.billing_person_name || "",
        billingPersonEmail: bo.billing_person_email || "",
        choreographerName: bo.choreographer_name || "",
        choreographerEmail: bo.choreographer_email || "",
        numberOfCopies: bo.number_of_copies || "",
        packageType: bo.package_type || "",
        requestedEditor: bo.requested_editor || "",
        timeLengthOfMix: bo.time_length_of_mix || "",
        musicAffiliate: bo.music_affiliate || "",
        powerMusicCovers: bo.power_music_covers || "",
        routineNotes: bo.routine_notes || "",
        customVoiceovers: bo.custom_voiceovers || "",
        gymName: bo.gym_name || undefined,
        gymBillingAddress: bo.gym_billing_address || undefined,
        teamName: bo.team_name || undefined,
        teamCoedAllGirl: bo.team_coed_all_girl || undefined,
        teamColors: bo.team_colors || undefined,
        schoolName: bo.school_name || undefined,
        schoolBillingAddress: bo.school_billing_address || undefined,
        mascot: bo.mascot || undefined,
        splitOrNoSplit: bo.split_or_no_split || undefined,
        virocChoreographerName: bo.viroc_choreographer_name || undefined,
        virocChoreographerEmail: bo.viroc_choreographer_email || undefined,
        colors: bo.colors || undefined,
        billingAddress: bo.billing_address || undefined,
        coachContactFullName: bo.coach_contact_full_name || undefined,
        coachEmailAddress: bo.coach_email_address || undefined,
        emailAddress: bo.email_address || undefined,
        sendingEightCountSheets: bo.sending_eight_count_sheets || undefined,
        usingEightCountSheets: bo.using_eight_count_sheets || undefined,
        songListSuggestions: bo.song_list_suggestions || undefined,
        couponCode: bo.coupon_code || undefined,
        howDidYouFindOut: bo.how_did_you_find_out || undefined,
        customerName: bo.customer_name || bo.program_name,
        contactName: bo.contact_name || bo.customer_name,
        programName: bo.program_name,
        category: bo.category || "Cheer",
        package: bo.package || "TBD",
        musicTheme: bo.music_theme || "",
        editorRequest: bo.editor_request || "FA",
        requestedProducer: bo.requested_producer || "",
        assignedProducer: bo.editor_request && bo.editor_request !== "FA" && bo.editor_request !== "NA" ? bo.editor_request : null,
        price: bo.price ?? 0,
        priceCompliance: bo.price_compliance || "compliant",
        status: bo.status || "new",
        createdAt: bo.created_at || new Date().toISOString(),
        completedAt: bo.completed_at || null,
        needsAttention: Boolean(bo.needs_attention),
        attentionReason: bo.attention_reason || null,
        systemCalculatedCustomerPrice: bo.system_calculated_customer_price ?? null,
        finalCustomerPrice: bo.final_customer_price ?? null,
        finalCustomerPriceOverridden: Boolean(bo.final_customer_price_overridden),
        pricingBreakdown: bo.pricing_breakdown || null,
        rateUsed: bo.rate_used ?? null,
        rateSource: bo.rate_source || null,
        producerPayout: bo.producer_payout ?? null,
        sltPortion: bo.slt_portion ?? null,
        payrollFinalized: Boolean(bo.payroll_finalized),
        payrollBreakdown: bo.payroll_breakdown || null,
    };
}
async function fetchOrdersApi() {
    const backendOrders = await client_1.apiClient.get("/api/orders");
    const activeOrders = [];
    const pastOrders = [];
    for (const bo of backendOrders) {
        const transformed = transformOrder(bo);
        if (bo.is_past_order || bo.status === "completed") {
            pastOrders.push(transformed);
        }
        else {
            activeOrders.push(transformed);
        }
    }
    return { activeOrders, pastOrders };
}
async function createOrderApi(order) {
    const payload = {
        customer_name: order.customerName || order.programName || "Customer",
        contact_name: order.contactName || order.customerName || "Contact",
        program_name: order.programName || "Program",
        category: order.category || "Cheer",
        package: order.package || "TBD",
        price: order.price ?? 0,
        music_theme: order.musicTheme || null,
        editor_request: order.editorRequest || "FA",
        requested_producer: order.requestedProducer || null,
        form_type: order.formType || "school-all-star-cheer",
        status: order.status || "new",
    };
    const res = await client_1.apiClient.post("/api/orders", payload);
    return transformOrder(res);
}
async function updateOrderApi(id, patch) {
    const payload = {};
    if (patch.customerName !== undefined)
        payload.customer_name = patch.customerName;
    if (patch.contactName !== undefined)
        payload.contact_name = patch.contactName;
    if (patch.programName !== undefined)
        payload.program_name = patch.programName;
    if (patch.category !== undefined)
        payload.category = patch.category;
    if (patch.package !== undefined)
        payload.package = patch.package;
    if (patch.price !== undefined)
        payload.price = patch.price;
    if (patch.musicTheme !== undefined)
        payload.music_theme = patch.musicTheme;
    if (patch.editorRequest !== undefined)
        payload.editor_request = patch.editorRequest;
    if (patch.requestedProducer !== undefined)
        payload.requested_producer = patch.requestedProducer;
    if (patch.status !== undefined)
        payload.status = patch.status;
    if (patch.needsAttention !== undefined)
        payload.needs_attention = patch.needsAttention;
    if (patch.attentionReason !== undefined)
        payload.attention_reason = patch.attentionReason;
    if (patch.completedAt !== undefined)
        payload.completed_at = patch.completedAt;
    try {
        const res = await client_1.apiClient.patch(`/api/orders/${id}`, payload);
        return transformOrder(res);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError && err.status === 404) {
            console.warn(`Order ${id} not found on backend (local/seed order). Update persisted locally.`);
            return { id, ...patch };
        }
        throw err;
    }
}
