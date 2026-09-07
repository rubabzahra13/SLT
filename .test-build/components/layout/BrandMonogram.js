"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandMonogram = BrandMonogram;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const brand_logo_1 = require("@/lib/brand-logo");
function BrandMonogram({ className }) {
    return ((0, jsx_runtime_1.jsx)("span", { className: (0, clsx_1.default)("flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[1.5px]", className), style: {
            backgroundImage: `linear-gradient(135deg, ${brand_logo_1.BRAND_LOGO_RING.from}, ${brand_logo_1.BRAND_LOGO_RING.to})`,
        }, children: (0, jsx_runtime_1.jsx)("span", { className: "flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white", children: (0, jsx_runtime_1.jsx)("img", { src: brand_logo_1.BRAND_LOGO_PATH, alt: "", className: "h-full w-full object-contain object-center", style: {
                    transform: `translateX(${brand_logo_1.BRAND_LOGO_IMAGE.translateXPx}px) scale(${brand_logo_1.BRAND_LOGO_IMAGE.scale})`,
                } }) }) }));
}
