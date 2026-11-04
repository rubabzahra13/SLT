import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord } from "@/types";
import {
  mtdBoardQueryKey,
  patchMtdBoardRecordInCaches,
  readMtdBoardCache,
  writeMtdBoardCache,
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
});
