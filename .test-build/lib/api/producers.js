"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformProducer = transformProducer;
exports.fetchProducersApi = fetchProducersApi;
exports.createProducerApi = createProducerApi;
exports.updateProducerApi = updateProducerApi;
exports.deleteProducerApi = deleteProducerApi;
const client_1 = require("./client");
function transformProducer(bp) {
    return {
        id: bp.legacy_id || bp.id,
        name: bp.name,
        initials: bp.initials,
        email: bp.email,
        specialty: bp.specialty,
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
        overtimeDays: bp.overtime_days || [],
        compensationModel: bp.compensation_model ?? null,
        defaultRate: bp.default_rate ?? null,
        ratesByCategory: bp.rates_by_category ?? null,
        rateOverrides: bp.rate_overrides ?? null,
        manualInputFields: bp.manual_input_fields ?? null,
        notes: bp.notes ?? null,
    };
}
async function fetchProducersApi() {
    const backendProducers = await client_1.apiClient.get("/api/producers");
    return backendProducers.map(transformProducer);
}
async function createProducerApi(producer) {
    const payload = {
        name: producer.name,
        initials: producer.initials,
        email: producer.email,
        specialty: producer.specialty,
        avatar: producer.avatar,
        status: producer.status,
        work_days: producer.workDays,
        max_mixes_per_day: producer.maxMixesPerDay,
        overtime_days: producer.overtimeDays,
        compensation_model: producer.compensationModel,
        default_rate: producer.defaultRate,
        rates_by_category: producer.ratesByCategory,
        rate_overrides: producer.rateOverrides,
        manual_input_fields: producer.manualInputFields,
        notes: producer.notes,
    };
    const res = await client_1.apiClient.post("/api/producers", payload);
    return transformProducer(res);
}
async function updateProducerApi(id, patch) {
    const payload = {};
    if (patch.name !== undefined)
        payload.name = patch.name;
    if (patch.initials !== undefined)
        payload.initials = patch.initials;
    if (patch.email !== undefined)
        payload.email = patch.email;
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
    if (patch.rateOverrides !== undefined)
        payload.rate_overrides = patch.rateOverrides;
    if (patch.manualInputFields !== undefined)
        payload.manual_input_fields = patch.manualInputFields;
    if (patch.notes !== undefined)
        payload.notes = patch.notes;
    const res = await client_1.apiClient.patch(`/api/producers/${id}`, payload);
    return transformProducer(res);
}
async function deleteProducerApi(id) {
    await client_1.apiClient.delete(`/api/producers/${id}`);
}
