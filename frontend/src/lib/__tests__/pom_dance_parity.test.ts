import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getDanceSongsConfirmText,
  getFormSongListColumnText,
  getOrderRequirements,
} from "../order-requirements";
import { buildMissingDataMailFieldGroups } from "../forward-order-mail";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import { normalizeOrder } from "../order-form";
import { getOrderIdentityFieldKey } from "../order-detail-sections";
import { resolveOrderPackageDisplayPrice } from "../order-package-price";
import type { MTDRecord, Order } from "../../types";

function pomOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "pom-1",
    formType: "school-all-star-dance",
    danceFormSubtype: "pom",
    category: "Dance",
    packageType: "CUSTOM POM",
    package: "CUSTOM POM",
    schoolProgramName: "Demo POM Program",
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

describe("POM Dance parity — Songs OR covers + Mix", () => {
  it("identity merge key is schoolProgramName", () => {
    assert.equal(
      getOrderIdentityFieldKey("school-all-star-dance", null, "pom"),
      "schoolProgramName"
    );
  });

  it("applicable collections are Mix + Songs + Notes (Magento form fields)", () => {
    const order = pomOrder({
      powerMusicCovers: "Track A",
      timeLengthOfMix: "2:15",
      routineNotes: "Routine notes",
    });
    const ids = getOrderRequirements(order)
      .all.filter((r) => r.isApplicable && r.id !== "form")
      .map((r) => r.id)
      .sort();
    assert.deepEqual(ids, ["mix", "notes", "songs"]);
    assert.equal(
      getOrderRequirements(order).songsArea.find((r) => r.id === "notes")
        ?.state,
      "green"
    );
  });

  it("Songs green if Power Music OR Unleash filled; red if both empty", () => {
    assert.equal(songsState(pomOrder()), "red");
    assert.equal(
      songsState(pomOrder({ powerMusicCovers: "Power list" })),
      "green"
    );
    assert.equal(
      songsState(pomOrder({ unleashTheBeatsCovers: "Unleash list" })),
      "green"
    );
    assert.equal(
      songsState(
        pomOrder({
          powerMusicCovers: "Power",
          unleashTheBeatsCovers: "Unleash",
        })
      ),
      "green"
    );
    assert.equal(
      songsState(
        pomOrder({
          musicTheme: "leftover theme text",
          powerMusicCovers: "",
          unleashTheBeatsCovers: "",
        })
      ),
      "red"
    );
    assert.equal(
      getFormSongListColumnText(
        pomOrder({ musicTheme: "leftover", powerMusicCovers: "" })
      ),
      ""
    );
  });

  it("dance songs confirm text includes both cover boxes when both filled", () => {
    const text = getDanceSongsConfirmText(
      pomOrder({
        powerMusicCovers: "Power A",
        unleashTheBeatsCovers: "Unleash B",
      })
    );
    assert.ok(text.includes("Power A"));
    assert.ok(text.includes("Unleash B"));
  });

  it("Mix follows timeLengthOfMix; package does not refill cleared time", () => {
    assert.equal(mixState(pomOrder({ timeLengthOfMix: "2:15" })), "green");
    assert.equal(mixState(pomOrder({ timeLengthOfMix: "" })), "red");

    const cleared = normalizeOrder(
      pomOrder({
        package: "CUSTOM POM 2:15",
        packageType: "CUSTOM POM",
        timeLengthOfMix: "",
      })
    );
    assert.equal(cleared.timeLengthOfMix, "");
    assert.equal(mixState(cleared), "red");

    const patch = orderPatchFromOrderField(
      "timeLengthOfMix",
      "",
      pomOrder({
        timeLengthOfMix: "2:15",
        collectionStates: { mix: true },
      })
    );
    const next = {
      ...pomOrder({ timeLengthOfMix: "2:15", collectionStates: { mix: true } }),
      ...patch,
    };
    assert.equal(next.timeLengthOfMix, "");
    assert.equal(next.collectionStates?.mix, undefined);
    assert.equal(mixState(next), "red");
  });

  it("Form pill + COMPLETED ORDER FORM only for unmatched manuals", () => {
    const manual = pomOrder({ isManualEntry: true, timeLengthOfMix: "" });
    assert.ok(
      getOrderRequirements(manual).collections.some(
        (r) => r.id === "form" && r.state === "red"
      )
    );
    const labels = buildMissingDataMailFieldGroups(
      {
        id: "mtd-pom",
        orderId: manual.id,
        section: "DANCE MUSIC",
        assignedProducer: null,
        category: "Dance",
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        editorRequest: "FA",
        contactName: "Demo",
        editorInitials: "FA",
        programName: "Demo POM Program",
        package: "CUSTOM POM",
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

    const magento = pomOrder({ isManualEntry: false, timeLengthOfMix: "" });
    assert.ok(
      !getOrderRequirements(magento).collections.some((r) => r.id === "form")
    );
    const magentoLabels = buildMissingDataMailFieldGroups(
      {
        id: "mtd-pom2",
        orderId: magento.id,
        section: "DANCE MUSIC",
        assignedProducer: null,
        category: "Dance",
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        editorRequest: "FA",
        contactName: "Demo",
        editorInitials: "FA",
        programName: "Demo POM Program",
        package: "CUSTOM POM",
        musicTheme: "",
        price: 400,
        priceCompliance: "compliant",
        invoice: "",
        mixStartDate: "",
        eightCountSheet: "",
        haveSongs: "",
        needsAttention: true,
        status: "active",
        isManualScheduleEntry: false,
        timeLengthOfMix: "",
      } as MTDRecord,
      magento
    ).flatMap((g) => g.fields.map((f) => f.label));
    assert.ok(!magentoLabels.includes("COMPLETED ORDER FORM"));
  });
});

describe("POM Dance parity — empty package price", () => {
  it("new order with no package selected shows $0 (not CUSTOM POM $850)", () => {
    for (const pkg of ["", "POM", "Standard", "TBD"]) {
      const order = pomOrder({
        packageType: pkg,
        package: pkg,
        price: 0,
        timeLengthOfMix: "",
      });
      const rec = {
        id: order.id,
        orderId: order.id,
        package: pkg || "Standard",
        category: "Dance",
        formType: "school-all-star-dance",
        danceFormSubtype: "pom",
        price: 0,
        priceCompliance: "compliant",
      } as MTDRecord;
      assert.equal(
        resolveOrderPackageDisplayPrice(rec, order),
        0,
        `expected $0 display for package ${JSON.stringify(pkg)}`
      );
    }

    const priced = pomOrder({
      packageType: "CUSTOM POM",
      package: "CUSTOM POM",
      price: 0,
    });
    const pricedRec = {
      id: priced.id,
      orderId: priced.id,
      package: "CUSTOM POM",
      category: "Dance",
      formType: "school-all-star-dance",
      danceFormSubtype: "pom",
      price: 0,
      priceCompliance: "compliant",
    } as MTDRecord;
    assert.equal(resolveOrderPackageDisplayPrice(pricedRec, priced), 850);
  });
});
