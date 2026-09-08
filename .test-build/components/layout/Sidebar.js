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
const SidebarContext_1 = require("@/context/SidebarContext");
const AppStateContext_1 = require("@/context/AppStateContext");
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
    const { expanded, toggleExpanded, setExpanded, mobileOpen, setMobileOpen } = (0, SidebarContext_1.useSidebar)();
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
    const navItemClass = (active) => (0, clsx_1.default)("group relative flex h-10 items-center rounded-xl transition-all duration-200", showExpanded ? "w-full gap-3 px-3" : "relative w-10 justify-center px-0", active
        ? "bg-brand-sidebar-active font-semibold text-brand-sidebar-ink"
        : "text-brand-sidebar-text hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink");
    return ((0, jsx_runtime_1.jsxs)("aside", { className: (0, clsx_1.default)("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-brand-sidebar-border bg-brand-sidebar shadow-[1px_0_0_rgba(15,20,25,0.06),4px_0_24px_rgba(0,0,0,0.12)] transition-[width,transform] duration-300 ease-out md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full", showExpanded
            ? "w-[min(252px,88vw)] md:w-[228px]"
            : "w-[min(252px,88vw)] md:w-[72px]"), "aria-label": "Main navigation", "data-expanded": showExpanded ? "true" : "false", children: [(0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("relative flex h-[72px] shrink-0 items-center", showExpanded ? "px-3" : "justify-center px-2"), children: showExpanded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)(link_1.default, { href: "/", className: "flex min-w-0 flex-1 items-center gap-2.5 pr-8", children: [(0, jsx_runtime_1.jsx)(BrandMonogram_1.BrandMonogram, {}), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0", children: [(0, jsx_runtime_1.jsx)("p", { className: "whitespace-nowrap text-[12px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-sidebar-accent", children: "Sounds Like That" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 whitespace-nowrap text-[10px] font-semibold uppercase leading-none tracking-[0.06em] text-brand-sidebar-text-muted", children: "Admin Studio" })] })] }), (0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: "Close menu", placement: "bottom", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setMobileOpen(false), className: "absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-sidebar-text-muted transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:hidden", "aria-label": "Close menu", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) }), (0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: "Collapse sidebar", placement: "bottom", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: toggleExpanded, className: "absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-brand-sidebar-text-muted transition hover:bg-brand-sidebar-hover hover:text-brand-sidebar-ink md:inline-flex", "aria-label": "Collapse sidebar", "aria-expanded": "true", children: (0, jsx_runtime_1.jsx)(lucide_react_1.PanelLeftClose, { className: "h-[16px] w-[16px]", strokeWidth: 1.75 }) }) })] })) : ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: "Expand sidebar", placement: "right", children: (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: toggleExpanded, className: "transition hover:scale-[1.03]", "aria-label": "Expand sidebar", "aria-expanded": "false", children: (0, jsx_runtime_1.jsx)(BrandMonogram_1.BrandMonogram, {}) }) })) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("h-px shrink-0 bg-brand-sidebar-border", showExpanded ? "mx-3" : "mx-2") }), (0, jsx_runtime_1.jsx)(DottedScroll_1.DottedScroll, { className: "min-h-0 flex-1", scrollClassName: "h-full overflow-y-scroll scrollbar-hide", indicatorPlacement: "overlay", tone: "dark", contentClassName: (0, clsx_1.default)("flex flex-col gap-0.5 py-4", showExpanded ? "px-3" : "items-center px-2"), children: (0, jsx_runtime_1.jsx)("nav", { className: "flex flex-col gap-0.5", children: navItems.map(({ href, label, icon: Icon, badge }) => {
                        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                        return ((0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: showExpanded ? "" : label, placement: "right", className: showExpanded ? "block w-full" : "", children: (0, jsx_runtime_1.jsxs)(link_1.default, { href: href, onClick: () => setMobileOpen(false), className: navItemClass(active), "aria-label": label, children: [active && showExpanded ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-blue" })) : null, (0, jsx_runtime_1.jsx)(Icon, { className: (0, clsx_1.default)("h-[19px] w-[19px] shrink-0", active
                                            ? "text-brand-blue"
                                            : "text-brand-sidebar-text group-hover:text-brand-sidebar-ink"), strokeWidth: active ? 2.25 : 1.75 }), showExpanded ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("flex-1 text-[14px]", active
                                                    ? "font-semibold text-brand-sidebar-ink"
                                                    : "font-medium"), children: label }), badge ? ((0, jsx_runtime_1.jsx)("span", { className: "min-w-[22px] rounded-md bg-brand-sidebar-active px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-brand-blue", children: badge })) : null] })) : badge ? ((0, jsx_runtime_1.jsx)("span", { className: "absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-orange" })) : null] }) }, href));
                    }) }) }), (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("shrink-0 border-t border-brand-sidebar-border", showExpanded ? "px-3 py-4" : "flex justify-center p-2"), children: (0, jsx_runtime_1.jsx)(HoverTip_1.HoverTip, { label: showExpanded ? "" : "Megan · Expand for account", placement: "right", children: (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => {
                            if (!showExpanded)
                                setExpanded(true);
                        }, className: (0, clsx_1.default)("flex items-center rounded-xl text-left transition hover:bg-brand-sidebar-hover", showExpanded ? "w-full gap-2.5 px-0 py-2" : "h-9 w-9 justify-center"), "aria-label": showExpanded ? "Account" : "Expand sidebar for account", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-9 w-9 shrink-0 overflow-hidden rounded-full bg-brand-sidebar-elevated ring-1 ring-brand-sidebar-border", children: (0, jsx_runtime_1.jsx)("img", { src: "https://api.dicebear.com/7.x/notionists/svg?seed=Megan&backgroundColor=f5f5f3", alt: "Megan", className: "h-full w-full object-cover" }) }), showExpanded ? ((0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold text-brand-sidebar-ink", children: "Megan" }), (0, jsx_runtime_1.jsx)("p", { className: "truncate text-[11px] text-brand-sidebar-text-muted", children: "Administrator" })] })) : null] }) }) })] }));
}
