"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const schedule_view_1 = require("../schedule-view");
const mockProducer = {
    id: "prod-john",
    name: "John",
    initials: "J",
    email: "john@example.com",
    avatar: "/avatars/john.jpg",
    specialty: "Cheer",
    categories: ["All-Star Cheer"],
    status: "available",
    mixesThisWeek: 2,
    nextAvailable: "Today",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: 5,
    maxProducerCostPerDay: null,
    overtimeDays: [],
};
const mockProducerMary = {
    id: "prod-mary",
    name: "Mary",
    initials: "M",
    email: "mary@example.com",
    avatar: "/avatars/mary.jpg",
    specialty: "Dance",
    categories: ["Pom", "Gameday"],
    status: "available",
    mixesThisWeek: 1,
    nextAvailable: "Tomorrow",
    workDays: ["mon", "tue", "wed", "thu", "fri"],
    timeOff: [],
    maxMixesPerDay: 5,
    maxProducerCostPerDay: null,
    overtimeDays: [],
};
const anchorDate = new Date(2026, 8, 10); // Sept 10, 2026
(0, node_test_1.describe)("Schedule Tab — Extended 6 Month Range and Multi-Mix Resolution", () => {
    (0, node_test_1.it)("supports all four date-range view options (week, month, 90days, 6months)", () => {
        const ranges = ["week", "month", "90days", "6months"];
        ranges.forEach((range) => {
            const cells = (0, schedule_view_1.getScheduleCells)(mockProducer, [], range, anchorDate, []);
            if (range === "week")
                strict_1.default.equal(cells.length, 7);
            if (range === "month") {
                // Full September 2026 calendar month
                strict_1.default.equal(cells.length, 30);
                strict_1.default.equal(cells[0]?.key, "2026-09-01");
                strict_1.default.equal(cells[cells.length - 1]?.key, "2026-09-30");
            }
            if (range === "90days") {
                strict_1.default.equal(cells.length, 90);
                strict_1.default.equal(cells[0]?.key, "2026-09-10");
                strict_1.default.equal(cells[cells.length - 1]?.key, "2026-12-08");
            }
            if (range === "6months") {
                strict_1.default.equal(cells[0]?.key, "2026-09-10");
                strict_1.default.equal(cells[cells.length - 1]?.key, "2027-03-10");
                strict_1.default.ok(cells.length > 180);
            }
        });
    });
    (0, node_test_1.it)("calculates range labels and cell sizes correctly for 6months while preserving 90days", () => {
        strict_1.default.equal((0, schedule_view_1.rangeLabel)("month", anchorDate), "This month");
        strict_1.default.equal((0, schedule_view_1.rangeLabel)("90days", anchorDate), "Next 90 days");
        strict_1.default.equal((0, schedule_view_1.rangeLabel)("6months", anchorDate), "Next 6 months");
        strict_1.default.equal((0, schedule_view_1.cellSizeForRange)("90days"), "sm");
        strict_1.default.equal((0, schedule_view_1.cellSizeForRange)("6months"), "sm");
    });
    (0, node_test_1.it)("preserves visual distinction for available, booked, and off statuses", () => {
        strict_1.default.equal((0, schedule_view_1.statusLabel)("available"), "Available");
        strict_1.default.equal((0, schedule_view_1.statusLabel)("mix"), "Booked");
        strict_1.default.equal((0, schedule_view_1.statusLabel)("off"), "Off");
        strict_1.default.equal((0, schedule_view_1.statusLabel)("nonwork"), "Non-working");
    });
    (0, node_test_1.it)("renders multiple mixes on the same date for the same producer as separate schedule bookings", () => {
        const mtdRecords = [
            {
                id: "mtd-1",
                programName: "Mix A",
                assignedProducer: "John",
                mixStartDate: "2026-09-10",
                mixEndDate: "2026-09-12",
                status: "active",
            },
            {
                id: "mtd-2",
                programName: "Mix B",
                assignedProducer: "John",
                mixStartDate: "2026-09-10",
                mixEndDate: "2026-09-13",
                status: "active",
            },
            {
                id: "mtd-3",
                programName: "Mix C",
                assignedProducer: "John",
                mixStartDate: "2026-09-10",
                mixEndDate: "2026-09-14",
                status: "active",
            },
        ];
        const cells = (0, schedule_view_1.getScheduleCells)(mockProducer, [], "week", anchorDate, mtdRecords);
        const sept10Cell = cells.find((c) => c.key === "2026-09-10");
        strict_1.default.ok(sept10Cell);
        strict_1.default.equal(sept10Cell?.status, "mix");
        strict_1.default.equal(sept10Cell?.unavailable, true);
        strict_1.default.equal(sept10Cell?.bookings?.length, 3);
        strict_1.default.deepEqual(sept10Cell?.bookings?.map((b) => b.work), ["Mix A", "Mix B", "Mix C"]);
    });
    (0, node_test_1.it)("does not merge separate date mixes for the same producer or mixes for different producers", () => {
        const mtdRecords = [
            {
                id: "mtd-1",
                programName: "Mix A",
                assignedProducer: "John",
                mixStartDate: "2026-09-10",
                mixEndDate: "2026-09-10",
                status: "active",
            },
            {
                id: "mtd-2",
                programName: "Mix D",
                assignedProducer: "John",
                mixStartDate: "2026-09-11",
                mixEndDate: "2026-09-11",
                status: "active",
            },
            {
                id: "mtd-3",
                programName: "Mix E",
                assignedProducer: "Mary",
                mixStartDate: "2026-09-10",
                mixEndDate: "2026-09-10",
                status: "active",
            },
        ];
        const johnCells = (0, schedule_view_1.getScheduleCells)(mockProducer, [], "week", anchorDate, mtdRecords);
        const sept10John = johnCells.find((c) => c.key === "2026-09-10");
        const sept11John = johnCells.find((c) => c.key === "2026-09-11");
        strict_1.default.equal(sept10John?.bookings?.length, 1);
        strict_1.default.equal(sept10John?.bookings?.[0].work, "Mix A");
        strict_1.default.equal(sept11John?.bookings?.length, 1);
        strict_1.default.equal(sept11John?.bookings?.[0].work, "Mix D");
        const maryCells = (0, schedule_view_1.getScheduleCells)(mockProducerMary, [], "week", anchorDate, mtdRecords);
        const sept10Mary = maryCells.find((c) => c.key === "2026-09-10");
        strict_1.default.equal(sept10Mary?.bookings?.length, 1);
        strict_1.default.equal(sept10Mary?.bookings?.[0].work, "Mix E");
    });
});
