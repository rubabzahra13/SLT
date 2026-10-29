import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mtdPatchFromOrderField, orderPatchFromMTD } from "../mtd-order-sync";
import {
  displayPackageFromOrder,
  mergeCollectionStateFromOrder,
} from "../order-staging";
import { overlayMergedFormForDisplay } from "../manual-form-merge";
import { getOrderIdentityName } from "../order-detail-sections";
import type { MTDRecord, Order } from "@/types";

describe("Phase 3: MTD identity SoT is Orders", () => {
  it("order form identity edits do not dual-write onto MTD", () => {
    assert.deepEqual(mtdPatchFromOrderField("contactName", "Coach A"), {});
    assert.deepEqual(mtdPatchFromOrderField("programName", "Gym A"), {});
    assert.deepEqual(mtdPatchFromOrderField("package", "GOLD"), {});
    assert.deepEqual(mtdPatchFromOrderField("musicTheme", "Theme"), {});
    assert.deepEqual(mtdPatchFromOrderField("gymName", "Gym B"), {});
  });

  it("board identity edits still map to Order patches for SoT writes", () => {
    const patch = orderPatchFromMTD({
      contactName: "Coach B",
      programName: "Org C",
      package: "SILVER",
      musicTheme: "Notes",
    });
    assert.equal(patch.contactName, "Coach B");
    assert.equal(patch.coachName, "Coach B");
    assert.equal(patch.programName, "Org C");
    assert.equal(patch.gymName, "Org C");
    assert.equal(patch.package, "SILVER");
    assert.equal(patch.musicTheme, "Notes");
  });

  it("collection / songs still sync to MTD ops fields", () => {
    const songs = mtdPatchFromOrderField("songListSuggestions", "Song 1");
    assert.equal(songs.haveSongs, "HAVE SONGS");
    assert.equal(songs.songListSuggestions, "Song 1");
  });

  it("thin MTD board rows hydrate identity + assignment from linked Order", () => {
    const order = {
      id: "ord-mb-1",
      formType: "marching-band",
      category: "Marching Band",
      coachName: "Nabeeha",
      schoolProgramName: "ABC Band Org",
      schoolName: "ABC Band Org",
      packageType: "FIGHT SONG PLUS",
      package: "TBD",
      assignedProducer: "BE",
      mixStartDate: "2026-10-18",
      mixEndDate: "2026-10-20",
      status: "in_mtd",
      price: 600,
      priceCompliance: "compliant",
      createdAt: "2026-10-01",
      needsAttention: false,
      attentionReason: null,
      contactName: "",
      programName: "",
      customerName: "",
      musicTheme: "",
      editorRequest: "FA",
      requestedProducer: "",
    } as Order;

    const thinMtd = {
      id: "mtd-1",
      orderId: order.id,
      section: "MARCHING BAND",
      category: "Cheer",
      contactName: "",
      programName: "",
      package: "",
      assignedProducer: null,
      mixStartDate: "",
      mixEndDate: undefined,
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
      inMTD: true,
      editorRequest: "FA",
    } as MTDRecord;

    assert.equal(displayPackageFromOrder(order), "FIGHT SONG PLUS");

    const merged = mergeCollectionStateFromOrder(thinMtd, order);
    assert.equal(merged.contactName, "Nabeeha");
    assert.equal(merged.programName, "ABC Band Org");
    assert.equal(merged.package, "FIGHT SONG PLUS");
    assert.equal(merged.assignedProducer, "BE");
    assert.equal(merged.mixStartDate, "2026-10-18");
    assert.equal(merged.mixEndDate, "2026-10-20");
    assert.equal(merged.formType, "marching-band");
    assert.equal(merged.category, "Marching Band");
  });

  it("in_mtd booking with empty school_gym_name reads March School from linked Magento form", () => {
    const booking = {
      id: "ord-booking",
      formType: "marching-band",
      category: "Marching Band",
      isManualEntry: false,
      status: "in_mtd",
      mergedFormOrderId: "ord-form",
      schoolProgramName: "",
      schoolName: "",
      programName: "",
      packageType: "FIGHT SONG PLUS",
      package: "TBD",
      coachName: "Test",
      contactName: "",
      customerName: "",
      musicTheme: "",
      editorRequest: "FA",
      requestedProducer: "",
      assignedProducer: null,
      price: 600,
      priceCompliance: "compliant",
      createdAt: "2026-10-01",
      needsAttention: false,
      attentionReason: null,
    } as Order;

    const form = {
      id: "ord-form",
      formType: "marching-band",
      category: "Marching Band",
      isManualEntry: false,
      status: "new",
      mergedIntoManualOrderId: "ord-booking",
      schoolProgramName: "March School",
      schoolName: "March School",
      programName: "March School",
      packageType: "BAND CHANT",
      package: "BAND CHANT",
      coachName: "Demo Band Coach",
      contactName: "Demo Band Coach",
      customerName: "Demo Band Coach",
      musicTheme: "",
      editorRequest: "FA",
      requestedProducer: "",
      assignedProducer: null,
      price: 600,
      priceCompliance: "compliant",
      createdAt: "2026-10-01",
      needsAttention: false,
      attentionReason: null,
    } as Order;

    assert.equal(getOrderIdentityName(booking).trim(), "");
    const enriched = overlayMergedFormForDisplay(booking, [booking, form]);
    assert.equal(getOrderIdentityName(enriched).trim(), "March School");
    assert.equal(enriched.schoolProgramName, "March School");

    const thinMtd = {
      id: "mtd-1",
      orderId: booking.id,
      section: "MARCHING BAND",
      category: "Cheer",
      contactName: "Test",
      programName: "",
      package: "",
      assignedProducer: null,
      mixStartDate: "",
      price: 0,
      priceCompliance: "compliant",
      invoice: "",
      eightCountSheet: "",
      haveSongs: "",
      needsAttention: false,
      status: "active",
      inMTD: true,
      editorRequest: "FA",
    } as MTDRecord;

    const board = mergeCollectionStateFromOrder(thinMtd, enriched);
    assert.equal(board.programName, "March School");
    assert.equal(board.contactName, "Test");
  });
});
