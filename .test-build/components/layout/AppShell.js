"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
const jsx_runtime_1 = require("react/jsx-runtime");
const SidebarContext_1 = require("@/context/SidebarContext");
const Sidebar_1 = require("@/components/layout/Sidebar");
const NotificationToaster_1 = require("@/components/notifications/NotificationToaster");
const lucide_react_1 = require("lucide-react");
function AppShell({ children }) {
    const { expanded, mobileOpen, setMobileOpen } = (0, SidebarContext_1.useSidebar)();
    const desktopMargin = expanded
        ? SidebarContext_1.SIDEBAR_WIDTH_EXPANDED
        : SidebarContext_1.SIDEBAR_WIDTH_COLLAPSED;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [mobileOpen ? ((0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "Close navigation menu", className: "fixed inset-0 z-40 bg-brand-scrim backdrop-blur-[1px] md:hidden", onClick: () => setMobileOpen(false) })) : null, (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, {}), (0, jsx_runtime_1.jsx)(NotificationToaster_1.NotificationToaster, {}), (0, jsx_runtime_1.jsxs)("div", { className: "app-canvas flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-out md:ml-[var(--sidebar-margin)]", style: { "--sidebar-margin": `${desktopMargin}px` }, children: [(0, jsx_runtime_1.jsxs)("header", { className: "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-brand-line bg-brand-surface px-4 md:hidden", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMobileOpen(true), className: "inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-ink transition hover:bg-brand-bg", "aria-label": "Open menu", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { className: "h-5 w-5", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-sm font-semibold", children: "Sounds Like That" }), (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: "Admin Studio" })] })] }), (0, jsx_runtime_1.jsx)("main", { className: "app-canvas flex min-h-0 min-w-0 flex-1 flex-col", children: children })] })] }));
}
