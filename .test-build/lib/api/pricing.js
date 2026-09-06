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
    return client_1.apiClient.post(`/api/orders/${orderId}/complete-pricing`, req);
}
async function finalizePayrollApi(orderId, req) {
    return client_1.apiClient.post(`/api/orders/${orderId}/finalize-payroll`, req);
}
