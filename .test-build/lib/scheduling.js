"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestMixEndDate = void 0;
exports.getNextAvailableSlot = getNextAvailableSlot;
exports.formatSlotForDisplay = formatSlotForDisplay;
exports.suggestMixStartDate = suggestMixStartDate;
const dates_1 = require("@/lib/dates");
const producer_schedule_calc_1 = require("@/lib/producer-schedule-calc");
function getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords = []) {
    const producer = producers.find((p) => p.initials === producerInitials ||
        p.name.toUpperCase() === producerInitials.toUpperCase() ||
        p.id === producerInitials);
    if (producer) {
        const calc = (0, producer_schedule_calc_1.calculateProducerNextOpening)(producer, mtdRecords, schedule);
        return {
            date: calc.nextAvailable,
            label: calc.nextAvailable,
            dateObj: calc.nextAvailableDate,
        };
    }
    const entries = schedule.filter((s) => s.producer === producerInitials);
    const availableEntry = entries.find((e) => e.status === "available");
    if (availableEntry) {
        const dateObj = (0, dates_1.parseFlexibleDate)(availableEntry.day) ?? new Date();
        return { date: availableEntry.day, label: availableEntry.day, dateObj };
    }
    return null;
}
function formatSlotForDisplay(producerInitials, producers, schedule, mtdRecords = []) {
    const slot = getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords);
    if (!slot)
        return "No slot found";
    return slot.label;
}
function suggestMixStartDate(producerInitials, producers, schedule, mtdRecords = []) {
    const slot = getNextAvailableSlot(producerInitials, producers, schedule, mtdRecords);
    if (!slot || !slot.dateObj)
        return new Date().toISOString().slice(0, 10);
    const y = slot.dateObj.getFullYear();
    const m = String(slot.dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(slot.dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
var producer_availability_1 = require("@/lib/producer-availability");
Object.defineProperty(exports, "suggestMixEndDate", { enumerable: true, get: function () { return producer_availability_1.suggestMixEndDate; } });
