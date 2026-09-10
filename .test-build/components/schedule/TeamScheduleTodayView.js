"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamScheduleTodayView = TeamScheduleTodayView;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const Avatar_1 = require("@/components/ui/Avatar");
const DataTable_1 = require("@/components/ui/DataTable");
const schedule_legend_1 = require("@/components/schedule/schedule-legend");
const TruncatedText_1 = require("@/components/ui/TruncatedText");
function formatTodayHeading(date) {
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
}
function buildTodayEntries(rows) {
    const entries = [];
    const statusOrder = {
        available: 0,
        mix: 1,
        off: 2,
        capacity: 3,
    };
    for (const row of rows) {
        const cell = row.cells[0];
        if (cell)
            entries.push({ row, cell });
    }
    entries.sort((a, b) => {
        const statusDiff = statusOrder[a.cell.status] - statusOrder[b.cell.status];
        if (statusDiff !== 0)
            return statusDiff;
        return a.row.producer.name.localeCompare(b.row.producer.name);
    });
    return entries;
}
function TeamScheduleTodayView({ rows, date, activeProducerId, onSelectProducer, emptyMessage = "No producers in this view.", className, }) {
    const entries = (0, react_1.useMemo)(() => buildTodayEntries(rows), [rows]);
    const hasEntries = entries.length > 0;
    const shouldStretchRows = entries.length > 2;
    const columns = (0, react_1.useMemo)(() => [
        {
            key: "producer",
            header: "Producer",
            width: "72px",
            align: "center",
            nowrap: false,
            cellClassName: "!overflow-visible whitespace-normal",
            render: (entry) => {
                const { producer } = entry.row;
                const active = producer.id === activeProducerId;
                return ((0, jsx_runtime_1.jsxs)("div", { className: "mx-auto flex w-full flex-col items-center justify-center gap-1", title: producer.name, children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 rounded-full ring-1 ring-offset-1 ring-offset-white", active ? "ring-brand-orange/60" : "ring-brand-blue/30"), children: (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producer, size: "sm" }) }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("max-w-full truncate text-[10px] font-bold leading-none", active ? "text-brand-orange-deep" : "text-brand-ink-secondary"), children: producer.initials })] }));
            },
        },
        {
            key: "bookedOn",
            header: "Booked On",
            width: "320px",
            align: "center",
            render: (entry) => {
                const bookings = (0, schedule_legend_1.getCellBookings)(entry.cell);
                if (bookings.length === 0) {
                    if (entry.cell.status === "available") {
                        return ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-signature", children: "Available" }));
                    }
                    if (entry.cell.status === "capacity") {
                        return ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-amber-700", children: "Capacity Reached" }));
                    }
                    return (0, jsx_runtime_1.jsx)("span", { className: "text-brand-ink-tertiary", children: "\u2014" });
                }
                const extraCount = bookings.length - 1;
                return ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 w-full text-center", children: [(0, jsx_runtime_1.jsx)(TruncatedText_1.TruncatedText, { text: bookings[0].work, className: "text-[12px] font-medium text-brand-ink" }), extraCount > 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] font-medium text-brand-ink-tertiary", children: ["+", extraCount, " more mix", extraCount === 1 ? "" : "es"] })) : null] }));
            },
        },
        {
            key: "endDate",
            header: "End Date",
            width: "120px",
            align: "center",
            render: (entry) => {
                const bookings = (0, schedule_legend_1.getCellBookings)(entry.cell);
                const until = bookings[0]?.until;
                if (!until && entry.cell.status === "available") {
                    return ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-signature", children: "Available" }));
                }
                if (!until && entry.cell.status === "capacity") {
                    return ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-amber-700", children: "At daily limit" }));
                }
                return ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("text-[12px] tabular-nums", until ? "font-medium text-brand-ink-secondary" : "text-brand-ink-tertiary"), children: until ?? "—" }));
            },
        },
        {
            key: "status",
            header: "Status",
            width: "88px",
            align: "center",
            nowrap: false,
            cellClassName: "!overflow-visible whitespace-normal",
            render: (entry) => ((0, jsx_runtime_1.jsx)(schedule_legend_1.ScheduleStatusTile, { status: entry.cell.status, cell: entry.cell, className: shouldStretchRows ? "h-8 w-14 max-w-[56px]" : undefined })),
        },
    ], [activeProducerId, shouldStretchRows]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("dashboard-panel dashboard-panel-framed flex h-full min-h-0 w-full flex-col overflow-hidden", className), children: [(0, jsx_runtime_1.jsxs)("div", { className: "shrink-0 border-b border-brand-line/60 px-5 py-4 lg:px-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Today" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[20px]", children: formatTodayHeading(date) }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: [rows.length, " producer", rows.length === 1 ? "" : "s", " on roster"] })] }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("min-h-0 flex-1", hasEntries && shouldStretchRows
                    ? "flex flex-col overflow-hidden"
                    : hasEntries
                        ? "overflow-y-auto"
                        : "flex flex-col"), children: hasEntries ? ((0, jsx_runtime_1.jsx)(DataTable_1.DataTable, { data: entries, columns: columns, rowKey: (entry) => entry.row.producer.id, onRowClick: (entry) => onSelectProducer(entry.row, entry.cell), emptyMessage: emptyMessage, embedded: true, compact: true, showScrollIndicator: false, stretchRows: shouldStretchRows, className: shouldStretchRows ? "h-full min-h-0 flex-1" : undefined })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-1 items-center justify-center px-6 py-12", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-md text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: emptyMessage }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[12px] leading-relaxed text-brand-ink-tertiary", children: "Try another filter or category to see producers in this view." })] }) })) })] }));
}
