"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignEditorModal = AssignEditorModal;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const Avatar_1 = require("@/components/ui/Avatar");
const EditorSelectDropdown_1 = require("@/components/mtd/EditorSelectDropdown");
const editor_assignment_1 = require("@/lib/editor-assignment");
const producer_keys_1 = require("@/lib/producer-keys");
const dates_1 = require("@/lib/dates");
function parseSlotDate(label) {
    if (!label || label === "TBD" || label === "No slot found")
        return null;
    const short = label.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\w+)\s+(\d{1,2})/i);
    if (short) {
        const parsed = new Date(`${short[1]} ${short[2]}, 2026`);
        if (!Number.isNaN(parsed.getTime()))
            return parsed;
    }
    const long = new Date(label);
    if (!Number.isNaN(long.getTime()))
        return long;
    return null;
}
function groupSuggestionsByDate(suggestions) {
    const groups = new Map();
    for (const suggestion of suggestions) {
        const label = suggestion.slotLabel || "TBD";
        const parsed = parseSlotDate(label);
        const key = parsed
            ? parsed.toISOString().slice(0, 10)
            : label.toLowerCase();
        const existing = groups.get(key);
        if (existing) {
            existing.editors.push(suggestion);
            continue;
        }
        groups.set(key, {
            key,
            sortTime: parsed?.getTime() ?? Number.MAX_SAFE_INTEGER,
            weekday: parsed
                ? parsed.toLocaleDateString("en-US", { weekday: "short" })
                : "—",
            day: parsed
                ? parsed.toLocaleDateString("en-US", { day: "numeric" })
                : label,
            month: parsed
                ? parsed.toLocaleDateString("en-US", { month: "short" })
                : "",
            editors: [suggestion],
        });
    }
    return Array.from(groups.values()).sort((a, b) => a.sortTime - b.sortTime);
}
function AssignEditorModal({ open, record, mtdRecords, allOrders, producers, schedule, onClose, onAssign, }) {
    const categoryEditors = (0, react_1.useMemo)(() => record
        ? (0, editor_assignment_1.getEditorNamesForCategory)(producers, record.category)
        : [], [record, producers]);
    const [selectedEditor, setSelectedEditor] = (0, react_1.useState)("");
    const isAssignmentLocked = Boolean(record?.assignedProducer?.trim());
    const suggestions = (0, react_1.useMemo)(() => record
        ? (0, editor_assignment_1.getSuggestedEditors)(mtdRecords, producers, schedule, record.category, record.id, record)
        : [], [record, mtdRecords, producers, schedule]);
    const suggestionsByDate = (0, react_1.useMemo)(() => groupSuggestionsByDate(suggestions), [suggestions]);
    const linkedOrder = (0, react_1.useMemo)(() => (record ? (0, editor_assignment_1.findLinkedOrder)(record, allOrders) : undefined), [record, allOrders]);
    const requestedEditor = (0, react_1.useMemo)(() => record
        ? (0, editor_assignment_1.getRequestedEditorFromRecord)(record, producers, linkedOrder)
        : null, [record, producers, linkedOrder]);
    const availableNames = (0, react_1.useMemo)(() => suggestions.map((suggestion) => suggestion.name), [suggestions]);
    const editorWorkload = (0, react_1.useMemo)(() => (0, editor_assignment_1.getEditorWorkload)(mtdRecords, record?.id), [mtdRecords, record?.id]);
    const editorBookedUntil = (0, react_1.useMemo)(() => {
        const map = new Map();
        for (const name of categoryEditors) {
            const until = (0, editor_assignment_1.getEditorBookedUntilIso)(name, mtdRecords, record?.id);
            if (until) {
                map.set((0, producer_keys_1.normalizeProducerKey)(name), until);
            }
        }
        return map;
    }, [categoryEditors, mtdRecords, record?.id]);
    const availableEditorKeys = (0, react_1.useMemo)(() => new Set(availableNames.map((name) => (0, producer_keys_1.normalizeProducerKey)(name))), [availableNames]);
    const { availableEditors, bookedEditors } = (0, react_1.useMemo)(() => {
        const available = [];
        const booked = [];
        for (const name of categoryEditors) {
            if (availableEditorKeys.has((0, producer_keys_1.normalizeProducerKey)(name))) {
                available.push(name);
            }
            else {
                booked.push(name);
            }
        }
        return { availableEditors: available, bookedEditors: booked };
    }, [categoryEditors, availableEditorKeys]);
    const currentAssignee = record?.assignedProducer ?? "";
    const requestedBookedEditors = (0, react_1.useMemo)(() => {
        if (!requestedEditor)
            return [];
        return bookedEditors.filter((name) => (0, producer_keys_1.producerKeysMatch)(name, requestedEditor));
    }, [requestedEditor, bookedEditors]);
    const editorSelectGroups = (0, react_1.useMemo)(() => {
        const toOption = (name, tone) => {
            const key = (0, producer_keys_1.normalizeProducerKey)(name);
            const producer = (0, editor_assignment_1.findProducerByAssignmentKey)(name, producers);
            const mixCount = editorWorkload.get(key) ?? 0;
            const bookedUntil = editorBookedUntil.get(key);
            const isCurrent = (0, producer_keys_1.producerKeysMatch)(currentAssignee, name);
            return {
                name,
                producer,
                mixCount: tone === "booked" ? mixCount : undefined,
                bookedUntil: tone === "booked" ? bookedUntil : undefined,
                disabled: tone === "booked" && !isCurrent,
            };
        };
        const groups = [
            {
                label: "Available",
                tone: "available",
                options: availableEditors.map((name) => toOption(name, "available")),
            },
        ];
        if (requestedBookedEditors.length > 0) {
            groups.push({
                label: "Booked on other mixes",
                tone: "booked",
                options: requestedBookedEditors.map((name) => toOption(name, "booked")),
            });
        }
        return groups;
    }, [
        availableEditors,
        requestedBookedEditors,
        producers,
        editorWorkload,
        editorBookedUntil,
        currentAssignee,
    ]);
    const assignedProducer = (0, react_1.useMemo)(() => isAssignmentLocked && record?.assignedProducer
        ? (0, editor_assignment_1.findProducerByAssignmentKey)(record.assignedProducer, producers)
        : undefined, [isAssignmentLocked, record?.assignedProducer, producers]);
    function pickEditorForOpen(active) {
        const pick = (0, editor_assignment_1.pickDefaultEditor)(active, producers, mtdRecords, schedule, linkedOrder);
        let editor = pick.editor;
        const booked = (0, editor_assignment_1.getEditorWorkload)(mtdRecords, active.id);
        const isCurrent = (0, producer_keys_1.producerKeysMatch)(active.assignedProducer ?? "", editor);
        if (editor && booked.has((0, producer_keys_1.normalizeProducerKey)(editor)) && !isCurrent) {
            editor =
                (0, editor_assignment_1.getSuggestedEditors)(mtdRecords, producers, schedule, active.category, active.id, active)[0]?.name || "";
        }
        return editor;
    }
    (0, react_1.useEffect)(() => {
        if (!record || !open)
            return;
        const assignedKey = record.assignedProducer?.trim() || null;
        if (assignedKey) {
            const match = categoryEditors.find((name) => (0, producer_keys_1.producerKeysMatch)(name, assignedKey));
            setSelectedEditor(match ?? assignedKey.toUpperCase());
        }
        else {
            let editor = pickEditorForOpen(record);
            const isBooked = editor &&
                !availableEditorKeys.has((0, producer_keys_1.normalizeProducerKey)(editor)) &&
                !(0, producer_keys_1.producerKeysMatch)(record.assignedProducer ?? "", editor);
            if (isBooked) {
                editor = availableEditors[0] ?? "";
            }
            setSelectedEditor(editor);
        }
    }, [
        open,
        record,
        categoryEditors,
        mtdRecords,
        producers,
        schedule,
        linkedOrder,
        availableEditorKeys,
        availableEditors,
    ]);
    const mixStartIso = (0, dates_1.toIsoDateString)(record?.mixStartDate ?? "");
    const mixEndIso = (0, dates_1.toIsoDateString)(record?.mixEndDate ?? "");
    const showProducerBooking = Boolean(mixStartIso && mixEndIso);
    if (!open || !record)
        return null;
    const activeRecord = record;
    const canSubmit = Boolean(selectedEditor) && !isAssignmentLocked;
    const genreLabel = activeRecord.category || "this";
    function handleSubmit(e) {
        e.preventDefault();
        if (!canSubmit)
            return;
        onAssign(activeRecord.id, {
            editorRequest: (0, editor_assignment_1.editorRequestForAssignment)(selectedEditor, requestedEditor, availableNames),
            assignedProducer: selectedEditor,
        });
        onClose();
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "absolute inset-0 bg-brand-scrim backdrop-blur-sm", onClick: onClose, "aria-label": "Close" }), (0, jsx_runtime_1.jsxs)("div", { className: "surface-premium relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-start justify-between gap-4 border-b border-brand-line/60 px-6 py-5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Editor assignment" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-display mt-1 text-[18px]", children: "Assign producer" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-[13px] text-brand-ink-secondary", children: [activeRecord.programName, (0, jsx_runtime_1.jsxs)("span", { className: "text-brand-ink-tertiary", children: [" ", "\u00B7 ", genreLabel, " specialists"] })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClose, className: "rounded-lg p-1.5 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }), (0, jsx_runtime_1.jsx)("form", { onSubmit: handleSubmit, className: "flex min-h-0 flex-1 flex-col", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid min-h-0 flex-1 lg:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-col border-b border-brand-line/60 bg-brand-bg/30 lg:border-b-0 lg:border-r", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex shrink-0 items-center justify-between gap-3 px-6 pb-3 pt-5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Next availability" }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[12px] text-brand-ink-tertiary", children: [genreLabel, " editors \u00B7", " ", isAssignmentLocked
                                                                    ? "locked while assigned"
                                                                    : "tap to select"] })] }), suggestionsByDate.length > 0 ? ((0, jsx_runtime_1.jsxs)("span", { className: "inline-flex items-center gap-1 rounded-full bg-brand-signature-soft px-2.5 py-1 text-[11px] font-semibold text-brand-signature", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarDays, { className: "h-3 w-3", strokeWidth: 2 }), suggestionsByDate.length, " date", suggestionsByDate.length === 1 ? "" : "s"] })) : null] }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "max-h-[min(52vh,420px)] overflow-y-scroll scrollbar-hide px-6 pb-5", indicatorPlacement: "gutter", children: categoryEditors.length === 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning", children: ["No producers specialize in ", genreLabel, ". Update a producer's category on the roster."] })) : suggestionsByDate.length === 0 ? ((0, jsx_runtime_1.jsxs)("p", { className: "rounded-xl border border-brand-warning/30 bg-brand-warning/8 px-3 py-2 text-[13px] text-brand-warning", children: ["All ", genreLabel, " editors are assigned. Pick from the list on the right if you need to reassign."] })) : ((0, jsx_runtime_1.jsx)("ol", { className: (0, clsx_1.default)("relative isolate space-y-3 before:absolute before:bottom-3 before:left-[22px] before:top-3 before:-z-10 before:w-px before:bg-brand-line", isAssignmentLocked && "pointer-events-none opacity-45"), children: suggestionsByDate.map((group, index) => ((0, jsx_runtime_1.jsxs)("li", { className: "relative pl-12", children: [(0, jsx_runtime_1.jsxs)("span", { className: (0, clsx_1.default)("absolute left-0 top-3 z-10 flex h-11 w-11 flex-col items-center justify-center rounded-xl border bg-brand-elevated text-center shadow-sm", index === 0
                                                                ? "border-brand-signature/40 ring-2 ring-brand-signature-soft"
                                                                : "border-brand-line/80"), children: [(0, jsx_runtime_1.jsx)("span", { className: "text-[9px] font-semibold uppercase tracking-wide text-brand-ink-tertiary", children: group.weekday }), (0, jsx_runtime_1.jsx)("span", { className: "text-[15px] font-bold leading-none tabular-nums text-brand-ink", children: group.day }), group.month ? ((0, jsx_runtime_1.jsx)("span", { className: "mt-0.5 text-[9px] font-medium text-brand-ink-tertiary", children: group.month })) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-brand-line/70 bg-brand-elevated/80 p-3 shadow-[var(--shadow-premium-sm)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-2.5 flex items-center justify-between gap-2", children: [(0, jsx_runtime_1.jsxs)("p", { className: "text-[12px] font-semibold text-brand-ink", children: [group.editors.length, " editor", group.editors.length === 1 ? "" : "s", " free"] }), index === 0 ? ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-brand-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-success", children: "Soonest" })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: group.editors.map((suggestion) => {
                                                                        const selected = selectedEditor === suggestion.name;
                                                                        return ((0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setSelectedEditor(suggestion.name), className: (0, clsx_1.default)("inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition", selected
                                                                                ? "border-brand-signature bg-brand-signature-soft shadow-sm"
                                                                                : "border-brand-line/70 bg-brand-bg/60 hover:border-brand-line hover:bg-brand-bg"), children: [suggestion.producer?.avatar ? ((0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: suggestion.producer.avatar, alt: suggestion.name, size: "xs" })) : ((0, jsx_runtime_1.jsx)("span", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-brand-bg-subtle text-[10px] font-bold text-brand-ink-secondary", children: suggestion.name.slice(0, 2) })), (0, jsx_runtime_1.jsx)("span", { className: "text-[12px] font-semibold text-brand-ink", children: suggestion.name })] }, suggestion.name));
                                                                    }) })] })] }, group.key))) })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex min-h-0 flex-col px-6 py-5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-5", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "text-label", htmlFor: "editor-select", children: "Editor" }), requestedEditor ? ((0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary", children: ["Requested:", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: requestedEditor })] })) : ((0, jsx_runtime_1.jsxs)("p", { className: "mt-0.5 text-[11px] text-brand-ink-tertiary", children: ["Requested:", " ", (0, jsx_runtime_1.jsx)("span", { className: "font-semibold text-brand-ink", children: "First available" })] })), isAssignmentLocked && activeRecord.assignedProducer ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-1.5 rounded-xl border border-brand-line/70 bg-brand-bg/50 px-3 py-2.5", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2.5", children: [assignedProducer?.avatar ? ((0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { src: assignedProducer.avatar, alt: activeRecord.assignedProducer, size: "sm" })) : ((0, jsx_runtime_1.jsx)("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-signature-soft text-[11px] font-bold text-brand-signature", children: activeRecord.assignedProducer.slice(0, 2) })), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold text-brand-ink", children: activeRecord.assignedProducer }), (0, jsx_runtime_1.jsx)("p", { className: "text-[11px] text-brand-ink-tertiary", children: "Currently assigned" })] }), (0, jsx_runtime_1.jsx)("span", { className: "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-brand-ink-tertiary", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "h-3.5 w-3.5", strokeWidth: 2 }) })] }) })) : ((0, jsx_runtime_1.jsx)(EditorSelectDropdown_1.EditorSelectDropdown, { id: "editor-select", value: selectedEditor, onChange: setSelectedEditor, groups: editorSelectGroups, requestedEditor: requestedEditor, disabled: categoryEditors.length === 0, emptyLabel: "No matching editors" }))] }), showProducerBooking ? ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-brand-line/70 bg-brand-bg/40 px-3 py-2.5", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-label", children: "Producer booking" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-tertiary", children: "Same as mix start & end in the table. Edit those columns to change this window." }), (0, jsx_runtime_1.jsxs)("dl", { className: "mt-2.5 space-y-1.5", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between gap-3 text-[12px]", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-brand-ink-tertiary", children: "From" }), (0, jsx_runtime_1.jsx)("dd", { className: "font-medium tabular-nums text-brand-ink", children: (0, dates_1.formatDisplayDate)(mixStartIso) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-baseline justify-between gap-3 text-[12px]", children: [(0, jsx_runtime_1.jsx)("dt", { className: "text-brand-ink-tertiary", children: "Until" }), (0, jsx_runtime_1.jsx)("dd", { className: "font-medium tabular-nums text-brand-ink", children: (0, dates_1.formatDisplayDate)(mixEndIso) })] })] })] })) : null] }), !isAssignmentLocked ? ((0, jsx_runtime_1.jsx)("div", { className: "mt-auto flex flex-wrap items-center justify-end gap-2 border-t border-brand-line/60 pt-5", children: (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: !canSubmit, className: "rounded-lg bg-brand-cta px-4 py-2 text-[13px] font-medium text-brand-cta-text transition hover:bg-brand-cta-hover disabled:cursor-not-allowed disabled:opacity-45", children: "Assign" }) })) : null] })] }) })] })] }));
}
