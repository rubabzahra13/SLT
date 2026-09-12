"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextAvailableSlot = getNextAvailableSlot;
exports.formatSlotForDisplay = formatSlotForDisplay;
exports.suggestMixStartDate = suggestMixStartDate;
exports.suggestMixEndDate = suggestMixEndDate;
const dates_1 = require("@/lib/dates");
const package_1 = require("@/lib/package");
const producer_schedule_calc_1 = require("@/lib/producer-schedule-calc");
function getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords = []) {
    const producer = producers.find((p) => p.initials === producerInitials ||
        p.name.toUpperCase() === producerInitials.toUpperCase() ||
        p.id === producerInitials);
    if (producer) {
        const calc = (0, producer_schedule_calc_1.calculateProducerNextOpening)(producer, mtdRecords, schedule);
        return { date: calc.nextAvailable, label: calc.nextAvailable };
    }
    const entries = schedule.filter((s) => s.producer === producerInitials);
    const availableEntry = entries.find((e) => e.status === "available");
    if (availableEntry) {
        return { date: availableEntry.day, label: availableEntry.day };
    }
    return null;
}
function formatSlotForDisplay(producerInitials, producers, schedule) {
    const slot = getNextAvailableSlot(producerInitials, producers, schedule);
    if (!slot)
        return "No slot found";
    return slot.label;
}
function suggestMixStartDate(producerInitials, producers, schedule) {
    const slot = getNextAvailableSlot(producerInitials, producers, schedule);
    if (!slot)
        return "";
    const dayMatch = slot.date.match(/Aug (\d+)/i);
    if (dayMatch) {
        return `2026-08-${dayMatch[1].padStart(2, "0")}`;
    }
    return new Date().toISOString().slice(0, 10);
}
function mixWindowDays(packageStr) {
    const { tier, limit } = (0, package_1.parsePackage)(packageStr);
    const t = tier.toUpperCase();
    if (t.includes("PLATINUM"))
        return 7;
    if (t.includes("GOLD"))
        return 5;
    if (t.includes("SILVER"))
        return 4;
    if (t.includes("HOMECOMING"))
        return 3;
    if (limit === "TBD")
        return 6;
    return 5;
}
/** Estimate mix end from start date and package tier. */
function suggestMixEndDate(mixStartDate, packageStr) {
    const start = (0, dates_1.parseFlexibleDate)(mixStartDate);
    if (!start)
        return "";
    const end = new Date(start);
    end.setDate(end.getDate() + mixWindowDays(packageStr));
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
