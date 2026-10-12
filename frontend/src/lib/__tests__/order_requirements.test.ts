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

    const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["mix", "songs"].sort());
    assert.strictEqual(reqs.compliancyMet, true);

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
    const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["mix", "notes", "songs"].sort());
    assert.strictEqual(reqs.compliancyMet, true);

    const songReq = reqs.songsArea.find((r) => r.id === "songs");
    assert.strictEqual(songReq?.label, "Song");
  });

  it("Cheer Titanium requires Notes, CS, Video (No Songs)", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      package: "Titanium 2:30",
      routineNotes: "Routine video attached https://vimeo.com/demo",
      sendingEightCountSheets: "Yes",
    };

    const reqs = getOrderRequirements(order as Order);
    const applicable = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(applicable.sort(), ["cs", "notes", "video"].sort());

    const songsReq = reqs.all.find((r) => r.id === "songs");
    assert.strictEqual(songsReq?.isApplicable, false);
  });

  it("Cheer Platinum requires Songs, CS, Video", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      package: "Platinum 2:30",
      songListSuggestions: "Have",
      sendingEightCountSheets: "Yes",
      routineNotes: "Video link provided",
    };

    const reqs = getOrderRequirements(order as Order);
    const applicable = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(applicable.sort(), ["cs", "songs", "video"].sort());
  });

  it("Form Yes makes CS red until admin marks HAVE CS; Form No is N/A", () => {
    const goldYes: Partial<Order> = {
      category: "Cheer",
      package: "Gold 2:00",
      songListSuggestions: "Have",
      sendingEightCountSheets: "Yes",
    };
    const yesReqs = getOrderRequirements(goldYes as Order);
    const yesCs = yesReqs.collections.find((r) => r.id === "cs");
    assert.strictEqual(yesCs?.isApplicable, true);
    assert.strictEqual(yesCs?.state, "red");

    const goldYesHave: Partial<Order> = {
      ...goldYes,
      eightCountSheet: "HAVE CS",
      collectionStates: { cs: true },
    };
    const haveReqs = getOrderRequirements(goldYesHave as Order);
    const haveCs = haveReqs.collections.find((r) => r.id === "cs");
    assert.strictEqual(haveCs?.state, "green");

    const goldNo: Partial<Order> = {
      category: "Cheer",
      package: "Gold 2:00",
      songListSuggestions: "Have",
      sendingEightCountSheets: "No",
      eightCountSheet: "NEED CS",
    };
    const noReqs = getOrderRequirements(goldNo as Order);
    const noCs = noReqs.collections.find((r) => r.id === "cs");
    assert.strictEqual(noCs?.isApplicable, false);
    assert.strictEqual(noCs?.state, "white");
  });

  it("Marching Band Band Chant requires Song, Time of Mix", () => {
    const order: Partial<Order> = {
      category: "Marching Band",
      package: "Band Chant",
      timeLengthOfMix: "1:30",
      songListSuggestions: "Fight Song Track",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["mix", "songs"].sort());

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
    const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["mix", "notes", "songs"].sort());
  });

  it("manual orders include a Form collection pill; form orders do not", () => {
    const formOrder: Partial<Order> = {
      category: "Cheer",
      package: "Platinum 2:30",
      songListSuggestions: "Have",
      sendingEightCountSheets: "Yes",
      isManualEntry: false,
    };
    const formReqs = getOrderRequirements(formOrder as Order);
    assert.ok(!formReqs.collections.some((r) => r.id === "form"));

    const manualOrder: Partial<Order> = {
      ...formOrder,
      isManualEntry: true,
    };
    const manualReqs = getOrderRequirements(manualOrder as Order);
    const formPill = manualReqs.collections.find((r) => r.id === "form");
    assert.ok(formPill, "manual orders must show Form");
    assert.strictEqual(formPill?.isApplicable, true);
    assert.strictEqual(formPill?.state, "red");
    assert.deepStrictEqual(
      manualReqs.collections.map((r) => r.id),
      ["mix", "cs", "video", "form"]
    );

    const collected = getOrderRequirements({
      ...manualOrder,
      collectionStates: { form: true },
    } as Order);
    assert.strictEqual(
      collected.collections.find((r) => r.id === "form")?.state,
      "green"
    );
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
