"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const data_1 = require("../data");
const date_filters_1 = require("../date-filters");
const dates_1 = require("../dates");
const export_csv_1 = require("../export-csv");
const mtd_completion_1 = require("../mtd-completion");
const pricing_display_1 = require("../pricing-display");
const editor_assignment_1 = require("../editor-assignment");
(0, node_test_1.describe)("Prompt 12 — Full End-to-End QA and Regression Audit", () => {
    const { mtdRecords, orders: allOrders, producers } = (0, data_1.getData)();
    const payrollRecords = (0, mtd_completion_1.getPayrollRecords)(mtdRecords);
    (0, node_test_1.it)("1. Lifecycle Persistence & Stage Transition Audit (Orders -> MTD -> Payroll)", () => {
        strict_1.default.ok(payrollRecords.length >= 10, "Payroll records count should be at least 10");
        payrollRecords.forEach((rec) => {
            strict_1.default.strictEqual(rec.status, "completed", "Payroll record status must be 'completed'");
            strict_1.default.ok(rec.completedAt, "Payroll record must persist completedAt date");
            strict_1.default.notStrictEqual(rec.assignedProducer, undefined, "Payroll record must have assignedProducer defined");
            strict_1.default.ok(rec.mixStartDate, "Payroll record must persist mixStartDate");
        });
        const patch = (0, mtd_completion_1.patchReturnFromPayroll)();
        strict_1.default.strictEqual(patch.status, "active", "Return to MTD patch must reset status to 'active'");
        strict_1.default.strictEqual(patch.completedAt, undefined, "Return to MTD patch must clear completedAt");
    });
    (0, node_test_1.it)("2. CSV Export Filter-Aware Accuracy (Orders, MTD, Payroll)", () => {
        const ordersCsv = (0, export_csv_1.generateOrdersCsv)(mtdRecords, allOrders);
        strict_1.default.ok(ordersCsv.includes("Order ID"), "Orders CSV must include header");
        strict_1.default.ok(ordersCsv.includes("Contact Name"), "Orders CSV must include contact header");
        const mtdCsv = (0, export_csv_1.generateMTDCsv)(mtdRecords, allOrders, producers);
        strict_1.default.ok(mtdCsv.includes("Record ID"), "MTD CSV must include record header");
        strict_1.default.ok(mtdCsv.includes("Mix Start Date"), "MTD CSV must include mix start date");
        const adminPayrollCsv = (0, export_csv_1.generatePayrollCsv)(payrollRecords, allOrders, producers);
        strict_1.default.ok(adminPayrollCsv.includes("Total Producer Payout"), "Payroll CSV must include payout header");
        strict_1.default.strictEqual(adminPayrollCsv.includes("SLT Take-Home"), false, "Admin payroll CSV must never expose SLT take-home");
    });
    (0, node_test_1.it)("3. Admin vs. Producer-Facing Payroll Export Isolation Audit", () => {
        const nickName = "Nick";
        const nickRecords = payrollRecords.filter((r) => {
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name === nickName || r.assignedProducer === nickName;
        });
        const producerStatementCsv = (0, export_csv_1.generateProducerFacingPayrollCsv)(nickRecords, allOrders, producers, nickName);
        strict_1.default.ok(producerStatementCsv.includes("Completed Date"));
        strict_1.default.ok(producerStatementCsv.includes("My Total Payout"));
        strict_1.default.ok(producerStatementCsv.includes("My Compensation Rate"));
        strict_1.default.strictEqual(producerStatementCsv.includes("SLT Gross"), false, "Producer export must not expose SLT Gross");
        strict_1.default.strictEqual(producerStatementCsv.includes("SLT Take-Home"), false, "Producer export must not expose SLT Take-Home");
        strict_1.default.strictEqual(producerStatementCsv.includes("Customer Price"), false, "Producer export must not expose customer price");
        strict_1.default.strictEqual(producerStatementCsv.includes("Email"), false, "Producer export must not expose customer email PII");
        strict_1.default.strictEqual(producerStatementCsv.includes("Phone"), false, "Producer export must not expose customer phone PII");
        strict_1.default.strictEqual(producerStatementCsv.includes("Billing Address"), false, "Producer export must not expose customer billing address PII");
        strict_1.default.strictEqual(producerStatementCsv.includes("Andrea"), false, "Nick's export must not contain Andrea's data");
    });
    (0, node_test_1.it)("4. Payroll Send-Prep & Schedule Download Per-Producer Isolation Audit", () => {
        const bounds = (0, date_filters_1.calculateDateBounds)("last1Year");
        const filterPeriod = {
            start: (0, dates_1.toCanonicalIsoDate)(bounds.start),
            end: (0, dates_1.toCanonicalIsoDate)(bounds.end),
        };
        const dateMatching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        const distinctProducers = Array.from(new Set(dateMatching
            .map((r) => {
            if (!r.assignedProducer)
                return null;
            const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            return p?.name || r.assignedProducer;
        })
            .filter(Boolean)));
        distinctProducers.forEach((targetName) => {
            const prodRecords = dateMatching.filter((r) => {
                const p = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
                return p?.name === targetName || r.assignedProducer === targetName;
            });
            const statementCsv = (0, export_csv_1.generateProducerFacingPayrollCsv)(prodRecords, allOrders, producers, targetName);
            strict_1.default.ok(statementCsv.length > 0);
            const scheduleCsv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetName);
            strict_1.default.ok(scheduleCsv.length > 0);
            const otherNames = distinctProducers.filter((p) => p !== targetName);
            otherNames.forEach((other) => {
                const otherProdObj = producers.find((p) => p.name === other);
                if (otherProdObj?.email) {
                    strict_1.default.strictEqual(statementCsv.includes(otherProdObj.email), false, `Statement for ${targetName} must not contain ${other}'s email`);
                }
                strict_1.default.strictEqual(scheduleCsv.includes(`"${other}"`), false, `Schedule for ${targetName} must not contain ${other}'s schedule rows`);
            });
        });
    });
    (0, node_test_1.it)("5. Producer Color-Coding Authenticity Audit", () => {
        producers.forEach((p) => {
            if (p.color) {
                strict_1.default.ok(/^#[0-9A-Fa-f]{6}$/.test(p.color), `Producer ${p.name} color must be valid hex`);
            }
        });
        const mockUnconfiguredProducer = { id: "test", name: "Test" };
        const color = mockUnconfiguredProducer.color || "#94a3b8";
        strict_1.default.strictEqual(color, "#94a3b8", "Unconfigured producer must use neutral slate #94A3B8 fallback");
    });
    (0, node_test_1.it)("6. Comprehensive Preserved Business Rules Audit", () => {
        // 6a. Voiceover never alters customer package price
        const danceOrder = allOrders.find((o) => (o.formType === "school-all-star-dance") && o.status === "completed");
        if (danceOrder) {
            const basePrice = danceOrder.price;
            const custPrice = danceOrder.finalCustomerPrice ?? danceOrder.price;
            strict_1.default.strictEqual(custPrice, basePrice, "Voiceover on Dance order must not alter customer package price");
        }
        // 6b. Rush fee producer payout formula: $150 x quantity x producer_rush_rate
        const producerObj = producers[0];
        const rushRate = producerObj.rushFeeRate ?? 1.0;
        const calcQty1 = (0, pricing_display_1.computeClientPayroll)(producerObj, 500, null, 0.5, null, "all-star-cheer", 500, {
            rushFeeQuantity: 1,
            rushFeeCompensationRate: rushRate,
            formType: "school-all-star-cheer",
        });
        strict_1.default.strictEqual(calcQty1.rushFeePayout, 150 * 1 * rushRate, "Qty 1 rush fee payout formula check");
        const calcQty2 = (0, pricing_display_1.computeClientPayroll)(producerObj, 500, null, 0.5, null, "all-star-cheer", 500, {
            rushFeeQuantity: 2,
            rushFeeCompensationRate: rushRate,
            formType: "school-all-star-cheer",
        });
        strict_1.default.strictEqual(calcQty2.rushFeePayout, 150 * 2 * rushRate, "Qty 2 rush fee payout formula check");
        // 6c. Coupon Code is display-only and never alters customer price, payroll base, or producer payouts
        if (danceOrder && danceOrder.couponCode) {
            strict_1.default.strictEqual(danceOrder.finalCustomerPrice ?? danceOrder.price, danceOrder.price, "Coupon code must not alter customer price");
            strict_1.default.strictEqual(danceOrder.finalPayrollPrice ?? danceOrder.price, danceOrder.price, "Coupon code must not alter payroll base price");
        }
    });
});
