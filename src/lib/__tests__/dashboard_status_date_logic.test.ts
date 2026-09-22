import test from "node:test";
import assert from "node:assert/strict";
import { getDashboardMixStatus, buildDashboardPulse } from "../dashboard";
import type { MTDRecord } from "@/types";

function createMockRecord(overrides: Partial<MTDRecord> = {}): MTDRecord {
  return {
    id: "rec-test-1",
    section: "CHEERLEADING MUSIC",
    category: "Cheer",
    contactName: "Test Coach",
    editorInitials: "CA",
    editorRequest: "FA",
    programName: "Test Team",
    musicTheme: "Gold Mix",
    package: "GOLD 2:00",
    price: 950,
    priceCompliance: "compliant",
    invoice: "INV-100",
    mixStartDate: "2026-09-07",
    eightCountSheet: "HAVE CS",
    haveSongs: "HAVE SONGS",
    needsAttention: false,
    status: "active",
    assignedProducer: "CA",
    ...overrides,
  };
}

test("Dashboard Status & Date-Aware Classification", async (t) => {
  await t.test("Unassigned: no producer assigned -> Unassigned regardless of start date", () => {
    const rec1 = createMockRecord({ assignedProducer: null, mixStartDate: "2026-09-01" });
    const rec2 = createMockRecord({ assignedProducer: "", mixStartDate: "2026-09-18" });

    assert.equal(getDashboardMixStatus(rec1, "2026-09-07"), "unassigned");
    assert.equal(getDashboardMixStatus(rec2, "2026-09-07"), "unassigned");
  });

  await t.test("In Queue: producer assigned + future start date -> In Queue", () => {
    const rec = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-18" });

    assert.equal(getDashboardMixStatus(rec, "2026-09-07"), "in_queue");
    assert.equal(getDashboardMixStatus(rec, "2026-09-17"), "in_queue");
  });

  await t.test("In Production: producer assigned + start date today -> In Production", () => {
    const rec = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-07" });

    assert.equal(getDashboardMixStatus(rec, "2026-09-07"), "in_production");
  });

  await t.test("In Production: producer assigned + start date in past -> In Production", () => {
    const rec1 = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-03" });
    const rec2 = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-08-15" });

    assert.equal(getDashboardMixStatus(rec1, "2026-09-07"), "in_production");
    assert.equal(getDashboardMixStatus(rec2, "2026-09-07"), "in_production");
  });

  await t.test("Completed/Delivered: completed or inPayroll -> not In Production nor In Queue", () => {
    const completedRec = createMockRecord({
      assignedProducer: "CA",
      mixStartDate: "2026-09-01",
      status: "completed",
    });
    const payrollRec = createMockRecord({
      assignedProducer: "CA",
      mixStartDate: "2026-09-01",
      inPayroll: true,
    });

    assert.equal(getDashboardMixStatus(completedRec, "2026-09-07"), "completed");
    assert.equal(getDashboardMixStatus(payrollRec, "2026-09-07"), "completed");
  });

  await t.test("Outsourced: status === 'outsourced' -> outsourced", () => {
    const outsourcedRec = createMockRecord({
      assignedProducer: "CA",
      mixStartDate: "2026-09-01",
      status: "outsourced",
    });

    assert.equal(getDashboardMixStatus(outsourcedRec, "2026-09-07"), "outsourced");
  });

  await t.test("Waiting for data: assigned but needs attention is not in queue or production", () => {
    const rec = createMockRecord({
      assignedProducer: "CA",
      mixStartDate: "2026-09-18",
      needsAttention: true,
      status: "needs_attention",
    });

    assert.equal(getDashboardMixStatus(rec, "2026-09-07"), "waiting_for_data");
  });

  await t.test("Date Sensitivity: classification shifts from In Queue to In Production as reference date arrives", () => {
    const rec = createMockRecord({
      assignedProducer: "CA",
      mixStartDate: "2026-09-18",
    });

    // On Sept 7, start date Sept 18 is in future -> In Queue
    assert.equal(getDashboardMixStatus(rec, "2026-09-07"), "in_queue");

    // On Sept 18, start date Sept 18 has arrived -> In Production
    assert.equal(getDashboardMixStatus(rec, "2026-09-18"), "in_production");

    // On Sept 25, start date Sept 18 has passed -> In Production (cumulative)
    assert.equal(getDashboardMixStatus(rec, "2026-09-25"), "in_production");
  });

  await t.test("buildDashboardPulse In Queue KPI counts scheduled future-start mixes only", () => {
    const mockRecords: MTDRecord[] = [
      createMockRecord({ id: "r1", recordStatus: "Ongoing" }),
      createMockRecord({
        id: "r2",
        recordStatus: "Ongoing",
        assignedProducer: "CA",
        mixStartDate: "2026-09-18",
      }),
      createMockRecord({ id: "r3", recordStatus: "Ongoing", needsAttention: true, status: "needs_attention" }),
      createMockRecord({ id: "r4", recordStatus: "Completed", status: "completed" }),
      createMockRecord({ id: "r5", inPayroll: true, recordStatus: "Completed" }),
    ];

    const pulse = buildDashboardPulse(mockRecords, [], [], "2026-09-07");

    assert.equal(pulse.inQueue, 1);
  });

  await t.test("buildDashboardPulse correctly computes pulse metrics for reference date", () => {
    const mockRecords: MTDRecord[] = [
      createMockRecord({ id: "r1", assignedProducer: null }), // Unassigned
      createMockRecord({
        id: "r2",
        recordStatus: "Ongoing",
        assignedProducer: "CA",
        mixStartDate: "2026-09-18",
      }),
      createMockRecord({
        id: "r3",
        recordStatus: "Ongoing",
        assignedProducer: "CA",
        mixStartDate: "2026-09-07",
      }),
      createMockRecord({
        id: "r4",
        recordStatus: "Ongoing",
        assignedProducer: "CA",
        mixStartDate: "2026-09-01",
      }),
      createMockRecord({ id: "r5", assignedProducer: "CA", status: "outsourced" }), // Outsourced
      createMockRecord({ id: "r6", assignedProducer: "CA", status: "completed" }), // Completed
    ];

    const pulse = buildDashboardPulse(mockRecords, [], [], "2026-09-07");

    assert.equal(pulse.toAssign, 1);
    assert.equal(pulse.inQueue, 1);
    assert.equal(pulse.todaysMixes, 2);
    assert.equal(pulse.inProduction, 2);
    assert.equal(pulse.outsourced, 1);
    assert.equal(pulse.payrollCount, 1);
  });

  await t.test("Outsourced filter & KPI insights", () => {
    const { matchesAssignedProducerFilter, buildAssignedProducerOptions } = require("../mtd-filters");
    const { kpiInsight } = require("../dashboard-tooltips");

    const outsourcedRec = createMockRecord({ status: "outsourced" });
    const regularRec = createMockRecord({ assignedProducer: "CA", status: "active" });

    assert.equal(matchesAssignedProducerFilter(outsourcedRec, "Outsourced"), true);
    assert.equal(matchesAssignedProducerFilter(regularRec, "Outsourced"), false);

    const options = buildAssignedProducerOptions([outsourcedRec, regularRec], ["CA"]);
    const outsourcedOpt = options.find((o: any) => o.value === "Outsourced");
    assert.ok(outsourcedOpt);
    assert.equal(outsourcedOpt.count, 1);

    const inQueueTip = kpiInsight("In Queue", {} as any);
    assert.equal(inQueueTip.body, "Mixes that are scheduled but not currently being worked on.");
    assert.equal(inQueueTip.body.includes("—"), false);

    const todaysTip = kpiInsight("Today's Mixes", {} as any);
    assert.equal(todaysTip.title, "Today's Mixes");
    assert.equal(
      todaysTip.body,
      "Everything producers are scheduled to work on today, including mixes that started earlier and are still being worked on."
    );

    const outsourcedTip = kpiInsight("Outsourced", {} as any);
    assert.equal(outsourcedTip.body, "Mixes that have been assigned to outsourced producers.");
  });
});
