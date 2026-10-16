import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDanceSongsConfirmText,
  getFormSongListColumnText,
  getOrderRequirements,
  isAllStarDanceOrder,
} from "../order-requirements";
import { buildMissingDataMailFieldGroups } from "../forward-order-mail";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import { normalizeOrder } from "../order-form";
import { getOrderIdentityFieldKey } from "../order-detail-sections";
import { sameOrderCategory } from "../manual-form-merge";
import { DANCE_FORM_SUBTABS, type DanceFormSubtype, type MTDRecord, type Order } from "../../types";

/** Representative Magento package per dance subcategory (not Jazz Simple Cut). */
const PACKAGE_BY_SUBTYPE: Record<DanceFormSubtype, string> = {
  pom: "CUSTOM POM",
  "hip-hop": "CUSTOM HIP-HOP",
  "team-performance-variety": "TP MIX",
  gameday: "PERFORMANCE MIX",
  "jazz-kick": "JAZZ/KICK MIX",
};

function danceOrder(
  subtype: DanceFormSubtype,
  overrides: Partial<Order> = {}
): Order {
  const pkg = PACKAGE_BY_SUBTYPE[subtype];
  return {
    id: `dance-${subtype}`,
    formType: "school-all-star-dance",
    danceFormSubtype: subtype,
    category: "All Star Dance",
    packageType: pkg,
    package: pkg,
    schoolProgramName: `Demo ${subtype} Program`,
    timeLengthOfMix: "2:15",
    powerMusicCovers: "",
    unleashTheBeatsCovers: "",
    songListSuggestions: "",
    musicTheme: "",
    customerName: "Demo Coach",
    contactName: "Demo Coach",
    editorRequest: "FA",
    price: 400,
    status: "new",
    createdAt: "2026-10-16",
    needsAttention: false,
    isManualEntry: false,
    ...overrides,
  } as Order;
}

function songsState(order: Order): string | undefined {
  return getOrderRequirements(order).songsArea.find((r) => r.id === "songs")
    ?.state;
}

function mixState(order: Order): string | undefined {
  return getOrderRequirements(order).collections.find((r) => r.id === "mix")
    ?.state;
}

