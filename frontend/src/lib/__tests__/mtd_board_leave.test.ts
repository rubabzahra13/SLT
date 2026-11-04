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
