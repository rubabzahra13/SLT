import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mtdPatchFromOrderField, orderPatchFromMTD } from "../mtd-order-sync";

describe("Phase 4: MTD assignment SoT is Orders", () => {
  it("order assignment edits do not dual-write onto MTD", () => {
    assert.deepEqual(mtdPatchFromOrderField("assignedProducer", "CM"), {});
    assert.deepEqual(mtdPatchFromOrderField("mixStartDate", "2026-09-14"), {});
    assert.deepEqual(mtdPatchFromOrderField("mixEndDate", "2026-09-18"), {});
    assert.deepEqual(mtdPatchFromOrderField("isReassigned", "true"), {});
    assert.deepEqual(mtdPatchFromOrderField("editorRequest", "FA"), {});
  });

  it("board identity edits still map to Order patches for SoT writes", () => {
    const patch = orderPatchFromMTD({
      contactName: "Coach B",
      programName: "Org C",
      package: "SILVER",
    });
    assert.equal(patch.contactName, "Coach B");
    assert.equal(patch.programName, "Org C");
    assert.equal(patch.package, "SILVER");
  });

  it("collection / songs still sync to MTD ops fields", () => {
    const songs = mtdPatchFromOrderField("songListSuggestions", "Song 1");
    assert.equal(songs.haveSongs, "HAVE SONGS");
    assert.equal(songs.songListSuggestions, "Song 1");
  });
});
