import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord } from "@/types";
import {
  mtdBoardCountsQueryKey,
  mtdBoardQueryKey,
  patchMtdBoardRecordInCaches,
  readMtdBoardCache,
  readMtdBoardCountsCache,
  writeMtdBoardCache,
  writeMtdBoardCountsCache,
} from "../mtd-board-cache";

describe("MTD board leave membership", () => {
  it("removes the row from scope=board when moved to payroll", () => {
    const key = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
    });
    const row = {
      id: "mtd-1",
      orderId: "ord-1",
      programName: "Team",
      inMTD: true,
      inPayroll: false,
      assignedProducer: "CH",
    } as MTDRecord;
    writeMtdBoardCache(key, { records: [row], nextPageToken: null });

    patchMtdBoardRecordInCaches("mtd-1", {
      inPayroll: true,
      status: "completed",
      recordStatus: "Completed",
    });

    assert.equal(readMtdBoardCache(key)?.entry.records.length, 0);
  });

  it("Move to Payroll alias re-patches do not duplicate the payroll row", () => {
    const boardKey = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const payrollKey = mtdBoardQueryKey({
      scope: "payroll",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const seed = {
      id: "mtd-dup",
      uuid: "uuid-dup",
      orderId: "ord-dup",
      legacyId: "leg-dup",
      programName: "Cheerforce",
      contactName: "Noell Evans",
      invoice: "789",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: true,
      inPayroll: false,
      assignedProducer: "CH",
    } as MTDRecord;
    writeMtdBoardCache(boardKey, { records: [seed], nextPageToken: null });
    writeMtdBoardCache(payrollKey, { records: [], nextPageToken: null });

    const payrollPatch = {
      inPayroll: true,
      inMTD: false,
      status: "completed",
      recordStatus: "Completed",
    } as Partial<MTDRecord>;

    // Mimic confirmCompleteToPayroll + updateMTD alias fan-out (including a
    // stale order.mtdId that does not match any field on the row).
    patchMtdBoardRecordInCaches("mtd-dup", payrollPatch, seed);
    patchMtdBoardRecordInCaches("ord-dup", payrollPatch, seed);
    patchMtdBoardRecordInCaches("uuid-dup", payrollPatch, seed);
    patchMtdBoardRecordInCaches("stale-mtd-id", payrollPatch, seed);

    const payrollRows = readMtdBoardCache(payrollKey)?.entry.records ?? [];
    assert.equal(payrollRows.length, 1, "exactly one payroll row");
    assert.equal(payrollRows[0]?.id, "mtd-dup");
    assert.equal(payrollRows[0]?.invoice, "789");
    assert.equal(readMtdBoardCache(boardKey)?.entry.records.length, 0);
  });

  it("removes the row from scope=board when moved to Orders", () => {
    const key = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
    });
    const row = {
      id: "mtd-2",
      orderId: "ord-2",
      programName: "Team",
      inMTD: true,
      inPayroll: false,
      assignedProducer: "CH",
    } as MTDRecord;
    writeMtdBoardCache(key, { records: [row], nextPageToken: null });

    patchMtdBoardRecordInCaches("mtd-2", {
      inMTD: false,
      isReassigned: true,
      assignedProducer: null,
    });

    assert.equal(readMtdBoardCache(key)?.entry.records.length, 0);
  });

  it("moves payroll → archive on Mark Paid without leaving a ghost", () => {
    const payrollKey = mtdBoardQueryKey({
      scope: "payroll",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const archiveKey = mtdBoardQueryKey({
      scope: "archive",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const row = {
      id: "mtd-paid",
      orderId: "ord-paid",
      programName: "Team Japan",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: false,
      inPayroll: true,
      paidAt: null,
      assignedProducer: "CH",
    } as MTDRecord;
    writeMtdBoardCache(payrollKey, { records: [row], nextPageToken: null });

    const paidAt = "2026-11-04T12:00:00.000Z";
    patchMtdBoardRecordInCaches("mtd-paid", {
      inPayroll: true,
      status: "completed",
      recordStatus: "Completed",
      paidAt,
    });

    assert.equal(readMtdBoardCache(payrollKey)?.entry.records.length, 0);
    const archived = readMtdBoardCache(archiveKey)?.entry.records ?? [];
    assert.equal(archived.length, 1);
    assert.equal(archived[0]?.id, "mtd-paid");
    assert.equal(archived[0]?.paidAt, paidAt);
  });

  it("seeds scope=board on Move to MTD without polluting Dance cache", () => {
    const cheerKey = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const danceKey = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-dance",
    });
    const boardCountsKey = mtdBoardCountsQueryKey({ scope: "board" });
    writeMtdBoardCache(cheerKey, { records: [], nextPageToken: null });
    writeMtdBoardCache(danceKey, { records: [], nextPageToken: null });
    writeMtdBoardCountsCache(boardCountsKey, {
      all: 0,
      by_form_type: {},
      by_cheer_form_subtype: {},
      by_dance_form_subtype: {},
      by_category: {},
    });

    const row = {
      id: "mtd-enter",
      orderId: "ord-enter",
      programName: "Black Diamondz",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: false,
      inPayroll: false,
    } as MTDRecord;

    patchMtdBoardRecordInCaches("mtd-enter", { inMTD: true }, row);

    const cheer = readMtdBoardCache(cheerKey)?.entry.records ?? [];
    const dance = readMtdBoardCache(danceKey)?.entry.records ?? [];
    assert.equal(cheer.length, 1);
    assert.equal(cheer[0]?.id, "mtd-enter");
    assert.equal(dance.length, 0);
    assert.equal(readMtdBoardCountsCache(boardCountsKey)?.counts.all, 1);
    assert.equal(
      readMtdBoardCountsCache(boardCountsKey)?.counts.by_form_type?.[
        "school-all-star-cheer"
      ],
      1
    );
  });

  it("leave decrements form chips from the board row even if seed lacks formType", () => {
    const cheerKey = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const boardCountsKey = mtdBoardCountsQueryKey({ scope: "board" });
    const row = {
      id: "mtd-leave-meta",
      orderId: "ord-leave-meta",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: true,
      inPayroll: false,
    } as MTDRecord;
    writeMtdBoardCache(cheerKey, { records: [row], nextPageToken: null });
    writeMtdBoardCountsCache(boardCountsKey, {
      all: 1,
      by_form_type: { "school-all-star-cheer": 1 },
      by_cheer_form_subtype: { "all-star-cheer": 1 },
      by_dance_form_subtype: {},
      by_category: {},
    });

    // Seed without formType — used to decrement only `all`, leaving cheer=1.
    patchMtdBoardRecordInCaches(
      "mtd-leave-meta",
      { inMTD: false, isReassigned: true },
      { id: "mtd-leave-meta", inMTD: true } as MTDRecord
    );

    const counts = readMtdBoardCountsCache(boardCountsKey)?.counts;
    assert.equal(counts?.all, 0);
    assert.equal(counts?.by_form_type?.["school-all-star-cheer"], 0);
    assert.equal(counts?.by_cheer_form_subtype?.["all-star-cheer"], 0);
  });

  it("does not re-bump board counts when already on MTD", () => {
    const cheerKey = mtdBoardQueryKey({
      scope: "board",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const boardCountsKey = mtdBoardCountsQueryKey({ scope: "board" });
    const row = {
      id: "mtd-dup",
      orderId: "ord-dup",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: true,
      inPayroll: false,
    } as MTDRecord;
    writeMtdBoardCache(cheerKey, { records: [row], nextPageToken: null });
    writeMtdBoardCountsCache(boardCountsKey, {
      all: 1,
      by_form_type: { "school-all-star-cheer": 1 },
      by_cheer_form_subtype: { "all-star-cheer": 1 },
      by_dance_form_subtype: {},
      by_category: {},
    });

    patchMtdBoardRecordInCaches(
      "mtd-dup",
      { inMTD: true, invoice: "INV-1" },
      row
    );

    assert.equal(readMtdBoardCountsCache(boardCountsKey)?.counts.all, 1);
    assert.equal(readMtdBoardCache(cheerKey)?.entry.records.length, 1);
  });

  it("Mark Paid decrements payroll form/subtype chips (Archive has no counts)", () => {
    const payrollKey = mtdBoardQueryKey({
      scope: "payroll",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const payrollCountsKey = mtdBoardCountsQueryKey({ scope: "payroll" });
    const archiveCountsKey = mtdBoardCountsQueryKey({ scope: "archive" });
    const row = {
      id: "mtd-chips",
      orderId: "ord-chips",
      programName: "Team Japan",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: false,
      inPayroll: true,
      paidAt: null,
      assignedProducer: "CH",
    } as MTDRecord;
    writeMtdBoardCache(payrollKey, { records: [row], nextPageToken: null });
    writeMtdBoardCountsCache(payrollCountsKey, {
      all: 1,
      by_form_type: { "school-all-star-cheer": 1 },
      by_cheer_form_subtype: { "all-star-cheer": 1 },
      by_dance_form_subtype: {},
      by_category: {},
    });
    writeMtdBoardCountsCache(archiveCountsKey, {
      all: 0,
      by_form_type: {},
      by_cheer_form_subtype: {},
      by_dance_form_subtype: {},
      by_category: {},
    });

    patchMtdBoardRecordInCaches("mtd-chips", {
      inPayroll: true,
      status: "completed",
      recordStatus: "Completed",
      paidAt: "2026-11-04T12:00:00.000Z",
    });

    const pay = readMtdBoardCountsCache(payrollCountsKey)?.counts;
    const arch = readMtdBoardCountsCache(archiveCountsKey)?.counts;
    assert.equal(pay?.all, 0);
    assert.equal(pay?.by_form_type?.["school-all-star-cheer"], 0);
    assert.equal(pay?.by_cheer_form_subtype?.["all-star-cheer"], 0);
    // Archive counts stay untouched — no badge / no /mtd/counts for archive.
    assert.equal(arch?.all, 0);
  });
});
