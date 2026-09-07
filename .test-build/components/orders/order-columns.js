"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderFormColumns = getOrderFormColumns;
exports.getOrderColumns = getOrderColumns;
const jsx_runtime_1 = require("react/jsx-runtime");
const StatusBadge_1 = require("@/components/ui/StatusBadge");
const order_form_1 = require("@/lib/order-form");
const cheer_order_columns_1 = require("@/components/orders/cheer-order-columns");
const lucide_react_1 = require("lucide-react");
function textCell(value, wide = false) {
    return ((0, jsx_runtime_1.jsx)("span", { className: wide ? "block max-w-[220px] truncate" : "block truncate", children: (0, order_form_1.displayText)(value) }));
}
function multilineCell(value) {
    return ((0, jsx_runtime_1.jsx)("span", { className: "block max-w-[240px] text-[12px] leading-snug text-brand-ink-secondary", children: (0, order_form_1.displayMultiline)(value, 140) }));
}
function pomFormColumns() {
    return [
        {
            key: "schoolProgramName",
            header: "School / Program",
            width: "180px",
            render: (o) => textCell(o.schoolProgramName, true),
        },
        {
            key: "schoolAddress",
            header: "Address",
            width: "140px",
            render: (o) => textCell(o.schoolAddress),
        },
        { key: "city", header: "City", width: "100px", render: (o) => textCell(o.city) },
        {
            key: "stateProvince",
            header: "State",
            width: "72px",
            render: (o) => textCell(o.stateProvince),
        },
        {
            key: "zipPostalCode",
            header: "ZIP",
            width: "80px",
            render: (o) => (0, jsx_runtime_1.jsx)("span", { className: "tabular-nums", children: o.zipPostalCode || "—" }),
        },
        {
            key: "country",
            header: "Country",
            width: "110px",
            render: (o) => textCell(o.country),
        },
        {
            key: "division",
            header: "Division",
            width: "160px",
            nowrap: false,
            render: (o) => multilineCell(o.division),
        },
        {
            key: "coachName",
            header: "Coach",
            width: "120px",
            render: (o) => textCell(o.coachName),
        },
        {
            key: "coachPhone",
            header: "Coach Phone",
            width: "110px",
            render: (o) => (0, jsx_runtime_1.jsx)("span", { className: "tabular-nums", children: o.coachPhone || "—" }),
        },
        {
            key: "coachEmail",
            header: "Coach Email",
            width: "180px",
            render: (o) => ((0, jsx_runtime_1.jsx)("span", { className: "block truncate text-brand-ink-secondary", children: o.coachEmail || "—" })),
        },
        {
            key: "billingPersonName",
            header: "Billing Contact",
            width: "120px",
            render: (o) => textCell(o.billingPersonName),
        },
        {
            key: "billingPersonEmail",
            header: "Billing Email",
            width: "180px",
            render: (o) => ((0, jsx_runtime_1.jsx)("span", { className: "block truncate text-brand-ink-secondary", children: o.billingPersonEmail || "—" })),
        },
        {
            key: "choreographerName",
            header: "Choreographer",
            width: "140px",
            render: (o) => textCell(o.choreographerName),
        },
        {
            key: "choreographerEmail",
            header: "Choreographer Email",
            width: "180px",
            render: (o) => ((0, jsx_runtime_1.jsx)("span", { className: "block truncate text-brand-ink-secondary", children: o.choreographerEmail || "—" })),
        },
        {
            key: "numberOfCopies",
            header: "Copies",
            width: "72px",
            align: "center",
            render: (o) => (0, jsx_runtime_1.jsx)("span", { className: "tabular-nums", children: o.numberOfCopies || "—" }),
        },
        {
            key: "packageType",
            header: "Package",
            width: "160px",
            nowrap: false,
            render: (o) => multilineCell(o.packageType),
        },
        {
            key: "requestedEditor",
            header: "Requested Editor",
            width: "120px",
            render: (o) => textCell(o.requestedEditor),
        },
        {
            key: "timeLengthOfMix",
            header: "Mix Length",
            width: "100px",
            render: (o) => (0, jsx_runtime_1.jsx)("span", { children: o.timeLengthOfMix || "—" }),
        },
        {
            key: "musicAffiliate",
            header: "Music Affiliate",
            width: "140px",
            render: (o) => textCell(o.musicAffiliate),
        },
        {
            key: "powerMusicCovers",
            header: "Power Music Covers",
            width: "220px",
            nowrap: false,
            render: (o) => multilineCell(o.powerMusicCovers),
        },
        {
            key: "routineNotes",
            header: "Routine Notes",
            width: "240px",
            nowrap: false,
            render: (o) => multilineCell(o.routineNotes),
        },
        {
            key: "customVoiceovers",
            header: "Voiceovers",
            width: "120px",
            render: (o) => textCell(o.customVoiceovers),
        },
    ];
}
function resolveFormColumns(options) {
    if (options.formType === "school-all-star-cheer" && options.cheerFormSubtype) {
        return (0, cheer_order_columns_1.getCheerOrderColumns)(options.cheerFormSubtype);
    }
    return pomFormColumns();
}
function getOrderFormColumns(order) {
    return resolveFormColumns({
        mode: "active",
        formType: order.formType,
        cheerFormSubtype: order.cheerFormSubtype,
        danceFormSubtype: order.danceFormSubtype,
    });
}
function getOrderColumns(options) {
    const { mode } = options;
    const columns = resolveFormColumns(options);
    columns.push({
        key: "status",
        header: "Status",
        width: "96px",
        nowrap: true,
        render: (order) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1.5", children: [mode === "active" && order.needsAttention ? ((0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { className: "h-3.5 w-3.5 shrink-0 text-brand-warning", strokeWidth: 1.75 })) : null, (0, jsx_runtime_1.jsx)(StatusBadge_1.StatusBadge, { status: order.status })] })),
    });
    columns.push({
        key: "date",
        header: mode === "active" ? "Received" : "Completed",
        width: "96px",
        align: "right",
        nowrap: true,
        render: (order) => ((0, jsx_runtime_1.jsx)("span", { className: "text-[12px] text-brand-ink-tertiary tabular-nums", children: mode === "past" || order.status === "completed"
                ? order.completedAt || order.createdAt
                : order.createdAt })),
    });
    return columns;
}
