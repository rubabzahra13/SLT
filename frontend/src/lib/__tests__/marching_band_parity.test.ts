import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFormNotesText,
  getFormSongListColumnText,
  getOrderRequirements,
  resolveMarchingBandPackageKind,
} from "../order-requirements";
import { buildMissingDataMailFieldGroups } from "../forward-order-mail";
import { orderPatchFromOrderField } from "../mtd-order-sync";
import { normalizeOrder } from "../order-form";
import { getOrderIdentityFieldKey } from "../order-detail-sections";
import type { MTDRecord, Order } from "../../types";

function mbOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "mb-1",
    formType: "marching-band",
    category: "Marching Band",
    packageType: "BAND CHANT",
    package: "BAND CHANT",
    schoolProgramName: "Demo High Band",
    timeLengthOfMix: "1:30",
    instrumentationNotes: "",
    lyricalNotes: "",
    customerName: "Demo Coach",
    contactName: "Demo Coach",
    editorRequest: "FA",
    price: 600,
    status: "new",
    createdAt: "2026-10-16",
    needsAttention: false,
    isManualEntry: false,
    ...overrides,
  } as Order;
}

function applicableIds(order: Order): string[] {
  return getOrderRequirements(order)
    .all.filter((r) => r.isApplicable && r.id !== "form")
    .map((r) => r.id)
    .sort();
}

describe("Marching Band parity — Magento form fields + SoT", () => {
  it("identity merge key is schoolProgramName", () => {
    assert.equal(getOrderIdentityFieldKey("marching-band"), "schoolProgramName");
  });

  it("resolves package kinds for Magento labels", () => {
    assert.equal(
      resolveMarchingBandPackageKind(mbOrder({ package: "BAND CHANT" })),
      "band_chant"
    );
    assert.equal(
      resolveMarchingBandPackageKind(
        mbOrder({ package: "DRUM CADENCE ORIGINAL" })
      ),
      "drum_cadence"
    );
    assert.equal(
      resolveMarchingBandPackageKind(mbOrder({ package: "FIGHT SONG PLUS" })),
      "fight_alma"
    );
    assert.equal(
      resolveMarchingBandPackageKind(mbOrder({ package: "ALMA MATER ORIGINAL" })),
      "fight_alma"
    );
  });

  it("every MB package: Mix + Song (instrumentation) + Notes (lyrics)", () => {
    for (const packageType of [
      "BAND CHANT",
      "DRUM CADENCE ORIGINAL",
      "FIGHT SONG ORIGINAL",
      "FIGHT SONG PLUS",
      "ALMA MATER ORIGINAL",
      "ALMA MATER PLUS",
    ]) {
      const order = mbOrder({
        package: packageType,
        packageType,
        instrumentationNotes: "Seven Nation Army cover",
        lyricalNotes: "School fight lyrics",
        timeLengthOfMix: "1:30",
      });
      assert.deepEqual(
        applicableIds(order),
        ["mix", "notes", "songs"],
        packageType
      );
      assert.equal(
        getFormSongListColumnText(order),
        "Seven Nation Army cover",
        packageType
      );
      assert.equal(getFormNotesText(order), "School fight lyrics", packageType);
      assert.equal(
        getOrderRequirements(order).songsArea.find((r) => r.id === "songs")
          ?.state,
        "green",
        packageType
      );
      assert.equal(
        getOrderRequirements(order).songsArea.find((r) => r.id === "notes")
          ?.state,
        "green",
        packageType
      );
      assert.equal(
        getOrderRequirements({
          ...order,
          instrumentationNotes: "",
          songListSuggestions: "",
        } as Order).songsArea.find((r) => r.id === "songs")?.state,
        "red",
        packageType
      );
      assert.equal(
        getOrderRequirements({
          ...order,
          lyricalNotes: "",
          routineNotes: "",
        } as Order).songsArea.find((r) => r.id === "notes")?.state,
        "red",
        packageType
      );
      // Instrumentation must not green Notes; lyrics must not green Song.
      assert.equal(
        getFormNotesText({
          ...order,
          lyricalNotes: "",
          routineNotes: "",
          instrumentationNotes: "brass only",
        } as Order),
        "",
        packageType
      );
      assert.equal(
        getFormSongListColumnText({
          ...order,
          instrumentationNotes: "",
          songListSuggestions: "",
          lyricalNotes: "only lyrics",
        } as Order),
        "",
        packageType
      );
    }
  });

  it("Mix follows timeLengthOfMix; package does not refill cleared time", () => {
    const cleared = normalizeOrder(
      mbOrder({
        package: "BAND CHANT 1:30",
        packageType: "BAND CHANT",
        timeLengthOfMix: "",
      })
    );
    assert.equal(cleared.timeLengthOfMix, "");
    assert.equal(
      getOrderRequirements(cleared).collections.find((r) => r.id === "mix")
        ?.state,
      "red"
    );

    const patch = orderPatchFromOrderField(
      "timeLengthOfMix",
      "",
      mbOrder({
        timeLengthOfMix: "1:30",
        collectionStates: { mix: true },
      })
    );
    const next = {
      ...mbOrder({ timeLengthOfMix: "1:30", collectionStates: { mix: true } }),
      ...patch,
    };
    assert.equal(next.timeLengthOfMix, "");
    assert.equal(next.collectionStates?.mix, undefined);
    assert.equal(
      getOrderRequirements(next).collections.find((r) => r.id === "mix")?.state,
      "red"
    );
  });

  it("Form pill + COMPLETED ORDER FORM only for unmatched manuals", () => {
    const manual = mbOrder({ isManualEntry: true, timeLengthOfMix: "" });
    assert.ok(
      getOrderRequirements(manual).collections.some(
        (r) => r.id === "form" && r.state === "red"
      )
    );
    const manualLabels = buildMissingDataMailFieldGroups(
      {
        id: "mtd-mb",
        orderId: manual.id,
        section: "CHEERLEADING MUSIC",
        assignedProducer: null,
        category: "Marching Band",
        formType: "marching-band",
        editorRequest: "FA",
        contactName: "Demo",
        editorInitials: "FA",
        programName: "Demo High Band",
        package: "BAND CHANT",
        musicTheme: "",
        price: 600,
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
    assert.ok(manualLabels.includes("COMPLETED ORDER FORM"));

    const magento = mbOrder({ isManualEntry: false, timeLengthOfMix: "" });
    assert.ok(
      !getOrderRequirements(magento).collections.some((r) => r.id === "form")
    );
    const magentoLabels = buildMissingDataMailFieldGroups(
      {
        id: "mtd-mb2",
        orderId: magento.id,
        section: "CHEERLEADING MUSIC",
        assignedProducer: null,
        category: "Marching Band",
        formType: "marching-band",
        editorRequest: "FA",
        contactName: "Demo",
        editorInitials: "FA",
        programName: "Demo High Band",
        package: "BAND CHANT",
        musicTheme: "",
        price: 600,
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

    const matched = mbOrder({
      isManualEntry: true,
      mergedFormOrderId: "form-1",
      timeLengthOfMix: "",
    });
    assert.ok(
      !getOrderRequirements(matched).collections.some((r) => r.id === "form")
    );
  });
});
