"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.producerScheduleId = producerScheduleId;
exports.getScheduleCells = getScheduleCells;
exports.groupCellsByWeek = groupCellsByWeek;
exports.countUnavailable = countUnavailable;
exports.rangeLabel = rangeLabel;
exports.buildTeamSchedule = buildTeamSchedule;
exports.aggregateColumns = aggregateColumns;
exports.buildScheduleColumnAggregates = buildScheduleColumnAggregates;
exports.buildCalendarDays = buildCalendarDays;
exports.groupCalendarDaysByWeek = groupCalendarDaysByWeek;
exports.buildMonthGrid = buildMonthGrid;
exports.cellSizeForRange = cellSizeForRange;
exports.statusLabel = statusLabel;
exports.formatMatrixDateCell = formatMatrixDateCell;
exports.buildMatrixMonthGroups = buildMatrixMonthGroups;
const dates_1 = require("@/lib/dates");
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
function producerScheduleId(producer) {
    return producer.name.toUpperCase();
}
function formatLegacyDay(date) {
    return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}
function hashSeed(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}
function inferStatus(producer, date, scheduleByDay) {
    const legacy = formatLegacyDay(date);
    const entry = scheduleByDay.get(legacy);
    if (entry)
        return entry.status;
    const day = date.getDay();
    const seed = hashSeed(`${producer.id}-${toLocalIsoDate(date)}`);
    if (day === 0 || day === 6) {
        return seed % 4 === 0 ? "mix" : "off";
    }
    if (producer.status === "unavailable")
        return "off";
    if (producer.status === "limited") {
        return seed % 3 === 0 ? "available" : "mix";
    }
    if (producer.mixesThisWeek > 100) {
        return seed % 5 === 0 ? "available" : "mix";
    }
    return seed % 6 === 0 ? "mix" : "available";
}
function addDays(date, days) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + days);
    return next;
}
function toLocalIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function formatDisplayDate(date) {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
function producerMatchesAssignment(producer, assigned) {
    const key = assigned.trim().toUpperCase();
    return (key === producer.name.toUpperCase() ||
        key === producer.initials.toUpperCase() ||
        key === producerScheduleId(producer));
}
function producerAssignments(producer, mtdRecords) {
    return mtdRecords.filter((rec) => rec.assignedProducer &&
        producerMatchesAssignment(producer, rec.assignedProducer) &&
        rec.status === "active");
}
function resolveBookings(producer, date, status, assignments) {
    const covering = assignments.filter((rec) => {
        const start = (0, dates_1.parseFlexibleDate)(rec.mixStartDate);
        const end = (0, dates_1.parseFlexibleDate)(rec.mixEndDate);
        if (!start)
            return false;
        const day = new Date(date);
        day.setHours(12, 0, 0, 0);
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        if (day < startDay)
            return false;
        if (end) {
            const endDay = new Date(end);
            endDay.setHours(23, 59, 59, 999);
            return day <= endDay;
        }
        return day.getTime() - startDay.getTime() <= 7 * 86400000;
    });
    if (covering.length > 0) {
        return covering.map((pick) => {
            const untilDate = (0, dates_1.parseFlexibleDate)(pick.mixEndDate) ??
                addDays((0, dates_1.parseFlexibleDate)(pick.mixStartDate) ?? date, 3);
            return {
                work: pick.programName,
                until: formatDisplayDate(untilDate),
                mixId: pick.id,
                status: pick.status,
            };
        });
    }
    if (status === "available")
        return [];
    if (status === "off") {
        const until = date.getDay() === 0 || date.getDay() === 6
            ? addDays(date, date.getDay() === 6 ? 1 : 0)
            : date;
        return [
            {
                work: "Unavailable",
                until: formatDisplayDate(until),
            },
        ];
    }
    const seed = hashSeed(`${producer.id}-${toLocalIsoDate(date)}`);
    const pick = assignments.length > 0 ? assignments[seed % assignments.length] : null;
    if (!pick) {
        return [
            {
                work: `${producer.specialty} mix`,
                until: formatDisplayDate(addDays(date, 2 + (seed % 5))),
            },
        ];
    }
    const untilDate = (0, dates_1.parseFlexibleDate)(pick.mixEndDate) ??
        addDays((0, dates_1.parseFlexibleDate)(pick.mixStartDate) ?? date, 3 + (seed % 4));
    return [
        {
            work: pick.programName,
            until: formatDisplayDate(untilDate),
            mixId: pick.id,
            status: pick.status,
        },
    ];
}
function resolveBooking(producer, date, status, assignments) {
    const bookings = resolveBookings(producer, date, status, assignments);
    return bookings[0] ?? null;
}
function startOfCalendarWeek(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
}
function buildDateRange(range, anchor) {
    const end = new Date(anchor);
    end.setHours(0, 0, 0, 0);
    if (range === "week") {
        const start = startOfCalendarWeek(end);
        const dates = [];
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    }
    const days = range === "month" ? 30 : range === "90days" ? 90 : 180;
    const dates = [];
    for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        dates.push(d);
    }
    return dates;
}
function getScheduleCells(producer, schedule, range, anchorDate = new Date(2026, 7, 19), mtdRecords = []) {
    const scheduleId = producerScheduleId(producer);
    const scheduleByDay = new Map(schedule
        .filter((entry) => entry.producer === scheduleId)
        .map((entry) => [entry.day, entry]));
    const assignments = producerAssignments(producer, mtdRecords);
    return buildDateRange(range, anchorDate).map((date) => {
        let status = inferStatus(producer, date, scheduleByDay);
        const bookings = resolveBookings(producer, date, status, assignments);
        if (bookings.length > 0 && status === "available") {
            status = "mix";
        }
        return {
            key: toLocalIsoDate(date),
            date,
            dayLabel: DAY_NAMES[date.getDay()],
            dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
            status,
            unavailable: status === "off" || status === "mix" || bookings.length > 0,
            booking: bookings[0] ?? null,
            bookings,
        };
    });
}
function groupCellsByWeek(cells) {
    if (cells.length === 0)
        return [];
    const weeks = [];
    let current = [];
    const first = cells[0].date.getDay();
    for (let i = 0; i < first; i += 1) {
        current.push({
            key: `pad-start-${i}`,
            date: new Date(0),
            dayLabel: "",
            dateLabel: "",
            status: "available",
            unavailable: false,
        });
    }
    for (const cell of cells) {
        current.push(cell);
        if (current.length === 7) {
            weeks.push(current);
            current = [];
        }
    }
    if (current.length > 0) {
        while (current.length < 7) {
            current.push({
                key: `pad-end-${current.length}`,
                date: new Date(0),
                dayLabel: "",
                dateLabel: "",
                status: "available",
                unavailable: false,
            });
        }
        weeks.push(current);
    }
    return weeks;
}
function countUnavailable(cells) {
    return cells.filter((cell) => cell.unavailable && cell.key && !cell.key.startsWith("pad")).length;
}
function rangeLabel(range, anchorDate = new Date(2026, 7, 19)) {
    if (range === "week") {
        const dates = buildDateRange("week", anchorDate);
        const start = dates[0];
        const end = dates[dates.length - 1];
        const sameMonth = start.getMonth() === end.getMonth();
        if (sameMonth) {
            return `Week of ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}`;
        }
        return `Week of ${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
    }
    if (range === "month")
        return "Last 30 days";
    if (range === "90days")
        return "Last 90 days";
    return "Last 6 months";
}
function buildTeamSchedule(producers, schedule, range, anchorDate = new Date(2026, 7, 19), mtdRecords = []) {
    return producers.map((producer) => ({
        producer,
        cells: getScheduleCells(producer, schedule, range, anchorDate, mtdRecords),
    }));
}
function aggregateColumns(rows, anchorDate = new Date(2026, 7, 19)) {
    if (rows.length === 0)
        return [];
    const todayKey = toLocalIsoDate(anchorDate);
    return rows[0].cells.map((cell, index) => {
        const unavailableCount = rows.filter((row) => row.cells[index]?.unavailable).length;
        const availableCount = rows.length - unavailableCount;
        return {
            key: cell.key,
            availableCount,
            unavailableCount,
            total: rows.length,
            label: cell.dateLabel,
            dayLabel: cell.dayLabel,
            isToday: cell.key === todayKey,
        };
    });
}
function buildScheduleColumnAggregates(range, anchorDate = new Date(2026, 7, 19)) {
    const todayKey = toLocalIsoDate(anchorDate);
    return buildDateRange(range, anchorDate).map((date) => {
        const key = toLocalIsoDate(date);
        return {
            key,
            availableCount: 0,
            unavailableCount: 0,
            total: 0,
            label: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
            dayLabel: DAY_NAMES[date.getDay()],
            isToday: key === todayKey,
        };
    });
}
function buildCalendarDays(rows, range, anchorDate = new Date(2026, 7, 19)) {
    const todayKey = toLocalIsoDate(anchorDate);
    const dates = range === "week"
        ? buildDateRange("week", anchorDate)
        : (() => {
            const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
            const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
            const days = [];
            for (let day = 1; day <= end.getDate(); day += 1) {
                days.push(new Date(start.getFullYear(), start.getMonth(), day));
            }
            return days;
        })();
    return dates.map((date) => {
        const key = toLocalIsoDate(date);
        const unavailableProducers = rows
            .map((row) => {
            const cell = row.cells.find((entry) => entry.key === key);
            return cell?.unavailable ? { producer: row.producer, cell } : null;
        })
            .filter((entry) => Boolean(entry));
        return {
            key,
            date,
            dayLabel: DAY_NAMES[date.getDay()],
            dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
            unavailableCount: unavailableProducers.length,
            unavailableProducers,
            isToday: key === todayKey,
            isCurrentMonth: true,
        };
    });
}
function groupCalendarDaysByWeek(days) {
    if (days.length === 0)
        return [];
    const weeks = [];
    let current = [];
    const firstDay = days[0].date.getDay();
    for (let i = 0; i < firstDay; i += 1) {
        current.push(createPaddedCalendarDay(days[0].date, -(firstDay - i)));
    }
    for (const day of days) {
        current.push(day);
        if (current.length === 7) {
            weeks.push(current);
            current = [];
        }
    }
    if (current.length > 0) {
        const padCount = 7 - current.length;
        for (let i = 1; i <= padCount; i += 1) {
            current.push(createPaddedCalendarDay(days[days.length - 1].date, i));
        }
        weeks.push(current);
    }
    return weeks;
}
function buildMonthGrid(rows, anchorDate = new Date(2026, 7, 19)) {
    return groupCalendarDaysByWeek(buildCalendarDays(rows, "month", anchorDate));
}
function createPaddedCalendarDay(baseDate, offsetDays) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + offsetDays);
    return {
        key: `pad-${toLocalIsoDate(date)}`,
        date,
        dayLabel: DAY_NAMES[date.getDay()],
        dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
        unavailableCount: 0,
        unavailableProducers: [],
        isToday: false,
        isCurrentMonth: date.getMonth() === baseDate.getMonth(),
    };
}
function cellSizeForRange(range) {
    if (range === "week")
        return "lg";
    if (range === "month")
        return "md";
    return "sm";
}
function statusLabel(status) {
    if (status === "mix")
        return "Booked";
    if (status === "off")
        return "Off";
    return "Available";
}
function formatMatrixDateCell(column, _range, _previousKey) {
    const title = `${column.dayLabel}, ${column.label}`;
    const dayStr = column.key.split("-")[2];
    const day = String(Number(dayStr));
    const weekday = column.dayLabel.slice(0, 3).toUpperCase();
    if (column.isToday) {
        return { top: "Today", day, title, emphasizeTop: true };
    }
    return { top: weekday, day, title };
}
/** Group matrix day columns by calendar month for longer ranges. */
function buildMatrixMonthGroups(columns) {
    const groups = [];
    for (let i = 0; i < columns.length; i += 1) {
        const monthKey = columns[i].key.slice(0, 7); // YYYY-MM
        const last = groups[groups.length - 1];
        if (last && last.key === monthKey) {
            last.rowCount += 1;
            continue;
        }
        const month = Number(monthKey.split("-")[1]);
        groups.push({
            key: monthKey,
            label: MONTH_NAMES[month - 1],
            startIndex: i,
            rowCount: 1,
        });
    }
    return groups;
}
