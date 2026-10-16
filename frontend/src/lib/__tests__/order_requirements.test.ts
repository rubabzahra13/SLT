import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getFormSongListColumnText,
  getOrderRequirements,
  mergeOrderFormFieldsForRequirements,
} from "../order-requirements";
import type { MTDRecord, Order } from "../../types";

describe("SLT Implementation 2: Package-Specific Data Collection Rules", () => {
  it("Dance package matrix: Songs + Mix (Jazz Simple Cut adds Notes; Jazz/Kick = Song(s))", () => {
    const cases: Array<{ package: string; label: string; ids: string[] }> = [
      { package: "DANCE MIX", label: "Songs", ids: ["mix", "songs"] },
      { package: "DANCE PLUS", label: "Songs", ids: ["mix", "songs"] },
      { package: "CUSTOM POM 2:15", label: "Songs", ids: ["mix", "songs"] },
      { package: "RALLY MIX", label: "Songs", ids: ["mix", "songs"] },
      { package: "CUSTOM HIP HOP 2:00", label: "Songs", ids: ["mix", "songs"] },
      {
        package: "GAMEDAY PERFORMANCE MIX",
        label: "Songs",
        ids: ["mix", "songs"],
      },
      {
        package: "GAMEDAY PERFORMANCE PLUS",
        label: "Songs",
        ids: ["mix", "songs"],
      },
      {
        package: "GAMEDAY PERFORMANCE EXTREME",
        label: "Songs",
        ids: ["mix", "songs"],
      },
      { package: "JAZZ/KICK MIX", label: "Song(s)", ids: ["mix", "songs"] },
      {
        package: "JAZZ SIMPLE CUT 1:45",
        label: "Song",
        ids: ["mix", "notes", "songs"],
      },
    ];

    for (const c of cases) {
      for (const isManualEntry of [false, true]) {
        const order: Partial<Order> = {
          category: "Dance",
          formType: "school-all-star-dance",
          package: c.package,
          timeLengthOfMix: "2:00",
          songListSuggestions: "Track A",
          routineNotes: c.ids.includes("notes") ? "Cut notes" : "",
          isManualEntry,
        };
        const reqs = getOrderRequirements(order as Order);
        const ids = reqs.all
          .filter((r) => r.isApplicable && r.id !== "form")
          .map((r) => r.id);
        assert.deepStrictEqual(
          ids.sort(),
          c.ids.sort(),
          `${c.package} manual=${isManualEntry}`
        );
        assert.strictEqual(
          reqs.songsArea.find((r) => r.id === "songs")?.label,
          c.label,
          c.package
        );
        assert.strictEqual(reqs.compliancyMet, true, c.package);
        if (isManualEntry) {
          assert.ok(
            reqs.collections.some((r) => r.id === "form" && r.state === "red"),
            `${c.package} manual Form`
          );
        }
      }
    }
  });

  it("Cheer package matrix: Bronze/Silver/Gold Songs; Platinum Songs+CS+Video; Titanium Notes+CS+Video; Rally Mix Songs+CS", () => {
    const cases: Array<{ package: string; ids: string[]; subtype?: string }> = [
      { package: "Bronze 1:30", ids: ["songs"] },
      { package: "Silver 1:45", ids: ["songs"] },
      { package: "Gold 2:00", ids: ["songs"] },
      { package: "Platinum 2:30", ids: ["cs", "songs", "video"] },
      { package: "Titanium 2:30", ids: ["cs", "notes", "video"] },
      {
        package: "RALLY MIX",
        ids: ["cs", "songs"],
        subtype: "school-cheer-viroc-yes",
      },
      {
        package: "Rally Mix (without 8 count sheets)",
        ids: ["cs", "songs"],
        subtype: "school-cheer-viroc-yes",
      },
    ];

    for (const c of cases) {
      for (const isManualEntry of [false, true]) {
        const order: Partial<Order> = {
          category: "Cheer",
          formType: "school-all-star-cheer",
          cheerFormSubtype: (c.subtype as Order["cheerFormSubtype"]) || "all-star-cheer",
          package: c.package,
          songListSuggestions: c.ids.includes("songs") ? "Have" : "",
          routineNotes: c.ids.includes("notes") ? "Routine notes" : "",
          sendingEightCountSheets: c.ids.includes("cs") ? "Yes" : "No",
          isManualEntry,
        };
        const reqs = getOrderRequirements(order as Order);
        const ids = reqs.all
          .filter((r) => r.isApplicable && r.id !== "form")
          .map((r) => r.id);
        assert.deepStrictEqual(
          ids.sort(),
          c.ids.sort(),
          `${c.package} manual=${isManualEntry}`
        );
        if (isManualEntry) {
          assert.ok(
            reqs.collections.some((r) => r.id === "form" && r.state === "red"),
            `${c.package} manual Form`
          );
        }
      }
    }
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

  it("Marching Band Band Chant: Song + Mix; Notes N/A (Magento + manual)", () => {
    for (const isManualEntry of [false, true]) {
      const order: Partial<Order> = {
        category: "Marching Band",
        formType: "marching-band",
        package: "BAND CHANT",
        packageType: "BAND CHANT",
        timeLengthOfMix: "1:30",
        instrumentationNotes: "Cover in marching band style: Seven Nation Army",
        lyricalNotes: "ignored for Band Chant Notes pill",
        isManualEntry,
      };

      const reqs = getOrderRequirements(order as Order);
      const ids = reqs.all
        .filter((r) => r.isApplicable && r.id !== "form")
        .map((r) => r.id);
      assert.deepStrictEqual(ids.sort(), ["mix", "songs"].sort());

      const songReq = reqs.songsArea.find((r) => r.id === "songs");
      assert.strictEqual(songReq?.label, "Song");
      assert.strictEqual(songReq?.state, "green");
      assert.strictEqual(
        reqs.songsArea.find((r) => r.id === "notes")?.state,
        "white"
      );
      assert.strictEqual(
        reqs.collections.find((r) => r.id === "mix")?.state,
        "green"
      );
      if (isManualEntry) {
        assert.ok(
          reqs.collections.some((r) => r.id === "form" && r.state === "red")
        );
      }

      const missingSong = getOrderRequirements({
        ...order,
        instrumentationNotes: "",
      } as Order);
      assert.strictEqual(
        missingSong.songsArea.find((r) => r.id === "songs")?.state,
        "red"
      );
    }
  });

  it("Marching Band Drum Cadence: Mix + Notes from instrumentation (Magento + manual)", () => {
    for (const isManualEntry of [false, true]) {
      const order: Partial<Order> = {
        category: "Marching Band",
        formType: "marching-band",
        package: "DRUM CADENCE ORIGINAL",
        packageType: "DRUM CADENCE ORIGINAL",
        timeLengthOfMix: "2:00",
        instrumentationNotes: "Full brass & percussion",
        lyricalNotes: "optional — must not drive Drum Cadence Notes",
        isManualEntry,
      };
      const reqs = getOrderRequirements(order as Order);
      const ids = reqs.all
        .filter((r) => r.isApplicable && r.id !== "form")
        .map((r) => r.id);
      assert.deepStrictEqual(ids.sort(), ["mix", "notes"].sort());
      assert.strictEqual(
        reqs.songsArea.find((r) => r.id === "songs")?.state,
        "white"
      );
      assert.strictEqual(
        reqs.songsArea.find((r) => r.id === "notes")?.state,
        "green"
      );
      if (isManualEntry) {
        assert.ok(
          reqs.collections.some((r) => r.id === "form" && r.state === "red")
        );
      }

      const missingNotes = getOrderRequirements({
        ...order,
        instrumentationNotes: "",
      } as Order);
      assert.strictEqual(
        missingNotes.songsArea.find((r) => r.id === "notes")?.state,
        "red"
      );
      // Lyrics alone must not green Drum Cadence Notes.
      const lyricsOnly = getOrderRequirements({
        ...order,
        instrumentationNotes: "",
        lyricalNotes: "only lyrics",
      } as Order);
      assert.strictEqual(
        lyricsOnly.songsArea.find((r) => r.id === "notes")?.state,
        "red"
      );
    }
  });

  it("Marching Band Fight Song / Alma Mater: Mix + Notes from lyrics (Magento + manual)", () => {
    for (const packageType of [
      "FIGHT SONG ORIGINAL",
      "FIGHT SONG PLUS",
      "ALMA MATER ORIGINAL",
      "ALMA MATER PLUS",
    ]) {
      for (const isManualEntry of [false, true]) {
        const order: Partial<Order> = {
          category: "Marching Band",
          formType: "marching-band",
          package: packageType,
          packageType,
          timeLengthOfMix: "2:00",
          instrumentationNotes: "brass — must not drive Fight/Alma Notes",
          lyricalNotes: "Written lyrics for alma/fight",
          isManualEntry,
        };
        const reqs = getOrderRequirements(order as Order);
        const ids = reqs.all
          .filter((r) => r.isApplicable && r.id !== "form")
          .map((r) => r.id);
        assert.deepStrictEqual(
          ids.sort(),
          ["mix", "notes"].sort(),
          `${packageType} manual=${isManualEntry}`
        );
        assert.strictEqual(
          reqs.songsArea.find((r) => r.id === "notes")?.state,
          "green",
          packageType
        );
        if (isManualEntry) {
          assert.ok(
            reqs.collections.some((r) => r.id === "form" && r.state === "red"),
            `${packageType} manual must also show Form`
          );
        }

        const missingLyrics = getOrderRequirements({
          ...order,
          lyricalNotes: "",
        } as Order);
        assert.strictEqual(
          missingLyrics.songsArea.find((r) => r.id === "notes")?.state,
          "red",
          packageType
        );
        // Instrumentation alone must not green Fight/Alma Notes.
        const instrumentationOnly = getOrderRequirements({
          ...order,
          lyricalNotes: "",
          instrumentationNotes: "only instrumentation",
        } as Order);
        assert.strictEqual(
          instrumentationOnly.songsArea.find((r) => r.id === "notes")?.state,
          "red",
          packageType
        );
      }
    }
  });

  it("Sports Entertainment all Magento packages: Songs + Notes + Mix (Magento + manual)", () => {
    for (const packageType of [
      "PRE-GAME / HALFTIME REMIXED",
      "QUARTER BREAK / TIMEOUT REMIXED",
      "OTHER (mixes longer than 2:30)",
    ]) {
      for (const isManualEntry of [false, true]) {
        const order: Partial<Order> = {
          category: "Sports Entertainment",
          formType: "sports-entertainment",
          package: packageType,
          packageType,
          timeLengthOfMix: "2:00",
          routineNotes: "Organ sound FX",
          songListSuggestions: "Have",
          isManualEntry,
        };
        const reqs = getOrderRequirements(order as Order);
        const ids = reqs.all
          .filter((r) => r.isApplicable && r.id !== "form")
          .map((r) => r.id);
        assert.deepStrictEqual(
          ids.sort(),
          ["mix", "notes", "songs"].sort(),
          `${packageType} manual=${isManualEntry}`
        );
        if (isManualEntry) {
          assert.ok(
            reqs.collections.some((r) => r.id === "form" && r.state === "red"),
            `${packageType} manual must also show Form`
          );
        }
      }
    }
  });

  it("Sports Entertainment Songs stays red when only Notes + Mix are filled (ignores musicTheme)", () => {
    // normalizeOrder packs routineNotes into musicTheme; Songs must not follow that.
    const emptySongs: Partial<Order> = {
      category: "Sports Entertainment",
      formType: "sports-entertainment",
      package: "PRE-GAME / HALFTIME REMIXED",
      packageType: "PRE-GAME / HALFTIME REMIXED",
      timeLengthOfMix: "2:00",
      routineNotes: "Stadium walkout and halftime bed - dummy SE notes.",
      additionalNotes: "Stadium walkout and halftime bed - dummy SE notes.",
      songListSuggestions: "",
      customerSongs: "",
      musicTheme:
        "Stadium walkout and halftime bed - dummy SE notes.",
      haveSongs: "NEED SONGS",
    };
    const emptyReqs = getOrderRequirements(emptySongs as Order);
    assert.strictEqual(
      emptyReqs.collections.find((r) => r.id === "mix")?.state,
      "green"
    );
    assert.strictEqual(
      emptyReqs.songsArea.find((r) => r.id === "notes")?.state,
      "green"
    );
    assert.strictEqual(
      emptyReqs.songsArea.find((r) => r.id === "songs")?.state,
      "red",
      "Songs must be red when customerSongs / songListSuggestions are empty"
    );
    assert.strictEqual(getFormSongListColumnText(emptySongs as Order), "");

    const withSongs: Partial<Order> = {
      ...emptySongs,
      customerSongs: "Eye of the Tiger",
      songListSuggestions: "Eye of the Tiger",
    };
    const filledReqs = getOrderRequirements(withSongs as Order);
    assert.strictEqual(
      filledReqs.songsArea.find((r) => r.id === "songs")?.state,
      "green"
    );
    assert.ok(
      getFormSongListColumnText(withSongs as Order).includes("Eye of the Tiger")
    );
  });

  it("School Anthem Magento form has no Mix Time / CS / Video collections", () => {
    const order: Partial<Order> = {
      formType: "school-anthem",
      category: "School Anthem",
      package: "SCHOOL ANTHEMS",
      isManualEntry: false,
      instrumentationNotes: "style",
      lyricalNotes: "lyrics",
    };
    const reqs = getOrderRequirements(order as Order);
    assert.deepStrictEqual(
      reqs.collections.filter((r) => r.isApplicable).map((r) => r.id),
      [],
      "Magento School Anthem collections must be empty (no Mix Time)"
    );
    assert.ok(!reqs.collections.some((r) => r.id === "form"));
  });

  it("School Anthem manual New Order shows Form red until Magento name-match", () => {
    const manual: Partial<Order> = {
      formType: "school-anthem",
      category: "School Anthem",
      package: "SCHOOL ANTHEMS",
      isManualEntry: true,
      instrumentationNotes: "",
      lyricalNotes: "",
    };
    const waiting = getOrderRequirements(manual as Order);
    assert.deepStrictEqual(
      waiting.collections.filter((r) => r.isApplicable).map((r) => r.id),
      ["form"]
    );
    assert.strictEqual(
      waiting.collections.find((r) => r.id === "form")?.state,
      "red"
    );

    const matched = getOrderRequirements({
      ...manual,
      mergedFormOrderId: "form-anthem-1",
    } as Order);
    assert.ok(
      !matched.collections.some((r) => r.id === "form"),
      "matched Magento form → Form order, no Form collection pill"
    );
  });

  it("School Anthem Song from Instrumental Style Preference; Notes from Lyrical Notes", () => {
    const empty: Partial<Order> = {
      formType: "school-anthem",
      category: "School Anthem",
      package: "SCHOOL ANTHEMS",
      packageType: "SCHOOL ANTHEMS",
      timeLengthOfMix: "2:00",
      songListSuggestions: "should not drive Song pill",
      routineNotes: "should not drive Notes pill",
      instrumentationNotes: "",
      lyricalNotes: "",
    };
    const emptyReqs = getOrderRequirements(empty as Order);
    assert.strictEqual(
      emptyReqs.songsArea.find((r) => r.id === "songs")?.state,
      "red"
    );
    assert.strictEqual(
      emptyReqs.songsArea.find((r) => r.id === "notes")?.state,
      "red"
    );
    assert.strictEqual(
      getFormSongListColumnText(empty as Order),
      "",
      "song list / musicTheme must not green School Anthem Song"
    );

    const filled: Partial<Order> = {
      ...empty,
      instrumentationNotes: "Pop / Rock with marching energy",
      lyricalNotes: "Hail to the Cavaliers",
    };
    const filledReqs = getOrderRequirements(filled as Order);
    assert.strictEqual(
      filledReqs.songsArea.find((r) => r.id === "songs")?.state,
      "green"
    );
    assert.strictEqual(
      filledReqs.songsArea.find((r) => r.id === "notes")?.state,
      "green"
    );
    assert.strictEqual(
      getFormSongListColumnText(filled as Order),
      "Pop / Rock with marching energy"
    );
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

    // Form is automatic — collectionStates.form must not green it.
    const toggled = getOrderRequirements({
      ...manualOrder,
      collectionStates: { form: true },
    } as Order);
    assert.strictEqual(
      toggled.collections.find((r) => r.id === "form")?.state,
      "red",
      "Form stays red until Magento name-match links mergedFormOrderId"
    );

    const matched = getOrderRequirements({
      ...manualOrder,
      mergedFormOrderId: "form-auto-1",
    } as Order);
    assert.ok(
      !matched.collections.some((r) => r.id === "form"),
      "matched Magento form → Form order, no Form collection pill"
    );
  });

  it("every form type shows Form in Collections when added as manual", () => {
    const cases: Array<{
      formType: string;
      category: string;
      package: string;
      expectMix: boolean;
    }> = [
      {
        formType: "school-all-star-cheer",
        category: "Cheer",
        package: "Gold 2:00",
        expectMix: false,
      },
      {
        formType: "school-all-star-dance",
        category: "Dance",
        package: "Custom POM 2:15",
        expectMix: true,
      },
      {
        formType: "marching-band",
        category: "Marching Band",
        package: "BAND CHANT",
        expectMix: true,
      },
      {
        formType: "sports-entertainment",
        category: "Sports Entertainment",
        package: "PRE-GAME / HALFTIME REMIXED",
        expectMix: true,
      },
      {
        formType: "school-anthem",
        category: "School Anthem",
        package: "SCHOOL ANTHEMS",
        expectMix: false,
      },
    ];

    for (const c of cases) {
      const magento = getOrderRequirements({
        formType: c.formType,
        category: c.category,
        package: c.package,
        isManualEntry: false,
      } as Order);
      assert.ok(
        !magento.collections.some((r) => r.id === "form"),
        `${c.formType} Magento must not show Form`
      );

      const manual = getOrderRequirements({
        formType: c.formType,
        category: c.category,
        package: c.package,
        isManualEntry: true,
      } as Order);
      const applicable = manual.collections
        .filter((r) => r.isApplicable)
        .map((r) => r.id);
      assert.ok(
        applicable.includes("form"),
        `${c.formType} manual must show Form in Collections`
      );
      assert.strictEqual(
        manual.collections.find((r) => r.id === "form")?.state,
        "red",
        `${c.formType} Form stays red until Magento match`
      );
      if (c.expectMix) {
        assert.ok(
          applicable.includes("mix"),
          `${c.formType} manual still shows Mix Time with Form`
        );
      }
    }
  });

  it("correctly identifies orders that are Waiting for Data (missing >= 1 requirement)", () => {
    const completeOrder: Partial<Order> = {
      category: "Dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      package: "Custom POM 2:15",
      timeLengthOfMix: "2:15",
      musicAffiliate: "Power Music",
      powerMusicCovers: "Have",
    };

    const incompleteOrder: Partial<Order> = {
      category: "Dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      package: "Custom POM 2:15",
      timeLengthOfMix: "", // Missing Time of Mix
      musicAffiliate: "Power Music",
      powerMusicCovers: "Have",
    };

    assert.strictEqual(getOrderRequirements(completeOrder as Order).missingCount, 0);
    assert.strictEqual(getOrderRequirements(incompleteOrder as Order).missingCount, 1);
    assert.strictEqual(getOrderRequirements(incompleteOrder as Order).allMet, false);
  });

  it("Cheer Gold is Songs only (Notes N/A even on All Star)", () => {
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
    assert.strictEqual(notes?.isApplicable, false);
    assert.strictEqual(notes?.state, "white");
  });

  it("Cheer Titanium Notes is red when Routine notes empty (ignores musicTheme)", () => {
    const order: Partial<Order> = {
      category: "Cheer",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      package: "Titanium 2:30",
      songListSuggestions: "Song A",
      routineNotes: "",
      musicTheme: "(Power Music & Unleash the Beats Covers)",
      sendingEightCountSheets: "Yes",
    };
    const notes = getOrderRequirements(order as Order).songsArea.find(
      (r) => r.id === "notes"
    );
    assert.strictEqual(notes?.isApplicable, true);
    assert.strictEqual(notes?.state, "red");
    assert.strictEqual(
      getOrderRequirements(order as Order).songsArea.find((r) => r.id === "songs")
        ?.isApplicable,
      false
    );
  });

  it("Dance/POM Songs uses Power Music OR Unleash covers (not musicTheme)", () => {
    const empty: Partial<Order> = {
      category: "Dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      package: "Custom POM 2:15",
      timeLengthOfMix: "2:15",
      musicAffiliate: "Power Music Covers",
      musicTheme: "(Power Music Covers) · leftover theme",
      songListSuggestions: "",
      powerMusicCovers: "",
      unleashTheBeatsCovers: "",
      haveSongs: "NEED SONGS",
    };
    assert.strictEqual(
      getOrderRequirements(empty as Order).songsArea.find((r) => r.id === "songs")
        ?.state,
      "red",
      "musicTheme alone must not green Dance Songs"
    );
    assert.strictEqual(getFormSongListColumnText(empty as Order), "");

    const powerOnly: Partial<Order> = {
      ...empty,
      powerMusicCovers: "Song A, Song B",
    };
    assert.strictEqual(
      getOrderRequirements(powerOnly as Order).songsArea.find(
        (r) => r.id === "songs"
      )?.state,
      "green"
    );

    const unleashOnly: Partial<Order> = {
      ...empty,
      unleashTheBeatsCovers: "Unleash track list",
    };
    assert.strictEqual(
      getOrderRequirements(unleashOnly as Order).songsArea.find(
        (r) => r.id === "songs"
      )?.state,
      "green"
    );
  });

  it("Form song list keeps legacy musicTheme board text", () => {
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
    assert.strictEqual(
      getOrderRequirements(order as Order).songsArea.find((r) => r.id === "songs")
        ?.state,
      "green"
    );
  });

  it("merge prefers linked Band Chant package so Songs shows Song not Notes", () => {
    const mtd = {
      id: "mtd-lincoln",
      orderId: "order-lincoln",
      category: "Marching Band",
      package: "HALFTIME SHOW",
      formType: "marching-band",
    } as MTDRecord;
    const linked = {
      id: "order-lincoln",
      formType: "marching-band",
      category: "Marching Band",
      package: "BAND CHANT",
      packageType: "BAND CHANT",
      instrumentationNotes: "",
    } as Order;
    const merged = mergeOrderFormFieldsForRequirements(mtd, linked);
    const reqs = getOrderRequirements(merged);
    const songs = reqs.songsArea.filter(
      (r) => r.isApplicable && r.state !== "white"
    );
    assert.deepStrictEqual(
      songs.map((r) => r.label),
      ["Song"],
      "stale MTD HALFTIME SHOW must not force Notes on Band Chant"
    );
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

  it("merge keeps empty linked musicTheme after Songs remove (does not revive MTD theme)", () => {
    const mtd = {
      id: "mtd-1",
      musicTheme: "Review Required: Level check · (Power Music Covers)",
      songListSuggestions: "Old songs",
      routineNotes: "",
    } as Order;
    const linked = {
      id: "ord-1",
      musicTheme: "",
      songListSuggestions: "",
      routineNotes: "Keep my notes",
      formType: "school-all-star-cheer",
    } as Order;
    const merged = mergeOrderFormFieldsForRequirements(mtd, linked);
    assert.strictEqual(merged.musicTheme, "");
    assert.strictEqual(merged.songListSuggestions, "");
    assert.strictEqual(getFormSongListColumnText(merged), "");
  });
});
