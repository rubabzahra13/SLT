"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerStatementPreview = ProducerStatementPreview;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const DateFilter_1 = require("@/components/ui/DateFilter");
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
const Avatar_1 = require("@/components/ui/Avatar");
const data_1 = require("@/lib/data");
const date_filters_1 = require("@/lib/date-filters");
const dates_1 = require("@/lib/dates");
const export_csv_1 = require("@/lib/export-csv");
const editor_assignment_1 = require("@/lib/editor-assignment");
function StatementPreviewTable({ rows }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("h4", { className: "text-[13px] font-bold tracking-wide text-brand-ink", children: "Statement Data Preview (Matching CSV Export)" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-[11px] text-brand-ink-tertiary", children: [export_csv_1.PRODUCER_STATEMENT_COLUMNS.length, " columns"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto scrollbar-hide", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full min-w-[1200px] border-collapse text-left", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "table-header-row border-b border-brand-line/70 bg-brand-bg/80", children: [(0, jsx_runtime_1.jsx)("th", { className: "table-header-cell w-12 px-3 py-2.5 text-center text-[11px] font-bold uppercase text-brand-ink-secondary", children: "#" }), export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((col) => ((0, jsx_runtime_1.jsx)("th", { className: "table-header-cell whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary", children: col.label }, col.key)))] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-brand-line/50 bg-white", children: rows.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: export_csv_1.PRODUCER_STATEMENT_COLUMNS.length + 1, className: "px-6 py-12 text-center text-brand-ink-secondary", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "h-8 w-8 text-brand-ink-tertiary/40" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[14px] font-semibold text-brand-ink", children: "No completed mixes in this pay period." })] }) }) })) : (rows.map((row, idx) => ((0, jsx_runtime_1.jsxs)("tr", { className: "transition-colors hover:bg-brand-orange-soft/20", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-brand-ink-tertiary", children: idx + 1 }), export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((col) => {
                                        const val = row[col.key];
                                        const isTotalCol = col.key === "totalPayout";
                                        const isProgramCol = col.key === "programName";
                                        return ((0, jsx_runtime_1.jsx)("td", { className: `whitespace-nowrap px-3 py-2.5 text-[12px] ${isTotalCol
                                                ? "font-bold tabular-nums text-brand-success"
                                                : isProgramCol
                                                    ? "font-semibold text-brand-ink"
                                                    : "text-brand-ink-secondary"}`, children: val || "—" }, col.key));
                                    })] }, row.recId || idx)))) })] }) })] }));
}
function ProducerStatementPreview({ selectedProducer, onProducerChange, selectedPeriod, onPeriodChange, payrollRecords, allOrders, producers, onBack, embedded = false, allowedProducerNames, sendLayout = "separate", }) {
    const [activeTabProducer, setActiveTabProducer] = (0, react_1.useState)("");
    const [collapsedProducers, setCollapsedProducers] = (0, react_1.useState)(() => new Set());
    const filterPeriod = (0, react_1.useMemo)(() => {
        const bounds = (0, date_filters_1.calculateDateBounds)(selectedPeriod.type, selectedPeriod.value);
        return {
            start: bounds.start ? (0, dates_1.toCanonicalIsoDate)(bounds.start) : "",
            end: bounds.end ? (0, dates_1.toCanonicalIsoDate)(bounds.end) : "",
        };
    }, [selectedPeriod]);
    const activeProducerSummaries = (0, react_1.useMemo)(() => {
        const dateMatching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        const payoutByProducer = new Map();
        for (const rec of dateMatching) {
            if (!rec.assignedProducer)
                continue;
            const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(rec.assignedProducer, producers);
            const name = prodObj?.name || rec.assignedProducer;
            if (!name)
                continue;
            payoutByProducer.set(name, (payoutByProducer.get(name) ?? 0) + 1);
        }
        const allowed = allowedProducerNames && allowedProducerNames.length > 0
            ? new Set(allowedProducerNames.map((name) => name.toUpperCase()))
            : null;
        return Array.from(payoutByProducer.entries())
            .map(([name, mixCount]) => {
            const rows = (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, name, filterPeriod);
            const total = rows.reduce((sum, row) => sum + row.rawTotalPayout, 0);
            const producerObj = producers.find((p) => p.name.toUpperCase() === name.toUpperCase() || p.id === name) || (0, editor_assignment_1.findProducerByAssignmentKey)(name, producers);
            return { name, mixCount, total, producerObj, rows };
        })
            .filter((entry) => !allowed || allowed.has(entry.name.toUpperCase()))
            .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    }, [
        payrollRecords,
        allOrders,
        producers,
        filterPeriod,
        allowedProducerNames,
    ]);
    const activeProducersInPeriod = (0, react_1.useMemo)(() => activeProducerSummaries.map((entry) => entry.name), [activeProducerSummaries]);
    const producerNamesKey = activeProducersInPeriod.join("|");
    (0, react_1.useEffect)(() => {
        if (!embedded || sendLayout !== "together")
            return;
        setCollapsedProducers(new Set(activeProducersInPeriod.slice(1)));
    }, [embedded, sendLayout, producerNamesKey, activeProducersInPeriod]);
    const toggleProducerCollapsed = (name) => {
        setCollapsedProducers((prev) => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            }
            else {
                next.add(name);
            }
            return next;
        });
    };
    const currentProducerToView = (0, react_1.useMemo)(() => {
        if (selectedProducer !== "all") {
            const found = producers.find((p) => p.id === selectedProducer ||
                p.name.toUpperCase() === selectedProducer.toUpperCase());
            return found ? found.name : selectedProducer;
        }
        if (activeTabProducer && activeProducersInPeriod.includes(activeTabProducer)) {
            return activeTabProducer;
        }
        return activeProducersInPeriod[0] || producers[0]?.name || "";
    }, [selectedProducer, activeTabProducer, activeProducersInPeriod, producers]);
    const currentRows = (0, react_1.useMemo)(() => {
        return (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, currentProducerToView, filterPeriod);
    }, [payrollRecords, allOrders, producers, currentProducerToView, filterPeriod]);
    const currentProducerTotal = (0, react_1.useMemo)(() => currentRows.reduce((sum, row) => sum + row.rawTotalPayout, 0), [currentRows]);
    const currentProducerObj = (0, react_1.useMemo)(() => {
        return (producers.find((p) => p.name.toUpperCase() === currentProducerToView.toUpperCase() ||
            p.id.toUpperCase() === currentProducerToView.toUpperCase()) || (0, editor_assignment_1.findProducerByAssignmentKey)(currentProducerToView, producers));
    }, [producers, currentProducerToView]);
    const handleDownloadCurrentProducer = () => {
        const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(payrollRecords, allOrders, producers, currentProducerToView, filterPeriod);
        (0, export_csv_1.triggerCsvDownload)(`Payroll_Producer_Statement_${currentProducerToView.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
    };
    const handleDownloadAllProducers = () => {
        const targets = selectedProducer === "all" ? activeProducersInPeriod : [currentProducerToView];
        if (targets.length === 0) {
            if (typeof window !== "undefined") {
                alert("No completed records found for the selected pay period.");
            }
            return;
        }
        targets.forEach((targetName) => {
            const csv = (0, export_csv_1.generateProducerFacingPayrollCsv)(payrollRecords, allOrders, producers, targetName, filterPeriod);
            (0, export_csv_1.triggerCsvDownload)(`Payroll_Producer_Statement_${targetName.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: embedded ? "space-y-4" : "space-y-5 animate-fade-in px-6 py-6 lg:px-8", children: [!embedded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col justify-between gap-4 border-b border-brand-line/70 pb-4 md:flex-row md:items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [onBack ? ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onBack, className: "inline-flex h-9 items-center gap-2 rounded-xl border border-brand-line/80 bg-brand-elevated px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus:outline-none", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Back to Payroll" })] })) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-[20px] font-bold tracking-tight text-brand-ink", children: "Producer Statement Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-secondary", children: "Exact on-screen preview of the statement sent to the producer." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2.5", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadCurrentProducer, className: "inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-elevated px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4 text-brand-ink-secondary" }), (0, jsx_runtime_1.jsx)("span", { children: "Export Statement CSV" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadAllProducers, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: selectedProducer === "all"
                                                    ? "Send to All (Download Files)"
                                                    : "Send Statement (Download)" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "dashboard-panel relative z-20 !overflow-visible flex flex-col justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-surface/90 p-4 shadow-sm md:flex-row md:items-center", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [(0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: producers, value: selectedProducer, onChange: (val) => {
                                        onProducerChange(val);
                                        if (val !== "all")
                                            setActiveTabProducer("");
                                    }, label: "Editor:", allLabel: "All Editors" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[12px] font-semibold text-brand-ink-secondary", children: "Payroll Period:" }), (0, jsx_runtime_1.jsx)(DateFilter_1.DateFilter, { value: selectedPeriod, onChange: onPeriodChange })] })] }) }), selectedProducer === "all" && activeProducersInPeriod.length > 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between", children: (0, jsx_runtime_1.jsxs)("h3", { className: "text-[13px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: ["Active Producer Statements (", activeProducersInPeriod.length, ")"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: activeProducerSummaries.map(({ name, mixCount, total, producerObj }) => {
                                    const isSelected = currentProducerToView.toUpperCase() === name.toUpperCase();
                                    const dotColor = producerObj?.color || "#94a3b8";
                                    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTabProducer(name), className: (0, clsx_1.default)("flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12px] font-medium shadow-sm transition", isSelected
                                            ? "border-brand-orange/60 bg-brand-orange-soft/40 text-brand-ink ring-2 ring-brand-orange/20"
                                            : "border-brand-line/70 bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"), children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10", style: { backgroundColor: dotColor }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: name }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-ink-secondary", children: [mixCount, " mixes \u00B7 ", (0, data_1.formatPrice)(total)] })] }, name));
                                }) })] })) : null, (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel flex flex-col justify-between gap-4 rounded-2xl border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 p-5 shadow-sm md:flex-row md:items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3.5", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: currentProducerObj, name: currentProducerToView, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-[16px] font-bold text-brand-ink", children: [currentProducerToView, "'s Payroll Statement"] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[12px] text-brand-ink-secondary", children: "Previewing payout statement" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 rounded-xl border border-brand-line/60 bg-brand-surface/90 px-4 py-2.5 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Total Payout" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[20px] font-extrabold tabular-nums text-brand-success", children: (0, data_1.formatPrice)(currentProducerTotal) })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-8 w-px bg-brand-line/70" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Completed Mixes" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[18px] font-bold tabular-nums text-brand-ink", children: currentRows.length })] })] })] })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "min-h-0 space-y-4", children: embedded && sendLayout === "together" ? (activeProducerSummaries.map(({ name, mixCount, total, producerObj, rows }, index) => {
                    const isCollapsed = collapsedProducers.has(name);
                    return ((0, jsx_runtime_1.jsxs)("section", { className: "overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleProducerCollapsed(name), "aria-expanded": !isCollapsed, className: "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-brand-bg/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-3", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums tracking-tight ring-1 ring-inset transition", !isCollapsed
                                                    ? "bg-brand-orange-soft/55 text-brand-orange ring-brand-orange/30"
                                                    : "bg-brand-bg/90 text-brand-ink-tertiary ring-brand-line/55"), "aria-hidden": true, children: String(index + 1).padStart(2, "0") }), (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producerObj, name: name, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h3", { className: "truncate text-[15px] font-bold text-brand-ink", children: name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] text-brand-ink-secondary", children: [mixCount, " mix", mixCount === 1 ? "" : "es", " \u00B7 ", (0, data_1.formatPrice)(total)] })] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-200", !isCollapsed && "rotate-180"), strokeWidth: 2, "aria-hidden": true })] }), !isCollapsed ? ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-brand-line/60 px-3 pb-3", children: (0, jsx_runtime_1.jsx)(StatementPreviewTable, { rows: rows }) })) : null] }, name));
                })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "dashboard-panel flex items-center justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-surface/90 px-4 py-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: currentProducerObj, name: currentProducerToView, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h3", { className: "truncate text-[15px] font-bold text-brand-ink", children: currentProducerToView }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] text-brand-ink-secondary", children: [currentRows.length, " mix", currentRows.length === 1 ? "" : "es", " \u00B7", " ", (0, data_1.formatPrice)(currentProducerTotal)] })] })] }) }), (0, jsx_runtime_1.jsx)(StatementPreviewTable, { rows: currentRows })] })) })] }));
}
