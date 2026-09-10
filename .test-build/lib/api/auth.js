"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginApi = loginApi;
exports.fetchMeApi = fetchMeApi;
exports.logoutApi = logoutApi;
const client_1 = require("./client");
async function loginApi(email, password) {
    return client_1.apiClient.post("/api/auth/login", { email, password });
}
async function fetchMeApi(token) {
    return client_1.apiClient.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
    });
}
async function logoutApi(token) {
    try {
        await client_1.apiClient.post("/api/auth/logout", undefined, {
            headers: { Authorization: `Bearer ${token}` },
        });
    }
    catch {
        // Ignore error on logout
    }
}
