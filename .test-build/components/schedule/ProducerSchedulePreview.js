"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerSchedulePreview = ProducerSchedulePreview;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
const Avatar_1 = require("@/components/ui/Avatar");
const date_filters_1 = require("@/lib/date-filters");
const export_csv_1 = require("@/lib/export-csv");
const editor_assignment_1 = require("@/lib/editor-assignment");
function ProducerSchedulePreview({ selectedProducer, onProducerChange, mtdRecords, allOrders, producers, onBack, }) {
    const [activeTabProducer, setActiveTabProducer] = (0, react_1.useState)("");
    // Find all producers who have ongoing assigned MTD records with valid schedule dates
    const activeProducersInSchedule = (0, react_1.useMemo)(() => {
        const eligibleRecords = mtdRecords.filter(export_csv_1.isEligibleProducerScheduleRecord);
        const set = new Set();
        for (const r of eligibleRecords) {
            if (r.assignedProducer) {
                const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
                const name = prodObj?.name || r.assignedProducer;
                if (name)
                    set.add(name);
            }
        }
        return Array.from(set).sort();
    }, [mtdRecords, producers]);
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
        return (0, export_csv_1.getProducerFacingScheduleRows)(mtdRecords, allOrders, producers, currentProducerToView);
    }, [mtdRecords, allOrders, producers, currentProducerToView]);
    const handleDownloadCurrentProducer = () => {
        const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, currentProducerToView);
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
            const csv = (0, export_csv_1.generateScheduleCsv)(mtdRecords, allOrders, producers, targetName);
            (0, export_csv_1.triggerCsvDownload)(`Schedule_${targetName.replace(/\s+/g, "_")}_${(0, date_filters_1.todayIso)()}.csv`, csv);
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-line/60 pb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onBack, className: "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-line/70 bg-brand-surface text-brand-ink-secondary shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange", title: "Back to Schedule Overview", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-[18px] font-bold text-brand-ink", children: "Producer Schedule Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary", children: "Exact on-screen visual preview of the schedule statement sent to the producer." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [(0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: producers, value: selectedProducer, onChange: (val) => {
                                    onProducerChange(val);
                                    setActiveTabProducer("");
                                }, label: "Editor:", allLabel: "All Editors" }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadCurrentProducer, className: "inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-surface px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("span", { children: "Export Schedule CSV" })] }), selectedProducer === "all" && ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadAllProducers, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Send to All (Download Files)" })] }))] })] }), selectedProducer === "all" && activeProducersInSchedule.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel p-3 border border-brand-line/70 bg-brand-surface/90 rounded-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] font-bold uppercase tracking-wider text-brand-ink-tertiary mb-2 px-1", children: ["Active Producer Schedules (", activeProducersInSchedule.length, ")"] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: activeProducersInSchedule.map((prodName) => {
                            const pObj = producers.find((p) => p.name.toUpperCase() === prodName.toUpperCase() || p.id === prodName) || (0, editor_assignment_1.findProducerByAssignmentKey)(prodName, producers);
                            const pRows = (0, export_csv_1.getProducerFacingScheduleRows)(mtdRecords, allOrders, producers, prodName);
                            const isSelected = currentProducerToView.toUpperCase() === prodName.toUpperCase();
                            const dotColor = pObj?.color || "#94a3b8";
                            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTabProducer(prodName), className: `flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-medium transition border shadow-sm ${isSelected
                                    ? "border-brand-orange/60 bg-brand-orange-soft/40 text-brand-ink ring-2 ring-brand-orange/20"
                                    : "border-brand-line/70 bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", style: { backgroundColor: dotColor }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: prodName }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-ink-secondary", children: [pRows.length, " mixes"] })] }, prodName));
                        }) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel p-5 border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3.5", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: currentProducerObj, name: currentProducerToView, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-[16px] font-bold text-brand-ink", children: [currentProducerToView, "'s Schedule"] }), currentProducerObj?.color && ((0, jsx_runtime_1.jsx)("span", { className: "h-3 w-3 rounded-full ring-1 ring-black/10", style: { backgroundColor: currentProducerObj.color }, title: `${currentProducerToView} accent color` }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary mt-0.5", children: "Previewing ongoing scheduled mixes" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-4 bg-brand-surface/90 border border-brand-line/60 rounded-xl px-4 py-2.5 shadow-sm", children: (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Scheduled Mixes" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[18px] font-bold tabular-nums text-brand-ink", children: currentRows.length })] }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("h4", { className: "text-[13px] font-bold text-brand-ink tracking-wide", children: "Schedule Data Preview (Matching CSV Export)" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[11px] text-brand-ink-tertiary font-mono", children: [export_csv_1.PRODUCER_SCHEDULE_COLUMNS.length, " columns"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto scrollbar-hide", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-left border-collapse min-w-[1000px]", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "table-header-row bg-brand-bg/80 border-b border-brand-line/70", children: [(0, jsx_runtime_1.jsx)("th", { className: "table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase text-brand-ink-secondary w-12 text-center", children: "#" }), export_csv_1.PRODUCER_SCHEDULE_COLUMNS.map((col) => ((0, jsx_runtime_1.jsx)("th", { className: "table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary whitespace-nowrap", children: col.label }, col.key)))] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-brand-line/50 bg-white", children: currentRows.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: export_csv_1.PRODUCER_SCHEDULE_COLUMNS.length + 1, className: "px-4 py-8 text-center text-[13px] text-brand-ink-tertiary", children: "No ongoing scheduled mixes found for this producer." }) })) : (currentRows.map((row, idx) => ((0, jsx_runtime_1.jsxs)("tr", { className: "hover:bg-brand-bg/40 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-3 py-2.5 text-[12px] font-mono text-center text-brand-ink-tertiary", children: idx + 1 }), export_csv_1.PRODUCER_SCHEDULE_COLUMNS.map((col) => {
                                                const val = row[col.key];
                                                const isProgramCol = col.key === "programName";
                                                const isStatusCol = col.key === "status";
                                                return ((0, jsx_runtime_1.jsx)("td", { className: `px-3 py-2.5 text-[12px] whitespace-nowrap ${isProgramCol
                                                        ? "font-semibold text-brand-ink"
                                                        : isStatusCol
                                                            ? "font-medium text-brand-orange"
                                                            : "text-brand-ink-secondary"}`, children: String(val ?? "—") }, col.key));
                                            })] }, row.recId || idx)))) })] }) })] })] }));
}
