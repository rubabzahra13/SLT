import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MTDRecord, Order } from "@/types";
import { resolveMtdTimestamp } from "../mtd-timestamp";
import {
  mtdBoardQueryKey,
  patchMtdBoardRecordInCaches,
  readMtdBoardCache,
} from "../mtd-board-cache";
import {
  writeOrdersBoardCache,
  ordersBoardQueryKey,
} from "../orders-board-cache";

describe("resolveMtdTimestamp", () => {
  it("prefers createdAt on the MTD board row", () => {
    const rec = {
      id: "mtd-1",
      orderId: "ord-1",
      createdAt: "2026-01-02T10:00:00.000Z",
    } as MTDRecord;
    assert.equal(
      resolveMtdTimestamp(rec, []),
      "2026-01-02T10:00:00.000Z"
    );
  });

  it("falls back to AppState linked order", () => {
    const rec = { id: "mtd-2", orderId: "ord-2" } as MTDRecord;
    const orders = [
      { id: "ord-2", createdAt: "2026-02-03T11:00:00.000Z" } as Order,
    ];
    assert.equal(
      resolveMtdTimestamp(rec, orders),
      "2026-02-03T11:00:00.000Z"
    );
  });

  it("falls back to Orders board cache when allOrders is empty", () => {
    const order = {
      id: "ord-3",
      createdAt: "2026-03-04T12:00:00.000Z",
      programName: "Team",
    } as Order;
    writeOrdersBoardCache(ordersBoardQueryKey({}), {
      orders: [order],
      nextPageToken: null,
    });
    const rec = { id: "mtd-3", orderId: "ord-3" } as MTDRecord;
    assert.equal(
      resolveMtdTimestamp(rec, []),
      "2026-03-04T12:00:00.000Z"
    );
  });
});

describe("MTD board cache seeds payroll from explicit seed", () => {
  it("seeds payroll when music cache is cold", () => {
    const seed = {
      id: "mtd-seed",
      orderId: "ord-seed",
      programName: "Seed Team",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
      inMTD: true,
      inPayroll: false,
      assignedProducer: "CH",
    } as MTDRecord;

    patchMtdBoardRecordInCaches(
      "mtd-seed",
      {
        inPayroll: true,
        status: "completed",
        recordStatus: "Completed",
      },
      seed
    );

    const payrollKey = mtdBoardQueryKey({
      scope: "payroll",
      formType: "school-all-star-cheer",
      cheerFormSubtype: "all-star-cheer",
    });
    const rows = readMtdBoardCache(payrollKey)?.entry.records ?? [];
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "mtd-seed");
    assert.equal(rows[0]?.inPayroll, true);
  });
});
