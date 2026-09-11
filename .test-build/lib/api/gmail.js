"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGmailStatus = getGmailStatus;
exports.getGmailConnectUrl = getGmailConnectUrl;
exports.disconnectGmail = disconnectGmail;
exports.sendGmailTestEmail = sendGmailTestEmail;
exports.sendGmailEmail = sendGmailEmail;
const client_1 = require("./client");
function authHeaders(token) {
    if (!token)
        return {};
    return { Authorization: `Bearer ${token}` };
}
async function getGmailStatus(token) {
    return client_1.apiClient.get("/api/gmail/status", {
        headers: authHeaders(token),
    });
}
async function getGmailConnectUrl(token) {
    return client_1.apiClient.get("/api/gmail/connect", {
        headers: authHeaders(token),
    });
}
async function disconnectGmail(token) {
    return client_1.apiClient.post("/api/gmail/disconnect", undefined, {
        headers: authHeaders(token),
    });
}
async function sendGmailTestEmail(token) {
    return client_1.apiClient.post("/api/gmail/test-email", undefined, {
        headers: authHeaders(token),
    });
}
async function sendGmailEmail(payload, token) {
    return client_1.apiClient.post("/api/gmail/send", payload, {
        headers: authHeaders(token),
    });
}
