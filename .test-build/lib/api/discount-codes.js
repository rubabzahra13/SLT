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
        discountType: bd.discount_type === "percentage"
            ? "percentage"
            : bd.discount_type === "fixed"
                ? "fixed"
                : undefined,
        discountValue: typeof bd.discount_value === "number" ? bd.discount_value : undefined,
    };
}
async function fetchDiscountCodesApi() {
    try {
        const backendCodes = await client_1.apiClient.get("/api/discount-codes");
        return backendCodes.map(transformDiscountCode);
    }
    catch (err) {
        console.warn("Failed to fetch discount codes from backend API:", err);
        return [];
    }
}
async function createDiscountCodeApi(dc) {
    const payload = {
        code: dc.code,
        description: dc.description,
        discount_type: dc.discountType,
        discount_value: dc.discountValue,
    };
    try {
        const res = await client_1.apiClient.post("/api/discount-codes", payload);
        return transformDiscountCode(res);
    }
    catch (err) {
        console.warn("Failed to persist new discount code to backend API:", err);
        return dc;
    }
}
async function updateDiscountCodeApi(id, patch) {
    const payload = {};
    if (patch.code !== undefined)
        payload.code = patch.code;
    if (patch.description !== undefined)
        payload.description = patch.description;
    if (patch.discountType !== undefined)
        payload.discount_type = patch.discountType;
    if (patch.discountValue !== undefined)
        payload.discount_value = patch.discountValue;
    try {
        const res = await client_1.apiClient.patch(`/api/discount-codes/${id}`, payload);
        return transformDiscountCode(res);
    }
    catch (err) {
        console.warn("Failed to persist discount code update to backend API:", err);
        return {
            id,
            code: patch.code || "",
            description: patch.description,
            discountType: patch.discountType,
            discountValue: patch.discountValue,
        };
    }
}
async function deleteDiscountCodeApi(id) {
    try {
        await client_1.apiClient.delete(`/api/discount-codes/${id}`);
    }
    catch (err) {
        console.warn("Failed to delete discount code from backend API:", err);
    }
}
