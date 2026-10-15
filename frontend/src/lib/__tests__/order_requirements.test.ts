import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getFormSongListColumnText,
  getOrderRequirements,
  mergeOrderFormFieldsForRequirements,
} from "../order-requirements";
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

  it("Cheer Titanium requires Notes, CS, Video; All Star also keeps Songs", () => {
    const schoolTitanium: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "school-cheer-viroc-no",
      package: "Titanium 2:30",
      routineNotes: "Routine video attached https://vimeo.com/demo",
      sendingEightCountSheets: "Yes",
    };

    const schoolReqs = getOrderRequirements(schoolTitanium as Order);
    const schoolApplicable = schoolReqs.all
      .filter((r) => r.isApplicable)
      .map((r) => r.id);
    assert.deepStrictEqual(schoolApplicable.sort(), ["cs", "notes", "video"].sort());
    assert.strictEqual(
      schoolReqs.all.find((r) => r.id === "songs")?.isApplicable,
      false
    );

    const allStarTitanium: Partial<Order> = {
      ...schoolTitanium,
      cheerFormSubtype: "all-star-cheer",
      songListSuggestions: "",
    };
    const allStarReqs = getOrderRequirements(allStarTitanium as Order);
    const songs = allStarReqs.songsArea.find((r) => r.id === "songs");
    const notes = allStarReqs.songsArea.find((r) => r.id === "notes");
    assert.strictEqual(songs?.isApplicable, true);
    assert.strictEqual(songs?.state, "red"); // song list empty
    assert.strictEqual(notes?.isApplicable, true);
    assert.strictEqual(notes?.state, "green"); // routine notes filled
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

  it("Marching Band Band Chant: Song from instrumentation notes + Mix; Notes N/A", () => {
    const order: Partial<Order> = {
      category: "Marching Band",
      formType: "marching-band",
      package: "BAND CHANT",
      packageType: "BAND CHANT",
      timeLengthOfMix: "1:30",
      instrumentationNotes: "Cover in marching band style: Seven Nation Army",
      lyricalNotes: "ignored for Band Chant Notes pill",
    };

    const reqs = getOrderRequirements(order as Order);
    const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
    assert.deepStrictEqual(ids.sort(), ["mix", "songs"].sort());

    const songReq = reqs.songsArea.find((r) => r.id === "songs");
    assert.strictEqual(songReq?.label, "Song");
    assert.strictEqual(songReq?.state, "green");
    assert.strictEqual(reqs.songsArea.find((r) => r.id === "notes")?.state, "white");
    assert.strictEqual(reqs.collections.find((r) => r.id === "mix")?.state, "green");

    const missingSong = getOrderRequirements({
      ...order,
      instrumentationNotes: "",
    } as Order);
    assert.strictEqual(
      missingSong.songsArea.find((r) => r.id === "songs")?.state,
      "red"
    );
  });

  it("Marching Band Fight Song / Alma Mater / Drum Cadence: Mix + Notes from instrumentation; Songs N/A", () => {
    for (const packageType of [
      "FIGHT SONG ORIGINAL",
      "FIGHT SONG PLUS",
      "ALMA MATER ORIGINAL",
      "ALMA MATER PLUS",
      "DRUM CADENCE ORIGINAL",
    ]) {
      const order: Partial<Order> = {
        category: "Marching Band",
        formType: "marching-band",
        package: packageType,
        packageType,
        timeLengthOfMix: "2:00",
        instrumentationNotes: "Full brass & percussion",
        lyricalNotes: "optional — must not drive Notes pill",
      };
      const reqs = getOrderRequirements(order as Order);
      const ids = reqs.all.filter((r) => r.isApplicable).map((r) => r.id);
      assert.deepStrictEqual(
        ids.sort(),
        ["mix", "notes"].sort(),
        packageType
      );
      assert.strictEqual(
        reqs.songsArea.find((r) => r.id === "songs")?.state,
        "white",
        packageType
      );
      assert.strictEqual(
        reqs.songsArea.find((r) => r.id === "notes")?.state,
        "green",
        packageType
      );

      const missingNotes = getOrderRequirements({
        ...order,
        instrumentationNotes: "",
      } as Order);
      assert.strictEqual(
        missingNotes.songsArea.find((r) => r.id === "notes")?.state,
        "red",
        packageType
      );
      // Lyrics alone must not green the Notes pill.
      const lyricsOnly = getOrderRequirements({
        ...order,
        instrumentationNotes: "",
        lyricalNotes: "only lyrics",
      } as Order);
      assert.strictEqual(
        lyricsOnly.songsArea.find((r) => r.id === "notes")?.state,
        "red",
        packageType
      );
    }
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

  it("All Star Cheer shows both Songs and Notes pills", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      package: "Gold 2:00",
      songListSuggestions: "Track list",
      routineNotes: "Routine notes",
    };
    const reqs = getOrderRequirements(order as Order);
    const songs = reqs.songsArea.find((r) => r.id === "songs");
    const notes = reqs.songsArea.find((r) => r.id === "notes");
    assert.strictEqual(songs?.isApplicable, true);
    assert.strictEqual(songs?.state, "green");
    assert.strictEqual(notes?.isApplicable, true);
    assert.strictEqual(notes?.state, "green");
  });

  it("All Star Cheer Notes is red when Routine notes empty (ignores musicTheme)", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      package: "Gold 2:00",
      songListSuggestions: "Song A",
      routineNotes: "",
      musicTheme: "(Power Music & Unleash the Beats Covers)",
    };
    const notes = getOrderRequirements(order as Order).songsArea.find(
      (r) => r.id === "notes"
    );
    assert.strictEqual(notes?.isApplicable, true);
    assert.strictEqual(notes?.state, "red");
  });

  it("Songs pill matches Form song list / Song list/suggestions field", () => {
    const empty: Partial<Order> = {
      category: "Dance",
      package: "Custom POM 2:15",
      timeLengthOfMix: "2:15",
      musicAffiliate: "Power Music Covers",
      musicTheme: "(Power Music Covers) · (Power Music Covers)",
      songListSuggestions: "",
      powerMusicCovers: "",
      haveSongs: "NEED SONGS",
    };
    // Affiliate-only musicTheme is not a song list.
    assert.strictEqual(getFormSongListColumnText(empty as Order), "");
    const emptySongs = getOrderRequirements(empty as Order).songsArea.find(
      (r) => r.id === "songs"
    );
    assert.strictEqual(emptySongs?.state, "red");

    const filled: Partial<Order> = {
      ...empty,
      powerMusicCovers: "Song A, Song B",
      haveSongs: "NEED SONGS",
    };
    const filledSongs = getOrderRequirements(filled as Order).songsArea.find(
      (r) => r.id === "songs"
    );
    assert.strictEqual(filledSongs?.state, "green");
  });

  it("Form song list ignores musicTheme that is just Routine notes + affiliate", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      package: "Gold 2:00",
      songListSuggestions: "",
      routineNotes: "Customer submitted form with fast-paced routine notes.",
      musicTheme:
        "Customer submitted form with fast-paced routine notes. · (Power Music Covers)",
    };
    assert.strictEqual(getFormSongListColumnText(order as Order), "");
    const songs = getOrderRequirements(order as Order).songsArea.find(
      (r) => r.id === "songs"
    );
    assert.strictEqual(songs?.state, "red");
    const notes = getOrderRequirements(order as Order).songsArea.find(
      (r) => r.id === "notes"
    );
    assert.strictEqual(notes?.state, "green");
  });

  it("Form song list keeps legacy musicTheme when it is real song text", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      package: "Gold 2:00",
      songListSuggestions: "",
      routineNotes: "Coach will send counts later",
      musicTheme: "Song A, Song B, Fight Song · (Power Music Covers)",
    };
    assert.ok(getFormSongListColumnText(order as Order).includes("Song A"));
    const songs = getOrderRequirements(order as Order).songsArea.find(
      (r) => r.id === "songs"
    );
    assert.strictEqual(songs?.state, "green");
  });

  it("mergeOrderFormFieldsForRequirements keeps empty linked Song list", () => {
    const mtd = {
      id: "mtd-1",
      songListSuggestions: "(Power Music Covers)",
      musicTheme: "(Power Music Covers)",
      routineNotes: "stale",
    } as Order;
    const linked = {
      id: "ord-1",
      songListSuggestions: "",
      routineNotes: "",
      formType: "school-all-star-cheer",
    } as Order;
    const merged = mergeOrderFormFieldsForRequirements(mtd, linked);
    assert.strictEqual(merged.songListSuggestions, "");
    assert.strictEqual((merged as Order).routineNotes, "");
  });

  it("merge keeps MTD musicTheme when linked order musicTheme is empty", () => {
    const mtd = {
      id: "mtd-1",
      musicTheme: "Review Required: Level check · (Power Music Covers)",
      songListSuggestions: "",
      routineNotes: "",
    } as Order;
    const linked = {
      id: "ord-1",
      musicTheme: "",
      songListSuggestions: "",
      routineNotes: "",
      formType: "school-all-star-cheer",
    } as Order;
    const merged = mergeOrderFormFieldsForRequirements(mtd, linked);
    assert.ok(String(merged.musicTheme || "").includes("Review Required"));
    // Review notes in musicTheme (no routineNotes duplicate) still surface as song-list legacy text.
    assert.ok(getFormSongListColumnText(merged).includes("Review Required"));
  });
});
