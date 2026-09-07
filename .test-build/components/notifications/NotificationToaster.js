"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationToaster = NotificationToaster;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const clsx_1 = __importDefault(require("clsx"));
const lucide_react_1 = require("lucide-react");
const AppStateContext_1 = require("@/context/AppStateContext");
const AUTO_DISMISS_MS = 6000;
const toneByType = {
    new_order: {
        icon: lucide_react_1.Bell,
        ring: "ring-brand-orange/30",
        iconColor: "text-brand-orange",
        bar: "bg-brand-orange",
    },
    mtd_move: {
        icon: lucide_react_1.PackageCheck,
        ring: "ring-brand-success/30",
        iconColor: "text-brand-success",
        bar: "bg-brand-success",
    },
    schedule: {
        icon: lucide_react_1.CalendarClock,
        ring: "ring-brand-warning/30",
        iconColor: "text-brand-warning",
        bar: "bg-brand-warning",
    },
    payroll: {
        icon: lucide_react_1.Wallet,
        ring: "ring-brand-blue/30",
        iconColor: "text-brand-blue",
        bar: "bg-brand-blue",
    },
};
function NotificationToaster() {
    const { notifications, markNotificationRead } = (0, AppStateContext_1.useAppState)();
    const router = (0, navigation_1.useRouter)();
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const seenRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        // First run: treat everything already present as seen (no toast on load).
        if (seenRef.current === null) {
            seenRef.current = new Set(notifications.map((n) => n.id));
            return;
        }
        const fresh = notifications.filter((n) => !seenRef.current.has(n.id));
        if (fresh.length === 0)
            return;
        fresh.forEach((n) => seenRef.current.add(n.id));
        setToasts((prev) => [...fresh, ...prev].slice(0, 4));
    }, [notifications]);
    function dismiss(id) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }
    if (toasts.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-[360px] flex-col gap-2.5", children: toasts.map((toast) => ((0, jsx_runtime_1.jsx)(ToastCard, { toast: toast, onDismiss: () => dismiss(toast.id), onOpen: () => {
                markNotificationRead(toast.id);
                dismiss(toast.id);
                if (toast.href)
                    router.push(toast.href);
            } }, toast.id))) }));
}
function ToastCard({ toast, onDismiss, onOpen, }) {
    const tone = toneByType[toast.type];
    const Icon = tone.icon;
    (0, react_1.useEffect)(() => {
        const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "animate-toast-in pointer-events-auto overflow-hidden rounded-2xl border border-brand-line bg-brand-elevated shadow-[var(--shadow-premium)]", role: "status", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3 p-3.5", children: [(0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-bg ring-1 ring-inset", tone.ring), children: (0, jsx_runtime_1.jsx)(Icon, { className: (0, clsx_1.default)("h-4 w-4", tone.iconColor), strokeWidth: 2 }) }), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: onOpen, className: "min-w-0 flex-1 text-left", children: [(0, jsx_runtime_1.jsx)("p", { className: "truncate text-[13px] font-semibold text-brand-ink", children: toast.title }), (0, jsx_runtime_1.jsx)("p", { className: "mt-0.5 line-clamp-2 text-[12px] leading-snug text-brand-ink-secondary", children: toast.message }), toast.href ? ((0, jsx_runtime_1.jsx)("span", { className: "mt-1 inline-block text-[11px] font-semibold text-brand-signature", children: "View" })) : null] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onDismiss, className: "rounded-full p-1 text-brand-ink-tertiary transition hover:bg-brand-bg hover:text-brand-ink", "aria-label": "Dismiss notification", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-3.5 w-3.5" }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "h-0.5 w-full bg-brand-line/60", children: (0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("animate-toast-bar h-full", tone.bar) }) })] }));
}
