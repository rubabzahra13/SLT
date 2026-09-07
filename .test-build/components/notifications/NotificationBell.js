"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationBell = NotificationBell;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const AppStateContext_1 = require("@/context/AppStateContext");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const react_1 = require("react");
function NotificationBell({ tone = "light", }) {
    const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, } = (0, AppStateContext_1.useAppState)();
    const [open, setOpen] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => setOpen(!open), className: (0, clsx_1.default)("relative flex h-8 w-8 items-center justify-center rounded-lg border transition", tone === "glass" &&
                    "border-white/[0.1] bg-white/[0.06] hover:bg-white/[0.12]", tone === "dark" &&
                    "border-brand-sidebar-border bg-brand-sidebar-elevated hover:bg-brand-sidebar-hover", tone === "light" &&
                    "border-brand-line bg-brand-elevated/90 hover:bg-brand-elevated"), "aria-label": "Notifications", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { className: (0, clsx_1.default)("h-4 w-4", tone === "light"
                            ? "text-brand-ink-secondary"
                            : "text-brand-sidebar-text"), strokeWidth: 1.75 }), unreadCount > 0 ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f07840] px-1 text-[9px] font-bold text-white", children: unreadCount > 9 ? "9+" : unreadCount })) : null] }), open ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "fixed inset-0 z-40", onClick: () => setOpen(false), "aria-label": "Close notifications" }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-brand-line bg-brand-surface shadow-[var(--shadow-premium)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between border-b border-brand-line px-4 py-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[13px] font-semibold", children: "Notifications" }), unreadCount > 0 ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: markAllNotificationsRead, className: "text-[11px] font-medium text-brand-ink-secondary hover:text-brand-ink", children: "Mark all read" })) : null] }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "max-h-80", scrollClassName: "max-h-80 overflow-y-scroll scrollbar-hide", indicatorPlacement: "gutter", children: notifications.length === 0 ? ((0, jsx_runtime_1.jsx)("p", { className: "px-4 py-8 text-center text-[12px] text-brand-ink-tertiary", children: "No notifications yet" })) : (notifications.map((n) => ((0, jsx_runtime_1.jsx)(link_1.default, { href: n.href || "#", onClick: () => {
                                        markNotificationRead(n.id);
                                        setOpen(false);
                                    }, className: (0, clsx_1.default)("block border-b border-brand-line px-4 py-3 transition last:border-b-0 hover:bg-brand-bg/60", !n.read && "bg-brand-bg/40"), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", n.type === "new_order" && "bg-brand-orange", n.type === "mtd_move" && "bg-brand-success", n.type === "schedule" && "bg-brand-warning", n.type === "payroll" && "bg-brand-blue") }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-[12px] font-semibold", children: n.title }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 text-[11px] leading-snug text-brand-ink-secondary", children: n.message })] })] }) }, n.id)))) })] })] })) : null] }));
}
