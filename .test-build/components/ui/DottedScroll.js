"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DottedScroll = DottedScroll;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = __importDefault(require("clsx"));
const DOT_COUNT = 3;
const DEFAULT_SCROLL_CLASS = {
    vertical: "h-full overflow-y-scroll scrollbar-hide",
    horizontal: "w-full overflow-x-scroll scrollbar-hide",
};
function DottedScroll({ children, className = "", contentClassName, scrollClassName, orientation = "vertical", indicatorPlacement, indicatorDistribution = "center", indicatorClassName = "", tone = "light", showIndicator = true, }) {
    const containerRef = (0, react_1.useRef)(null);
    const [activeIndex, setActiveIndex] = (0, react_1.useState)(0);
    const [canScroll, setCanScroll] = (0, react_1.useState)(false);
    const isHorizontal = orientation === "horizontal";
    const resolvedIndicatorPlacement = indicatorPlacement ?? (isHorizontal ? "below" : "overlay");
    const indicatorsBelow = resolvedIndicatorPlacement === "below";
    const indicatorsGutter = resolvedIndicatorPlacement === "gutter";
    const baseScrollClass = scrollClassName ??
        DEFAULT_SCROLL_CLASS[isHorizontal ? "horizontal" : "vertical"];
    const resolvedScrollClass = indicatorsGutter && !isHorizontal && !/\bpr-\d/.test(baseScrollClass)
        ? `${baseScrollClass} pr-4`.trim()
        : baseScrollClass;
    const resolvedContentClass = contentClassName ??
        (isHorizontal ? "block w-max min-w-full leading-[0]" : "flex flex-col");
    const bounded = isHorizontal
        ? !resolvedScrollClass.includes("w-full")
        : !resolvedScrollClass.includes("h-full");
    const updateScrollState = (0, react_1.useCallback)(() => {
        const el = containerRef.current;
        if (!el)
            return;
        if (isHorizontal) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            const maxScroll = scrollWidth - clientWidth;
            const scrollable = maxScroll > 4;
            setCanScroll(scrollable);
            if (!scrollable) {
                setActiveIndex(0);
                return;
            }
            const progress = scrollLeft / maxScroll;
            setActiveIndex(Math.round(progress * (DOT_COUNT - 1)));
            return;
        }
        const { scrollTop, scrollHeight, clientHeight } = el;
        const maxScroll = scrollHeight - clientHeight;
        const scrollable = maxScroll > 4;
        setCanScroll(scrollable);
        if (!scrollable) {
            setActiveIndex(0);
            return;
        }
        const progress = scrollTop / maxScroll;
        setActiveIndex(Math.round(progress * (DOT_COUNT - 1)));
    }, [isHorizontal]);
    (0, react_1.useEffect)(() => {
        const el = containerRef.current;
        if (!el)
            return;
        updateScrollState();
        el.addEventListener("scroll", updateScrollState, { passive: true });
        const resizeObserver = new ResizeObserver(updateScrollState);
        resizeObserver.observe(el);
        if (el.firstElementChild) {
            resizeObserver.observe(el.firstElementChild);
        }
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            resizeObserver.disconnect();
        };
    }, [updateScrollState]);
    const dotMarks = ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: Array.from({ length: DOT_COUNT }).map((_, index) => ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("rounded-full transition-all duration-150", index === activeIndex
                ? "h-2 w-2 bg-brand-signature"
                : tone === "dark"
                    ? "h-1.5 w-1.5 bg-white/20"
                    : "h-1.5 w-1.5 bg-brand-line-strong") }, index))) }));
    const dots = showIndicator && canScroll ? ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("pointer-events-none", indicatorsBelow &&
            "mt-2 flex items-center justify-center gap-2", isHorizontal &&
            !indicatorsBelow &&
            "absolute bottom-1.5 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2", !isHorizontal &&
            indicatorsGutter &&
            (0, clsx_1.default)("absolute inset-y-0 right-0 z-[2] flex w-5 flex-col items-center", indicatorDistribution === "even"
                ? "justify-between py-5"
                : "justify-center gap-2"), !isHorizontal &&
            !indicatorsGutter &&
            "absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 py-3", indicatorClassName, !isHorizontal && !indicatorsGutter && !indicatorClassName && "right-1"), "aria-hidden": "true", children: dotMarks })) : null;
    const handleWheel = (0, react_1.useCallback)((e) => {
        if (isHorizontal && containerRef.current) {
            const el = containerRef.current;
            if (el.scrollWidth > el.clientWidth) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    el.scrollLeft += e.deltaY;
                }
            }
        }
    }, [isHorizontal]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("relative", bounded
            ? "w-full shrink-0"
            : isHorizontal
                ? "min-w-0 w-full"
                : "min-h-0 flex-1", className), children: [(0, jsx_runtime_1.jsx)("div", { ref: containerRef, className: resolvedScrollClass, onWheel: handleWheel, children: (0, jsx_runtime_1.jsx)("div", { className: resolvedContentClass, children: children }) }), dots] }));
}
