"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProducerApiId = resolveProducerApiId;
exports.transformProducer = transformProducer;
exports.fetchProducersApi = fetchProducersApi;
exports.createProducerApi = createProducerApi;
exports.updateProducerApi = updateProducerApi;
exports.deleteProducerApi = deleteProducerApi;
const client_1 = require("./client");
const producers_1 = require("@/lib/producers");
function resolveProducerApiId(producer) {
    return producer.uuid || producer.id;
}
function transformProducer(bp) {
    const categories = Array.isArray(bp.categories) && bp.categories.length > 0
        ? bp.categories
        : bp.specialty
            ? [bp.specialty]
            : [];
    return (0, producers_1.normalizeProducer)({
        id: bp.legacy_id || bp.id,
        legacyId: bp.legacy_id || undefined,
        uuid: bp.id,
        name: bp.name,
        initials: bp.initials,
        email: bp.email,
        categories,
        specialty: bp.specialty || categories[0] || "",
        avatar: bp.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${bp.initials}`,
        mixesThisWeek: bp.mixes_this_week ?? 0,
        nextAvailable: bp.next_available || "Available",
        status: bp.status || "available",
        workDays: bp.work_days || ["mon", "tue", "wed", "thu", "fri"],
        timeOff: (bp.time_offs || []).map((to) => ({
            id: to.id,
            startDate: to.start_date,
            endDate: to.end_date,
            type: to.type,
            reason: to.reason,
        })),
        maxMixesPerDay: bp.max_mixes_per_day ?? null,
        maxProducerCostPerDay: bp.max_producer_cost_per_day ?? null,
        overtimeDays: bp.overtime_days || [],
        compensationModel: bp.compensation_model ?? null,
        defaultRate: bp.default_rate ?? null,
        ratesByCategory: bp.rates_by_category ?? null,
        danceVoiceoverRate: bp.dance_voiceover_rate ?? null,
        cheerVoiceoverRate: bp.cheer_voiceover_rate ?? null,
        rushFeeRate: bp.rush_fee_rate ?? null,
        rateOverrides: bp.rate_overrides ?? null,
        manualInputFields: bp.manual_input_fields ?? null,
        notes: bp.notes ?? null,
    });
}
async function fetchProducersApi() {
    const backendProducers = await client_1.apiClient.get("/api/producers");
    return backendProducers.map(transformProducer);
}
async function createProducerApi(producer) {
    const payload = {
        legacy_id: producer.legacyId || producer.id,
        name: producer.name,
        initials: producer.initials,
        email: producer.email,
        categories: producer.categories,
        specialty: producer.specialty,
        avatar: producer.avatar,
        status: producer.status,
        work_days: producer.workDays,
        max_mixes_per_day: producer.maxMixesPerDay,
        max_producer_cost_per_day: producer.maxProducerCostPerDay,
        overtime_days: producer.overtimeDays,
        compensation_model: producer.compensationModel,
        default_rate: producer.defaultRate,
        rates_by_category: producer.ratesByCategory,
        dance_voiceover_rate: producer.danceVoiceoverRate,
        cheer_voiceover_rate: producer.cheerVoiceoverRate,
        rush_fee_rate: producer.rushFeeRate,
        rate_overrides: producer.rateOverrides,
        manual_input_fields: producer.manualInputFields,
        notes: producer.notes,
    };
    const res = await client_1.apiClient.post("/api/producers", payload);
    return transformProducer(res);
}
async function updateProducerApi(id, patch, apiId) {
    const payload = {};
    if (patch.name !== undefined)
        payload.name = patch.name;
    if (patch.initials !== undefined)
        payload.initials = patch.initials;
    if (patch.email !== undefined)
        payload.email = patch.email;
    if (patch.categories !== undefined)
        payload.categories = patch.categories;
    if (patch.specialty !== undefined)
        payload.specialty = patch.specialty;
    if (patch.avatar !== undefined)
        payload.avatar = patch.avatar;
    if (patch.status !== undefined)
        payload.status = patch.status;
    if (patch.workDays !== undefined)
        payload.work_days = patch.workDays;
    if (patch.maxMixesPerDay !== undefined)
        payload.max_mixes_per_day = patch.maxMixesPerDay;
    if (patch.maxProducerCostPerDay !== undefined)
        payload.max_producer_cost_per_day = patch.maxProducerCostPerDay;
    if (patch.overtimeDays !== undefined)
        payload.overtime_days = patch.overtimeDays;
    if (patch.mixesThisWeek !== undefined)
        payload.mixes_this_week = patch.mixesThisWeek;
    if (patch.nextAvailable !== undefined)
        payload.next_available = patch.nextAvailable;
    if (patch.compensationModel !== undefined)
        payload.compensation_model = patch.compensationModel;
    if (patch.defaultRate !== undefined)
        payload.default_rate = patch.defaultRate;
    if (patch.ratesByCategory !== undefined)
        payload.rates_by_category = patch.ratesByCategory;
    if (patch.danceVoiceoverRate !== undefined)
        payload.dance_voiceover_rate = patch.danceVoiceoverRate;
    if (patch.cheerVoiceoverRate !== undefined)
        payload.cheer_voiceover_rate = patch.cheerVoiceoverRate;
    if (patch.rushFeeRate !== undefined)
        payload.rush_fee_rate = patch.rushFeeRate;
    if (patch.rateOverrides !== undefined)
        payload.rate_overrides = patch.rateOverrides;
    if (patch.manualInputFields !== undefined)
        payload.manual_input_fields = patch.manualInputFields;
    if (patch.notes !== undefined)
        payload.notes = patch.notes;
    try {
        const res = await client_1.apiClient.patch(`/api/producers/${apiId || id}`, payload);
        return transformProducer(res);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError) {
            throw err;
        }
        throw err;
    }
}
async function deleteProducerApi(id, apiId) {
    try {
        await client_1.apiClient.delete(`/api/producers/${apiId || id}`);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError && err.status === 404) {
            // Producer is already deleted/missing on backend DB; complete deletion gracefully
            return;
        }
        throw err;
    }
}
