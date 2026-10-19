import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mtdPatchFromOrderField } from "../mtd-order-sync";

describe("Phase 5 — MTD collection SoT is Orders", () => {
  it("direct collection field edits do not dual-write onto MTD storage", () => {
    assert.deepEqual(mtdPatchFromOrderField("eightCountSheet", "HAVE CS"), {});
    assert.deepEqual(mtdPatchFromOrderField("haveSongs", "HAVE SONGS"), {});
    assert.deepEqual(mtdPatchFromOrderField("needsAttention", "true"), {});
    assert.deepEqual(mtdPatchFromOrderField("orderStatus", "Complete"), {});
  });

  it("song list still mirrors haveSongs locally for board pills", () => {
    const songs = mtdPatchFromOrderField("songListSuggestions", "Song 1");
    assert.equal(songs.haveSongs, "HAVE SONGS");
    assert.equal(songs.songListSuggestions, "Song 1");
  });

  it("sending No for 8-count clears local CS display only", () => {
    const patch = mtdPatchFromOrderField("sendingEightCountSheets", "No");
    assert.equal(patch.eightCountSheet, "");
  });
});
