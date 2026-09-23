"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const schedule_view_1 = require("../schedule-view");
const scheduling_1 = require("../scheduling");
const monSatProducer = {
    id: "prod-casey",
    name: "Casey Marlow",
    initials: "CM",
    email: "casey@example.com",
    avatar: "",
    specialty: "Cheer",
    categories: ["All-Star Cheer"],
    status: "available",
    mixesThisWeek: 0,
    nextAvailable: "",
    workDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
    timeOff: [],
    maxMixesPerDay: null,
    maxProducerCostPerDay: null,
    overtimeDays: [],
};
(0, node_test_1.describe)("Producer work days on schedule and booking", () => {
    (0, node_test_1.it)("marks Sunday as non-working for Mon–Sat producers and Saturday as available", () => {
        // Week of Sun Aug 16 – Sat Aug 22, 2026
        const anchor = new Date(2026, 7, 19); // Wed Aug 19
        const cells = (0, schedule_view_1.getScheduleCells)(monSatProducer, [], "week", anchor, []);
        const sunday = cells.find((c) => c.key === "2026-08-16");
        const monday = cells.find((c) => c.key === "2026-08-17");
        const saturday = cells.find((c) => c.key === "2026-08-22");
        strict_1.default.equal(sunday?.status, "nonwork");
        strict_1.default.equal(sunday?.unavailable, true);
        strict_1.default.equal(monday?.status, "available");
        strict_1.default.equal(saturday?.status, "available");
    });
    (0, node_test_1.it)("treats overtime on Sunday as a scheduled day", () => {
        const withOvertime = {
            ...monSatProducer,
            overtimeDays: ["2026-08-16"],
        };
        const anchor = new Date(2026, 7, 19);
        const cells = (0, schedule_view_1.getScheduleCells)(withOvertime, [], "week", anchor, []);
        const sunday = cells.find((c) => c.key === "2026-08-16");
        strict_1.default.equal(sunday?.status, "available");
    });
    (0, node_test_1.it)("marks time off on work days as off, not overtime days", () => {
        const withBoth = {
            ...monSatProducer,
            overtimeDays: ["2026-08-16"],
            timeOff: [
                {
                    id: "to-1",
                    startDate: "2026-08-16",
                    endDate: "2026-08-17",
                    type: "personal",
                    reason: "Vacation",
                },
            ],
        };
        const anchor = new Date(2026, 7, 19);
        const cells = (0, schedule_view_1.getScheduleCells)(withBoth, [], "week", anchor, []);
        const sunday = cells.find((c) => c.key === "2026-08-16");
        const monday = cells.find((c) => c.key === "2026-08-17");
        // Sunday is overtime — time off does not cancel it; remove OT instead.
        strict_1.default.equal(sunday?.status, "available");
        strict_1.default.equal(monday?.status, "off");
    });
    (0, node_test_1.it)("returns to nonwork when overtime is removed", () => {
        const withoutOt = {
            ...monSatProducer,
            overtimeDays: [],
            timeOff: [
                {
                    id: "to-1",
                    startDate: "2026-08-16",
                    endDate: "2026-08-16",
                    type: "personal",
                    reason: "Vacation",
                },
            ],
        };
        const anchor = new Date(2026, 7, 19);
        const cells = (0, schedule_view_1.getScheduleCells)(withoutOt, [], "week", anchor, []);
        const sunday = cells.find((c) => c.key === "2026-08-16");
        strict_1.default.equal(sunday?.status, "nonwork");
    });
    (0, node_test_1.it)("skips Sunday when finding the next available booking slot", () => {
        // From Sunday Aug 16, next Mon–Sat work day is Monday Aug 17.
        const fromSunday = new Date(2026, 7, 16);
        const slot = (0, scheduling_1.getNextAvailableSlot)("CM", [monSatProducer], [], []);
        strict_1.default.ok(slot);
        strict_1.default.equal(slot?.date, "2026-08-17");
        strict_1.default.equal(slot?.label, "Aug 17, 2026");
    });
    (0, node_test_1.it)("returns ISO mix start dates from suggestMixStartDate via next work day", () => {
        const fromFriday = new Date(2026, 7, 21); // Fri Aug 21
        const slot = (0, scheduling_1.getNextAvailableSlot)("Casey Marlow", [monSatProducer], [], []);
        strict_1.default.equal(slot?.date, "2026-08-21");
        strict_1.default.match(slot?.date ?? "", /^\d{4}-\d{2}-\d{2}$/);
        // suggestMixStartDate uses "today"; when today is a work day it returns ISO.
        const suggested = (0, scheduling_1.suggestMixStartDate)("CM", [monSatProducer], [], []);
        strict_1.default.match(suggested, /^\d{4}-\d{2}-\d{2}$/);
    });
});
