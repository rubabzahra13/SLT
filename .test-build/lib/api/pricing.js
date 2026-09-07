"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePricingApi = calculatePricingApi;
exports.completePricingApi = completePricingApi;
exports.finalizePayrollApi = finalizePayrollApi;
const client_1 = require("./client");
async function calculatePricingApi(req) {
    return client_1.apiClient.post("/api/pricing/calculate", req);
}
async function completePricingApi(orderId, req) {
    try {
        return await client_1.apiClient.post(`/api/orders/${orderId}/complete-pricing`, req);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError) {
            console.warn(`Order ${orderId} complete pricing managed locally (${err.message}).`);
            return {
                order_id: orderId,
                system_calculated_customer_price: null,
                final_customer_price: req.final_customer_price_override ?? null,
                final_customer_price_overridden: Boolean(req.final_customer_price_override),
                price_compliance: null,
                pricing_breakdown: null,
            };
        }
        throw err;
    }
}
async function finalizePayrollApi(orderId, req) {
    try {
        return await client_1.apiClient.post(`/api/orders/${orderId}/finalize-payroll`, req);
    }
    catch (err) {
        if (err instanceof client_1.ApiClientError) {
            console.warn(`Order ${orderId} finalize payroll managed locally (${err.message}).`);
            return {
                order_id: orderId,
                system_calculated_customer_price: null,
                final_customer_price: req.final_customer_price ?? null,
                final_customer_price_overridden: false,
                price_compliance: null,
                pricing_breakdown: null,
            };
        }
        throw err;
    }
}
