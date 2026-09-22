"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const producer_availability_1 = require("../producer-availability");
(0, node_test_1.describe)("Overtime day eligibility", () => {
    (0, node_test_1.it)("only allows non-work weekdays (Mon–Sat workers → Sundays only)", () => {
        const workDays = ["mon", "tue", "wed", "thu", "fri", "sat"];
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 16), workDays), true);
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 17), workDays), false);
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 22), workDays), false);
    });
    (0, node_test_1.it)("allows Saturday when work days are Mon–Fri", () => {
        const workDays = ["mon", "tue", "wed", "thu", "fri"];
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 22), workDays), true);
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 16), workDays), true);
        strict_1.default.equal((0, producer_availability_1.isEligibleOvertimeDate)(new Date(2026, 7, 19), workDays), false);
    });
});
