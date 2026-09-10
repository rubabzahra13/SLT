"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppShell = AppShell;
const jsx_runtime_1 = require("react/jsx-runtime");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const SidebarContext_1 = require("@/context/SidebarContext");
const AuthContext_1 = require("@/context/AuthContext");
const Sidebar_1 = require("@/components/layout/Sidebar");
const NotificationToaster_1 = require("@/components/notifications/NotificationToaster");
const lucide_react_1 = require("lucide-react");
function AppShell({ children }) {
    const pathname = (0, navigation_1.usePathname)();
    const router = (0, navigation_1.useRouter)();
    const { isAuthenticated, isLoading, isViewOnly } = (0, AuthContext_1.useAuth)();
    const { expanded, mobileOpen, setMobileOpen } = (0, SidebarContext_1.useSidebar)();
    const isLoginPage = pathname === "/login";
    (0, react_1.useEffect)(() => {
        if (!isLoading && !isAuthenticated && !isLoginPage) {
            router.replace("/login");
        }
    }, [isLoading, isAuthenticated, isLoginPage, router]);
    if (isLoginPage) {
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
    }
    if (isLoading || (!isAuthenticated && !isLoginPage)) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "flex min-h-screen w-full items-center justify-center bg-brand-bg", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center gap-3 text-brand-ink-tertiary", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs font-medium", children: "Loading Sounds Like That CRM..." })] }) }));
    }
    const desktopMargin = expanded
        ? SidebarContext_1.SIDEBAR_WIDTH_EXPANDED
        : SidebarContext_1.SIDEBAR_WIDTH_COLLAPSED;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [mobileOpen ? ((0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "Close navigation menu", className: "fixed inset-0 z-40 bg-brand-scrim backdrop-blur-[1px] md:hidden", onClick: () => setMobileOpen(false) })) : null, (0, jsx_runtime_1.jsx)(Sidebar_1.Sidebar, {}), (0, jsx_runtime_1.jsx)(NotificationToaster_1.NotificationToaster, {}), (0, jsx_runtime_1.jsxs)("div", { className: "app-canvas flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-out md:ml-[var(--sidebar-margin)]", style: { "--sidebar-margin": `${desktopMargin}px` }, children: [isViewOnly ? ((0, jsx_runtime_1.jsxs)("div", { className: "relative z-20 flex w-full shrink-0 items-center justify-center gap-2 border-b border-amber-300/40 bg-amber-500/10 px-4 py-2 text-[12px] font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400", strokeWidth: 2 }), (0, jsx_runtime_1.jsx)("span", { className: "text-center", children: "View Only Mode \u2014 All application data is read-only. Editing and modification actions are disabled." })] })) : null, (0, jsx_runtime_1.jsxs)("header", { className: "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-brand-line bg-brand-surface px-4 md:hidden", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMobileOpen(true), className: "inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-ink transition hover:bg-brand-bg", "aria-label": "Open menu", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { className: "h-5 w-5", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-sm font-semibold", children: "Sounds Like That" }), (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-ink-tertiary", children: "Admin Studio" })] })] }), (0, jsx_runtime_1.jsx)("main", { className: "app-canvas flex min-h-0 min-w-0 flex-1 flex-col", children: children })] })] }));
}
