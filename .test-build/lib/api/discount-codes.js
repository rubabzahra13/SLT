"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformDiscountCode = transformDiscountCode;
exports.fetchDiscountCodesApi = fetchDiscountCodesApi;
exports.createDiscountCodeApi = createDiscountCodeApi;
exports.updateDiscountCodeApi = updateDiscountCodeApi;
exports.deleteDiscountCodeApi = deleteDiscountCodeApi;
const client_1 = require("./client");
function transformDiscountCode(bd) {
    return {
        id: bd.legacy_id || bd.id,
        code: bd.code,
        description: bd.description || "",
    };
}
async function fetchDiscountCodesApi() {
    const backendCodes = await client_1.apiClient.get("/api/discount-codes");
    return backendCodes.map(transformDiscountCode);
}
async function createDiscountCodeApi(dc) {
    const payload = {
        code: dc.code,
        description: dc.description,
    };
    const res = await client_1.apiClient.post("/api/discount-codes", payload);
    return transformDiscountCode(res);
}
async function updateDiscountCodeApi(id, patch) {
    const payload = {};
    if (patch.code !== undefined)
        payload.code = patch.code;
    if (patch.description !== undefined)
        payload.description = patch.description;
    const res = await client_1.apiClient.patch(`/api/discount-codes/${id}`, payload);
    return transformDiscountCode(res);
}
async function deleteDiscountCodeApi(id) {
    await client_1.apiClient.delete(`/api/discount-codes/${id}`);
}
