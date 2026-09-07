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
    await t.test("buildDashboardPulse correctly computes pulse metrics for reference date", () => {
        const mockRecords = [
            createMockRecord({ id: "r1", assignedProducer: null }), // Unassigned
            createMockRecord({ id: "r2", assignedProducer: "CA", mixStartDate: "2026-09-18" }), // In Queue
            createMockRecord({ id: "r3", assignedProducer: "CA", mixStartDate: "2026-09-07" }), // In Production
            createMockRecord({ id: "r4", assignedProducer: "CA", mixStartDate: "2026-09-01" }), // In Production
            createMockRecord({ id: "r5", assignedProducer: "CA", status: "outsourced" }), // Outsourced
            createMockRecord({ id: "r6", assignedProducer: "CA", status: "completed" }), // Completed
        ];
        const pulse = (0, dashboard_1.buildDashboardPulse)(mockRecords, [], [], "2026-09-07");
        strict_1.default.equal(pulse.toAssign, 1);
        strict_1.default.equal(pulse.inQueue, 1);
        strict_1.default.equal(pulse.inProduction, 2);
        strict_1.default.equal(pulse.outsourced, 1);
        strict_1.default.equal(pulse.payrollCount, 1);
    });
});
