"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRequirementPill = OrderRequirementPill;
exports.OrderRequirementsCell = OrderRequirementsCell;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const AppStateContext_1 = require("@/context/AppStateContext");
const order_requirements_1 = require("@/lib/order-requirements");
function OrderRequirementPill({ item, onToggle, disabled = false, }) {
    const isGreen = item.state === "green";
    const isRed = item.state === "red";
    const isWhite = item.state === "white";
    const isInteractive = !disabled && (isGreen || isRed);
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInteractive && onToggle) {
            onToggle(item);
        }
    };
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: !isInteractive, onClick: handleClick, className: (0, clsx_1.default)("inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none transition shadow-2xs select-none focus:outline-none focus:ring-1 focus:ring-slate-400/40", isGreen &&
            "bg-[#c2e7d9] text-[#0f5236] border border-[#9edbb8] hover:brightness-95 active:scale-95 cursor-pointer", isRed &&
            "bg-[#f9d7d7] text-[#901313] border border-[#ebafaf] hover:brightness-95 active:scale-95 cursor-pointer", isWhite &&
            "bg-white text-slate-400 border border-slate-200/80 cursor-default opacity-85", !isInteractive && "cursor-default"), title: isWhite
            ? `${item.label}: Not applicable for this package`
            : `${item.label}: ${isGreen ? "Collected (Click to set RED)" : "Missing (Click to set GREEN)"}`, children: (0, jsx_runtime_1.jsx)("span", { children: item.label }) }));
}
function OrderRequirementsCell({ record, category, }) {
    const { updateMTD, addNotification, isViewOnly } = (0, AppStateContext_1.useAppState)();
    const reqs = (0, order_requirements_1.getOrderRequirements)(record);
    const items = category === "collections" ? reqs.collections : reqs.songsArea;
    if (!items || items.length === 0) {
        return (0, jsx_runtime_1.jsx)("span", { className: "text-[11px] text-brand-ink-tertiary", children: "\u2014" });
    }
    const handleToggle = (item) => {
        if (isViewOnly)
            return;
        const currentlyCollected = item.state === "green";
        const nextCollected = !currentlyCollected;
        const existingOverrides = record.collectionStates || record.collection_states || {};
        const updatedCollectionStates = {
            ...existingOverrides,
            [item.id]: nextCollected,
        };
        const oldStatus = (0, order_requirements_1.getOrderRequirements)(record).status;
        const simulatedRecord = {
            ...record,
            collectionStates: updatedCollectionStates,
            collection_states: updatedCollectionStates,
            orderStatus: undefined,
            order_status: undefined,
        };
        const newStatus = (0, order_requirements_1.getOrderRequirements)(simulatedRecord).status;
        const statusChanged = oldStatus !== newStatus;
        const patch = {
            collectionStates: updatedCollectionStates,
            collection_states: updatedCollectionStates,
        };
        if (statusChanged) {
            patch.orderStatus = newStatus;
            patch.order_status = newStatus;
        }
        // Synchronize legacy text flags if applicable
        if (item.id === "songs") {
            patch.haveSongs = nextCollected ? "HAVE SONGS" : "NEED SONGS";
        }
        if (item.id === "cs" || item.id === "eight_count") {
            patch.eightCountSheet = nextCollected ? "HAVE CS" : "NEED CS";
        }
        updateMTD(record.id, patch);
        if (statusChanged) {
            addNotification({
                type: "mtd_move",
                title: "Order status updated",
                message: `Order moved to ${newStatus}.`,
            });
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "inline-flex items-center justify-center gap-1 rounded-full bg-[#f0f3f6] border border-[#e2e8f0] p-1 shadow-inner max-w-fit mx-auto", onClick: (e) => e.stopPropagation(), children: items.map((item) => ((0, jsx_runtime_1.jsx)(OrderRequirementPill, { item: item, onToggle: handleToggle, disabled: isViewOnly }, item.id))) }));
}
