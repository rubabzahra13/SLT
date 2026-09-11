"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerStatementPreview = ProducerStatementPreview;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const DateFilter_1 = require("@/components/ui/DateFilter");
const ProducerSelect_1 = require("@/components/ui/ProducerSelect");
const Avatar_1 = require("@/components/ui/Avatar");
const data_1 = require("@/lib/data");
const date_filters_1 = require("@/lib/date-filters");
const dates_1 = require("@/lib/dates");
const export_csv_1 = require("@/lib/export-csv");
const editor_assignment_1 = require("@/lib/editor-assignment");
function ProducerStatementPreview({ selectedProducer, onProducerChange, selectedPeriod, onPeriodChange, payrollRecords, allOrders, producers, onBack, }) {
    const [activeTabProducer, setActiveTabProducer] = (0, react_1.useState)("");
    const filterPeriod = (0, react_1.useMemo)(() => {
        const bounds = (0, date_filters_1.calculateDateBounds)(selectedPeriod.type, selectedPeriod.value);
        return {
            start: bounds.start ? (0, dates_1.toCanonicalIsoDate)(bounds.start) : "",
            end: bounds.end ? (0, dates_1.toCanonicalIsoDate)(bounds.end) : "",
        };
    }, [selectedPeriod]);
    // Find all active producers who have records in this pay period
    const activeProducersInPeriod = (0, react_1.useMemo)(() => {
        const dateMatching = payrollRecords.filter((rec) => {
            const recStart = rec.completedAt || rec.mixStartDate || "";
            const recEnd = rec.completedAt || rec.mixEndDate || rec.mixStartDate || "";
            return (0, dates_1.doDateRangesOverlap)({ start: recStart, end: recEnd }, filterPeriod);
        });
        const set = new Set();
        for (const r of dateMatching) {
            if (r.assignedProducer) {
                const prodObj = (0, editor_assignment_1.findProducerByAssignmentKey)(r.assignedProducer, producers);
                const name = prodObj?.name || r.assignedProducer;
                if (name)
                    set.add(name);
            }
        }
        return Array.from(set).sort();
    }, [payrollRecords, producers, filterPeriod]);
    // Determine current active producer name to view
    const currentProducerToView = (0, react_1.useMemo)(() => {
        if (selectedProducer !== "all") {
            const found = producers.find((p) => p.id === selectedProducer || p.name.toUpperCase() === selectedProducer.toUpperCase());
            return found ? found.name : selectedProducer;
        }
        if (activeTabProducer && activeProducersInPeriod.includes(activeTabProducer)) {
            return activeTabProducer;
        }
        return activeProducersInPeriod[0] || producers[0]?.name || "Casey Marlow";
    }, [selectedProducer, activeTabProducer, activeProducersInPeriod, producers]);
    // Get rows for currently viewed producer
    const currentRows = (0, react_1.useMemo)(() => {
        return (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, currentProducerToView, filterPeriod);
    }, [payrollRecords, allOrders, producers, currentProducerToView, filterPeriod]);
    // Calculate total payout sum for currently viewed producer
    const currentProducerTotal = (0, react_1.useMemo)(() => {
        return currentRows.reduce((sum, r) => sum + r.rawTotalPayout, 0);
    }, [currentRows]);
    // Producer object for avatar/color display
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "px-6 py-6 lg:px-8 space-y-5 animate-fade-in", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-line/70 pb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onBack, className: "inline-flex h-9 items-center gap-2 rounded-xl border border-brand-line/80 bg-brand-elevated px-3 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-orange/40 hover:bg-brand-orange-soft/35 hover:text-brand-orange focus:outline-none", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: "Back to Payroll" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-[20px] font-bold text-brand-ink tracking-tight", children: "Producer Statement Preview" }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary mt-0.5", children: "Exact on-screen visual preview of the statement sent to the producer. No internal revenue or cross-producer data exposed." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2.5", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadCurrentProducer, className: "inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-line/80 bg-brand-elevated px-3.5 text-[12px] font-semibold text-brand-ink shadow-sm transition hover:border-brand-line-strong hover:bg-brand-bg", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "h-4 w-4 text-brand-ink-secondary" }), (0, jsx_runtime_1.jsx)("span", { children: "Export Statement CSV" })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: handleDownloadAllProducers, className: "inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-cta px-4 text-[12px] font-semibold text-brand-cta-text shadow-sm transition hover:bg-brand-cta-hover active:scale-[0.98]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { children: selectedProducer === "all" ? "Send to All (Download Files)" : "Send Statement (Download)" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "dashboard-panel relative z-20 !overflow-visible p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-brand-line/70 bg-brand-surface/90 shadow-sm rounded-2xl", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-3", children: [(0, jsx_runtime_1.jsx)(ProducerSelect_1.ProducerSelect, { producers: producers, value: selectedProducer, onChange: (val) => {
                                onProducerChange(val);
                                if (val !== "all")
                                    setActiveTabProducer("");
                            }, label: "Editor:", allLabel: "All Editors" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-[12px] font-semibold text-brand-ink-secondary", children: "Payroll Period:" }), (0, jsx_runtime_1.jsx)(DateFilter_1.DateFilter, { value: selectedPeriod, onChange: onPeriodChange })] })] }) }), selectedProducer === "all" && ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-[13px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: ["Active Producer Statements (", activeProducersInPeriod.length, ")"] }), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] text-brand-ink-secondary", children: "Click a producer below to preview their specific payout statement table:" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: activeProducersInPeriod.map((prodName) => {
                            const pObj = producers.find((p) => p.name.toUpperCase() === prodName.toUpperCase() || p.id === prodName) || (0, editor_assignment_1.findProducerByAssignmentKey)(prodName, producers);
                            const pRows = (0, export_csv_1.getProducerFacingPayrollRows)(payrollRecords, allOrders, producers, prodName, filterPeriod);
                            const pTotal = pRows.reduce((sum, r) => sum + r.rawTotalPayout, 0);
                            const isSelected = currentProducerToView.toUpperCase() === prodName.toUpperCase();
                            const dotColor = pObj?.color || "#94a3b8";
                            return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setActiveTabProducer(prodName), className: `flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12px] font-medium transition border shadow-sm ${isSelected
                                    ? "border-brand-orange/60 bg-brand-orange-soft/40 text-brand-ink ring-2 ring-brand-orange/20"
                                    : "border-brand-line/70 bg-brand-surface text-brand-ink-secondary hover:border-brand-line-strong hover:bg-brand-bg"}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/10", style: { backgroundColor: dotColor }, "aria-hidden": "true" }), (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: prodName }), (0, jsx_runtime_1.jsxs)("span", { className: "rounded bg-black/5 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-brand-ink-secondary", children: [pRows.length, " mixes \u00B7 ", (0, data_1.formatPrice)(pTotal)] })] }, prodName));
                        }) })] })), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel p-5 border border-brand-line/70 bg-gradient-to-r from-brand-surface to-brand-bg/80 shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3.5", children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { producer: currentProducerObj, name: currentProducerToView, size: "md" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-[16px] font-bold text-brand-ink", children: [currentProducerToView, "'s Payroll Statement"] }), currentProducerObj?.color && ((0, jsx_runtime_1.jsx)("span", { className: "h-3 w-3 rounded-full ring-1 ring-black/10", style: { backgroundColor: currentProducerObj.color }, title: `${currentProducerToView} accent color` }))] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-secondary mt-0.5", children: "Previewing payout statement" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4 bg-brand-surface/90 border border-brand-line/60 rounded-xl px-4 py-2.5 shadow-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Total Payout" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[20px] font-extrabold tabular-nums text-brand-success", children: (0, data_1.formatPrice)(currentProducerTotal) })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-8 w-px bg-brand-line/70" }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsx)("span", { className: "block text-[11px] font-semibold uppercase tracking-wider text-brand-ink-tertiary", children: "Completed Mixes" }), (0, jsx_runtime_1.jsx)("span", { className: "text-[18px] font-bold tabular-nums text-brand-ink", children: currentRows.length })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-panel dashboard-panel-framed overflow-hidden rounded-2xl", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-brand-line/70 bg-brand-surface/90 px-4 py-3 flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileSpreadsheet, { className: "h-4 w-4 text-brand-orange" }), (0, jsx_runtime_1.jsx)("h4", { className: "text-[13px] font-bold text-brand-ink tracking-wide", children: "Statement Data Preview (Matching CSV Export)" })] }), (0, jsx_runtime_1.jsxs)("span", { className: "text-[11px] text-brand-ink-tertiary font-mono", children: [export_csv_1.PRODUCER_STATEMENT_COLUMNS.length, " columns"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "overflow-x-auto scrollbar-hide", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-left border-collapse min-w-[1200px]", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "table-header-row bg-brand-bg/80 border-b border-brand-line/70", children: [(0, jsx_runtime_1.jsx)("th", { className: "table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase text-brand-ink-secondary w-12 text-center", children: "#" }), export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((col) => ((0, jsx_runtime_1.jsx)("th", { className: "table-header-cell px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-ink-secondary whitespace-nowrap", children: col.label }, col.key)))] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-brand-line/50 bg-white", children: currentRows.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: export_csv_1.PRODUCER_STATEMENT_COLUMNS.length + 1, className: "px-6 py-12 text-center text-brand-ink-secondary", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "h-8 w-8 text-brand-ink-tertiary/40" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-[14px] font-semibold text-brand-ink", children: ["No completed mixes for ", currentProducerToView, " in this pay period."] }), (0, jsx_runtime_1.jsx)("p", { className: "text-[12px] text-brand-ink-tertiary", children: "Try selecting a different pay period or producer above." })] }) }) })) : (currentRows.map((row, idx) => ((0, jsx_runtime_1.jsxs)("tr", { className: "hover:bg-brand-orange-soft/20 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-3 py-2 text-center text-[12px] tabular-nums font-semibold text-brand-ink-tertiary", children: idx + 1 }), export_csv_1.PRODUCER_STATEMENT_COLUMNS.map((col) => {
                                                const val = row[col.key];
                                                const isTotalCol = col.key === "totalPayout";
                                                const isProgramCol = col.key === "programName";
                                                return ((0, jsx_runtime_1.jsx)("td", { className: `px-3 py-2.5 text-[12px] whitespace-nowrap ${isTotalCol
                                                        ? "font-bold text-brand-success tabular-nums"
                                                        : isProgramCol
                                                            ? "font-semibold text-brand-ink"
                                                            : "text-brand-ink-secondary"}`, children: val || "—" }, col.key));
                                            })] }, row.recId || idx)))) })] }) })] })] }));
}
