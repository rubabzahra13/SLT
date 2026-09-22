"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const dashboard_1 = require("../dashboard");
function createMockRecord(overrides = {}) {
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
(0, node_test_1.default)("Dashboard Status & Date-Aware Classification", async (t) => {
    await t.test("Unassigned: no producer assigned -> Unassigned regardless of start date", () => {
        const rec1 = createMockRecord({ assignedProducer: null, mixStartDate: "2026-09-01" });
        const rec2 = createMockRecord({ assignedProducer: "", mixStartDate: "2026-09-18" });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec1, "2026-09-07"), "unassigned");
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec2, "2026-09-07"), "unassigned");
    });
    await t.test("In Queue: producer assigned + future start date -> In Queue", () => {
        const rec = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-18" });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-07"), "in_queue");
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-17"), "in_queue");
    });
    await t.test("In Production: producer assigned + start date today -> In Production", () => {
        const rec = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-07" });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-07"), "in_production");
    });
    await t.test("In Production: producer assigned + start date in past -> In Production", () => {
        const rec1 = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-09-03" });
        const rec2 = createMockRecord({ assignedProducer: "CA", mixStartDate: "2026-08-15" });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec1, "2026-09-07"), "in_production");
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec2, "2026-09-07"), "in_production");
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
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(completedRec, "2026-09-07"), "completed");
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(payrollRec, "2026-09-07"), "completed");
    });
    await t.test("Outsourced: status === 'outsourced' -> outsourced", () => {
        const outsourcedRec = createMockRecord({
            assignedProducer: "CA",
            mixStartDate: "2026-09-01",
            status: "outsourced",
        });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(outsourcedRec, "2026-09-07"), "outsourced");
    });
    await t.test("Waiting for data: assigned but needs attention is not in queue or production", () => {
        const rec = createMockRecord({
            assignedProducer: "CA",
            mixStartDate: "2026-09-18",
            needsAttention: true,
            status: "needs_attention",
        });
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-07"), "waiting_for_data");
    });
    await t.test("Date Sensitivity: classification shifts from In Queue to In Production as reference date arrives", () => {
        const rec = createMockRecord({
            assignedProducer: "CA",
            mixStartDate: "2026-09-18",
        });
        // On Sept 7, start date Sept 18 is in future -> In Queue
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-07"), "in_queue");
        // On Sept 18, start date Sept 18 has arrived -> In Production
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-18"), "in_production");
        // On Sept 25, start date Sept 18 has passed -> In Production (cumulative)
        strict_1.default.equal((0, dashboard_1.getDashboardMixStatus)(rec, "2026-09-25"), "in_production");
    });
    await t.test("buildDashboardPulse In Queue KPI counts scheduled future-start mixes only", () => {
        const mockRecords = [
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
        const pulse = (0, dashboard_1.buildDashboardPulse)(mockRecords, [], [], "2026-09-07");
        strict_1.default.equal(pulse.inQueue, 1);
    });
    await t.test("buildDashboardPulse correctly computes pulse metrics for reference date", () => {
        const mockRecords = [
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
        const pulse = (0, dashboard_1.buildDashboardPulse)(mockRecords, [], [], "2026-09-07");
        strict_1.default.equal(pulse.toAssign, 1);
        strict_1.default.equal(pulse.inQueue, 1);
        strict_1.default.equal(pulse.todaysMixes, 2);
        strict_1.default.equal(pulse.inProduction, 2);
        strict_1.default.equal(pulse.outsourced, 1);
        strict_1.default.equal(pulse.payrollCount, 1);
    });
    await t.test("Outsourced filter & KPI insights", () => {
        const { matchesAssignedProducerFilter, buildAssignedProducerOptions } = require("../mtd-filters");
        const { kpiInsight } = require("../dashboard-tooltips");
        const outsourcedRec = createMockRecord({ status: "outsourced" });
        const regularRec = createMockRecord({ assignedProducer: "CA", status: "active" });
        strict_1.default.equal(matchesAssignedProducerFilter(outsourcedRec, "Outsourced"), true);
        strict_1.default.equal(matchesAssignedProducerFilter(regularRec, "Outsourced"), false);
        const options = buildAssignedProducerOptions([outsourcedRec, regularRec], ["CA"]);
        const outsourcedOpt = options.find((o) => o.value === "Outsourced");
        strict_1.default.ok(outsourcedOpt);
        strict_1.default.equal(outsourcedOpt.count, 1);
        const inQueueTip = kpiInsight("In Queue", {});
        strict_1.default.equal(inQueueTip.body, "Mixes that are scheduled but not currently being worked on.");
        strict_1.default.equal(inQueueTip.body.includes("—"), false);
        const todaysTip = kpiInsight("Today's Mixes", {});
        strict_1.default.equal(todaysTip.title, "Today's Mixes");
        strict_1.default.equal(todaysTip.body, "Everything producers are scheduled to work on today, including mixes that started earlier and are still being worked on.");
        const outsourcedTip = kpiInsight("Outsourced", {});
        strict_1.default.equal(outsourcedTip.body, "Mixes that have been assigned to outsourced producers.");
    });
});