describe("All-Star Dance parity — every subcategory matches POM rules", () => {
  for (const { id: subtype, label } of DANCE_FORM_SUBTABS) {
    describe(label, () => {
      it("identity merge key is schoolProgramName (School/Program Name)", () => {
        assert.equal(
          getOrderIdentityFieldKey("school-all-star-dance", null, subtype),
          "schoolProgramName"
        );
      });

      it("is recognized as All-Star Dance", () => {
        assert.equal(isAllStarDanceOrder(danceOrder(subtype)), true);
      });

      it("applicable collections are Songs + Mix Time (Notes N/A)", () => {
        const order = danceOrder(subtype, {
          powerMusicCovers: "Track A",
          timeLengthOfMix: "2:15",
        });
        const ids = getOrderRequirements(order)
          .all.filter((r) => r.isApplicable && r.id !== "form")
          .map((r) => r.id)
          .sort();
        assert.deepEqual(ids, ["mix", "songs"]);
        assert.equal(
          getOrderRequirements(order).songsArea.find((r) => r.id === "notes")
            ?.state,
          "white"
        );
      });

      it("Songs green if Power Music OR Unleash filled; red if both empty", () => {
        assert.equal(songsState(danceOrder(subtype)), "red");
        assert.equal(
          songsState(danceOrder(subtype, { powerMusicCovers: "Power list" })),
          "green"
        );
        assert.equal(
          songsState(
            danceOrder(subtype, { unleashTheBeatsCovers: "Unleash list" })
          ),
          "green"
        );
        assert.equal(
          songsState(
            danceOrder(subtype, {
              musicTheme: "leftover theme text",
              powerMusicCovers: "",
              unleashTheBeatsCovers: "",
            })
          ),
          "red"
        );
        assert.equal(
          getFormSongListColumnText(
            danceOrder(subtype, {
              musicTheme: "leftover",
              powerMusicCovers: "",
            })
          ),
          ""
        );
      });

      it("dance songs confirm text includes both cover boxes when both filled", () => {
        const text = getDanceSongsConfirmText(
          danceOrder(subtype, {
            powerMusicCovers: "Power A",
            unleashTheBeatsCovers: "Unleash B",
          })
        );
        assert.ok(text.includes("Power A"));
        assert.ok(text.includes("Unleash B"));
      });

      it("Mix follows timeLengthOfMix; package does not refill cleared time", () => {
        assert.equal(
          mixState(danceOrder(subtype, { timeLengthOfMix: "2:15" })),
          "green"
        );
        assert.equal(
          mixState(danceOrder(subtype, { timeLengthOfMix: "" })),
          "red"
        );

        const pkg = PACKAGE_BY_SUBTYPE[subtype];
        const cleared = normalizeOrder(
          danceOrder(subtype, {
            package: `${pkg} 2:15`,
            packageType: pkg,
            timeLengthOfMix: "",
          })
        );
        assert.equal(cleared.timeLengthOfMix, "");
        assert.equal(mixState(cleared), "red");

        const base = danceOrder(subtype, {
          timeLengthOfMix: "2:15",
          collectionStates: { mix: true },
        });
        const patch = orderPatchFromOrderField("timeLengthOfMix", "", base);
        const next = { ...base, ...patch };
        assert.equal(next.timeLengthOfMix, "");
        assert.equal(next.collectionStates?.mix, undefined);
        assert.equal(mixState(next), "red");
      });

      it("Form pill + COMPLETED ORDER FORM only for unmatched manuals", () => {
        const manual = danceOrder(subtype, {
          isManualEntry: true,
          timeLengthOfMix: "",
        });
        assert.ok(
          getOrderRequirements(manual).collections.some(
            (r) => r.id === "form" && r.state === "red"
          )
        );
        const labels = buildMissingDataMailFieldGroups(
          {
            id: `mtd-${subtype}`,
            orderId: manual.id,
            section: "DANCE MUSIC",
            assignedProducer: null,
            category: "All Star Dance",
            formType: "school-all-star-dance",
            danceFormSubtype: subtype,
            editorRequest: "FA",
            contactName: "Demo",
            editorInitials: "FA",
            programName: manual.schoolProgramName,
            package: PACKAGE_BY_SUBTYPE[subtype],
            musicTheme: "",
            price: 400,
            priceCompliance: "compliant",
            invoice: "",
            mixStartDate: "",
            eightCountSheet: "",
            haveSongs: "",
            needsAttention: true,
            status: "active",
            isManualScheduleEntry: true,
            timeLengthOfMix: "",
          } as MTDRecord,
          manual
        ).flatMap((g) => g.fields.map((f) => f.label));
        assert.ok(labels.includes("COMPLETED ORDER FORM"));

        const magento = danceOrder(subtype, {
          isManualEntry: false,
          timeLengthOfMix: "",
        });
        assert.ok(
          !getOrderRequirements(magento).collections.some((r) => r.id === "form")
        );
      });

      it("manual↔form merge stays within the same dance subcategory", () => {
        const manual = danceOrder(subtype, { isManualEntry: true });
        const same = danceOrder(subtype, {
          id: "form-same",
          isManualEntry: false,
        });
        const otherSubtype =
          subtype === "pom" ? "hip-hop" : ("pom" as DanceFormSubtype);
        const cross = danceOrder(otherSubtype, {
          id: "form-cross",
          isManualEntry: false,
        });
        assert.equal(sameOrderCategory(manual, same), true);
        assert.equal(sameOrderCategory(manual, cross), false);
      });
    });
  }

  it("Jazz Simple Cut is the only dance package that also requires Notes", () => {
    const jazzSimple = danceOrder("jazz-kick", {
      packageType: "JAZZ SIMPLE CUT",
      package: "JAZZ SIMPLE CUT",
      powerMusicCovers: "Song",
      timeLengthOfMix: "1:30",
      routineNotes: "",
    });
    const ids = getOrderRequirements(jazzSimple)
      .all.filter((r) => r.isApplicable && r.id !== "form")
      .map((r) => r.id)
      .sort();
    assert.deepEqual(ids, ["mix", "notes", "songs"]);
  });
});
