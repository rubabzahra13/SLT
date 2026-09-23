"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULE_STATUS_FILTERS = void 0;
exports.producerScheduleId = producerScheduleId;
exports.parseToDate = parseToDate;
exports.describeScheduleOffDetail = describeScheduleOffDetail;
exports.getScheduleCells = getScheduleCells;
exports.groupCellsByWeek = groupCellsByWeek;
exports.countUnavailable = countUnavailable;
exports.rangeLabel = rangeLabel;
exports.scheduleViewFilterPeriod = scheduleViewFilterPeriod;
exports.sendPeriodLabel = sendPeriodLabel;
exports.scheduleSendFilterPeriod = scheduleSendFilterPeriod;
exports.buildTeamSchedule = buildTeamSchedule;
exports.aggregateColumns = aggregateColumns;
exports.buildScheduleColumnAggregates = buildScheduleColumnAggregates;
exports.buildCalendarDays = buildCalendarDays;
exports.groupCalendarDaysByWeek = groupCalendarDaysByWeek;
exports.buildMonthGrid = buildMonthGrid;
exports.cellSizeForRange = cellSizeForRange;
exports.statusLabel = statusLabel;
exports.filterTeamScheduleByStatus = filterTeamScheduleByStatus;
exports.formatMatrixDateCell = formatMatrixDateCell;
exports.buildMatrixMonthGroups = buildMatrixMonthGroups;
const dates_1 = require("@/lib/dates");
const producer_availability_1 = require("@/lib/producer-availability");
const export_csv_1 = require("@/lib/export-csv");
const producer_time_off_1 = require("@/lib/producer-time-off");
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
function parseToDate(date) {
    if (!date)
        return new Date();
    if (date instanceof Date) {
        return Number.isNaN(date.getTime()) ? new Date() : date;
    }
    if (typeof date === "string") {
        const flex = (0, dates_1.parseFlexibleDate)(date);
        if (flex && !Number.isNaN(flex.getTime()))
            return flex;
    }
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}
function formatLegacyDay(date) {
    const d = parseToDate(date);
    return `${DAY_NAMES[d.getDay()]} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}
/** Leave reason and/or public holiday name for an Off day. */
function describeScheduleOffDetail(producer, date, studioHolidays) {
    const dayIso = toLocalIsoDate(date);
    const parts = [];
    for (const name of (0, producer_time_off_1.studioHolidayNamesForIso)(dayIso, studioHolidays ?? [], producer.id)) {
        if (!parts.includes(name))
            parts.push(name);
    }
    for (const entry of producer.timeOff ?? []) {
        if (dayIso < entry.startDate || dayIso > entry.endDate)
            continue;
        const reason = (entry.reason || "").trim() || "Personal leave";
        if (!parts.includes(reason))
            parts.push(reason);
    }
    if (parts.length > 0)
        return parts.join(", ");
    if (producer.status === "unavailable")
        return "Unavailable";
    return undefined;
}
/**
 * Determines a producer's cell status for a given date.
 *
 * Priority:
 * 1. Legacy `schedule` entry (explicit day-level override, e.g. from a future
 *    db-backed producer availability table).
 * 2. Producer record status: "unavailable" → "off".
 * 3. Weekends: "off" (producers generally don't work weekends by default).
 * 4. All other cases: "available".
 *
 * NOTE: We deliberately do NOT randomly generate "mix" statuses here.
 * A cell is marked "mix" only when `coveringAssignments()` finds a real
 * eligible MTD record (Ongoing + assigned + valid dates) covering that date.
 * Random/hash-based "mix" generation was removed because it produced phantom
 * bookings that had no backing database record.
 */
function inferStatus(producer, date, scheduleByDay, studioHolidays) {
    const legacy = formatLegacyDay(date);
    const entry = scheduleByDay.get(legacy);
    // Only honour explicit "off" or "available" overrides from the legacy table.
    // Ignore legacy "mix" entries — those referred to old demo mixes that no
    // longer exist in the database.
    if (entry && (entry.status === "off" || entry.status === "available")) {
        return entry.status;
    }
    // Time off / studio holidays only apply on regular work days. Overtime days are cancelled
    // via removing the overtime date — not by adding time off.
    if ((0, producer_availability_1.isProducerWorkDay)(producer, date) &&
        (0, producer_availability_1.isProducerOnTimeOff)(producer, date, studioHolidays)) {
        return "off";
    }
    if ((0, producer_availability_1.isProducerWorkDay)(producer, date) || (0, producer_availability_1.isProducerOvertimeDay)(producer, date)) {
        if (producer.status === "unavailable")
            return "off";
        return "available";
    }
    return "nonwork";
}
function addDays(date, days) {
    const next = new Date(parseToDate(date));
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + days);
    return next;
}
function toLocalIsoDate(date) {
    const d = parseToDate(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function formatDisplayDate(date) {
    const d = parseToDate(date);
    return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function producerMatchesAssignment(producer, assigned) {
    const key = assigned.trim().toUpperCase();
    return (key === producer.name.toUpperCase() ||
        key === producer.initials.toUpperCase() ||
        key === producerScheduleId(producer));
}
/**
 * Returns all MTD records assigned to this producer that are eligible to
 * appear in the Schedule view.
 *
 * Eligibility (mirrors isEligibleProducerScheduleRecord):
 *   - Has an assigned producer matching this producer
 *   - Status is Ongoing (not Waiting for Data, Outsourced, Completed)
 *   - Has a valid Mix Start Date
 *   - Has a valid Mix End Date
 *   - Not in payroll / completed
 */
function producerAssignments(producer, mtdRecords) {
    return mtdRecords.filter((rec) => rec.assignedProducer &&
        producerMatchesAssignment(producer, rec.assignedProducer) &&
        (0, export_csv_1.isEligibleProducerScheduleRecord)(rec));
}
function coveringAssignments(date, assignments) {
    return assignments.filter((rec) => {
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
}
function bookingsFromAssignments(date, records) {
    return records.map((pick) => {
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
function resolveBookings(producer, date, status, assignments) {
    const covering = coveringAssignments(date, assignments);
    if (status === "available")
        return [];
    if (status === "off") {
        return [
            {
                work: "Time off",
                until: formatDisplayDate(date),
            },
        ];
    }
    if (status === "nonwork") {
        return [
            {
                work: "Not working",
                until: formatDisplayDate(date),
            },
        ];
    }
    if (covering.length > 0) {
        return bookingsFromAssignments(date, covering);
    }
    // No real assignments cover this date — return empty (no phantom bookings).
    return [];
}
function resolveBooking(producer, date, status, assignments) {
    const bookings = resolveBookings(producer, date, status, assignments);
    return bookings[0] ?? null;
}
function startOfCalendarWeek(date) {
    const start = new Date(parseToDate(date));
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
}
function buildDateRange(range, anchor) {
    const today = new Date(parseToDate(anchor));
    today.setHours(0, 0, 0, 0);
    if (range === "today") {
        return [today];
    }
    if (range === "week") {
        const start = startOfCalendarWeek(today);
        const dates = [];
        for (let i = 0; i < 7; i += 1) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    }
    if (range === "month") {
        return enumerateCalendarMonth(today.getFullYear(), today.getMonth());
    }
    if (range === "90days") {
        const end = new Date(today);
        end.setDate(today.getDate() + 89);
        return enumerateDays(today, end);
    }
    // Six full calendar months starting with the current month (28–31 days each).
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth() + 6, 0);
    return enumerateDays(start, endMonth);
}
function enumerateCalendarMonth(year, monthIndex) {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return enumerateDays(start, end);
}
function enumerateDays(start, end) {
    const dates = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor.getTime() <= last.getTime()) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
}
function getScheduleCells(producer, schedule, range, anchorDate = new Date(), mtdRecords = [], studioHolidays) {
    const scheduleId = producerScheduleId(producer);
    const scheduleByDay = new Map(schedule
        .filter((entry) => entry.producer === scheduleId)
        .map((entry) => [entry.day, entry]));
    const assignments = producerAssignments(producer, mtdRecords);
    return buildDateRange(range, anchorDate).map((date) => {
        let status = inferStatus(producer, date, scheduleByDay, studioHolidays);
        const coveringBookings = bookingsFromAssignments(date, coveringAssignments(date, assignments));
        if (coveringBookings.length > 0 && status === "available") {
            status = (0, producer_availability_1.isProducerAtDailyCapacity)(producer, date, mtdRecords)
                ? "capacity"
                : "mix";
        }
        else if (status === "available" &&
            (0, producer_availability_1.isProducerAtDailyCapacity)(producer, date, mtdRecords)) {
            status = "capacity";
        }
        const bookings = status === "mix" || status === "capacity"
            ? coveringBookings.length > 0
                ? coveringBookings
                : resolveBookings(producer, date, status, assignments)
            : resolveBookings(producer, date, status, assignments);
        const unavailable = status === "off" ||
            status === "nonwork" ||
            status === "mix" ||
            status === "capacity" ||
            bookings.length > 0;
        const isOvertime = (0, producer_availability_1.isProducerOvertimeDay)(producer, date) && !(0, producer_availability_1.isProducerWorkDay)(producer, date);
        return {
            key: toLocalIsoDate(date),
            date,
            dayLabel: DAY_NAMES[date.getDay()],
            dateLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`,
            status,
            unavailable,
            booking: bookings[0] ?? null,
            bookings,
            offDetail: status === "off"
                ? describeScheduleOffDetail(producer, date, studioHolidays)
                : undefined,
            isOvertime: isOvertime || undefined,
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
function rangeLabel(range, anchorDate = new Date()) {
    if (range === "today")
        return "Today";
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
        return "This month";
    if (range === "90days")
        return "Next 90 days";
    return "Next 6 months";
}
/** Inclusive ISO start/end for filtering mixes that overlap a schedule view range. */
function scheduleViewFilterPeriod(range, anchorDate = new Date()) {
    const dates = buildDateRange(range, anchorDate);
    if (dates.length === 0) {
        const today = toLocalIsoDate(anchorDate);
        return { start: today, end: today };
    }
    return {
        start: toLocalIsoDate(dates[0]),
        end: toLocalIsoDate(dates[dates.length - 1]),
    };
}
function sendPeriodLabel(period) {
    if (period === "complete")
        return "Complete schedule";
    return rangeLabel(period);
}
/** Date window for Send Schedule, or undefined for the full ongoing schedule. */
function scheduleSendFilterPeriod(period, anchorDate = new Date()) {
    if (period === "complete")
        return undefined;
    return scheduleViewFilterPeriod(period, anchorDate);
}
function buildTeamSchedule(producers, schedule, range, anchorDate = new Date(), mtdRecords = [], studioHolidays) {
    return producers.map((producer) => ({
        producer,
        cells: getScheduleCells(producer, schedule, range, anchorDate, mtdRecords, studioHolidays),
    }));
}
function aggregateColumns(rows, anchorDate = new Date()) {
    if (rows.length === 0)
        return [];
    const todayKey = toLocalIsoDate(anchorDate);
    return rows[0].cells.map((cell, index) => {
        const visibleRows = rows.filter((row) => !row.cells[index]?.filteredOut);
        const unavailableCount = visibleRows.filter((row) => row.cells[index]?.unavailable).length;
        const availableCount = visibleRows.length - unavailableCount;
        return {
            key: cell.key,
            availableCount,
            unavailableCount,
            total: visibleRows.length,
            label: cell.dateLabel,
            dayLabel: cell.dayLabel,
            isToday: cell.key === todayKey,
        };
    });
}
function buildScheduleColumnAggregates(range, anchorDate = new Date()) {
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
function buildCalendarDays(rows, range, anchorDate = new Date()) {
    const parsedAnchor = parseToDate(anchorDate);
    const todayKey = toLocalIsoDate(parsedAnchor);
    const dates = range === "week"
        ? buildDateRange("week", parsedAnchor)
        : enumerateCalendarMonth(parsedAnchor.getFullYear(), parsedAnchor.getMonth());
    return dates.map((date) => {
        const key = toLocalIsoDate(date);
        const unavailableProducers = rows
            .map((row) => {
            const cell = row.cells.find((entry) => entry.key === key);
            return cell?.unavailable && !cell.filteredOut
                ? { producer: row.producer, cell }
                : null;
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
function buildMonthGrid(rows, anchorDate = new Date()) {
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
    if (range === "today" || range === "week")
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
    if (status === "nonwork")
        return "Non-working";
    if (status === "capacity")
        return "Capacity Reached";
    return "Available";
}
exports.SCHEDULE_STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "mix", label: "Booked" },
    { value: "capacity", label: "Capacity Reached" },
    { value: "off", label: "Off" },
    { value: "nonwork", label: "Non-working" },
    { value: "available", label: "Available" },
];
function maskCellForStatusFilter(cell) {
    return {
        ...cell,
        status: "available",
        unavailable: false,
        booking: null,
        bookings: [],
        filteredOut: true,
    };
}
function filterTeamScheduleByStatus(rows, filter, range) {
    if (filter === "all")
        return rows;
    if (range === "today") {
        return rows.filter((row) => row.cells[0]?.status === filter);
    }
    const matchingRows = rows.filter((row) => row.cells.some((cell) => cell.status === filter));
    if (matchingRows.length === 0)
        return [];
    const columnCount = matchingRows[0].cells.length;
    const visibleColumnIndices = [];
    for (let index = 0; index < columnCount; index += 1) {
        const columnHasMatch = matchingRows.some((row) => row.cells[index]?.status === filter);
        if (columnHasMatch)
            visibleColumnIndices.push(index);
    }
    return matchingRows.map((row) => ({
        ...row,
        cells: visibleColumnIndices.map((index) => {
            const cell = row.cells[index];
            return cell.status === filter ? cell : maskCellForStatusFilter(cell);
        }),
    }));
}
function formatMatrixDateCell(column, _range, _previousKey) {
    const title = `${column.dayLabel}, ${column.label}`;
    const dayStr = column.key.split("-")[2];
    const day = String(Number(dayStr));
    const weekday = column.dayLabel.slice(0, 3).toUpperCase();
    if (column.isToday) {
        return {
            top: "Today",
            day: column.label,
            title,
            emphasizeTop: true,
            weekday,
        };
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
