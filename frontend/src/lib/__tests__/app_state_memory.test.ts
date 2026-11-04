import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_STATE_CACHE_HARD_MAX_AGE_MS,
  APP_STATE_CACHE_VERSION,
  archivedPayrollAfterLoad,
  archivedPayrollAfterRelease,
  isArchivedPayrollRecord,
  isPastBoardOrder,
  ordersCachePayload,
  pastOrdersAfterLoad,
  pastOrdersAfterRelease,
  readActiveOrdersFromCache,
  readLiveMtdFromCache,
  shouldApplyArchivedPayrollUpdate,
  shouldApplyPastOrderUpdate,
} from "../app-state-memory";
import { parseStudioStreamBlock } from "../api/studio-stream";
import type { MTDRecord, Order } from "../../types";

describe("app state memory / cache v5", () => {
  it("uses v5 cache version and 24h TTL", () => {
    assert.equal(APP_STATE_CACHE_VERSION, "v5");
    assert.equal(APP_STATE_CACHE_HARD_MAX_AGE_MS, 24 * 60 * 60 * 1000);
  });

  it("orders cache payload is active-only (no past key)", () => {
    const active = [{ id: "a1", status: "new" } as Order];
    const payload = ordersCachePayload(active);
    assert.deepEqual(payload, { active });
    assert.equal("past" in payload, false);
  });

  it("cache read restores active and ignores legacy past", () => {
    const restored = readActiveOrdersFromCache({
      active: [{ id: "a1" }],
      past: [{ id: "p1" }, { id: "p2" }],
    });
    assert.equal(restored.length, 1);
    assert.equal(restored[0]?.id, "a1");
  });

  it("MTD cache read drops paid archive rows", () => {
    const restored = readLiveMtdFromCache([
      { id: "live", paidAt: null } as MTDRecord,
      { id: "paid", paidAt: "2026-01-01T00:00:00Z" } as MTDRecord,
    ]);
    assert.equal(restored.length, 1);
    assert.equal(restored[0]?.id, "live");
  });

  it("treats completed / isPastOrder as past board rows", () => {
    assert.equal(isPastBoardOrder({ status: "completed", isPastOrder: false }), true);
    assert.equal(isPastBoardOrder({ status: "new", isPastOrder: true }), true);
    assert.equal(isPastBoardOrder({ status: "new", isPastOrder: false }), false);
  });

  it("treats paidAt as archived payroll", () => {
    assert.equal(isArchivedPayrollRecord({ paidAt: "2026-01-01" }), true);
    assert.equal(isArchivedPayrollRecord({ paidAt: null }), false);
  });

  it("past stream updates only apply while past is loaded", () => {
    assert.equal(shouldApplyPastOrderUpdate(false), false);
    assert.equal(shouldApplyPastOrderUpdate(true), true);
  });

  it("archive stream updates only apply while archive is loaded", () => {
    assert.equal(shouldApplyArchivedPayrollUpdate(false), false);
    assert.equal(shouldApplyArchivedPayrollUpdate(true), true);
  });

  it("ensurePast loads past and releasePast clears it", () => {
    const loaded = pastOrdersAfterLoad([{ id: "p1" }]);
    assert.equal(loaded.loaded, true);
    assert.equal(loaded.past.length, 1);
    const released = pastOrdersAfterRelease();
    assert.equal(released.loaded, false);
    assert.deepEqual(released.past, []);
  });

  it("ensureArchive loads archive and releaseArchive clears it", () => {
    const loaded = archivedPayrollAfterLoad([{ id: "a1" }]);
    assert.equal(loaded.loaded, true);
    assert.equal(loaded.archive.length, 1);
    const released = archivedPayrollAfterRelease();
    assert.equal(released.loaded, false);
    assert.deepEqual(released.archive, []);
  });
});

describe("studio stream event mapping", () => {
  it("maps order.updated and producer.updated SSE blocks", () => {
    const orderEvent = parseStudioStreamBlock(
      [
        "event: order.updated",
        'data: {"type":"order.updated","order":{"id":"ord-1","status":"new","form_type":"school-all-star-cheer"}}',
      ].join("\n")
    );
    assert.ok(orderEvent);
    assert.equal(orderEvent?.type, "order.updated");
    if (orderEvent?.type === "order.updated") {
      assert.equal(orderEvent.order.id, "ord-1");
    }

    const producerEvent = parseStudioStreamBlock(
      [
        "event: producer.updated",
        'data: {"type":"producer.updated","producer":{"id":"prod-1","name":"Casey","initials":"CM"}}',
      ].join("\n")
    );
    assert.ok(producerEvent);
    assert.equal(producerEvent?.type, "producer.updated");
    if (producerEvent?.type === "producer.updated") {
      assert.equal(producerEvent.producer.id, "prod-1");
    }
  });

  it("maps mtd.updated SSE blocks for archive policy tests", () => {
    const event = parseStudioStreamBlock(
      [
        "event: mtd.updated",
        'data: {"type":"mtd.updated","mtd":{"id":"mtd-1","paid_at":"2026-01-01T00:00:00Z","in_payroll":true,"program_name":"Paid","contact_name":"C","category":"Cheer","section":"CHEERLEADING MUSIC","package":"Gold","price":1,"invoice":"","status":"completed"}}',
      ].join("\n")
    );
    assert.ok(event);
    assert.equal(event?.type, "mtd.updated");
    if (event?.type === "mtd.updated") {
      assert.ok(event.record.paidAt);
      assert.equal(shouldApplyArchivedPayrollUpdate(false), false);
    }
  });
});
