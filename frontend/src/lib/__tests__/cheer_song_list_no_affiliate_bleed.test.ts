import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { inferMusicAffiliate, normalizeOrder } from "../order-form";
import { orderPatchFromOrderField, mtdPatchFromOrderField } from "../mtd-order-sync";
import type { Order } from "../../types";

function allStarCheerOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "cheer-1",
    formType: "school-all-star-cheer",
    cheerFormSubtype: "all-star-cheer",
    category: "Cheer",
    package: "GOLD 2:00",
    packageType: "GOLD",
    timeLengthOfMix: "2:00",
    musicTheme: "",
    musicAffiliate: "",
    songListSuggestions: "",
    routineNotes: "",
    powerMusicCovers: "",
    customerName: "Coach",
    contactName: "Coach",
    programName: "Elite Gym",
    gymName: "Elite Gym",
    editorRequest: "FA",
    requestedProducer: "",
    price: 950,
    status: "new",
    createdAt: "2026-10-16",
    needsAttention: false,
    isManualEntry: true,
    ...overrides,
  } as Order;
}

describe("All-Star Cheer: Song list must not fill Music Affiliate / Routine Notes", () => {
  it("inferMusicAffiliate ignores free-text song lists; accepts catalog / parenthetical", () => {
    assert.equal(inferMusicAffiliate("My custom song list abc123"), "");
    assert.equal(inferMusicAffiliate("Notes here · (Songs for Cheer)"), "Songs for Cheer");
    assert.equal(inferMusicAffiliate("Non Compliant track"), "Non compliant");
  });

  it("orderPatchFromOrderField for Song list does not write musicTheme", () => {
    const patch = orderPatchFromOrderField(
      "songListSuggestions",
      "Track A / Track B",
      allStarCheerOrder()
    );
    assert.equal(patch.songListSuggestions, "Track A / Track B");
    assert.equal(patch.musicTheme, undefined);
    assert.equal(patch.musicAffiliate, undefined);
    assert.equal(patch.routineNotes, undefined);
  });

  it("mtdPatchFromOrderField for Song list does not write musicTheme", () => {
    const patch = mtdPatchFromOrderField(
      "songListSuggestions",
      "Track A / Track B"
    );
    assert.equal(patch.songListSuggestions, "Track A / Track B");
    assert.equal(patch.musicTheme, undefined);
    assert.equal(patch.haveSongs, "HAVE SONGS");
  });

  it("normalizeOrder keeps Song list out of Music Affiliate and Routine Notes", () => {
    const order = normalizeOrder(
      allStarCheerOrder({
        songListSuggestions: "Random song text from edit form",
        // Simulate older bleed: Song list was copied into musicTheme.
        musicTheme: "Random song text from edit form",
        musicAffiliate: "",
        routineNotes: "",
      })
    );
    assert.equal(order.songListSuggestions, "Random song text from edit form");
    assert.equal(order.musicAffiliate, "");
    assert.equal(order.routineNotes, "");
  });

  it("normalizeOrder scrubs Music Affiliate when it equals Song list text", () => {
    const order = normalizeOrder(
      allStarCheerOrder({
        songListSuggestions: "Bleed text",
        musicAffiliate: "Bleed text",
        routineNotes: "Real notes stay",
      })
    );
    assert.equal(order.musicAffiliate, "");
    assert.equal(order.routineNotes, "Real notes stay");
    assert.equal(order.songListSuggestions, "Bleed text");
  });

  it("editing Song list then normalizing draft does not fill affiliate/notes", () => {
    const base = allStarCheerOrder({
      musicAffiliate: "Songs for Cheer",
      routineNotes: "",
    });
    const draft = {
      ...base,
      ...orderPatchFromOrderField(
        "songListSuggestions",
        "User typed songs here",
        base
      ),
    };
    const saved = normalizeOrder(draft);
    assert.equal(saved.songListSuggestions, "User typed songs here");
    assert.equal(saved.musicAffiliate, "Songs for Cheer");
    assert.equal(saved.routineNotes, "");
  });
});
