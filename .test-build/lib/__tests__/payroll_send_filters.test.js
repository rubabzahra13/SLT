"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const payroll_send_filters_1 = require("../payroll-send-filters");
const rubab = {
    id: "rubab",
    name: "Rubab",
    initials: "R",
    email: "rubab@example.com",
    specialty: "Dance",
    avatar: "",
    color: "#6366f1",
    mixesThisWeek: 0,
    nextAvailable: "Today",
    status: "available",
    workDays: ["mon"],
    maxMixesPerDay: 5,
    overtimeDays: [],
    categories: ["Hip Hop"],
};
const pomProducer = {
    ...rubab,
    id: "pom-editor",
    name: "Anne Jacobs",
    initials: "AJ",
    categories: ["Pom"],
};
const orderById = new Map([
    [
        "ord-pom",
        {
            id: "ord-pom",
            formType: "school-all-star-dance",
            danceFormSubtype: "pom",
            contactName: "Test",
            programName: "Pom Team",
            price: 400,
            status: "completed",
            needsAttention: false,
            createdAt: "2026-09-10T10:00:00Z",
        },
    ],
]);
const rubabPayrollRecord = {
    id: "payroll-rubab",
    orderId: "ord-pom",
    contactName: "Test",
    programName: "Pom Team",
    invoice: "INV-9001",
    package: "GOLD 1:30",
    assignedProducer: "Rubab",
    mixStartDate: "2026-09-01",
    mixEndDate: "2026-09-05",
    completedAt: "2026-09-10",
    inPayroll: true,
    status: "completed",
};
(0, node_test_1.describe)("payroll send producer names", () => {
    (0, node_test_1.it)("includes assigned editors even when their profile category does not match the tab filter", () => {
        const names = (0, payroll_send_filters_1.getPayrollSendProducerNames)([rubabPayrollRecord], orderById, [rubab, pomProducer], "school-all-star-dance", "all", "pom", { start: "2026-09-01", end: "2026-09-11" });
        strict_1.default.deepEqual(names, ["Rubab"]);
    });
});
