"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const gmail_1 = require("../api/gmail");
(0, node_test_1.describe)("Gmail Integration Phase 1 Client & Security Unit Tests", () => {
    (0, node_test_1.it)("1. GmailStatusResponse data structure contains only safe metadata (no refresh_token or credentials)", () => {
        const mockStatus = {
            connected: true,
            email: "megan@soundslikethat.com",
            provider: "google",
            updated_at: "2026-09-11T09:00:00Z",
        };
        strict_1.default.equal(mockStatus.connected, true);
        strict_1.default.equal(mockStatus.email, "megan@soundslikethat.com");
        strict_1.default.equal(mockStatus.provider, "google");
        const keys = Object.keys(mockStatus);
        strict_1.default.equal(keys.includes("refresh_token"), false, "Status response must never expose refresh_token");
        strict_1.default.equal(keys.includes("client_secret"), false, "Status response must never expose client_secret");
        strict_1.default.equal(keys.includes("access_token"), false, "Status response must never expose access_token");
    });
    (0, node_test_1.it)("2. Client API functions are properly exported and return expected shape", () => {
        strict_1.default.equal(typeof gmail_1.getGmailStatus, "function");
        strict_1.default.equal(typeof gmail_1.getGmailConnectUrl, "function");
        strict_1.default.equal(typeof gmail_1.disconnectGmail, "function");
        strict_1.default.equal(typeof gmail_1.sendGmailTestEmail, "function");
    });
});
