import { describe, it } from "node:test";
import assert from "node:assert";
import { getOrderRequirements } from "../order-requirements";
import type { Order } from "../../types";

describe("SLT Implementation 2: Package-Specific Data Collection Rules", () => {
  it("Dance Custom POM requires Songs, Time of Mix, Compliancy", () => {
    const order: Partial<Order> = {
      category: "Dance",
      package: "Custom POM 2:15",
      timeLengthOfMix: "2:15",
      musicAffiliate: "Power Music",
      songListSuggestions: "Have",
    };

    const reqs = getOrderRequirements(order as Order);
    assert.strictEqual(reqs.allMet, true);

    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["compliancy", "songs", "time_of_mix"].sort());

    const songReq = reqs.songsArea.find((r) => r.id === "songs");
    assert.strictEqual(songReq?.label, "Songs");
  });

  it("Dance Jazz Simple Cut requires Song, Time of Mix, Notes (No Compliancy)", () => {
    const order: Partial<Order> = {
      category: "Dance",
      package: "Jazz Simple Cut 1:45",
      timeLengthOfMix: "1:45",
      routineNotes: "Soft acoustic transition",
      songListSuggestions: "Acoustic Track",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["notes", "songs", "time_of_mix"].sort());

    const songReq = reqs.songsArea.find((r) => r.id === "songs");
    assert.strictEqual(songReq?.label, "Song");
  });

  it("Cheer Titanium requires Notes, 8-count Sheets, Video (No Songs)", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      package: "Titanium 2:30",
      routineNotes: "Routine video attached https://vimeo.com/demo",
      sendingEightCountSheets: "Yes",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["eight_count", "notes", "video"].sort());

    const songsPresent = reqs.all.some((r) => r.id === "songs");
    assert.strictEqual(songsPresent, false);
  });

  it("Cheer Platinum requires Songs, 8-count Sheets, Video", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      package: "Platinum 2:30",
      songListSuggestions: "Have",
      sendingEightCountSheets: "Yes",
      routineNotes: "Video link provided",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["eight_count", "songs", "video"].sort());
  });

  it("Marching Band Band Chant requires Song, Time of Mix", () => {
    const order: Partial<Order> = {
      category: "Marching Band",
      package: "Band Chant",
      timeLengthOfMix: "1:30",
      songListSuggestions: "Fight Song Track",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["songs", "time_of_mix"].sort());

    const songReq = reqs.songsArea.find((r) => r.id === "songs");
    assert.strictEqual(songReq?.label, "Song");
  });

  it("Sports Entertainment requires Songs, Notes, Time of Mix", () => {
    const order: Partial<Order> = {
      category: "Sports Entertainment",
      package: "Stadium Mix 2:00",
      timeLengthOfMix: "2:00",
      routineNotes: "Organ sound FX",
      songListSuggestions: "Have",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["notes", "songs", "time_of_mix"].sort());
  });

  it("correctly identifies orders that are Waiting for Data (missing >= 1 requirement)", () => {
    const completeOrder: Partial<Order> = {
      category: "Dance",
      package: "Custom POM 2:15",
      timeLengthOfMix: "2:15",
      musicAffiliate: "Power Music",
      songListSuggestions: "Have",
    };

    const incompleteOrder: Partial<Order> = {
      category: "Dance",
      package: "Custom POM 2:15",
      timeLengthOfMix: "", // Missing Time of Mix
      musicAffiliate: "Power Music",
      songListSuggestions: "Have",
    };

    assert.strictEqual(getOrderRequirements(completeOrder as Order).missingCount, 0);
    assert.strictEqual(getOrderRequirements(incompleteOrder as Order).missingCount, 1);
    assert.strictEqual(getOrderRequirements(incompleteOrder as Order).allMet, false);
  });
});
