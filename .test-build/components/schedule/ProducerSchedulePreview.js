"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerSchedulePreview = ProducerSchedulePreview;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
const Avatar_1 = require("@/components/ui/Avatar");
const producers_1 = require("@/lib/producers");
const date_filters_1 = require("@/lib/date-filters");
const dates_1 = require("@/lib/dates");
const export_csv_1 = require("@/lib/export-csv");
const editor_assignment_1 = require("@/lib/editor-assignment");
function SchedulePreviewTable({ rows }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("h4", { className: "text-[13px] font-bold tracking-wide text-brand-ink", children: "Schedule Data Preview (Matching CSV Export)" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "font-mono text-[11px] text-brand-ink-tertiary", children: [export_csv_1.PRODUCER_SCHEDULE_COLUMNS.length, " columns"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto scrollbar-hide", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full min-w-[1000px] border-collapse text-left", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "table-header-row border-b border-brand-line/70 bg-brand-bg/80", children: [(0, jsx_runtime_1.jsx)("th", { className: "table-header-cell w-12 px-3 py-2.5 text-center text-[11px] font-bold uppercase text-brand-ink-secondary", children: "#" }), export_csv_1.PRODUCER_SCHEDULE_COLUMNS.map((col) => ((0, jsx_runtime_1.jsx)("th", { className: "table-header-cell whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary", children: col.label }, col.key)))] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-brand-line/50 bg-white", children: rows.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: export_csv_1.PRODUCER_SCHEDULE_COLUMNS.length + 1, className: "px-4 py-8 text-center text-[13px] text-brand-ink-tertiary", children: "No ongoing scheduled mixes found for this producer." }) })) : (rows.map((row, idx) => ((0, jsx_runtime_1.jsxs)("tr", { className: "transition-colors hover:bg-brand-bg/40", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-3 py-2.5 text-center font-mono text-[12px] text-brand-ink-tertiary", children: idx + 1 }), export_csv_1.PRODUCER_SCHEDULE_COLUMNS.map((col) => {
                                        const val = row[col.key];
                                        const isProgramCol = col.key === "programName";
                                        const isStatusCol = col.key === "status";
                                        return ((0, jsx_runtime_1.jsx)("td", { className: `whitespace-nowrap px-3 py-2.5 text-[12px] ${isProgramCol
                                                ? "font-semibold text-brand-ink"
                                                : isStatusCol
                                                    ? "font-medium text-brand-orange"
                                                    : "text-brand-ink-secondary"}`, children: String(val ?? "—") }, col.key));
                                    })] }, row.recId || idx)))) })] }) })] }));
}
function ProducerSchedulePreview({ selectedProducer, onProducerChange, mtdRecords, allOrders, producers, onBack, embedded = false, allowedProducerNames, sendLayout = "separate", onViewingProducerChange, filterPeriod, }) {
    const [activeTabProducer, setActiveTabProducer] = (0, react_1.useState)("");
    const [sidebarSearch, setSidebarSearch] = (0, react_1.useState)("");
    const [collapsedProducers, setCollapsedProducers] = (0, react_1.useState)(() => new Set());
    const activeProducerSummaries = (0, react_1.useMemo)(() => {
        const eligibleRecords = mtdRecords.filter((r) => {
            if (!(0, export_csv_1.isEligibleProducerScheduleRecord)(r))
                return false;
            if (!filterPeriod)
                return true;
            const recStart = r.mixStartDate || r.completedAt || "";
            const recEnd = r.mixEndDate || r.mixStartDate || r.completedAt || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        const mixCounts = new Map();
        for (const r of eligibleRecords) {
            if (!r.assignedProducer)
                continue;
            const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
            const name = prodObj?.name || r.assignedProducer;
            if (!name)
                continue;
            mixCounts.set(name, (mixCounts.get(name) ?? 0) + 1);
        }
        const allowed = allowedProducerNames && allowedProducerNames.length > 0
            ? new Set(allowedProducerNames.map((name) => name.toUpperCase()))
            : null;
        return Array.from(mixCounts.entries())
            .map(([name, mixCount]) => {
            const producerObj = producers.find((p) => p.name.toUpperCase() === name.toUpperCase() || p.id === name) || (0, editor_assignment_1.findProducerByAssignmentKey)(name, producers);
            return { name, mixCount, producerObj };
        })
            .filter((entry) => !allowed || allowed.has(entry.name.toUpperCase()))
            .sort((a, b) => b.mixCount - a.mixCount || a.name.localeCompare(b.name));
    }, [mtdRecords, producers, allowedProducerNames, filterPeriod]);
    const activeProducersInSchedule = (0, react_1.useMemo)(() => activeProducerSummaries.map((entry) => entry.name), [activeProducerSummaries]);
    const producerNamesKey = activeProducersInSchedule.join("|");
    (0, react_1.useEffect)(() => {
        if (!embedded || sendLayout !== "together")
            return;
        setCollapsedProducers(new Set(activeProducersInSchedule.slice(1)));
    }, [embedded, sendLayout, producerNamesKey, activeProducersInSchedule]);
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
    const filteredProducerSummaries = (0, react_1.useMemo)(() => {
        const query = sidebarSearch.trim();
        if (!query)
            return activeProducerSummaries;
        return activeProducerSummaries.filter((entry) => {
            if (entry.producerObj) {
                return (0, producers_1.matchesProducerSearch)(entry.producerObj, query);
            }
            return entry.name.toLowerCase().includes(query.toLowerCase());
        });
    }, [activeProducerSummaries, sidebarSearch]);
    // Determine current active producer name to view
    const currentProducerToView = (0, react_1.useMemo)(() => {
        if (selectedProducer !== "all") {
            const found = producers.find((p) => p.id === selectedProducer || p.name.toUpperCase() === selectedProducer.toUpperCase());
            return found ? found.name : selectedProducer;
        }
        if (activeTabProducer && activeProducersInSchedule.includes(activeTabProducer)) {
            return activeTabProducer;
        }
        return activeProducersInSchedule[0] || producers[0]?.name || "Casey Marlow";
    }, [selectedProducer, activeTabProducer, activeProducersInSchedule, producers]);
    // Producer object for avatar/color display
    const currentProducerObj = (0, react_1.useMemo)(() => {
        return (producers.find((p) => p.name.toUpperCase() === currentProducerToView.toUpperCase() ||
            p.id.toUpperCase() === currentProducerToView.toUpperCase()) || (0, editor_assignment_1.findProducerByAssignmentKey)(currentProducerToView, producers));
    }, [producers, currentProducerToView]);
    // Get ongoing schedule rows for currently viewed producer
    const currentRows = (0, react_1.useMemo)(() => {
        return (0, export_csv_1.getProducerFacingScheduleRows)(mtdRecords, allOrders, producers, currentProducerToView, filterPeriod);
    }, [mtdRecords, allOrders, producers, currentProducerToView, filterPeriod]);
    const rowsByProducer = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const summary of activeProducerSummaries) {
            map.set(summary.name, (0, export_csv_1.getProducerFacingScheduleRows)(mtdRecords, allOrders, producers, summary.name, filterPeriod));
        }
        return map;
    }, [activeProducerSummaries, mtdRecords, allOrders, producers, filterPeriod]);
    (0, react_1.useEffect)(() => {
        onViewingProducerChange?.(currentProducerToView);
    }, [currentProducerToView, onViewingProducerChange]);
    const showSidebar = !embedded &&
        sendLayout === "separate" &&
        selectedProducer === "all" &&
        activeProducersInSchedule.length > 0;
    const handleDownloadCurrentProducer = () => {
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, currentProducerToView, filterPeriod);
        (0, export_csv_1.triggerCsvDownload)(`Schedule_Producer_Statement_${currentProducerToView.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
    };
    const handleDownloadAllProducers = () => {
        const targets = selectedProducer === "all" ? activeProducersInSchedule : [currentProducerToView];
        if (targets.length === 0) {
            if (typeof window !== "undefined") {
                alert("No ongoing scheduled mixes found for the active producers.");
            }
            return;
        }
        targets.forEach((targetName) => {
            const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetName, filterPeriod);
            (0, export_csv_1.triggerCsvDownload)(`Schedule_${targetName.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: embedded ? "space-y-4" : "space-y-5", children: [!embedded ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col justify-between gap-4 border-b border-brand-line/60 pb-4 md:flex-row md:items-center", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [onBack ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onBack, className: "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line/70 bg-brand-surface text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange", title: "Back to Schedule Overview", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }) })) : null, (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-[18px] font-bold text-brand-ink", children: "Producer Schedule Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary", children: "Review each editor's schedule, then download or send it individually." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [(0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: producers, value: selectedProducer, onChange: (val) => {
                                    onProducerChange(val);
                                    setActiveTabProducer("");
                                }, label: "Editor:", allLabel: "All Editors" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadCurrentProducer, className: "inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-surface px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("span", { children: "Download this editor's CSV" })] }), selectedProducer === "all" && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadAllProducers, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Download all editor CSVs" })] }))] })] })) : null, (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("min-h-0", showSidebar
                    ? "flex flex-col gap-4 lg:flex-row lg:items-start"
                    : "space-y-4"), children: [showSidebar ? ((0, jsx_runtime_1.jsxs)("aside", { className: "dashboard-panel flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 lg:w-[240px]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/50 px-3 py-2.5", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink-tertiary", children: ["Editors (", activeProducersInSchedule.length, ")"] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mt-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-ink-tertiary", strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("input", { type: "search", value: sidebarSearch, onChange: (event) => setSidebarSearch(event.target.value), placeholder: "Search editors\u2026", "aria-label": "Search editors", className: "h-8 w-full rounded-lg border border-brand-line/70 bg-brand-elevated pl-8 pr-2.5 text-[12px] text-brand-ink outline-none transition placeholder:text-brand-ink-tertiary focus:border-brand-blue/45 focus:ring-2 focus:ring-brand-blue/15" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-[320px] overflow-y-auto p-1.5 lg:max-h-[480px]", children: filteredProducerSummaries.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "px-2 py-3 text-[12px] text-brand-ink-tertiary", children: "No editors match your search." })) : (filteredProducerSummaries.map(({ name, mixCount, producerObj }) => {
                                    const isSelected = currentProducerToView.toUpperCase() === name.toUpperCase();
                                    return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTabProducer(name), className: (0, clsx_1.default)("flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition", isSelected
                                            ? "bg-brand-orange-soft/50 ring-1 ring-inset ring-brand-orange/25"
                                            : "hover:bg-brand-bg/80"), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producerObj, name: name, size: "sm" }), (0, jsx_runtime_1.jsxs)("span", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "block truncate text-[12px] font-semibold text-brand-ink", children: name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[11px] tabular-nums text-brand-ink-tertiary", children: [mixCount, " mix", mixCount === 1 ? "" : "es"] })] })] }, name));
                                })) })] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "min-w-0 flex-1 space-y-4", children: embedded && sendLayout === "together" ? (activeProducerSummaries.map(({ name, mixCount, producerObj }, index) => {
                            const rows = rowsByProducer.get(name) ?? [];
                            const isCollapsed = collapsedProducers.has(name);
                            return ((0, jsx_runtime_1.jsxs)("section", { className: "overflow-hidden rounded-2xl border border-brand-line/70 bg-brand-surface/90 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => toggleProducerCollapsed(name), "aria-expanded": !isCollapsed, className: "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-brand-bg/50", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-3", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums tracking-tight ring-1 ring-inset transition", !isCollapsed
                                                            ? "bg-brand-orange-soft/55 text-brand-orange ring-brand-orange/30"
                                                            : "bg-brand-bg/90 text-brand-ink-tertiary ring-brand-line/55"), "aria-hidden": true, children: String(index + 1).padStart(2, "0") }), (0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: producerObj, name: name, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h3", { className: "truncate text-[15px] font-bold text-brand-ink", children: name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] text-brand-ink-secondary", children: [mixCount, " ongoing mix", mixCount === 1 ? "" : "es"] })] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: (0, clsx_1.default)("h-4 w-4 shrink-0 text-brand-ink-tertiary transition-transform duration-200", !isCollapsed && "rotate-180"), strokeWidth: 2, "aria-hidden": true })] }), !isCollapsed ? ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-brand-line/60 px-3 pb-3", children: (0, jsx_runtime_1.jsx)(SchedulePreviewTable, { rows: rows }) })) : null] }, name));
                        })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "dashboard-panel flex items-center justify-between gap-4 rounded-2xl border border-brand-line/70 bg-brand-surface/90 px-4 py-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex min-w-0 items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: currentProducerObj, name: currentProducerToView, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("h3", { className: "truncate text-[15px] font-bold text-brand-ink", children: currentProducerToView }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] text-brand-ink-secondary", children: [currentRows.length, " ongoing mix", currentRows.length === 1 ? "" : "es"] })] })] }) }), (0, jsx_runtime_1.jsx)(SchedulePreviewTable, { rows: currentRows })] })) })] })] }));
}
