"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIDEBAR_WIDTH_COLLAPSED = exports.SIDEBAR_WIDTH_EXPANDED = void 0;
exports.SidebarProvider = SidebarProvider;
exports.useSidebar = useSidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const STORAGE_KEY = "sltSidebarExpanded";
const SidebarContext = (0, react_1.createContext)(null);
function readExpanded() {
    if (typeof window === "undefined")
        return true;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null)
            return true;
        return stored !== "false";
    }
    catch {
        return true;
    }
}
function SidebarProvider({ children }) {
    const [expanded, setExpandedState] = (0, react_1.useState)(true);
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
    const [hydrated, setHydrated] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setExpandedState(readExpanded());
        setHydrated(true);
    }, []);
    const setExpanded = (0, react_1.useCallback)((value) => {
        setExpandedState(value);
        try {
            localStorage.setItem(STORAGE_KEY, String(value));
        }
        catch {
            // ignore
        }
    }, []);
    const toggleExpanded = (0, react_1.useCallback)(() => {
        setExpanded(!expanded);
    }, [expanded, setExpanded]);
    (0, react_1.useEffect)(() => {
        if (!mobileOpen)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileOpen]);
    (0, react_1.useEffect)(() => {
        const onResize = () => {
            if (window.innerWidth >= 768)
                setMobileOpen(false);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return ((0, jsx_runtime_1.jsx)(SidebarContext.Provider, { value: {
            expanded: hydrated ? expanded : true,
            setExpanded,
            toggleExpanded,
            mobileOpen,
            setMobileOpen,
        }, children: children }));
}
function useSidebar() {
    const ctx = (0, react_1.useContext)(SidebarContext);
    if (!ctx)
        throw new Error("useSidebar must be used within SidebarProvider");
    return ctx;
}
exports.SIDEBAR_WIDTH_EXPANDED = 228;
exports.SIDEBAR_WIDTH_COLLAPSED = 72;
