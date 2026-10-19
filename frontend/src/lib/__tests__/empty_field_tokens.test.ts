import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describeEmptyFieldToken,
  EMPTY_FIELD_TOKENS,
  hasMeaningfulFieldValue,
  isEmptyFieldToken,
} from "../empty-field-tokens";
import { getOrderRequirements } from "../order-requirements";
import { getOrderFormFieldsBlockingMtd } from "../order-form-missing";
import type { Order } from "@/types";

describe("empty-field-tokens", () => {
  it("treats common customer placeholders as empty", () => {
    for (const token of [
      "none",
      "None",
      "NONE",
      "n/a",
      "N/A",
      "null",
      "NULL",
      "tbd",
      "TBD",
      "-",
      "...",
      "empty",
      "not applicable",
      "  none  ",
    ]) {
      assert.equal(
        hasMeaningfulFieldValue(token),
        false,
        `expected empty: ${JSON.stringify(token)}`
      );
      assert.equal(isEmptyFieldToken(token), true);
    }
  });

  it("treats real content as present", () => {
    assert.equal(hasMeaningfulFieldValue("Power Music song list"), true);
    assert.equal(hasMeaningfulFieldValue("2:30"), true);
    assert.equal(hasMeaningfulFieldValue("yes"), true);
    assert.equal(hasMeaningfulFieldValue("no"), true);
  });

  it("allows N/A on choreographer fields only", () => {
    assert.equal(hasMeaningfulFieldValue("N/A"), false);
    assert.equal(
      hasMeaningfulFieldValue("N/A", { fieldKey: "choreographerName" }),
      true
    );
    assert.equal(
      hasMeaningfulFieldValue("none", { fieldKey: "choreographerName" }),
      false
    );
  });

  it("describeEmptyFieldToken returns the raw placeholder for UI", () => {
    assert.equal(describeEmptyFieldToken("none"), "none");
    assert.equal(describeEmptyFieldToken("Real songs"), null);
  });

  it("dictionary is non-empty and frozen-like", () => {
    assert.ok(EMPTY_FIELD_TOKENS.length >= 20);
  });
});

describe("placeholder tokens on collection + MTD gates", () => {
  const baseSports = {
    id: "ord-1",
    formType: "sports-entertainment" as const,
    category: "Sports Entertainment",
    package: "PRO TEAM MIX",
    packageType: "PRO TEAM MIX",
    organizationName: "Acme Org",
    organizationBillingAddress: "1 Main",
    city: "Austin",
    stateProvince: "TX",
    zipPostalCode: "78701",
    country: "US",
    musicContactName: "Pat",
    musicContactPhone: "555",
    musicContactEmail: "pat@ex.com",
    clientRequestedMixDueDate: "2026-11-01",
    clientRequestedRushOrder: "no",
    timeLengthOfMix: "2:00",
    customerSongs: "none",
    additionalNotes: "none",
  } as unknown as Order;

  it("Songs/Notes pills stay red when song/notes are placeholder tokens", () => {
    const reqs = getOrderRequirements(baseSports);
    const songs = reqs.songsArea.find((r) => r.id === "songs");
    const notes = reqs.songsArea.find((r) => r.id === "notes");
    assert.equal(songs?.state, "red");
    assert.equal(notes?.state, "red");
    assert.equal(reqs.status, "Missing Data");
  });

  it("Move-to-MTD blocks when mandatory fields are placeholder tokens", () => {
    const gaps = getOrderFormFieldsBlockingMtd(baseSports);
    const keys = new Set(gaps.map((g) => g.key));
    assert.ok(keys.has("customerSongs") || keys.has("additionalNotes"));
  });

  it("real song/notes content clears collection red for those pills", () => {
    const filled = {
      ...baseSports,
      customerSongs: "Enter Sandman",
      additionalNotes: "Keep intro soft",
    } as Order;
    const reqs = getOrderRequirements(filled);
    assert.equal(reqs.songsArea.find((r) => r.id === "songs")?.state, "green");
    assert.equal(reqs.songsArea.find((r) => r.id === "notes")?.state, "green");
  });
});
