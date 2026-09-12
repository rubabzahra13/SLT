"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradientBackground = GradientBackground;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const brand_colors_1 = require("@/lib/brand-colors");
// GradientBackground — SLT brand remix of 21st.dev "Orchid Petal Sky".
// Zero dependencies: one <div> that fills its parent.
// Remix source: https://21st.dev/community/gradients/editor?from=5bccdbda-6bc4-4d83-8d0d-cead4a853ade
const GRAIN_FILTER_ID = "grain-slt-brand-sky";
function rgbaFromHex(hex, alpha = 0.92) {
    const value = parseInt(hex.slice(1), 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
const BRAND_SKY_GRADIENT = [
    `radial-gradient(ellipse 130% 110% at 50% 50%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL_MID, 0.55)} 0%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL, 0.95)} 100%)`,
    `radial-gradient(150% 50% at 40.46% 6%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL)} 0%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL, 0)} 55%)`,
    `radial-gradient(150% 50% at 41.41% 33%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL_MID)} 0%, ${rgbaFromHex(brand_colors_1.BRAND_CHARCOAL_MID, 0)} 55%)`,
    `radial-gradient(150% 50% at 51.35% 67%, ${rgbaFromHex(brand_colors_1.BRAND_BLUE)} 0%, ${rgbaFromHex(brand_colors_1.BRAND_BLUE, 0)} 55%)`,
    `radial-gradient(150% 50% at 54.16% 94%, ${rgbaFromHex(brand_colors_1.BRAND_ORANGE)} 0%, ${rgbaFromHex(brand_colors_1.BRAND_ORANGE, 0)} 55%)`,
].join(", ");
const NOISE_TEXTURE = "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.180'/></svg>\")";
function GradientBackground({ className }) {
    return ((0, jsx_runtime_1.jsxs)("div", { "aria-hidden": "true", className: (0, clsx_1.default)(className), style: {
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            containerType: "size",
        }, children: [(0, jsx_runtime_1.jsx)("div", { className: "gradient-sky-drift", style: {
                    position: "absolute",
                    inset: "-0.8cqmin",
                    filter: "blur(0.4cqmin)",
                    backgroundImage: `${NOISE_TEXTURE}, ${BRAND_SKY_GRADIENT}`,
                    backgroundSize: "120px 120px, auto, auto, auto, auto, auto",
                    backgroundBlendMode: "overlay, normal, normal, normal, normal, normal",
                } }), (0, jsx_runtime_1.jsxs)("svg", { "aria-hidden": "true", style: {
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0.18,
                    mixBlendMode: "overlay",
                }, children: [(0, jsx_runtime_1.jsxs)("filter", { id: GRAIN_FILTER_ID, children: [(0, jsx_runtime_1.jsx)("feTurbulence", { type: "fractalNoise", baseFrequency: "0.8", numOctaves: "2", stitchTiles: "stitch" }), (0, jsx_runtime_1.jsx)("feColorMatrix", { type: "saturate", values: "0" })] }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "100%", filter: `url(#${GRAIN_FILTER_ID})` })] })] }));
}
