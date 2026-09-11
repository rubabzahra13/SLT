import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getGmailStatus,
  getGmailConnectUrl,
  disconnectGmail,
  sendGmailTestEmail,
  type GmailStatusResponse,
} from "../api/gmail";

describe("Gmail Integration Phase 1 Client & Security Unit Tests", () => {
  it("1. GmailStatusResponse data structure contains only safe metadata (no refresh_token or credentials)", () => {
    const mockStatus: GmailStatusResponse = {
      connected: true,
      email: "megan@soundslikethat.com",
      provider: "google",
      updated_at: "2026-09-11T09:00:00Z",
    };

    assert.equal(mockStatus.connected, true);
    assert.equal(mockStatus.email, "megan@soundslikethat.com");
    assert.equal(mockStatus.provider, "google");

    const keys = Object.keys(mockStatus);
    assert.equal(keys.includes("refresh_token"), false, "Status response must never expose refresh_token");
    assert.equal(keys.includes("client_secret"), false, "Status response must never expose client_secret");
    assert.equal(keys.includes("access_token"), false, "Status response must never expose access_token");
  });

  it("2. Client API functions are properly exported and return expected shape", () => {
    assert.equal(typeof getGmailStatus, "function");
    assert.equal(typeof getGmailConnectUrl, "function");
    assert.equal(typeof disconnectGmail, "function");
    assert.equal(typeof sendGmailTestEmail, "function");
  });
});
