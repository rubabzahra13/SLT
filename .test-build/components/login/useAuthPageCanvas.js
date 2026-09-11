"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_PAGE_CANVAS = void 0;
exports.useAuthPageCanvas = useAuthPageCanvas;
const react_1 = require("react");
const brand_colors_1 = require("@/lib/brand-colors");
exports.AUTH_PAGE_CANVAS = brand_colors_1.BRAND_CHARCOAL;
/** Pin html/body to the auth background so overscroll never reveals white. */
function useAuthPageCanvas() {
    (0, react_1.useEffect)(() => {
        const html = document.documentElement;
        const body = document.body;
        const prev = {
            htmlBg: html.style.backgroundColor,
            bodyBg: body.style.backgroundColor,
            htmlOverscroll: html.style.overscrollBehavior,
            bodyOverscroll: body.style.overscrollBehavior,
        };
        html.style.backgroundColor = exports.AUTH_PAGE_CANVAS;
        body.style.backgroundColor = exports.AUTH_PAGE_CANVAS;
        html.style.overscrollBehavior = "none";
        body.style.overscrollBehavior = "none";
        let themeMeta = document.querySelector('meta[name="theme-color"]');
        const createdThemeMeta = !themeMeta;
        const prevTheme = themeMeta?.getAttribute("content") ?? "";
        if (!themeMeta) {
            themeMeta = document.createElement("meta");
            themeMeta.setAttribute("name", "theme-color");
            document.head.appendChild(themeMeta);
        }
        themeMeta.setAttribute("content", exports.AUTH_PAGE_CANVAS);
        return () => {
            html.style.backgroundColor = prev.htmlBg;
            body.style.backgroundColor = prev.bodyBg;
            html.style.overscrollBehavior = prev.htmlOverscroll;
            body.style.overscrollBehavior = prev.bodyOverscroll;
            if (createdThemeMeta) {
                themeMeta?.remove();
            }
            else if (themeMeta) {
                themeMeta.setAttribute("content", prevTheme);
            }
        };
    }, []);
}
