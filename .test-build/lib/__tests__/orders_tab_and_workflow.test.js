"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const mtd_filters_1 = require("../mtd-filters");
const order_staging_1 = require("../order-staging");
const mtd_completion_1 = require("../mtd-completion");
const order_detail_sections_1 = require("../order-detail-sections");
function makeRecord(overrides = {}) {
    return {
        id: "ord-test-101",
        section: "CHEERLEADING MUSIC",
        assignedProducer: null,
        category: "Cheer",
        editorInitials: "JD",
        programName: "SPIRIT XTREME AS MIGHTY MINI",
        package: "PLATINUM 2:30 NO SPLIT",
        musicTheme: "Power Music Covers",
        price: 1400,
        priceCompliance: "compliant",
        invoice: "",
        mixStartDate: "",
        mixEndDate: "",
        eightCountSheet: "NEED CS",
        haveSongs: "NEED SONGS",
        needsAttention: true,
        status: "active",
        editorRequest: "FA",
        contactName: "Walter Smith",
        ...overrides,
    };
}
(0, node_test_1.describe)("Orders Tab & Workflow Separation", () => {
    (0, node_test_1.it)("Unassigned and/or unscheduled orders are partitioned into the Orders tab (isPreMTDOrderRecord)", () => {
        const unassignedOrder = makeRecord({ assignedProducer: null, mixStartDate: "", mixEndDate: "" });
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(unassignedOrder), true);
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(unassignedOrder), false);
        const unscheduledOrder = makeRecord({ assignedProducer: "CM", mixStartDate: "2026-09-10", mixEndDate: "" });
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(unscheduledOrder), true);
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(unscheduledOrder), false);
    });
    (0, node_test_1.it)("Assigned and fully scheduled orders stay in Orders until explicitly moved to MTD", () => {
        // Assigning an editor + dates makes the order ready, but it stays in the
        // Orders tab (shows the assigned producer) until the user clicks Move to MTD.
        const readyOrder = makeRecord({
            assignedProducer: "CM",
            mixStartDate: "2026-09-10",
            mixEndDate: "2026-09-17",
        });
        strict_1.default.equal((0, mtd_filters_1.isOrderScheduledAndAssigned)(readyOrder), true);
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(readyOrder), false);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(readyOrder), true);
        // Once explicitly moved, it belongs on the MTD tab.
        const movedOrder = { ...readyOrder, inMTD: true };
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(movedOrder), true);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(movedOrder), false);
    });
    (0, node_test_1.it)("Move to MTD transition: validates assigned editor & dates, updating state without changing order ID", () => {
        const record = makeRecord({
            id: "ord-test-555",
            assignedProducer: null,
            mixStartDate: "",
            mixEndDate: "",
        });
        // Unassigned + unscheduled -> not ready
        strict_1.default.equal((0, mtd_filters_1.isOrderScheduledAndAssigned)(record), false);
        // Admin assigns editor & sets dates
        const scheduledRecord = {
            ...record,
            assignedProducer: "JD",
            mixStartDate: "2026-09-15",
            mixEndDate: "2026-09-22",
        };
        strict_1.default.equal((0, mtd_filters_1.isOrderScheduledAndAssigned)(scheduledRecord), true);
        // Admin clicks Move to MTD
        const movedRecord = {
            ...scheduledRecord,
            inMTD: true,
        };
        // Verify same order ID and state transition
        strict_1.default.equal(movedRecord.id, "ord-test-555");
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(movedRecord), true);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(movedRecord), false);
        strict_1.default.equal(movedRecord.assignedProducer, "JD");
        strict_1.default.equal(movedRecord.mixStartDate, "2026-09-15");
        strict_1.default.equal(movedRecord.mixEndDate, "2026-09-22");
    });
    (0, node_test_1.it)("Backend assignment wins over stale local state on reload", () => {
        const backendRecord = makeRecord({
            assignedProducer: "CM",
            mixStartDate: "2026-09-10",
            mixEndDate: "2026-09-17",
            inMTD: false,
        });
        const staleLocal = makeRecord({
            assignedProducer: null,
            editorRequest: "FA",
            mixStartDate: "",
            mixEndDate: "",
        });
        const merged = (0, mtd_completion_1.mergeLocalMtdRecordFields)(backendRecord, staleLocal);
        strict_1.default.equal(merged.assignedProducer, "CM");
        strict_1.default.equal(merged.inMTD, false);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(merged), true);
    });
    (0, node_test_1.it)("Open orders without mtd_records appear on the Orders tab", () => {
        const order = {
            id: "ord-open-1",
            customerName: "Coach",
            contactName: "Coach",
            programName: "Demo Team",
            category: "Cheer",
            package: "Gold",
            musicTheme: "",
            editorRequest: "FA",
            requestedProducer: "",
            assignedProducer: null,
            price: 299,
            priceCompliance: "compliant",
            status: "new",
            createdAt: "2026-01-01",
            needsAttention: false,
            formType: "school-all-star-cheer",
            cheerFormSubtype: "all-star-cheer",
        };
        const rows = (0, order_staging_1.listPreMtdOrderRecords)([order], []);
        strict_1.default.equal(rows.length, 1);
        strict_1.default.equal(rows[0].orderId, order.id);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(rows[0]), true);
    });
    (0, node_test_1.it)("Outsourced mixes belong on the MTD tab even without full scheduling", () => {
        const outsourced = makeRecord({
            section: "OUTSOURCED MIXES",
            status: "outsourced",
            assignedProducer: null,
            mixStartDate: "2026-07-27",
            mixEndDate: "2026-08-03",
        });
        strict_1.default.equal((0, mtd_filters_1.isMTDRecord)(outsourced), true);
        strict_1.default.equal((0, mtd_filters_1.isPreMTDOrderRecord)(outsourced), false);
    });
    (0, node_test_1.it)("Orders Detail View contains ONLY customer order form fields, excluding MTD spreadsheet operational fields", () => {
        const orderObj = {
            id: "ord-test-777",
            customerName: "Jane Coach",
            contactName: "Jane Coach",
            programName: "Thunder All-Stars",
            category: "Cheer",
            formType: "school-all-star-cheer",
            package: "GOLD 1:30",
            price: 950,
            status: "new",
            createdAt: "2026-09-01",
            requestedProducer: "FA",
            editorRequest: "FA",
            musicTheme: "Power Music Covers",
            needsAttention: false,
            attentionReason: null,
        };
        const sections = (0, order_detail_sections_1.getOrderDetailSections)(orderObj);
        strict_1.default.ok(sections.length > 0);
        const allFieldKeys = sections.flatMap((s) => s.fields.map((f) => f.key));
        // Order form fields MUST be present
        strict_1.default.ok(allFieldKeys.includes("contactName") || allFieldKeys.includes("customerName") || allFieldKeys.includes("gymName"));
        // MTD Operational Spreadsheet fields MUST NOT be present in order form sections
        strict_1.default.equal(allFieldKeys.includes("invoiceNumber"), false);
        strict_1.default.equal(allFieldKeys.includes("eightCountSheet"), false);
        strict_1.default.equal(allFieldKeys.includes("haveSongs"), false);
        strict_1.default.equal(allFieldKeys.includes("danceVoiceover"), false);
        strict_1.default.equal(allFieldKeys.includes("extraSongsQuantity"), false);
    });
});
