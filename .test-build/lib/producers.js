"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeProducer = normalizeProducer;
exports.formatMaxMixCapacity = formatMaxMixCapacity;
exports.formatWorkDays = formatWorkDays;
exports.formatTimeOffRange = formatTimeOffRange;
exports.initialsFromName = initialsFromName;
const types_1 = require("@/types");
const producer_avatars_1 = require("@/lib/producer-avatars");
function normalizeProducer(raw) {
    return {
        id: raw.id,
        name: raw.name || "Producer",
        initials: (raw.initials || "XX").toUpperCase().slice(0, 4),
        email: raw.email || "",
        specialty: raw.specialty || "Cheer",
        avatar: raw.avatar || (0, producer_avatars_1.defaultAvatarSrc)(),
        mixesThisWeek: raw.mixesThisWeek ?? 0,
        nextAvailable: raw.nextAvailable || "TBD",
        status: raw.status || "available",
        workDays: raw.workDays && raw.workDays.length > 0
            ? raw.workDays
            : [...types_1.DEFAULT_WORK_DAYS],
        timeOff: Array.isArray(raw.timeOff) ? raw.timeOff : [],
        maxMixesPerDay: raw.maxMixesPerDay != null && raw.maxMixesPerDay > 0
            ? raw.maxMixesPerDay
            : null,
        overtimeDays: Array.isArray(raw.overtimeDays)
            ? [...new Set(raw.overtimeDays.filter(Boolean))].sort()
            : [],
        compensationModel: raw.compensationModel ?? null,
        defaultRate: raw.defaultRate ?? null,
        ratesByCategory: raw.ratesByCategory ?? null,
        rateOverrides: raw.rateOverrides ?? null,
        manualInputFields: raw.manualInputFields ?? null,
        notes: raw.notes ?? null,
    };
}
function formatMaxMixCapacity(maxMixesPerDay) {
    if (maxMixesPerDay == null)
        return "No daily limit";
    if (maxMixesPerDay === 1)
        return "1 mix per day max";
    return `${maxMixesPerDay} mixes per day max`;
}
function formatWorkDays(days) {
    const order = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const labels = {
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
    };
    const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    if (sorted.length === 0)
        return "No work days";
    if (sorted.length === 5 &&
        types_1.DEFAULT_WORK_DAYS.every((d) => sorted.includes(d))) {
        return "Mon–Fri";
    }
    return sorted.map((d) => labels[d]).join(", ");
}
function formatTimeOffRange(entry) {
    if (entry.startDate === entry.endDate)
        return entry.startDate;
    return `${entry.startDate} → ${entry.endDate}`;
}
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return "";
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
