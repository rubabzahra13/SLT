"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_2 = require("lucide-react");
const SidebarContext_1 = require("@/context/SidebarContext");
const AppStateContext_1 = require("@/context/AppStateContext");
const AuthContext_1 = require("@/context/AuthContext");
const mtd_filters_1 = require("@/lib/mtd-filters");
const mtd_completion_1 = require("@/lib/mtd-completion");
const BrandMonogram_1 = require("@/components/layout/BrandMonogram");
const HoverTip_1 = require("@/components/ui/HoverTip");
const DottedScroll_1 = require("@/components/ui/DottedScroll");
const baseNavItems = [
    { href: "/", label: "Dashboard", icon: lucide_react_1.LayoutDashboard },
    { href: "/orders", label: "Orders", icon: lucide_react_1.ShoppingBag },
    { href: "/mtd", label: "MTD", icon: lucide_react_1.Music2 },
    { href: "/payroll", label: "Payroll", icon: lucide_react_1.Wallet },
    { href: "/schedule", label: "Schedule", icon: lucide_react_1.Calendar },
    { href: "/producers", label: "Producers", icon: lucide_react_1.Users },
    { href: "/settings", label: "Settings", icon: lucide_react_1.Settings },
];
function Sidebar() {
    const pathname = (0, navigation_1.usePathname)();
    const { mtdRecords } = (0, AppStateContext_1.useAppState)();
    const { user, logout } = (0, AuthContext_1.useAuth)();
    const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } = (0, SidebarContext_1.useSidebar)();
    const currentUser = user || {
        name: "Megan",
        email: "megan@soundslikethat.com",
        access_level: "Full Access",
    };
    const ordersCount = (0, react_1.useMemo)(() => mtdRecords.filter(mtd_filters_1.isPreMTDOrderRecord).length, [mtdRecords]);
    const mtdTabRecords = (0, react_1.useMemo)(() => mtdRecords.filter(mtd_filters_1.isMTDRecord), [mtdRecords]);
    const inProgressCount = (0, react_1.useMemo)(() => (0, mtd_filters_1.getInProgressCount)(mtdTabRecords), [mtdTabRecords]);
    const payrollCount = (0, react_1.useMemo)(() => (0, mtd_completion_1.getPayrollRecords)(mtdRecords).length, [mtdRecords]);
    const navItems = (0, react_1.useMemo)(() => baseNavItems.map((item) => {
        if (item.href === "/orders") {
            return {
                ...item,
                badge: ordersCount > 0 ? ordersCount : undefined,
            };
        }
        if (item.href === "/mtd") {
            return {
                ...item,
                badge: inProgressCount > 0 ? inProgressCount : undefined,
            };
        }
        if (item.href === "/payroll") {
            return {
                ...item,
                badge: payrollCount > 0 ? payrollCount : undefined,
            };
        }
        return item;
    }), [ordersCount, inProgressCount, payrollCount]);
    const showExpanded = expanded || mobileOpen;
    const navItemClass = (active) => (0, clsx_1.default)("group relative flex h-10 items-center rounded-xl transition-all duration-200", showExpanded ? "w-full gap-3 px-3" : "w-10 justify-center mx-auto", active
        ? "bg-brand-sidebar-active font-semibold text-brand-sidebar-ink"
        : "text-brand-sidebar-text hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink");
    return ((0, jsx_runtime_1.jsxs)("aside", { className: (0, clsx_1.default)("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-sidebar-border bg-brand-sidebar shadow-[1px_0_0_rgba(15,20,25,0.06),4px_0_24px_rgba(0,0,0,0.12)] transition-[width,transform] duration-300 ease-out md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full", showExpanded
            ? "w-[min(252px,88vw)] md:w-[228px]"
            : "w-[min(252px,88vw)] md:w-[72px]"), "aria-label": "Main navigation", "data-expanded": showExpanded ? "true" : "false", children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("relative flex h-[72px] shrink-0 items-center justify-between", showExpanded ? "px-4" : "justify-center px-2"), children: showExpanded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(link_1.default, { href: "/", className: "flex min-w-0 flex-1 items-center gap-2.5 pr-2", children: [(0, jsx_runtime_1.jsx)(BrandMonogram_1.BrandMonogram, {}), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[12px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-sidebar-accent", children: "Sounds Like That" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 truncate text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-brand-sidebar-text-muted", children: "Admin Studio" })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: toggleExpanded, className: "hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:flex", "aria-label": "Collapse sidebar", children: (0, jsx_runtime_1.jsx)(lucide_react_1.PanelLeftClose, { className: "h-4 w-4", strokeWidth: 1.75 }) }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMobileOpen(false), className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover md:hidden", "aria-label": "Close sidebar", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-5 w-5", strokeWidth: 1.75 }) })] })) : ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: toggleExpanded, className: "flex items-center justify-center rounded-xl p-1 transition hover:bg-brand-sidebar-hover", "aria-label": "Expand sidebar", children: (0, jsx_runtime_1.jsx)(BrandMonogram_1.BrandMonogram, {}) })) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("h-px shrink-0 bg-brand-sidebar-border", showExpanded ? "mx-4" : "mx-2") }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1 px-3 py-3", children: (0, jsx_runtime_1.jsx)("nav", { className: "space-y-1", "aria-label": "Main menu", children: navItems.map(({ href, label, icon: Icon, badge }) => {
                        const active = href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(href);
                        return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: showExpanded ? "" : label, placement: "right", className: showExpanded ? "w-full block" : "block", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: href, onClick: () => setMobileOpen(false), className: navItemClass(active), children: [(0, jsx_runtime_1.jsx)(Icon, { className: (0, clsx_1.default)("h-[18px] w-[18px] shrink-0 transition-colors", active
                                            ? "text-brand-blue"
                                            : "text-brand-sidebar-text group-hover:text-brand-sidebar-ink"), strokeWidth: 1.75 }), showExpanded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "truncate text-[13px] flex-1 text-left", children: label }), badge ? ((0, jsx_runtime_1.jsx)("span", { className: "min-w-[22px] rounded-md bg-brand-sidebar-active px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-brand-blue", children: badge })) : null] })) : badge ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-orange" })) : null] }) }, href));
                    }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("shrink-0 border-t border-brand-sidebar-border", showExpanded ? "px-4 py-3" : "flex flex-col items-center p-2 gap-2"), children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("flex items-center rounded-xl text-left", showExpanded ? "w-full justify-between gap-2 py-0.5" : "justify-center"), children: [(0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: showExpanded ? "" : `${currentUser.name} (${currentUser.access_level})`, placement: "right", className: showExpanded ? "min-w-0 flex-1" : "", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2.5 min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-sidebar-elevated ring-1 ring-brand-sidebar-border", children: (0, jsx_runtime_1.jsx)("img", { src: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.name)}&backgroundColor=f5f5f3`, alt: currentUser.name, className: "h-full w-full object-cover" }) }), showExpanded ? ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold text-brand-sidebar-ink leading-tight", children: currentUser.name }), (0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("mt-0.5 inline-block truncate text-[10px] font-semibold leading-none", currentUser.access_level === "View Only"
                                                        ? "text-brand-amber"
                                                        : "text-brand-blue"), children: currentUser.access_level })] })) : null] }) }), showExpanded ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: logout, className: "shrink-0 rounded-lg p-1.5 text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-danger", title: "Sign out", "aria-label": "Sign out", children: (0, jsx_runtime_1.jsx)(lucide_react_2.LogOut, { className: "h-4 w-4", strokeWidth: 1.75 }) })) : null] }), !showExpanded ? ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: "Sign out", placement: "right", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: logout, className: "flex h-8 w-8 items-center justify-center rounded-lg text-brand-sidebar-text transition hover:bg-brand-sidebar-hover hover:text-brand-danger", "aria-label": "Sign out", children: (0, jsx_runtime_1.jsx)(lucide_react_2.LogOut, { className: "h-4 w-4", strokeWidth: 1.75 }) }) })) : null] })] }));
}
